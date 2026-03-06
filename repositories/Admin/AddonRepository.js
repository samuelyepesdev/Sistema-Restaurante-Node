/**
 * AddonRepository - Acceso a datos de add-ons
 * Gestiona el catálogo de add-ons y su asignación a tenants.
 * Related to: services/AddonService.js, routes/admin/planes.js
 */

const db = require('../../config/database');

class AddonRepository {
    /**
     * Listar todos los add-ons activos
     * @returns {Promise<Object[]>}
     */
    static async findAll() {
        const [rows] = await db.query(
            'SELECT id, slug, nombre, descripcion, precio, activo FROM addons WHERE activo = TRUE ORDER BY id ASC'
        );
        return rows.map(AddonRepository._mapRow);
    }

    /**
     * Buscar add-on por ID
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async findById(id) {
        const [rows] = await db.query(
            'SELECT id, slug, nombre, descripcion, precio, activo FROM addons WHERE id = ?',
            [id]
        );
        return rows[0] ? AddonRepository._mapRow(rows[0]) : null;
    }

    /**
     * Actualizar precio/nombre/descripción de un add-on
     * @param {number} id
     * @param {{ nombre?: string, descripcion?: string, precio?: number }} data
     */
    static async update(id, data) {
        const fields = [];
        const params = [];
        if (data.nombre !== undefined) { fields.push('nombre = ?'); params.push(String(data.nombre).trim()); }
        if (data.descripcion !== undefined) { fields.push('descripcion = ?'); params.push(data.descripcion); }
        if (data.precio !== undefined) { fields.push('precio = ?'); params.push(parseFloat(data.precio) || 0); }
        if (fields.length === 0) return;
        params.push(id);
        await db.query(`UPDATE addons SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    /**
     * Obtener IDs de add-ons asignados a un tenant
     * @param {number} tenantId
     * @returns {Promise<Object[]>} add-ons completos
     */
    static async getByTenant(tenantId) {
        const [rows] = await db.query(
            `SELECT a.id, a.slug, a.nombre, a.descripcion, a.precio
             FROM tenant_addons ta
             INNER JOIN addons a ON a.id = ta.addon_id
             WHERE ta.tenant_id = ?
             ORDER BY a.id ASC`,
            [tenantId]
        );
        return rows.map(AddonRepository._mapRow);
    }

    /**
     * Asignar add-on a un tenant (ignora si ya existe)
     * @param {number} tenantId
     * @param {number} addonId
     */
    static async addToTenant(tenantId, addonId) {
        await db.query(
            'INSERT IGNORE INTO tenant_addons (tenant_id, addon_id) VALUES (?, ?)',
            [tenantId, addonId]
        );
    }

    /**
     * Quitar add-on de un tenant
     * @param {number} tenantId
     * @param {number} addonId
     */
    static async removeFromTenant(tenantId, addonId) {
        await db.query(
            'DELETE FROM tenant_addons WHERE tenant_id = ? AND addon_id = ?',
            [tenantId, addonId]
        );
    }

    /**
     * Obtener add-ons de múltiples tenants en una sola query (para vista de lista)
     * @param {number[]} tenantIds
     * @returns {Promise<Object[]>}  filas con { tenant_id, addon_id, addon_slug, addon_nombre, addon_precio }
     */
    static async getByTenantIds(tenantIds) {
        if (!tenantIds || tenantIds.length === 0) return [];
        const placeholders = tenantIds.map(() => '?').join(',');
        const [rows] = await db.query(
            `SELECT ta.tenant_id, a.id AS addon_id, a.slug AS addon_slug,
                    a.nombre AS addon_nombre, a.precio AS addon_precio
             FROM tenant_addons ta
             INNER JOIN addons a ON a.id = ta.addon_id
             WHERE ta.tenant_id IN (${placeholders})`,
            tenantIds
        );
        return rows;
    }

    static _mapRow(row) {
        return {
            id: row.id,
            slug: row.slug,
            nombre: row.nombre,
            descripcion: row.descripcion || '',
            precio: parseFloat(row.precio || 0),
            activo: row.activo !== undefined ? Boolean(row.activo) : true
        };
    }
}

module.exports = AddonRepository;
