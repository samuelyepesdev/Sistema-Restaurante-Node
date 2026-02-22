const db = require('../config/database');

class TenantService {
    static async getAllTenants() {
        const [rows] = await db.query(`
            SELECT t.id, t.nombre, t.slug, t.activo, t.config, t.plan_id, t.created_at, p.nombre AS plan_nombre, p.slug AS plan_slug
            FROM tenants t
            LEFT JOIN planes p ON t.plan_id = p.id
            ORDER BY t.created_at DESC
        `);
        return (rows || []).map(row => {
            let config = row.config;
            if (config && typeof config === 'string') {
                try { config = JSON.parse(config); } catch (_) { config = {}; }
            }
            return {
                id: row.id,
                nombre: row.nombre,
                slug: row.slug,
                activo: row.activo,
                config: config || {},
                plan_id: row.plan_id,
                plan_nombre: row.plan_nombre,
                plan_slug: row.plan_slug,
                created_at: row.created_at
            };
        });
    }

    static async createTenant({ nombre, slug, config = {}, activo = true, plan_id = 1 }) {
        const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            throw new Error('El slug ya existe');
        }
        const planId = plan_id != null && plan_id !== '' ? parseInt(plan_id, 10) : 1;
        const [result] = await db.query(
            'INSERT INTO tenants (nombre, slug, config, activo, plan_id) VALUES (?, ?, ?, ?, ?)',
            [nombre, slug, JSON.stringify(config), activo ? 1 : 0, planId]
        );
        return { id: result.insertId };
    }

    static async updateTenant(id, { nombre, config, activo, plan_id }) {
        const payload = [];
        const parts = [];
        if (nombre) {
            parts.push('nombre = ?');
            payload.push(nombre);
        }
        if (config !== undefined && config !== null) {
            parts.push('config = ?');
            const configStr = typeof config === 'string' ? config : JSON.stringify(config);
            payload.push(configStr);
        }
        if (activo !== undefined) {
            parts.push('activo = ?');
            payload.push(activo ? 1 : 0);
        }
        if (plan_id !== undefined && plan_id !== null && plan_id !== '') {
            parts.push('plan_id = ?');
            payload.push(parseInt(plan_id, 10));
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
        const [rows] = await db.query(
            'SELECT t.*, p.nombre AS plan_nombre, p.slug AS plan_slug FROM tenants t LEFT JOIN planes p ON t.plan_id = p.id WHERE t.id = ?',
            [id]
        );
        const row = rows[0] || null;
        if (!row) return null;
        let config = row.config;
        if (config && typeof config === 'string') {
            try { config = JSON.parse(config); } catch (_) { config = {}; }
        }
        return {
            ...row,
            config: config || {},
            plan_nombre: row.plan_nombre,
            plan_slug: row.plan_slug
        };
    }
}

module.exports = TenantService;
