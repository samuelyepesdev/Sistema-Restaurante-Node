// Script to run database migrations automatically
// Usage: node scripts/run-migrations.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Read and execute SQL file
 * @param {string} filePath - Path to SQL file
 * @returns {Promise<void>}
 */
async function executeSQLFile(filePath) {
    try {
        let sql = fs.readFileSync(filePath, 'utf8');
        
        // Remove comments (-- style and /* */ style)
        sql = sql.replace(/--.*$/gm, ''); // Remove -- comments
        sql = sql.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments
        
        // Split by semicolons and clean up
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => {
                // Filter out empty statements and USE statements
                if (s.length === 0) return false;
                if (s.toUpperCase().startsWith('USE ')) return false;
                // Must contain at least one SQL keyword
                const sqlKeywords = ['CREATE', 'INSERT', 'UPDATE', 'DELETE', 'SELECT', 'ALTER', 'DROP'];
                return sqlKeywords.some(keyword => s.toUpperCase().includes(keyword));
            });
        
        console.log(`\n📄 Ejecutando: ${path.basename(filePath)}`);
        console.log(`   Encontradas ${statements.length} sentencias SQL`);
        
        if (statements.length === 0) {
            console.log(`   ⚠️  No se encontraron sentencias SQL válidas en el archivo`);
            return;
        }
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                await db.query(statement);
                console.log(`   ✓ Sentencia ${i + 1}/${statements.length} ejecutada`);
            } catch (error) {
                // Ignore "table already exists" and duplicate entry errors
                if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                    error.code === 'ER_DUP_ENTRY' ||
                    error.code === 'ER_DUP_KEYNAME' ||
                    error.code === 'ER_DUP_FIELDNAME' ||
                    error.message.includes('already exists') ||
                    error.message.includes('Duplicate entry') ||
                    error.message.includes('Duplicate column name') ||
                    error.message.includes('Duplicate key name')) {
                    console.log(`   ⚠️  Sentencia ${i + 1}: ${error.message.split('\n')[0].substring(0, 60)}...`);
                } else {
                    console.error(`   ❌ Error en sentencia ${i + 1}:`, error.message);
                    throw error;
                }
            }
        }
        
        console.log(`   ✅ ${path.basename(filePath)} completado`);
    } catch (error) {
        console.error(`   ❌ Error ejecutando ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Run all migrations in order
 */
async function runMigrations() {
    try {
        console.log('🚀 Iniciando migraciones de base de datos...\n');
        
        // Test connection
        const connection = await db.getConnection();
        connection.release();
        console.log('✓ Conexión a base de datos exitosa\n');
        
        // Migration files in order
               const migrations = [
                   path.join(__dirname, '..', 'database.sql'),
                   path.join(__dirname, '..', 'database', 'migrations', '001_create_users_and_roles.sql'),
                   path.join(__dirname, '..', 'database', 'migrations', '002_add_categorias_to_productos.sql'),
                   path.join(__dirname, '..', 'database', 'migrations', '003_add_multi_tenancy.sql'),
                   path.join(__dirname, '..', 'database', 'migrations', '004_create_tenant_audit.sql')
               ];
        
        // Check if files exist
        for (const migration of migrations) {
            if (!fs.existsSync(migration)) {
                console.error(`❌ Archivo no encontrado: ${migration}`);
                process.exit(1);
            }
        }
        
        // Execute migrations
        for (const migration of migrations) {
            await executeSQLFile(migration);
        }
        
        console.log('\n✅ Todas las migraciones ejecutadas correctamente');
        console.log('\n📝 Próximo paso: Crear usuario administrador');
        console.log('   Ejecuta: node scripts/create-admin.js\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error ejecutando migraciones:', error.message);
        if (error.code) {
            console.error(`   Código: ${error.code}`);
        }
        process.exit(1);
    }
}

// Run migrations
runMigrations();

