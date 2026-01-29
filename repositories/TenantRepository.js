/**
 * TenantRepository - Data access layer for tenants (multi-tenancy)
 * Handles loading tenant by id/slug and validating active state.
 * Related to: middleware/tenant.js, AuthService
 */

const db = require('../config/database');

class TenantRepository {
    /**
     * Find tenant by ID
     * @param {number} id - Tenant ID
     * @returns {Promise<Object|null>} Tenant object or null
     */
    static async findById(id) {
        if (id == null || id === undefined) return null;
        const [rows] = await db.query(
            'SELECT id, nombre, slug, config, activo, created_at, updated_at FROM tenants WHERE id = ?',
            [id]
        );
        const row = rows[0];
        if (!row) return null;
        return TenantRepository._mapRow(row);
    }

    /**
     * Find tenant by ID only if active
     * @param {number} id - Tenant ID
     * @returns {Promise<Object|null>} Tenant object or null
     */
    static async findByIdAndActive(id) {
        if (id == null || id === undefined) return null;
        const [rows] = await db.query(
            'SELECT id, nombre, slug, config, activo, created_at, updated_at FROM tenants WHERE id = ? AND activo = TRUE',
            [id]
        );
        const row = rows[0];
        if (!row) return null;
        return TenantRepository._mapRow(row);
    }

    /**
     * Find tenant by slug (e.g. 'principal')
     * @param {string} slug - Tenant slug
     * @returns {Promise<Object|null>} Tenant object or null
     */
    static async findBySlug(slug) {
        if (!slug) return null;
        const [rows] = await db.query(
            'SELECT id, nombre, slug, config, activo, created_at, updated_at FROM tenants WHERE slug = ? AND activo = TRUE',
            [slug]
        );
        const row = rows[0];
        if (!row) return null;
        return TenantRepository._mapRow(row);
    }

    /**
     * Get default tenant (slug = 'principal')
     * @returns {Promise<Object|null>} Tenant object or null
     */
    static async getDefault() {
        return TenantRepository.findBySlug('principal');
    }

    static _mapRow(row) {
        let config = null;
        if (row.config) {
            try {
                config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
            } catch (_) {
                config = {};
            }
        }
        return {
            id: row.id,
            nombre: row.nombre,
            slug: row.slug,
            config: config || {},
            activo: Boolean(row.activo),
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

module.exports = TenantRepository;
