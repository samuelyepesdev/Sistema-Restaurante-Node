const db = require('../../config/database');

class ProveedorFacturaRepository {
    /**
     * Listar facturas de un proveedor (sin el contenido del archivo por rendimiento)
     */
    static async findAllByProveedor(tenantId, proveedorId) {
        const sql = `SELECT id, tenant_id, proveedor_id, numero_factura, fecha_emision, 
                           monto_total, archivo_nombre, archivo_tipo, archivo_size, notas, created_at 
                    FROM proveedor_facturas 
                    WHERE tenant_id = ? AND proveedor_id = ? 
                    ORDER BY created_at DESC`;
        const [rows] = await db.query(sql, [tenantId, proveedorId]);
        return rows;
    }

    /**
     * Obtener una factura específica con su contenido (para descarga/visualización)
     */
    static async findById(id, tenantId) {
        const sql = `SELECT * FROM proveedor_facturas WHERE id = ? AND tenant_id = ?`;
        const [rows] = await db.query(sql, [id, tenantId]);
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const {
            proveedor_id, numero_factura, fecha_emision, monto_total,
            archivo_nombre, archivo_contenido, archivo_tipo, archivo_size, notas
        } = data;

        const sql = `INSERT INTO proveedor_facturas 
                    (tenant_id, proveedor_id, numero_factura, fecha_emision, monto_total, 
                     archivo_nombre, archivo_contenido, archivo_tipo, archivo_size, notas) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            tenantId, proveedor_id, numero_factura || null, fecha_emision || null,
            parseFloat(monto_total) || 0, archivo_nombre, archivo_contenido,
            archivo_tipo, archivo_size, notas || null
        ]);

        return result.insertId;
    }

    static async delete(id, tenantId) {
        const sql = `DELETE FROM proveedor_facturas WHERE id = ? AND tenant_id = ?`;
        const [result] = await db.query(sql, [id, tenantId]);
        return result;
    }
}

module.exports = ProveedorFacturaRepository;
