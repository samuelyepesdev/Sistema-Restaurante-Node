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
        return await VentaRepository.getAllWithFilters(filters);
    }

    /**
     * Get sales for Excel export
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales data
     */
    static async getForExport(filters) {
        return await VentaRepository.getForExport(filters);
    }

    /**
     * Get tables with orders ready to pay
     * @returns {Promise<Array>} Array of tables with orders ready to pay
     */
    static async getTablesReadyToPay() {
        return await VentaRepository.getTablesWithOrdersReadyToPay();
    }
}

module.exports = VentaService;

