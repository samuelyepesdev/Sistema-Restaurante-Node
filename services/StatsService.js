/**
 * StatsService - Business logic layer for statistics
 * Handles statistics business logic
 * Related to: routes/dashboard.js, repositories/StatsRepository.js
 */

const StatsRepository = require('../repositories/StatsRepository');
const InventarioService = require('./InventarioService');

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

        const now = new Date();
        const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const mesFin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

        const [
            ventasHoy,
            totalSales,
            totalInvoices,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales,
            eventStats,
            ventasPorEvento,
            eventosEnRango,
            eventosCalendario
        ] = await Promise.all([
            StatsRepository.getVentasHoy(tenantId),
            StatsRepository.getTotalSales(tenantId, filters),
            StatsRepository.getTotalInvoices(tenantId, filters),
            StatsRepository.getTopProducts(tenantId, 10, filters),
            StatsRepository.getSalesByCategory(tenantId, filters),
            StatsRepository.getTopProductsByCategory(tenantId, 5, filters),
            StatsRepository.getDailySales(tenantId, 30),
            StatsRepository.getEventStatsForDashboard(tenantId, desde, hasta),
            StatsRepository.getVentasPorEventoEnRango(tenantId, desde, hasta),
            StatsRepository.getEventosEnRango(tenantId, desde, hasta),
            StatsRepository.getEventosEnRango(tenantId, mesInicio, mesFin)
        ]);

        let insumosBajoStock = 0;
        let insumosBajoStockLista = [];
        try {
            const resumen = await InventarioService.getResumenBajoStock(tenantId);
            insumosBajoStock = resumen.cantidad;
            insumosBajoStockLista = resumen.lista || [];
        } catch (e) {
            // Inventario puede no estar disponible en todos los tenants
        }

        return {
            ventasHoyTotal: ventasHoy.total,
            ventasHoyCantidad: ventasHoy.cantidad,
            totalSales,
            totalInvoices,
            topProducts,
            salesByCategory,
            topProductsByCategory,
            dailySales,
            eventos_count: eventStats.eventos_count,
            ventas_eventos_total: eventStats.ventas_eventos_total,
            ventas_eventos_cantidad: eventStats.ventas_eventos_cantidad,
            ventasPorEvento,
            eventosEnRango,
            eventosCalendario,
            insumosBajoStock,
            insumosBajoStockLista
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

