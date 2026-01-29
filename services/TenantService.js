const db = require('../config/database');

class TenantService {
    static async getAllTenants() {
        const [tenants] = await db.query(`
            SELECT id, nombre, slug, activo, config, created_at
            FROM tenants
            ORDER BY created_at DESC
        `);
        return tenants;
    }

    static async createTenant({ nombre, slug, config = {}, activo = true }) {
        const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            throw new Error('El slug ya existe');
        }
        const [result] = await db.query(
            'INSERT INTO tenants (nombre, slug, config, activo) VALUES (?, ?, ?, ?)',
            [nombre, slug, JSON.stringify(config), activo ? 1 : 0]
        );
        return { id: result.insertId };
    }

    static async updateTenant(id, { nombre, config, activo }) {
        const payload = [];
        const parts = [];
        if (nombre) {
            parts.push('nombre = ?');
            payload.push(nombre);
        }
        if (config) {
            parts.push('config = ?');
            payload.push(JSON.stringify(config));
        }
        if (activo !== undefined) {
            parts.push('activo = ?');
            payload.push(activo ? 1 : 0);
        }
        if (parts.length === 0) {
            return { affectedRows: 0 };
        }
        payload.push(id);
        const [result] = await db.query(
            `UPDATE tenants SET ${parts.join(', ')} WHERE id = ?`,
            payload
        );
        return result;
    }

    static async setTenantConfig(id, config) {
        const [result] = await db.query(
            'UPDATE tenants SET config = ? WHERE id = ?',
            [JSON.stringify(config || {}), id]
        );
        return result;
    }

    static async changeTenantStatus(id, activo) {
        const [result] = await db.query(
            'UPDATE tenants SET activo = ? WHERE id = ?',
            [activo ? 1 : 0, id]
        );
        return result;
    }

    static async getTenantById(id) {
        const [rows] = await db.query('SELECT * FROM tenants WHERE id = ?', [id]);
        return rows[0] || null;
    }
}

module.exports = TenantService;
