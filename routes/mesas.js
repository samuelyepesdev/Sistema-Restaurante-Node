const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requirePermission } = require('../middleware/auth');

// Rutas para gestión de mesas y pedidos de restaurante
// - Renderiza la vista de mesas (GET /mesas)
// - Expone endpoints para abrir pedidos por mesa, agregar items y enviarlos a cocina
// - Se monta en server.js tanto en '/mesas' como en '/api/mesas'

// GET /mesas - Página de gestión de mesas (solo mesas del tenant)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });

        const [mesas] = await db.query(`
            SELECT m.*, (
                SELECT COUNT(*) FROM pedidos p 
                WHERE p.mesa_id = m.id AND p.estado NOT IN ('cerrado','cancelado')
            ) AS pedidos_abiertos
            FROM mesas m
            WHERE m.tenant_id = ?
            ORDER BY CAST(m.numero AS UNSIGNED), m.numero
        `, [tenantId]);

        res.render('mesas', { 
            mesas: mesas || [],
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al cargar mesas:', error);
        res.status(500).render('error', { 
            error: { message: 'Error al cargar mesas', stack: error.stack }
        });
    }
});

// GET /mesas/listar - API: lista de mesas del tenant con estado actual
router.get('/listar', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const [mesas] = await db.query(`
            SELECT m.*, (
                SELECT COUNT(*) FROM pedidos p 
                WHERE p.mesa_id = m.id AND p.estado NOT IN ('cerrado','cancelado')
            ) AS pedidos_abiertos
            FROM mesas m
            WHERE m.tenant_id = ?
            ORDER BY CAST(m.numero AS UNSIGNED), m.numero
        `, [tenantId]);
        res.json(mesas);
    } catch (error) {
        console.error('Error al listar mesas:', error);
        res.status(500).json({ error: 'Error al listar mesas' });
    }
});

// POST /mesas/crear - API: crear mesa individual (del tenant)
router.post('/crear', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const { numero, descripcion } = req.body || {};
        if (!numero) return res.status(400).json({ error: 'El número de mesa es requerido' });
        if (!descripcion || !String(descripcion).trim()) return res.status(400).json({ error: 'La descripción es requerida (ej: Terraza, Interior)' });
        const [result] = await db.query(
            'INSERT INTO mesas (tenant_id, numero, descripcion, estado) VALUES (?, ?, ?, ?)',
            [tenantId, String(numero), String(descripcion).trim(), 'libre']
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error al crear mesa:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe una mesa con ese número' });
        }
        res.status(500).json({ error: 'Error al crear mesa' });
    }
});

// PUT /mesas/:mesaId - API: actualizar mesa (numero, descripcion) del tenant (requiere mesas.editar)
router.put('/:mesaId', requirePermission('mesas.editar'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const mesaId = req.params.mesaId;
        const { numero, descripcion } = req.body || {};
        const [rows] = await db.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesaId, tenantId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Mesa no encontrada' });
        if (numero != null && String(numero).trim() === '') return res.status(400).json({ error: 'El número de mesa es requerido' });
        if (descripcion != null && String(descripcion).trim() === '') return res.status(400).json({ error: 'La descripción es requerida' });
        const updates = [];
        const values = [];
        if (numero !== undefined) { updates.push('numero = ?'); values.push(String(numero).trim()); }
        if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(String(descripcion).trim()); }
        if (updates.length === 0) return res.status(400).json({ error: 'Indique numero o descripcion a actualizar' });
        values.push(mesaId, tenantId);
        await db.query(`UPDATE mesas SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
        res.json({ message: 'Mesa actualizada' });
    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe una mesa con ese número' });
        res.status(500).json({ error: 'Error al actualizar mesa' });
    }
});

// POST /mesas/crear-masivas - API: crear múltiples mesas del tenant
router.post('/crear-masivas', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const { cantidad, prefijo } = req.body || {};
        
        if (!cantidad || cantidad < 1 || cantidad > 100) {
            return res.status(400).json({ error: 'La cantidad debe estar entre 1 y 100' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Solo mesas de este tenant para evitar duplicados dentro del mismo local
            const [existing] = await connection.query('SELECT numero FROM mesas WHERE tenant_id = ?', [tenantId]);
            const existingNumbers = new Set(existing.map(m => m.numero));

            const created = [];
            const errors = [];
            
            // Find starting number if no prefix
            let startNumber = 1;
            if (!prefijo) {
                // Find the highest numeric mesa number
                const numericMesas = existing
                    .map(m => {
                        const num = parseInt(m.numero);
                        return isNaN(num) ? 0 : num;
                    })
                    .filter(n => n > 0);
                
                if (numericMesas.length > 0) {
                    startNumber = Math.max(...numericMesas) + 1;
                }
            } else {
                // With prefix, find highest number with this prefix
                const prefixPattern = new RegExp(`^${prefijo}(\\d+)$`);
                const prefixedMesas = existing
                    .map(m => {
                        const match = m.numero.match(prefixPattern);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .filter(n => n > 0);
                
                if (prefixedMesas.length > 0) {
                    startNumber = Math.max(...prefixedMesas) + 1;
                }
            }

            // Create mesas starting from startNumber
            for (let i = 0; i < cantidad; i++) {
                const numeroMesa = prefijo ? `${prefijo}${startNumber + i}` : String(startNumber + i);
                
                // Double check if already exists (shouldn't happen, but safety check)
                if (existingNumbers.has(numeroMesa)) {
                    errors.push(`Mesa ${numeroMesa} ya existe`);
                    continue;
                }

                try {
                    const [result] = await connection.query(
                        'INSERT INTO mesas (tenant_id, numero, descripcion, estado) VALUES (?, ?, ?, ?)',
                        [tenantId, numeroMesa, null, 'libre']
                    );
                    created.push({ id: result.insertId, numero: numeroMesa });
                    existingNumbers.add(numeroMesa); // Add to set to avoid duplicates in same batch
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        errors.push(`Mesa ${numeroMesa} ya existe`);
                    } else {
                        throw error;
                    }
                }
            }

            await connection.commit();
            connection.release();

            res.status(201).json({
                success: true,
                creadas: created.length,
                errores: errors.length,
                mesas: created,
                mensajes: errors,
                desde: prefijo ? `${prefijo}${startNumber}` : startNumber
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error al crear mesas masivas:', error);
        res.status(500).json({ error: 'Error al crear mesas' });
    }
});

// POST /mesas/abrir - API: abre (o recupera) pedido abierto para una mesa del tenant
router.post('/abrir', async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

    const { mesa_id, cliente_id, notas } = req.body || {};
    if (!mesa_id) return res.status(400).json({ error: 'mesa_id requerido' });
    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // Verificar que la mesa pertenece al tenant
            const [mesas] = await connection.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesa_id, tenantId]);
            if (mesas.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Mesa no encontrada' });
            }

            const [existentes] = await connection.query(
                `SELECT * FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado') LIMIT 1`,
                [mesa_id]
            );
            if (existentes.length > 0) {
                await connection.commit();
                connection.release();
                return res.json({ pedido: existentes[0] });
            }

            const [insert] = await connection.query(
                `INSERT INTO pedidos (tenant_id, mesa_id, cliente_id, estado, total, notas) VALUES (?, ?, ?, 'abierto', 0, ?)` ,
                [tenantId, mesa_id, cliente_id || null, notas || null]
            );

            // No marcar mesa como ocupada al solo abrir/ver pedido; se marcará al agregar el primer ítem
            await connection.commit();
            connection.release();
            res.status(201).json({ pedido: { id: insert.insertId, mesa_id, cliente_id: cliente_id || null, estado: 'abierto', total: 0, notas: notas || null } });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error al abrir pedido:', error);
        res.status(500).json({ error: 'Error al abrir pedido' });
    }
});

// GET /mesas/pedidos/:pedidoId - API: obtener pedido con items (solo si pertenece al tenant)
router.get('/pedidos/:pedidoId', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const pedidoId = req.params.pedidoId;
        const [pedidos] = await db.query('SELECT * FROM pedidos WHERE id = ? AND tenant_id = ?', [pedidoId, tenantId]);
        if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        const pedido = pedidos[0];
        const [items] = await db.query(`
            SELECT i.*, p.nombre AS producto_nombre 
            FROM pedido_items i
            JOIN productos p ON p.id = i.producto_id
            WHERE i.pedido_id = ?
            ORDER BY i.created_at ASC
        `, [pedidoId]);
        res.json({ pedido, items });
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ error: 'Error al obtener pedido' });
    }
});

// Helper: verificar que un item de pedido pertenece al tenant
async function itemPerteneceAlTenant(itemId, tenantId) {
    const [rows] = await db.query(
        'SELECT pi.id FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ?',
        [itemId, tenantId]
    );
    return rows.length > 0;
}

// PUT /api/mesas/items/:itemId/cantidad - actualizar cantidad (item del tenant)
const updateItemCantidad = async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const itemId = req.params.itemId;
        const { cantidad } = req.body || {};
        const cant = parseFloat(cantidad);
        if (cant == null || isNaN(cant) || cant < 0.01) {
            return res.status(400).json({ error: 'cantidad inválida (mínimo 0.01)' });
        }
        const pertenece = await itemPerteneceAlTenant(itemId, tenantId);
        if (!pertenece) return res.status(404).json({ error: 'Item no encontrado' });

        const [rows] = await db.query(
            'SELECT precio_unitario FROM pedido_items WHERE id = ?',
            [itemId]
        );
        const precio = Number(rows[0].precio_unitario);
        const subtotal = (cant * precio).toFixed(2);
        await db.query(
            'UPDATE pedido_items SET cantidad = ?, subtotal = ? WHERE id = ?',
            [cant, subtotal, itemId]
        );
        res.json({ message: 'Cantidad actualizada', subtotal: parseFloat(subtotal) });
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        res.status(500).json({ error: 'Error al actualizar cantidad' });
    }
};
router.put('/items/:itemId/cantidad', updateItemCantidad);
router.patch('/items/:itemId/cantidad', updateItemCantidad);

// POST /mesas/pedidos/:pedidoId/items - API: agregar item al pedido (pedido del tenant)
router.post('/pedidos/:pedidoId/items', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const pedidoId = req.params.pedidoId;
        const [pedidos] = await db.query('SELECT id FROM pedidos WHERE id = ? AND tenant_id = ?', [pedidoId, tenantId]);
        if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

        const { producto_id, cantidad, unidad, precio, nota } = req.body || {};
        if (!producto_id || !cantidad || !precio) {
            return res.status(400).json({ error: 'producto_id, cantidad y precio son requeridos' });
        }
        const InventarioService = require('../services/InventarioService');
        const check = await InventarioService.checkStockParaProducto(tenantId, producto_id, parseFloat(cantidad) || 1);
        if (!check.ok) {
            const msg = (check.faltantes || []).map(f => `${f.insumo_nombre}: requiere ${f.requerido} ${f.unidad_base}, disponible ${f.disponible}`).join('; ');
            return res.status(400).json({ error: 'No hay stock suficiente para este producto. ' + msg });
        }
        const subtotal = Number(cantidad) * Number(precio);
        const [pedidoRow] = await db.query('SELECT mesa_id FROM pedidos WHERE id = ? AND tenant_id = ?', [pedidoId, tenantId]);
        const mesaId = pedidoRow && pedidoRow[0] && pedidoRow[0].mesa_id;
        const [result] = await db.query(
            `INSERT INTO pedido_items (tenant_id, pedido_id, producto_id, cantidad, unidad_medida, precio_unitario, subtotal, estado, nota)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)` ,
            [tenantId, pedidoId, producto_id, cantidad, unidad || 'UND', precio, subtotal, nota || null]
        );
        if (mesaId) await db.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ? AND tenant_id = ?", [mesaId, tenantId]);
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error al agregar item:', error);
        res.status(500).json({ error: 'Error al agregar item' });
    }
});

// DELETE /mesas/items/:itemId - API: eliminar item del pedido (solo si pertenece al tenant)
router.delete('/items/:itemId', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const itemId = req.params.itemId;
        const pertenece = await itemPerteneceAlTenant(itemId, tenantId);
        if (!pertenece) return res.status(404).json({ error: 'Item no encontrado' });
        const [result] = await db.query('DELETE FROM pedido_items WHERE id = ?', [itemId]);
        res.json({ message: 'Item eliminado' });
    } catch (error) {
        console.error('Error al eliminar item:', error);
        res.status(500).json({ error: 'Error al eliminar item' });
    }
});

// PUT /mesas/items/:itemId/enviar - API: enviar item a cocina (item del tenant)
router.put('/items/:itemId/enviar', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const itemId = req.params.itemId;
        const pertenece = await itemPerteneceAlTenant(itemId, tenantId);
        if (!pertenece) return res.status(404).json({ error: 'Item no encontrado' });
        await db.query(
            `UPDATE pedido_items SET estado = 'enviado', enviado_at = NOW() WHERE id = ?`,
            [itemId]
        );
        res.json({ message: 'Item enviado a cocina' });
    } catch (error) {
        console.error('Error al enviar item:', error);
        res.status(500).json({ error: 'Error al enviar item' });
    }
});

// PUT /mesas/items/:itemId/estado - API: actualizar estado de item (solo si pertenece al tenant)
router.put('/items/:itemId/estado', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const itemId = req.params.itemId;
        const pertenece = await itemPerteneceAlTenant(itemId, tenantId);
        if (!pertenece) return res.status(404).json({ error: 'Item no encontrado' });

        const { estado } = req.body || {};
        const permitidos = ['pendiente','enviado','preparando','listo','servido','cancelado'];
        if (!permitidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

        let timestampField = null;
        if (estado === 'preparando') timestampField = 'preparado_at';
        if (estado === 'listo') timestampField = 'listo_at';
        if (estado === 'servido') timestampField = 'servido_at';

        if (timestampField) {
            await db.query(
                `UPDATE pedido_items SET estado = ?, ${timestampField} = NOW() WHERE id = ?`,
                [estado, itemId]
            );
        } else {
            await db.query(
                `UPDATE pedido_items SET estado = ? WHERE id = ?`,
                [estado, itemId]
            );
        }

        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error al actualizar estado de item:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// POST /mesas/pedidos/:pedidoId/facturar - API: genera factura desde pedido (pedido del tenant)
// Acepta opcional descuentos: { itemId: percent } — solo para esta factura; no modifica precio del producto en catálogo
router.post('/pedidos/:pedidoId/facturar', async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

    const pedidoId = req.params.pedidoId;
    const { cliente_id, forma_pago, descuentos } = req.body || {};
    if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido para facturar' });
    if (!forma_pago) return res.status(400).json({ error: 'forma_pago requerido' });
    const descuentosMap = descuentos && typeof descuentos === 'object' ? descuentos : {};
    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedidos] = await connection.query('SELECT * FROM pedidos WHERE id = ? AND tenant_id = ? FOR UPDATE', [pedidoId, tenantId]);
            if (pedidos.length === 0) throw new Error('Pedido no encontrado');
            const pedido = pedidos[0];

            const [items] = await connection.query(
                `SELECT * FROM pedido_items WHERE pedido_id = ? AND estado <> 'cancelado'`,
                [pedidoId]
            );
            if (items.length === 0) throw new Error('Pedido sin items');

            let total = 0;
            const lineasFactura = items.map(i => {
                const cant = Number(i.cantidad || 0);
                const precioUnit = Number(i.precio_unitario || 0);
                const pct = descuentosMap[String(i.id)] != null ? Number(descuentosMap[String(i.id)]) : 0;
                const desc = Math.min(100, Math.max(0, pct)) / 100;
                const subtotal = Math.round(cant * precioUnit * (1 - desc) * 100) / 100;
                const precioUnitFactura = desc > 0 ? Math.round(precioUnit * (1 - desc) * 100) / 100 : precioUnit;
                total += subtotal;
                return { producto_id: i.producto_id, cantidad: cant, precio_unitario: precioUnitFactura, unidad_medida: i.unidad_medida || 'UND', subtotal, descuento_porcentaje: desc > 0 ? pct : null };
            });
            total = Math.round(total * 100) / 100;

            const [facturaInsert] = await connection.query(
                `INSERT INTO facturas (tenant_id, cliente_id, total, forma_pago) VALUES (?, ?, ?, ?)`,
                [tenantId, cliente_id, total, forma_pago]
            );
            const facturaId = facturaInsert.insertId;

            const detallesValuesFinal = lineasFactura.map(l => [facturaId, l.producto_id, l.cantidad, l.precio_unitario, l.unidad_medida, l.subtotal, l.descuento_porcentaje]);
            await connection.query(
                `INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio_unitario, unidad_medida, subtotal, descuento_porcentaje) VALUES ?`,
                [detallesValuesFinal]
            );

            const InventarioService = require('../services/InventarioService');
            for (const l of lineasFactura) {
                try {
                    await InventarioService.descontarPorReceta(tenantId, l.producto_id, l.cantidad, 'factura_' + facturaId);
                } catch (invErr) {
                    console.error('Error al descontar inventario por receta:', invErr);
                }
            }

            await connection.query(`UPDATE pedidos SET estado = 'cerrado', total = ? WHERE id = ?`, [total, pedidoId]);
            await connection.query(`UPDATE mesas SET estado = 'libre' WHERE id = ?`, [pedido.mesa_id]);

            await connection.commit();
            connection.release();
            res.status(201).json({ factura_id: facturaId });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error en facturación desde pedido:', error);
            res.status(500).json({ error: 'Error al facturar pedido' });
        }
    } catch (error) {
        console.error('Error al preparar facturación:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /mesas/pedidos/:pedidoId/mover - Mover pedido a otra mesa del mismo tenant
router.put('/pedidos/:pedidoId/mover', async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

    const pedidoId = req.params.pedidoId;
    const { mesa_destino_id } = req.body || {};
    if (!mesa_destino_id) return res.status(400).json({ error: 'mesa_destino_id requerido' });
    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedidos] = await connection.query('SELECT * FROM pedidos WHERE id = ? AND tenant_id = ? FOR UPDATE', [pedidoId, tenantId]);
            if (pedidos.length === 0) throw new Error('Pedido no encontrado');
            const pedido = pedidos[0];

            // Mesa destino debe ser del mismo tenant
            const [mesaDest] = await connection.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesa_destino_id, tenantId]);
            if (mesaDest.length === 0) throw new Error('Mesa destino no encontrada');

            const [abiertosDestino] = await connection.query(
                `SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')`,
                [mesa_destino_id]
            );
            if ((abiertosDestino[0]?.cnt || 0) > 0) {
                throw new Error('La mesa destino tiene un pedido activo');
            }

            // Actualizar estados de mesas (origen puede quedar ocupada si tuviera otros pedidos, pero por defecto quedará libre)
            await connection.query('UPDATE pedidos SET mesa_id = ? WHERE id = ?', [mesa_destino_id, pedidoId]);

            // Poner libre la mesa origen si no le quedan pedidos abiertos
            const [restantesOrigen] = await connection.query(
                `SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')`,
                [pedido.mesa_id]
            );
            if ((restantesOrigen[0]?.cnt || 0) === 0) {
                await connection.query('UPDATE mesas SET estado = "libre" WHERE id = ?', [pedido.mesa_id]);
            }

            // Poner ocupada la mesa destino
            await connection.query('UPDATE mesas SET estado = "ocupada" WHERE id = ?', [mesa_destino_id]);

            await connection.commit();
            connection.release();
            res.json({ message: 'Pedido movido', mesa_origen_id: pedido.mesa_id, mesa_destino_id });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error al mover pedido:', error);
            res.status(400).json({ error: error.message || 'Error al mover pedido' });
        }
    } catch (error) {
        console.error('Error interno al mover pedido:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /mesas/:mesaId/liberar - Libera mesa del tenant si no tiene items activos
router.put('/:mesaId/liberar', async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

    const mesaId = req.params.mesaId;
    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [mesas] = await connection.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesaId, tenantId]);
            if (mesas.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Mesa no encontrada' });
            }

            const [abiertos] = await connection.query(
                `SELECT p.id FROM pedidos p WHERE p.mesa_id = ? AND p.estado NOT IN ('cerrado','cancelado') FOR UPDATE`,
                [mesaId]
            );

            if (abiertos.length > 0) {
                // Verificar que no tengan items distintos de cancelado
                const ids = abiertos.map(p => p.id);
                const [items] = await connection.query(
                    `SELECT COUNT(*) as cnt FROM pedido_items WHERE pedido_id IN (?) AND estado <> 'cancelado'`,
                    [ids]
                );
                if ((items[0]?.cnt || 0) > 0) {
                    throw new Error('La mesa tiene items activos, no se puede liberar');
                }
                // Si no hay items activos, podemos marcar esos pedidos como cancelados
                await connection.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id IN (?)`, [ids]);
            }

            await connection.query(`UPDATE mesas SET estado = 'libre' WHERE id = ?`, [mesaId]);
            await connection.commit();
            connection.release();
            res.json({ message: 'Mesa liberada' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error al liberar mesa:', error);
            res.status(400).json({ error: error.message || 'Error al liberar mesa' });
        }
    } catch (error) {
        console.error('Error interno al liberar mesa:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

module.exports = router;


