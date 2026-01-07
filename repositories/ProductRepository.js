/**
 * ProductRepository - Data access layer for products
 * Handles all SQL queries related to products
 * Related to: routes/productos.js, services/ProductService.js
 */

const db = require('../config/database');

class ProductRepository {
    /**
     * Get all products with their categories
     * @returns {Promise<Array>} Array of products
     */
    static async findAll() {
        const [productos] = await db.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            ORDER BY p.nombre
        `);
        return productos;
    }

    /**
     * Find product by ID with category
     * @param {number} id - Product ID
     * @returns {Promise<Object|null>} Product object or null
     */
    static async findById(id) {
        const [productos] = await db.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.id = ?
        `, [id]);
        return productos[0] || null;
    }

    /**
     * Search products by name or code
     * @param {string} query - Search term
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} Array of products
     */
    static async search(query, limit = 10) {
        const searchTerm = `%${query}%`;
        const [productos] = await db.query(`
            SELECT * FROM productos 
            WHERE nombre LIKE ? OR codigo LIKE ?
            ORDER BY nombre
            LIMIT ?
        `, [searchTerm, searchTerm, limit]);
        return productos;
    }

    /**
     * Create a new product
     * @param {Object} productData - Product data
     * @param {string} productData.codigo - Product code
     * @param {string} productData.nombre - Product name
     * @param {number} productData.precio_unidad - Unit price
     * @param {number} productData.categoria_id - Category ID
     * @returns {Promise<Object>} Created product with insertId
     */
    static async create(productData) {
        const { codigo, nombre, precio_unidad, categoria_id } = productData;
        const result = await db.query(
            'INSERT INTO productos (codigo, nombre, precio_unidad, categoria_id) VALUES (?, ?, ?, ?)',
            [codigo, nombre, precio_unidad || 0, categoria_id || 1]
        );
        return result;
    }

    /**
     * Update product by ID
     * @param {number} id - Product ID
     * @param {Object} productData - Product data to update
     * @returns {Promise<Object>} Update result
     */
    static async update(id, productData) {
        const { codigo, nombre, precio_unidad, categoria_id } = productData;
        const result = await db.query(
            'UPDATE productos SET codigo = ?, nombre = ?, precio_unidad = ?, categoria_id = ? WHERE id = ?',
            [codigo, nombre, precio_unidad || 0, categoria_id || 1, id]
        );
        return result;
    }

    /**
     * Delete product by ID
     * @param {number} id - Product ID
     * @returns {Promise<Object>} Delete result
     */
    static async delete(id) {
        const result = await db.query('DELETE FROM productos WHERE id = ?', [id]);
        return result;
    }

    /**
     * Bulk insert/update products (for Excel import)
     * @param {Array<Object>} products - Array of product objects
     * @returns {Promise<void>}
     */
    static async bulkUpsert(products) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const p of products) {
                await connection.query(
                    'INSERT INTO productos (codigo, nombre, categoria_id, precio_unidad) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), categoria_id=VALUES(categoria_id), precio_unidad=VALUES(precio_unidad)',
                    [p.codigo, p.nombre, p.categoria_id, p.precio_unidad]
                );
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ProductRepository;

