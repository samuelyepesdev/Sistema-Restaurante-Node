/**
 * FacturaRepository - Data access layer for invoices
 * Handles all SQL queries related to invoices and invoice details
 * Related to: routes/facturas.js, services/FacturaService.js
 */

const db = require('../config/database');

class FacturaRepository {
    /**
     * Create invoice with details (transactional)
     * @param {Object} facturaData - Invoice data
     * @param {number} facturaData.cliente_id - Client ID
     * @param {number} facturaData.total - Total amount
     * @param {string} facturaData.forma_pago - Payment method
     * @param {Array<Object>} facturaData.productos - Array of products
     * @returns {Promise<Object>} Created invoice with insertId
     */
    static async createWithDetails(tenantId, facturaData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                'INSERT INTO facturas (tenant_id, cliente_id, total, forma_pago) VALUES (?, ?, ?, ?)',
                [tenantId, facturaData.cliente_id, facturaData.total, facturaData.forma_pago]
            );

            const factura_id = result.insertId;

            // Insert invoice details
            const detallesValues = facturaData.productos.map(p => [
                factura_id,
                p.producto_id,
                p.cantidad,
                p.precio,
                p.unidad,
                p.subtotal
            ]);

            await connection.query(
                'INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio_unitario, unidad_medida, subtotal) VALUES ?',
                [detallesValues]
            );

            await connection.commit();
            connection.release();

            return { insertId: factura_id };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Find invoice by ID with client data
     * @param {number} id - Invoice ID
     * @returns {Promise<Object|null>} Invoice object or null
     */
    static async findByIdWithClient(id, tenantId) {
        const [facturas] = await db.query(`
            SELECT f.*, c.nombre as cliente_nombre, c.direccion, c.telefono
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.id = ? AND f.tenant_id = ?
        `, [id, tenantId]);
        return facturas[0] || null;
    }

    /**
     * Get invoice details by invoice ID
     * @param {number} facturaId - Invoice ID
     * @returns {Promise<Array>} Array of invoice details
     */
    static async getDetailsByFacturaId(facturaId) {
        const [detalles] = await db.query(`
            SELECT d.*, p.nombre as producto_nombre
            FROM detalle_factura d
            JOIN productos p ON d.producto_id = p.id
            WHERE d.factura_id = ?
        `, [facturaId]);
        return detalles;
    }

    /**
     * Get invoice details for API response
     * @param {number} id - Invoice ID
     * @returns {Promise<Object>} Invoice details object
     */
    static async getDetailsForAPI(id, tenantId) {
        const [facturas] = await db.query(`
            SELECT f.*, c.nombre as cliente_nombre, c.direccion, c.telefono 
            FROM facturas f 
            JOIN clientes c ON f.cliente_id = c.id 
            WHERE f.id = ? AND f.tenant_id = ?
        `, [id, tenantId]);

        if (facturas.length === 0) {
            return null;
        }

        const factura = facturas[0];
        const [productos] = await db.query(`
            SELECT d.cantidad, d.precio_unitario, d.unidad_medida, d.subtotal, p.nombre 
            FROM detalle_factura d 
            JOIN productos p ON d.producto_id = p.id 
            WHERE d.factura_id = ?
        `, [id]);

        return {
            factura: {
                id: factura.id,
                fecha: factura.fecha,
                total: parseFloat(factura.total || 0),
                forma_pago: factura.forma_pago
            },
            cliente: {
                nombre: factura.cliente_nombre || '',
                direccion: factura.direccion || '',
                telefono: factura.telefono || ''
            },
            productos: productos.map(p => ({
                nombre: p.nombre || '',
                cantidad: parseFloat(p.cantidad || 0),
                unidad: p.unidad_medida || '',
                precio: parseFloat(p.precio_unitario || 0),
                subtotal: parseFloat(p.subtotal || 0)
            }))
        };
    }
}

module.exports = FacturaRepository;

