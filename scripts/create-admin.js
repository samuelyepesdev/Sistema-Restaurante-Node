require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { ROLES } = require('../utils/constants');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@restaurante.com';
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || 'Administrador';
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@restaurante.com';
const SUPERADMIN_NOMBRE = process.env.SUPERADMIN_NOMBRE || 'Superadministrador';

async function getRoleId(nombre) {
    const [rows] = await db.query('SELECT id FROM roles WHERE nombre = ?', [nombre]);
    if (rows.length === 0) {
        throw new Error(`Rol "${nombre}" no encontrado.`);
    }
    return rows[0].id;
}

async function ensureTenant(slug, nombre) {
    const [rows] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (rows.length > 0) {
        return rows[0].id;
    }
    const [result] = await db.query(
        'INSERT INTO tenants (nombre, slug, activo) VALUES (?, ?, TRUE)',
        [nombre, slug]
    );
    return result.insertId;
}

async function upsertUser({ username, password, email, nombreCompleto, rolNombre, tenantId }) {
    const rolId = await getRoleId(rolNombre);
    const passwordHash = await bcrypt.hash(password, 10);
    const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) {
        await db.query(
            'UPDATE usuarios SET password_hash = ?, email = ?, nombre_completo = ?, rol_id = ?, tenant_id = ?, activo = TRUE WHERE username = ?',
            [passwordHash, email || null, nombreCompleto || null, rolId, tenantId || null, username]
        );
        return existing[0].id;
    }
    const [result] = await db.query(
        'INSERT INTO usuarios (username, password_hash, email, nombre_completo, rol_id, tenant_id, activo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [username, passwordHash, email || null, nombreCompleto || null, rolId, tenantId || null]
    );
    return result.insertId;
}

async function createAdminUsers() {
    try {
        const tenantId = await ensureTenant('principal', 'Principal');
        await upsertUser({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            email: ADMIN_EMAIL,
            nombreCompleto: ADMIN_NOMBRE,
            rolNombre: ROLES.ADMIN,
            tenantId
        });
        await upsertUser({
            username: SUPERADMIN_USERNAME,
            password: SUPERADMIN_PASSWORD,
            email: SUPERADMIN_EMAIL,
            nombreCompleto: SUPERADMIN_NOMBRE,
            rolNombre: ROLES.SUPERADMIN,
            tenantId: null
        });
        console.log('Usuarios administrativos listos:');
        console.log(`  Superadmin: ${SUPERADMIN_USERNAME} / ${SUPERADMIN_PASSWORD}`);
        console.log(`  Admin local: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
        console.log('⚠️ Cambia ambas claves al primer login.');
        process.exit(0);
    } catch (error) {
        console.error('Error creando usuarios:', error.message);
        process.exit(1);
    }
}

createAdminUsers();
