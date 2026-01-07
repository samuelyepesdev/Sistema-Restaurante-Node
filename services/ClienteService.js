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
    static async getAll() {
        return await ClienteRepository.findAll();
    }

    /**
     * Get client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object>} Client object
     * @throws {Error} If client not found
     */
    static async getById(id) {
        const cliente = await ClienteRepository.findById(id);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }
        return cliente;
    }

    /**
     * Search clients
     * @param {string} query - Search term
     * @returns {Promise<Array>} Array of clients
     */
    static async search(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        return await ClienteRepository.search(query.trim(), 10);
    }

    /**
     * Create a new client
     * @param {Object} clientData - Client data
     * @returns {Promise<Object>} Created client result
     * @throws {Error} If validation fails
     */
    static async create(clientData) {
        const { nombre, direccion, telefono } = clientData;

        if (!nombre || nombre.trim().length === 0) {
            throw new Error('El nombre es requerido');
        }

        const result = await ClienteRepository.create({
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
     * Update client by ID
     * @param {number} id - Client ID
     * @param {Object} clientData - Client data to update
     * @returns {Promise<Object>} Update result
     * @throws {Error} If client not found or validation fails
     */
    static async update(id, clientData) {
        const { nombre, direccion, telefono } = clientData;

        if (!nombre || nombre.trim().length === 0) {
            throw new Error('El nombre es requerido');
        }

        const existingClient = await ClienteRepository.findById(id);
        if (!existingClient) {
            throw new Error('Cliente no encontrado');
        }

        const result = await ClienteRepository.update(id, {
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
     * Delete client by ID
     * @param {number} id - Client ID
     * @returns {Promise<Object>} Delete result
     * @throws {Error} If client not found or has associated invoices
     */
    static async delete(id) {
        const cliente = await ClienteRepository.findById(id);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        try {
            const result = await ClienteRepository.delete(id);
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

