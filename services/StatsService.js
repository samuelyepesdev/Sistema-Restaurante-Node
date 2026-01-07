/**
 * StatsService - Business logic layer for statistics
 * Handles statistics business logic
 * Related to: routes/dashboard.js, repositories/StatsRepository.js
 */

const StatsRepository = require('../repositories/StatsRepository');

class StatsService {
    /**
     * Get dashboard statistics
     * @param {Object} filters - Date filters (optional)
     * @returns {Promise<Object>} Dashboard statistics object
     */
    static async getDashboardStats(filters = {}) {
        const [
            totalSales,
            totalInvoices,
            salesByPaymentMethod,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales
        ] = await Promise.all([
            StatsRepository.getTotalSales(filters),
            StatsRepository.getTotalInvoices(filters),
            StatsRepository.getSalesByPaymentMethod(filters),
            StatsRepository.getTopProducts(10, filters),
            StatsRepository.getSalesByCategory(filters),
            StatsRepository.getTopProductsByCategory(5, filters),
            StatsRepository.getDailySales(30)
        ]);

        return {
            totalSales,
            totalInvoices,
            salesByPaymentMethod,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales
        };
    }

    /**
     * Get statistics with custom date range
     * @param {string} desde - Start date (YYYY-MM-DD)
     * @param {string} hasta - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Dashboard statistics object
     */
    static async getStatsByDateRange(desde, hasta) {
        const filters = { desde, hasta };
        return await StatsService.getDashboardStats(filters);
    }
}

module.exports = StatsService;

