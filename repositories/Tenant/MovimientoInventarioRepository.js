/**
 * MovimientoInventarioRepository - Movimientos de inventario (entrada, salida, ajuste)
 */

const db = require('../../config/database');

class MovimientoInventarioRepository {
    static async create(tenantId, data) {
        const { insumo_id, tipo, cantidad, costo_unitario, referencia, proveedor_id, documento_referencia } = data;
        const [result] = await db.query(
            `INSERT INTO movimientos_inventario (tenant_id, insumo_id, tipo, cantidad, costo_unitario, referencia, proveedor_id, documento_referencia)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, insumo_id, tipo, cantidad,
                costo_unitario != null ? costo_unitario : null,
                referencia || null,
                proveedor_id || null,
                documento_referencia || null
            ]
        );
        return result.insertId;
    }

    static async findByInsumo(insumoId, tenantId, limit = 100) {
        const [rows] = await db.query(
            `SELECT * FROM movimientos_inventario
             WHERE insumo_id = ? AND tenant_id = ?
             ORDER BY created_at DESC LIMIT ?`,
            [insumoId, tenantId, limit]
        );
        return rows;
    }

    static async findByTenant(tenantId, filters = {}) {
        let sql = `
            SELECT m.*, i.nombre AS insumo_nombre, i.codigo AS insumo_codigo, i.unidad_base,
                   p.nombre AS proveedor_nombre
            FROM movimientos_inventario m
            INNER JOIN insumos i ON i.id = m.insumo_id AND i.tenant_id = m.tenant_id
            LEFT JOIN proveedores p ON p.id = m.proveedor_id
            WHERE m.tenant_id = ?
        `;
        const params = [tenantId];
        if (filters.insumo_id) {
            sql += ' AND m.insumo_id = ?';
            params.push(filters.insumo_id);
        }
        if (filters.tipo) {
            sql += ' AND m.tipo = ?';
            params.push(filters.tipo);
        }
        sql += ' ORDER BY m.created_at DESC LIMIT 200';
        const [rows] = await db.query(sql, params);
        return rows;
    }
}

module.exports = MovimientoInventarioRepository;
