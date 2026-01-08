/**
 * Script to create test users for each role
 * Creates users: mesero, cocinero, cajero, admin (if not exists)
 * Usage: node scripts/create-test-users.js
 * Related to: database/migrations/001_create_users_and_roles.sql, services/AuthService.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// Test users configuration
const testUsers = [
    {
        username: 'mesero',
        password: 'mesero123',
        email: 'mesero@restaurante.com',
        nombreCompleto: 'Juan Mesero',
        rolNombre: 'mesero'
    },
    {
        username: 'cocinero',
        password: 'cocinero123',
        email: 'cocinero@restaurante.com',
        nombreCompleto: 'Pedro Cocinero',
        rolNombre: 'cocinero'
    },
    {
        username: 'cajero',
        password: 'cajero123',
        email: 'cajero@restaurante.com',
        nombreCompleto: 'María Cajero',
        rolNombre: 'cajero'
    },
    {
        username: 'admin',
        password: 'admin123',
        email: 'admin@restaurante.com',
        nombreCompleto: 'Admin Sistema',
        rolNombre: 'admin'
    }
];

async function createTestUsers() {
    try {
        console.log('🔐 Creando usuarios de prueba para cada rol...\n');

        // Verify roles exist
        const [roles] = await db.query('SELECT id, nombre FROM roles');
        const rolesMap = new Map(roles.map(r => [r.nombre, r.id]));

        if (roles.length === 0) {
            throw new Error('No se encontraron roles. Ejecuta primero las migraciones: npm run migrate');
        }

        console.log(`✓ Roles encontrados: ${roles.map(r => r.nombre).join(', ')}\n`);

        const createdUsers = [];
        const updatedUsers = [];

        for (const userConfig of testUsers) {
            const { username, password, email, nombreCompleto, rolNombre } = userConfig;

            // Get role ID
            const rolId = rolesMap.get(rolNombre);
            if (!rolId) {
                console.error(`⚠️  Rol "${rolNombre}" no encontrado. Saltando usuario ${username}`);
                continue;
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Check if user exists
            const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);

            if (existing.length > 0) {
                // Update existing user
                await db.query(
                    'UPDATE usuarios SET password_hash = ?, email = ?, nombre_completo = ?, rol_id = ?, activo = TRUE WHERE username = ?',
                    [passwordHash, email, nombreCompleto, rolId, username]
                );
                updatedUsers.push({ username, rolNombre, password });
                console.log(`↻ Usuario actualizado: ${username} (${rolNombre})`);
            } else {
                // Create new user
                const [result] = await db.query(
                    'INSERT INTO usuarios (username, password_hash, email, nombre_completo, rol_id, activo) VALUES (?, ?, ?, ?, ?, TRUE)',
                    [username, passwordHash, email, nombreCompleto, rolId]
                );
                createdUsers.push({ username, rolNombre, password });
                console.log(`✓ Usuario creado: ${username} (${rolNombre}) - ID: ${result.insertId}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMEN DE USUARIOS DE PRUEBA');
        console.log('='.repeat(60));
        console.log('\nUsuarios creados/actualizados:\n');
        
        const allUsers = [...createdUsers, ...updatedUsers];
        allUsers.forEach(({ username, rolNombre, password }) => {
            console.log(`  👤 ${username.padEnd(12)} | Rol: ${rolNombre.padEnd(10)} | Password: ${password}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('⚠️  IMPORTANTE: Cambia las contraseñas después de las pruebas');
        console.log('='.repeat(60));
        console.log('\n✅ Proceso completado correctamente\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error al crear usuarios de prueba:', error.message);
        if (error.code) {
            console.error(`   Código: ${error.code}`);
        }
        console.error('\nStack:', error.stack);
        process.exit(1);
    }
}

// Run script
createTestUsers();

