/**
 * CategoryRepository - Data access layer for categories
 * Handles all SQL queries related to categories
 * Related to: routes/productos.js, services/CategoryService.js
 */

const db = require('../config/database');

class CategoryRepository {
    /**
     * Get all active categories (for tenant)
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Array>} Array of categories
     */
    static async findAllActive(tenantId) {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE tenant_id = ? AND activa = 1 ORDER BY nombre', [tenantId]);
        return categorias;
    }

    /**
     * Find category by ID (and tenant)
     * @param {number} id - Category ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findById(id, tenantId) {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return categorias[0] || null;
    }

    /**
     * Find category by name (case insensitive, within tenant)
     * @param {string} nombre - Category name
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findByName(nombre, tenantId) {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE tenant_id = ? AND LOWER(nombre) = LOWER(?) AND activa = 1', [tenantId, nombre]);
        return categorias[0] || null;
    }

    /**
     * Get category name by ID (for Excel import mapping, within tenant)
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Map>} Map of category names (lowercase) to IDs
     */
    static async getCategoryMap(tenantId) {
        const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE tenant_id = ? AND activa = 1', [tenantId]);
        const map = new Map();
        categorias.forEach(c => {
            map.set(c.nombre.toLowerCase(), c.id);
        });
        return map;
    }

    /**
     * Create a category for a tenant
     * @param {number} tenantId - Tenant ID
     * @param {Object} data - { nombre, descripcion }
     * @returns {Promise<number>} Insert ID
     */
    static async create(tenantId, data) {
        const { nombre, descripcion } = data;
        const [result] = await db.query(
            'INSERT INTO categorias (tenant_id, nombre, descripcion, activa) VALUES (?, ?, ?, 1)',
            [tenantId, nombre || '', descripcion || null]
        );
        return result.insertId;
    }

    /**
     * Count categories for a tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<number>}
     */
    static async countByTenant(tenantId) {
        const [rows] = await db.query('SELECT COUNT(*) AS n FROM categorias WHERE tenant_id = ?', [tenantId]);
        return rows[0]?.n ?? 0;
    }
}

module.exports = CategoryRepository;

