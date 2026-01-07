/**
 * VentaRepository - Data access layer for sales
 * Handles all SQL queries related to sales/invoices for reporting
 * Related to: routes/ventas.js, services/VentaService.js
 */

const db = require('../config/database');

class VentaRepository {
    /**
     * Find sales with filters (date range and search)
     * @param {Object} filters - Filter options
     * @param {string} filters.desde - Start date (optional)
     * @param {string} filters.hasta - End date (optional)
     * @param {string} filters.q - Search term (optional)
     * @returns {Promise<Array>} Array of sales/invoices
     */
    static async findWithFilters(filters) {
        let query = `
            SELECT f.*, c.nombre as cliente_nombre
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.desde && filters.hasta) {
            query += ` AND DATE(f.fecha) BETWEEN ? AND ?`;
            params.push(filters.desde, filters.hasta);
        }

        if (filters.q) {
            query += ` AND (c.nombre LIKE ? OR f.id LIKE ?)`;
            const term = `%${filters.q}%`;
            params.push(term, term);
        }

        query += ` ORDER BY f.fecha DESC`;

        const [ventas] = await db.query(query, params);
        return ventas;
    }

    /**
     * Find sales for Excel export
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales data
     */
    static async findForExport(filters) {
        let query = `
            SELECT f.id, f.fecha, c.nombre as cliente, f.forma_pago, f.total
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.desde && filters.hasta) {
            query += ` AND DATE(f.fecha) BETWEEN ? AND ?`;
            params.push(filters.desde, filters.hasta);
        }

        if (filters.q) {
            query += ` AND (c.nombre LIKE ? OR f.id LIKE ?)`;
            const term = `%${filters.q}%`;
            params.push(term, term);
        }

        query += ` ORDER BY f.fecha DESC`;

        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = VentaRepository;

