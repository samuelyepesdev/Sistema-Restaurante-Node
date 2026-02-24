/**
 * StatsService - Business logic layer for statistics
 * Handles statistics business logic
 * Related to: routes/dashboard.js, repositories/StatsRepository.js
 */

const StatsRepository = require('../repositories/StatsRepository');

class StatsService {
    /**
     * Get dashboard statistics (scoped by tenant)
     * @param {number} tenantId - Tenant ID (multi-tenancy)
     * @param {Object} filters - Date filters (optional)
     * @returns {Promise<Object>} Dashboard statistics object
     */
    static async getDashboardStats(tenantId, filters = {}) {
        const desde = filters.desde || new Date().toISOString().slice(0, 8) + '01';
        const hasta = filters.hasta || new Date().toISOString().slice(0, 10);

        const [
            totalSales,
            totalInvoices,
            salesByPaymentMethod,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales,
            eventStats
        ] = await Promise.all([
            StatsRepository.getTotalSales(tenantId, filters),
            StatsRepository.getTotalInvoices(tenantId, filters),
            StatsRepository.getSalesByPaymentMethod(tenantId, filters),
            StatsRepository.getTopProducts(tenantId, 10, filters),
            StatsRepository.getSalesByCategory(tenantId, filters),
            StatsRepository.getTopProductsByCategory(tenantId, 5, filters),
            StatsRepository.getDailySales(tenantId, 30),
            StatsRepository.getEventStatsForDashboard(tenantId, desde, hasta)
        ]);

        return {
            totalSales,
            totalInvoices,
            salesByPaymentMethod,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales,
            eventos_count: eventStats.eventos_count,
            ventas_eventos_total: eventStats.ventas_eventos_total
        };
    }

    /**
     * Get statistics with custom date range
     * @param {number} tenantId - Tenant ID
     * @param {string} desde - Start date (YYYY-MM-DD)
     * @param {string} hasta - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Dashboard statistics object
     */
    static async getStatsByDateRange(tenantId, desde, hasta) {
        const filters = { desde, hasta };
        return await StatsService.getDashboardStats(tenantId, filters);
    }
}

module.exports = StatsService;

