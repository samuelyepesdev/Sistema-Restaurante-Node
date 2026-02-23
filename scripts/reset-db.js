/**
 * Reset completo de la base de datos: borra y recrea la BD, luego ejecuta todas las migraciones.
 * Útil para desarrollo cuando quieres empezar desde cero.
 *
 * Uso: node scripts/reset-db.js
 *
 * Requisitos: MySQL en marcha, .env con DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (opcional, por defecto restaurante).
 *
 * Después del reset tendrás la BD vacía y esquema actualizado. Crea el admin y datos de prueba con:
 *   node scripts/create-admin.js
 *   node scripts/seed-analitica-datos.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'restaurante';

async function resetDatabase() {
    console.log('🔄 Reset de base de datos\n');

    // Conexión sin base de datos para poder hacer DROP
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        console.log(`   Eliminando base de datos "${DB_NAME}"...`);
        await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
        console.log(`   Creando base de datos "${DB_NAME}"...`);
        await connection.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('   ✓ Base de datos recreada.\n');
    } finally {
        await connection.end();
    }

    console.log('🚀 Ejecutando migraciones...\n');
    const projectRoot = path.join(__dirname, '..');
    execSync('node scripts/run-migrations.js', {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, DB_NAME }
    });

    console.log('\n✅ Reset completado. Base de datos limpia y esquema actualizado.');
    console.log('\n📝 Próximos pasos opcionales:');
    console.log('   node scripts/create-admin.js');
    console.log('   node scripts/seed-analitica-datos.js');
    console.log('   node scripts/seed-tenants-test.js\n');
}

resetDatabase().catch(err => {
    console.error('\n❌ Error:', err.message);
    if (err.code) console.error('   Código:', err.code);
    process.exit(1);
});
