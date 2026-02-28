/**
 * FacturaRepository - Data access layer for invoices
 * Handles all SQL queries related to invoices and invoice details
 * Related to: routes/facturas.js, services/FacturaService.js
 */

const db = require('../config/database');
const { toFechaISOUtc } = require('../utils/dateHelpers');

class FacturaRepository {
    /**
     * Si hay facturas sin numerar (numero NULL) o con numeración que no empieza en 1 por tenant
     * (p. ej. migración que puso numero = id), las acomoda a 1, 2, 3... por tenant (orden por id).
     * Usa la misma connection (dentro de transacción).
     * @param {import('mysql2/promise').PoolConnection} connection
     * @param {number} tenantId - Tenant actual (para acomodar solo su secuencia si hace falta)
     */
    static async acomodarNumeracionSiFalta(connection, tenantId) {
        let tieneColumnaNumero = true;
        try {
            const [rows] = await connection.query('SELECT COUNT(*) AS total FROM facturas WHERE numero IS NULL');
            const total = (rows && rows[0] && rows[0].total) || 0;
            if (total > 0) {
                const [tenants] = await connection.query('SELECT DISTINCT tenant_id FROM facturas ORDER BY tenant_id ASC');
                for (const { tenant_id } of tenants) {
                    const [facturas] = await connection.query(
                        'SELECT id FROM facturas WHERE tenant_id <=> ? ORDER BY id ASC',
                        [tenant_id]
                    );
                    let n = 1;
                    for (const f of facturas || []) {
                        await connection.query('UPDATE facturas SET numero = ? WHERE id = ?', [n, f.id]);
                        n++;
                    }
                }
                return;
            }
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('numero'))) return;
            throw err;
        }

        try {
            const [minRows] = await connection.query(
                'SELECT MIN(numero) AS min_num FROM facturas WHERE tenant_id = ?',
                [tenantId]
            );
            const minNum = minRows && minRows[0] && minRows[0].min_num != null ? Number(minRows[0].min_num) : null;
            if (minNum === null || minNum === 1) return;

            const [facturas] = await connection.query(
                'SELECT id FROM facturas WHERE tenant_id = ? ORDER BY id ASC',
                [tenantId]
            );
            let n = 1;
            for (const f of facturas || []) {
                await connection.query('UPDATE facturas SET numero = ? WHERE id = ?', [n, f.id]);
                n++;
            }
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('numero'))) return;
            throw err;
        }
    }

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

            await FacturaRepository.acomodarNumeracionSiFalta(connection, tenantId);

            const evento_id = facturaData.evento_id || null;
            const [rowsNum] = await connection.query(
                'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM facturas WHERE tenant_id = ?',
                [tenantId]
            );
            const numero = (rowsNum && rowsNum[0] && rowsNum[0].siguiente) || 1;

            const [result] = await connection.query(
                'INSERT INTO facturas (tenant_id, numero, cliente_id, total, forma_pago, evento_id) VALUES (?, ?, ?, ?, ?, ?)',
                [tenantId, numero, facturaData.cliente_id, facturaData.total, facturaData.forma_pago, evento_id]
            );

            const factura_id = result.insertId;

            // Insert invoice details (incl. descuento_porcentaje si viene para mostrar en factura impresa)
            const detallesValues = facturaData.productos.map(p => [
                factura_id,
                p.producto_id,
                p.cantidad,
                p.precio,
                p.unidad,
                p.subtotal,
                (p.descuento_porcentaje != null && p.descuento_porcentaje > 0) ? p.descuento_porcentaje : null
            ]);

            await connection.query(
                'INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio_unitario, unidad_medida, subtotal, descuento_porcentaje) VALUES ?',
                [detallesValues]
            );

            await connection.commit();
            connection.release();

            return { insertId: factura_id, numero };
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
            SELECT f.id, f.tenant_id, f.numero, f.cliente_id, f.total, f.forma_pago, f.propina, f.evento_id,
                   DATE_FORMAT(f.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
                   c.nombre AS cliente_nombre, c.direccion, c.telefono
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
            SELECT f.id, f.tenant_id, f.numero, f.cliente_id, f.total, f.forma_pago, f.propina, f.evento_id,
                   DATE_FORMAT(f.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
                   c.nombre AS cliente_nombre, c.direccion, c.telefono
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
                numero: factura.numero != null ? factura.numero : factura.id,
                fecha: factura.fecha,
                fechaISO: toFechaISOUtc(factura.fecha),
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

    /**
     * Delete invoice and its details by id (used by superadmin only).
     * @param {number} facturaId - Invoice ID
     * @returns {Promise<{ deleted: boolean }>}
     */
    static async deleteById(facturaId) {
        const connection = await db.getConnection();
        try {
            await connection.query('DELETE FROM detalle_factura WHERE factura_id = ?', [facturaId]);
            const [result] = await connection.query('DELETE FROM facturas WHERE id = ?', [facturaId]);
            return { deleted: result.affectedRows > 0 };
        } finally {
            connection.release();
        }
    }
}

module.exports = FacturaRepository;

