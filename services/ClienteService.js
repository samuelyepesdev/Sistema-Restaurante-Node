/**
 * ClienteService - Business logic layer for clients
 * Handles client business logic and validation
 * Related to: routes/clientes.js, repositories/ClienteRepository.js
 */

const ClienteRepository = require('../repositories/ClienteRepository');

class ClienteService {
    /**
     * Get all clients
     * @returns {Promise<Array>} Array of clients
     */
    static async getAll(tenantId) {
        return await ClienteRepository.findAll(tenantId);
    }

    /**
     * Get client by ID (within tenant)
     * @param {number} id - Client ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object>} Client object
     * @throws {Error} If client not found
     */
    static async getById(id, tenantId) {
        const cliente = await ClienteRepository.findById(id, tenantId);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }
        return cliente;
    }

    /**
     * Search clients (within tenant)
     * @param {string} query - Search term
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Array>} Array of clients
     */
    static async search(query, tenantId) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        return await ClienteRepository.search(query.trim(), tenantId, 10);
    }

    /**
     * Create a new client (for tenant)
     * @param {number} tenantId - Tenant ID
     * @param {Object} clientData - Client data
     * @returns {Promise<Object>} Created client result
     * @throws {Error} If validation fails
     */
    static async create(tenantId, clientData) {
        const { nombre, direccion, telefono } = clientData;

        if (!nombre || nombre.trim().length === 0) {
            throw new Error('El nombre es requerido');
        }

        const result = await ClienteRepository.create(tenantId, {
            nombre: nombre.trim(),
            direccion: direccion?.trim() || null,
            telefono: telefono?.trim() || null
        });

        return {
            id: result.insertId,
            message: 'Cliente creado exitosamente'
        };
    }

    /**
     * Update client by ID (within tenant)
     * @param {number} id - Client ID
     * @param {number} tenantId - Tenant ID
     * @param {Object} clientData - Client data to update
     * @returns {Promise<Object>} Update result
     * @throws {Error} If client not found or validation fails
     */
    static async update(id, tenantId, clientData) {
        const { nombre, direccion, telefono } = clientData;

        if (!nombre || nombre.trim().length === 0) {
            throw new Error('El nombre es requerido');
        }

        const existingClient = await ClienteRepository.findById(id, tenantId);
        if (!existingClient) {
            throw new Error('Cliente no encontrado');
        }

        const result = await ClienteRepository.update(id, tenantId, {
            nombre: nombre.trim(),
            direccion: direccion?.trim() || null,
            telefono: telefono?.trim() || null
        });

        if (result.affectedRows === 0) {
            throw new Error('No se pudo actualizar el cliente');
        }

        return { message: 'Cliente actualizado exitosamente' };
    }

    /**
     * Delete client by ID (within tenant)
     * @param {number} id - Client ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object>} Delete result
     * @throws {Error} If client not found or has associated invoices
     */
    static async delete(id, tenantId) {
        const cliente = await ClienteRepository.findById(id, tenantId);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        try {
            const result = await ClienteRepository.delete(id, tenantId);
            if (result.affectedRows === 0) {
                throw new Error('No se pudo eliminar el cliente');
            }
            return { message: 'Cliente eliminado exitosamente' };
        } catch (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('No se puede eliminar el cliente porque tiene facturas asociadas');
            }
            throw error;
        }
    }
}

module.exports = ClienteService;

