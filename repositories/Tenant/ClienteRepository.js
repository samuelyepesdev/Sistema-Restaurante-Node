/**
 * ClienteRepository - Data access layer for clients
 * Handles all SQL queries related to clients
 * Related to: routes/clientes.js, services/ClienteService.js
 */

const db = require('../../config/database');

class ClienteRepository {
    /**
     * Get all clients
     * @returns {Promise<Array>} Array of clients
     */
    static async findAll(tenantId) {
        const [clientes] = await db.query('SELECT * FROM clientes WHERE tenant_id = ? ORDER BY nombre', [tenantId]);
        return clientes;
    }

    /**
     * Find client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object|null>} Client object or null
     */
    static async findById(id, tenantId) {
        const [clientes] = await db.query('SELECT * FROM clientes WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return clientes[0] || null;
    }

    /**
     * Search clients by name or phone
     * @param {string} query - Search term
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} Array of clients
     */
    static async search(query, tenantId, limit = 10) {
        if (!query) return [];
        const searchTerm = `%${query.trim().toLowerCase()}%`;
        
        const [clientes] = await db.query(`
            SELECT id, nombre, telefono, numero_documento, email, tipo_documento FROM clientes 
            WHERE tenant_id = ? 
            AND (LOWER(nombre) LIKE ? OR telefono LIKE ? OR numero_documento LIKE ? OR LOWER(email) LIKE ?)
            ORDER BY nombre
            LIMIT ?
        `, [tenantId, searchTerm, searchTerm, searchTerm, searchTerm, limit]);
        
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
    static async create(tenantId, clientData) {
        const { nombre, direccion, telefono, tipo_documento, numero_documento, email } = clientData;
        const [result] = await db.query(
            'INSERT INTO clientes (tenant_id, nombre, direccion, telefono, tipo_documento, numero_documento, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tenantId, nombre, direccion || null, telefono || null, tipo_documento || 'CC', numero_documento || null, email || null]
        );
        return result;
    }

    /**
     * Update client by ID
     * @param {number} id - Client ID
     * @param {Object} clientData - Client data to update
     * @returns {Promise<Object>} Update result
     */
    static async update(id, tenantId, clientData) {
        const { nombre, direccion, telefono, tipo_documento, numero_documento, email } = clientData;
        const result = await db.query(
            'UPDATE clientes SET nombre = ?, direccion = ?, telefono = ?, tipo_documento = ?, numero_documento = ?, email = ? WHERE id = ? AND tenant_id = ?',
            [nombre, direccion || null, telefono || null, tipo_documento || 'CC', numero_documento || null, email || null, id, tenantId]
        );
        return result;
    }

    /**
     * Delete client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object>} Delete result
     */
    static async delete(id, tenantId) {
        const result = await db.query('DELETE FROM clientes WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }
}

module.exports = ClienteRepository;

