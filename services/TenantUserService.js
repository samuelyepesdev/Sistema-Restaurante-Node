const bcrypt = require('bcrypt');
const db = require('../config/database');

class TenantUserService {
    static async getUsersByTenant(tenantId) {
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.nombre_completo, u.activo, r.nombre AS rol
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.tenant_id = ?
            ORDER BY u.username
        `, [tenantId]);
        return users;
    }

    static async createTenantUser(tenantId, { username, password, email, nombre_completo, rol_nombre }) {
        if (!username || !password) {
            throw new Error('El username y la contraseña son obligatorios');
        }

        const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
        if (existing.length > 0) {
            throw new Error('Ya existe un usuario con ese usuario');
        }

        const [roles] = await db.query('SELECT id FROM roles WHERE nombre = ?', [rol_nombre]);
        if (roles.length === 0) {
            throw new Error('Rol no válido');
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (username, password_hash, email, nombre_completo, rol_id, tenant_id, activo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [username, password_hash, email || null, nombre_completo || null, roles[0].id, tenantId]
        );
        return result.insertId;
    }

    static async assignRoles(userId, tenantId, rol_nombre) {
        const [users] = await db.query('SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        if (users.length === 0) {
            throw new Error('Usuario no encontrado en ese tenant');
        }

        const [roles] = await db.query('SELECT id FROM roles WHERE nombre = ?', [rol_nombre]);
        if (roles.length === 0) {
            throw new Error('Rol no válido');
        }

        const [result] = await db.query(
            'UPDATE usuarios SET rol_id = ?, activo = TRUE WHERE id = ?',
            [roles[0].id, userId]
        );
        return result;
    }

    static async changeTenantUserStatus(userId, tenantId, activo) {
        const [result] = await db.query(
            'UPDATE usuarios SET activo = ? WHERE id = ? AND tenant_id = ?',
            [activo ? 1 : 0, userId, tenantId]
        );
        return result;
    }
}

module.exports = TenantUserService;
