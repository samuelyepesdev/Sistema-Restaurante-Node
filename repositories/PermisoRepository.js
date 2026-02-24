/**
 * PermisoRepository - Roles y permisos (panel superadmin)
 */

const db = require('../config/database');

class PermisoRepository {
    static async getAllRoles() {
        const [rows] = await db.query('SELECT id, nombre, descripcion FROM roles ORDER BY nombre');
        return rows;
    }

    static async getAllPermisos() {
        const [rows] = await db.query('SELECT id, nombre, descripcion FROM permisos ORDER BY nombre');
        return rows;
    }

    static async getPermisoIdsByRol(rolId) {
        const [rows] = await db.query('SELECT permiso_id FROM rol_permisos WHERE rol_id = ?', [rolId]);
        return rows.map(r => r.permiso_id);
    }

    static async setPermisosForRol(rolId, permisoIds) {
        const connection = await db.getConnection();
        try {
            await connection.query('DELETE FROM rol_permisos WHERE rol_id = ?', [rolId]);
            if (permisoIds && permisoIds.length > 0) {
                const values = permisoIds.map(pid => [rolId, pid]);
                await connection.query('INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ?', [values]);
            }
        } finally {
            connection.release();
        }
    }
}

module.exports = PermisoRepository;
