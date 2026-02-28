/**
 * PlanRepository - Acceso a datos de planes de suscripción
 */

const db = require('../config/database');

class PlanRepository {
    /**
     * Listar todos los planes activos ordenados
     * @returns {Promise<Object[]>}
     */
    static async findAll() {
        const [rows] = await db.query(
            'SELECT id, nombre, slug, descripcion, caracteristicas, orden, activo, precio_pequeno, precio_mediano, precio_grande, created_at, updated_at FROM planes WHERE activo = TRUE ORDER BY orden ASC'
        );
        return rows.map(PlanRepository._mapRow);
    }

    /**
     * Buscar plan por ID
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async findById(id) {
        if (id == null || id === undefined) return null;
        const [rows] = await db.query(
            'SELECT id, nombre, slug, descripcion, caracteristicas, orden, activo, precio_pequeno, precio_mediano, precio_grande, created_at, updated_at FROM planes WHERE id = ?',
            [id]
        );
        const row = rows[0];
        if (!row) return null;
        return PlanRepository._mapRow(row);
    }

    /**
     * Buscar plan por slug
     * @param {string} slug
     * @returns {Promise<Object|null>}
     */
    static async findBySlug(slug) {
        if (!slug) return null;
        const [rows] = await db.query(
            'SELECT id, nombre, slug, descripcion, caracteristicas, orden, activo, precio_pequeno, precio_mediano, precio_grande, created_at, updated_at FROM planes WHERE slug = ?',
            [slug]
        );
        const row = rows[0];
        if (!row) return null;
        return PlanRepository._mapRow(row);
    }

    /**
     * Actualizar los precios de un plan por tamaño de negocio
     * @param {number} id
     * @param {{ precio_pequeno: number, precio_mediano: number, precio_grande: number }} data
     */
    static async updatePrecios(id, data) {
        await db.query(
            'UPDATE planes SET precio_pequeno = ?, precio_mediano = ?, precio_grande = ? WHERE id = ?',
            [
                parseFloat(data.precio_pequeno) || 0,
                parseFloat(data.precio_mediano) || 0,
                parseFloat(data.precio_grande) || 0,
                id
            ]
        );
    }

    static _mapRow(row) {
        let caracteristicas = [];
        if (row.caracteristicas) {
            try {
                caracteristicas = typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || []);
            } catch (_) { }
        }
        return {
            id: row.id,
            nombre: row.nombre,
            slug: row.slug,
            descripcion: row.descripcion || '',
            caracteristicas: Array.isArray(caracteristicas) ? caracteristicas : [],
            orden: row.orden || 0,
            activo: Boolean(row.activo),
            precio_pequeno: parseFloat(row.precio_pequeno || 0),
            precio_mediano: parseFloat(row.precio_mediano || 0),
            precio_grande: parseFloat(row.precio_grande || 0),
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

module.exports = PlanRepository;
