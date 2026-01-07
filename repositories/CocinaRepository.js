/**
 * CocinaRepository - Data access layer for kitchen orders
 * Handles all SQL queries related to kitchen queue and order items
 * Related to: routes/cocina.js, services/CocinaService.js
 */

const db = require('../config/database');

class CocinaRepository {
    /**
     * Get kitchen queue (items in 'enviado', 'preparando', 'listo' states)
     * @returns {Promise<Array>} Array of kitchen items
     */
    static async getQueue() {
        const [items] = await db.query(`
            SELECT i.*, p.mesa_id, m.numero AS mesa_numero, pr.nombre AS producto_nombre
            FROM pedido_items i
            JOIN pedidos p ON p.id = i.pedido_id
            JOIN mesas m ON m.id = p.mesa_id
            JOIN productos pr ON pr.id = i.producto_id
            WHERE i.estado IN ('enviado','preparando','listo')
            ORDER BY COALESCE(i.enviado_at, i.created_at) ASC, i.id ASC
        `);
        return items;
    }

    /**
     * Update item state in kitchen
     * @param {number} id - Item ID
     * @param {string} estado - New state ('preparando' or 'listo')
     * @returns {Promise<Object>} Update result
     */
    static async updateItemEstado(id, estado) {
        const timestampField = estado === 'preparando' ? 'preparado_at' : 'listo_at';
        const [result] = await db.query(
            `UPDATE pedido_items SET estado = ?, ${timestampField} = NOW() WHERE id = ? AND estado IN ('enviado','preparando')`,
            [estado, id]
        );
        return result;
    }
}

module.exports = CocinaRepository;

