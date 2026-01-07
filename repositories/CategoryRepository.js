/**
 * CategoryRepository - Data access layer for categories
 * Handles all SQL queries related to categories
 * Related to: routes/productos.js, services/CategoryService.js
 */

const db = require('../config/database');

class CategoryRepository {
    /**
     * Get all active categories
     * @returns {Promise<Array>} Array of categories
     */
    static async findAllActive() {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre');
        return categorias;
    }

    /**
     * Find category by ID
     * @param {number} id - Category ID
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findById(id) {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
        return categorias[0] || null;
    }

    /**
     * Find category by name (case insensitive)
     * @param {string} nombre - Category name
     * @returns {Promise<Object|null>} Category object or null
     */
    static async findByName(nombre) {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE LOWER(nombre) = LOWER(?) AND activa = 1', [nombre]);
        return categorias[0] || null;
    }

    /**
     * Get category name by ID (for Excel import mapping)
     * @returns {Promise<Map>} Map of category names (lowercase) to IDs
     */
    static async getCategoryMap() {
        const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE activa = 1');
        const map = new Map();
        categorias.forEach(c => {
            map.set(c.nombre.toLowerCase(), c.id);
        });
        return map;
    }
}

module.exports = CategoryRepository;

