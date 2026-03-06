/**
 * VentaService - Business logic layer for sales
 * Handles sales reporting business logic
 * Related to: routes/ventas.js, repositories/VentaRepository.js
 */

const VentaRepository = require('../../repositories/Tenant/VentaRepository');

class VentaService {
    /**
     * Get sales with filters (scoped by tenant)
     * @param {number} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales
     */
    static async getWithFilters(tenantId, filters) {
        return await VentaRepository.getAllWithFilters(tenantId, filters);
    }

    /**
     * Get sales for Excel export (scoped by tenant)
     * @param {number} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales data
     */
    static async getForExport(tenantId, filters) {
        return await VentaRepository.getForExport(tenantId, filters);
    }

    /**
     * Get tables with orders ready to pay (scoped by tenant)
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Array>} Array of tables with orders ready to pay
     */
    static async getTablesReadyToPay(tenantId) {
        return await VentaRepository.getTablesWithOrdersReadyToPay(tenantId);
    }
}

module.exports = VentaService;

