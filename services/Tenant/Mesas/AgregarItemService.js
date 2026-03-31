const db = require('../../../config/database');
const InventarioService = require('../InventarioService');

class AgregarItemService {
    static async execute({ tenantId, pedidoId, producto_id, cantidad, unidad, precio, nota }) {
        if (!producto_id || !cantidad || !precio) {
            throw new Error('producto_id, cantidad y precio son requeridos');
        }

        const [pedidos] = await db.query('SELECT id, mesa_id FROM pedidos WHERE id = ? AND tenant_id = ?', [pedidoId, tenantId]);
        if (pedidos.length === 0) throw new Error('Pedido no encontrado');
        const pedidoRow = pedidos[0];

        const check = await InventarioService.checkStockParaProducto(tenantId, producto_id, parseFloat(cantidad) || 1);
        if (!check.ok) {
            const msg = (check.faltantes || []).map(f => `${f.insumo_nombre}: requiere ${f.requerido} ${f.unidad_base}, disponible ${f.disponible}`).join('; ');
            console.warn('[Inventario] Vendiendo sin stock suficiente: ' + msg);
        }

        const subtotal = Number(cantidad) * Number(precio);
        const mesaId = pedidoRow.mesa_id;

        const [result] = await db.query(
            `INSERT INTO pedido_items (tenant_id, pedido_id, producto_id, cantidad, unidad_medida, precio_unitario, subtotal, estado, nota)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)` ,
            [tenantId, pedidoId, producto_id, cantidad, unidad || 'UND', precio, subtotal, nota || null]
        );

        if (mesaId) await db.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ? AND tenant_id = ?", [mesaId, tenantId]);

        return { id: result.insertId };
    }
}

module.exports = AgregarItemService;
