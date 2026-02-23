// Script to run database migrations automatically
// Solo ejecuta migraciones que aún no están registradas en schema_migrations.
// Usage: node scripts/run-migrations.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const MIGRATIONS_TABLE = 'schema_migrations';

/** Errores que se consideran "ya aplicado" y no detienen la migración */
const IGNORABLE_ERRORS = [
    'ER_TABLE_EXISTS_ERROR',
    'ER_DUP_ENTRY',
    'ER_DUP_KEYNAME',
    'ER_DUP_FIELDNAME',
    'ER_FK_DUP_NAME',
    'ER_CANT_DROP_FIELD_OR_KEY'
];
const IGNORABLE_MESSAGES = [
    'already exists',
    'Duplicate entry',
    'Duplicate column name',
    'Duplicate key name',
    'Duplicate foreign key constraint name'
];

function isIgnorableError(error) {
    if (IGNORABLE_ERRORS.includes(error.code)) return true;
    const msg = (error.message || '').toLowerCase();
    return IGNORABLE_MESSAGES.some(m => msg.includes(m.toLowerCase()));
}

/**
 * Asegura que existe la tabla de control de migraciones
 */
async function ensureMigrationsTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            migration_name VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

/**
 * Indica si una migración ya fue aplicada
 */
async function isApplied(migrationName) {
    const [rows] = await db.query(
        `SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE migration_name = ?`,
        [migrationName]
    );
    return rows.length > 0;
}

/**
 * Marca una migración como aplicada
 */
async function markApplied(migrationName) {
    await db.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (migration_name) VALUES (?)`,
        [migrationName]
    );
}

/**
 * Lee y ejecuta un archivo SQL (solo sentencias válidas)
 */
async function executeSQLFile(filePath) {
    let sql = fs.readFileSync(filePath, 'utf8');
    sql = sql.replace(/--.*$/gm, '');
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
            if (s.length === 0) return false;
            if (s.toUpperCase().startsWith('USE ')) return false;
            const sqlKeywords = ['CREATE', 'INSERT', 'UPDATE', 'DELETE', 'SELECT', 'ALTER', 'DROP'];
            return sqlKeywords.some(keyword => s.toUpperCase().includes(keyword));
        });

    if (statements.length === 0) return;

    const basename = path.basename(filePath);
    console.log(`   Encontradas ${statements.length} sentencias SQL`);

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
            await db.query(statement);
            console.log(`   ✓ Sentencia ${i + 1}/${statements.length} ejecutada`);
        } catch (error) {
            if (isIgnorableError(error)) {
                console.log(`   ⏭️  Sentencia ${i + 1}: ya aplicada o duplicada (${(error.message || '').split('\n')[0].substring(0, 50)}...)`);
            } else {
                console.error(`   ❌ Error en sentencia ${i + 1}:`, error.message);
                throw error;
            }
        }
    }
    console.log(`   ✅ ${basename} completado`);
}

/**
 * Lista de archivos de migración en orden
 */
function getMigrationsList() {
    return [
        path.join(__dirname, '..', 'database.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '001_create_users_and_roles.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '002_add_categorias_to_productos.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '003_add_multi_tenancy.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '004_create_tenant_audit.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '005_unique_por_tenant.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '006_costeo.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '007_add_margen_minimo_alerta.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '008_temas_parametros.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '009_categorias_unique_por_tenant.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '010_recetas_costos_adicionales_reposteria.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '011_planes_y_tenant_plan.sql'),
        path.join(__dirname, '..', 'database', 'migrations', '012_permiso_plantillas_ver.sql')
    ];
}

async function runMigrations() {
    try {
        console.log('🚀 Iniciando migraciones de base de datos...\n');

        const connection = await db.getConnection();
        connection.release();
        console.log('✓ Conexión a base de datos exitosa');

        await ensureMigrationsTable();
        console.log(`✓ Tabla de control ${MIGRATIONS_TABLE} lista\n`);

        const migrations = getMigrationsList();

        for (const filePath of migrations) {
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Archivo no encontrado: ${filePath}`);
                process.exit(1);
            }

            const migrationName = path.basename(filePath);

            if (await isApplied(migrationName)) {
                console.log(`⏭️  Ya aplicada: ${migrationName}`);
                continue;
            }

            console.log(`\n📄 Ejecutando: ${migrationName}`);
            await executeSQLFile(filePath);
            await markApplied(migrationName);
        }

        console.log('\n✅ Migraciones revisadas. Las pendientes se ejecutaron correctamente.');
        console.log('\n📝 Próximo paso (si aplica): node scripts/create-admin.js\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code) console.error('   Código:', error.code);
        process.exit(1);
    }
}

runMigrations();
