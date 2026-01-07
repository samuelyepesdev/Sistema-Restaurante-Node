/**
 * ClienteRepository - Data access layer for clients
 * Handles all SQL queries related to clients
 * Related to: routes/clientes.js, services/ClienteService.js
 */

const db = require('../config/database');

class ClienteRepository {
    /**
     * Get all clients
     * @returns {Promise<Array>} Array of clients
     */
    static async findAll() {
        const [clientes] = await db.query('SELECT * FROM clientes ORDER BY nombre');
        return clientes;
    }

    /**
     * Find client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object|null>} Client object or null
     */
    static async findById(id) {
        const [clientes] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
        return clientes[0] || null;
    }

    /**
     * Search clients by name or phone
     * @param {string} query - Search term
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} Array of clients
     */
    static async search(query, limit = 10) {
        const searchTerm = `%${query}%`;
        const [clientes] = await db.query(`
            SELECT * FROM clientes 
            WHERE nombre LIKE ? OR telefono LIKE ?
            ORDER BY nombre
            LIMIT ?
        `, [searchTerm, searchTerm, limit]);
        return clientes;
    }

    /**
     * Create a new client
     * @param {Object} clientData - Client data
     * @param {string} clientData.nombre - Client name
     * @param {string} clientData.direccion - Client address (optional)
     * @param {string} clientData.telefono - Client phone (optional)
     * @returns {Promise<Object>} Created client with insertId
     */
    static async create(clientData) {
        const { nombre, direccion, telefono } = clientData;
        const [result] = await db.query(
            'INSERT INTO clientes (nombre, direccion, telefono) VALUES (?, ?, ?)',
            [nombre, direccion || null, telefono || null]
        );
        return result;
    }

    /**
     * Update client by ID
     * @param {number} id - Client ID
     * @param {Object} clientData - Client data to update
     * @returns {Promise<Object>} Update result
     */
    static async update(id, clientData) {
        const { nombre, direccion, telefono } = clientData;
        const result = await db.query(
            'UPDATE clientes SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
            [nombre, direccion || null, telefono || null, id]
        );
        return result;
    }

    /**
     * Delete client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object>} Delete result
     */
    static async delete(id) {
        const result = await db.query('DELETE FROM clientes WHERE id = ?', [id]);
        return result;
    }
}

module.exports = ClienteRepository;

