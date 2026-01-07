/**
 * VentaService - Business logic layer for sales
 * Handles sales reporting business logic
 * Related to: routes/ventas.js, repositories/VentaRepository.js
 */

const VentaRepository = require('../repositories/VentaRepository');

class VentaService {
    /**
     * Get sales with filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales
     */
    static async getWithFilters(filters) {
        return await VentaRepository.findWithFilters(filters);
    }

    /**
     * Get sales for Excel export
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales data
     */
    static async getForExport(filters) {
        return await VentaRepository.findForExport(filters);
    }
}

module.exports = VentaService;

