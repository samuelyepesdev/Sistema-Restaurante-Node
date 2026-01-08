/**
 * VentaRepository - Data access layer for sales
 * Handles all SQL queries related to sales and invoices
 * Related to: routes/ventas.js, services/VentaService.js
 */

const db = require('../config/database');

class VentaRepository {
    /**
     * Get all sales with filters
     * @param {Object} filters - Filter options
     * @param {string} filters.desde - Start date
     * @param {string} filters.hasta - End date
     * @param {string} filters.q - Search query
     * @returns {Promise<Array>} Array of sales
     */
    static async getAllWithFilters(filters) {
        let query = `
            SELECT f.*, 
                   c.nombre AS cliente_nombre,
                   c.identificacion AS cliente_identificacion
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.desde) {
            query += ` AND DATE(f.fecha) >= ?`;
            params.push(filters.desde);
        }

        if (filters.hasta) {
            query += ` AND DATE(f.fecha) <= ?`;
            params.push(filters.hasta);
        }

        if (filters.q) {
            query += ` AND (f.numero LIKE ? OR c.nombre LIKE ? OR c.identificacion LIKE ?)`;
            const searchTerm = `%${filters.q}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY f.fecha DESC, f.id DESC`;

        const [ventas] = await db.query(query, params);
        return ventas;
    }

    /**
     * Get sales data for Excel export
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of sales with details
     */
    static async getForExport(filters) {
        let query = `
            SELECT 
                f.numero AS factura_numero,
                f.fecha,
                c.nombre AS cliente_nombre,
                c.identificacion AS cliente_identificacion,
                f.forma_pago,
                f.subtotal,
                f.iva,
                f.total
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.desde) {
            query += ` AND DATE(f.fecha) >= ?`;
            params.push(filters.desde);
        }

        if (filters.hasta) {
            query += ` AND DATE(f.fecha) <= ?`;
            params.push(filters.hasta);
        }

        if (filters.q) {
            query += ` AND (f.numero LIKE ? OR c.nombre LIKE ? OR c.identificacion LIKE ?)`;
            const searchTerm = `%${filters.q}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY f.fecha DESC, f.id DESC`;

        const [ventas] = await db.query(query, params);
        return ventas;
    }

    /**
     * Get tables with orders ready to pay (have items in 'listo' or 'servido' state and no pending items)
     * @returns {Promise<Array>} Array of tables with orders ready to pay
     */
    static async getTablesWithOrdersReadyToPay() {
        const [mesas] = await db.query(`
            SELECT 
                m.id AS mesa_id,
                m.numero AS mesa_numero,
                m.estado AS mesa_estado,
                p.id AS pedido_id,
                COALESCE(SUM(pi.subtotal), 0) AS pedido_total,
                COUNT(DISTINCT pi.id) AS total_items,
                COUNT(DISTINCT CASE WHEN pi.estado IN ('listo', 'servido') THEN pi.id END) AS items_listos,
                MAX(pi.updated_at) AS ultima_actualizacion
            FROM mesas m
            INNER JOIN pedidos p ON p.mesa_id = m.id
            INNER JOIN pedido_items pi ON pi.pedido_id = p.id
            WHERE p.estado NOT IN ('cerrado', 'cancelado')
            AND pi.estado NOT IN ('cancelado')
            GROUP BY m.id, m.numero, m.estado, p.id
            HAVING items_listos > 0 
            AND items_listos = total_items
            ORDER BY CAST(m.numero AS UNSIGNED), m.numero ASC
        `);
        return mesas;
    }
}

module.exports = VentaRepository;
