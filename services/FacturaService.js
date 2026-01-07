/**
 * FacturaService - Business logic layer for invoices
 * Handles invoice business logic and validation
 * Related to: routes/facturas.js, repositories/FacturaRepository.js
 */

const FacturaRepository = require('../repositories/FacturaRepository');

class FacturaService {
    /**
     * Create invoice with details
     * @param {Object} facturaData - Invoice data
     * @returns {Promise<Object>} Created invoice result
     */
    static async create(facturaData) {
        const { cliente_id, total, forma_pago, productos } = facturaData;

        if (!cliente_id || !productos || productos.length === 0) {
            throw new Error('Datos incompletos');
        }

        const result = await FacturaRepository.createWithDetails({
            cliente_id,
            total,
            forma_pago,
            productos
        });

        return { id: result.insertId };
    }

    /**
     * Get invoice by ID for printing (does not include config)
     * @param {number} id - Invoice ID
     * @returns {Promise<Object>} Invoice data with client and details
     * @throws {Error} If invoice not found
     */
    static async getByIdForPrint(id) {
        const factura = await FacturaRepository.findByIdWithClient(id);
        if (!factura) {
            throw new Error('Factura no encontrada');
        }

        const detalles = await FacturaRepository.getDetailsByFacturaId(id);
        if (!detalles || detalles.length === 0) {
            throw new Error('No se encontraron detalles de la factura');
        }

        return { factura, detalles };
    }

    /**
     * Get invoice details for API
     * @param {number} id - Invoice ID
     * @returns {Promise<Object>} Invoice details object
     * @throws {Error} If invoice not found
     */
    static async getDetails(id) {
        const details = await FacturaRepository.getDetailsForAPI(id);
        if (!details) {
            throw new Error('Factura no encontrada');
        }
        return details;
    }
}

module.exports = FacturaService;

