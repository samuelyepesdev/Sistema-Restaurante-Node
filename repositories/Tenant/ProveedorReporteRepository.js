const db = require('../../config/database');

class ProveedorReporteRepository {
    /**
     * Obtiene el historial de compras/insumos de un proveedor con sus costos unitarios
     */
    static async getHistorialCostos(tenantId, proveedorId) {
        const sql = `
            SELECT 
                mi.created_at as fecha,
                i.nombre as insumo,
                mi.cantidad,
                mi.costo_unitario,
                (mi.cantidad * mi.costo_unitario) as subtotal,
                mi.documento_referencia
            FROM movimientos_inventario mi
            JOIN insumos i ON mi.insumo_id = i.id
            WHERE mi.tenant_id = ? AND mi.proveedor_id = ? AND mi.tipo = 'entrada'
            ORDER BY mi.created_at DESC
            LIMIT 50
        `;
        const [rows] = await db.query(sql, [tenantId, proveedorId]);
        return rows;
    }

    /**
     * Obtiene un resumen de gasto total por mes para un proveedor
     */
    static async getGastoMensual(tenantId, proveedorId) {
        const sql = `
            SELECT 
                DATE_FORMAT(mi.created_at, '%Y-%m') as mes,
                SUM(mi.cantidad * mi.costo_unitario) as total
            FROM movimientos_inventario mi
            WHERE mi.tenant_id = ? AND mi.proveedor_id = ? AND mi.tipo = 'entrada'
            GROUP BY mes
            ORDER BY mes DESC
            LIMIT 12
        `;
        const [rows] = await db.query(sql, [tenantId, proveedorId]);
        return rows;
    }
}

module.exports = ProveedorReporteRepository;
