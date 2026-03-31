const db = require('../../../../config/database');
const FacturaRepository = require('../../../../repositories/Tenant/FacturaRepository');
const InventarioService = require('../../../../services/Tenant/InventarioService');
const CategoryService = require('../../../../services/Admin/CategoryService');
const ProductRepository = require('../../../../repositories/Tenant/ProductRepository');
const AbrirPedidoService = require('../../../../services/Tenant/Mesas/AbrirPedidoService');
const FacturarPedidoService = require('../../../../services/Tenant/Mesas/FacturarPedidoService');
class MesasController {
    // GET /mesas
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });

            const [mesasData] = await db.query(`
                SELECT m.*, (
                    SELECT COUNT(*) FROM pedidos p 
                    WHERE p.mesa_id = m.id AND p.estado NOT IN ('cerrado','cancelado')
                ) AS pedidos_abiertos
                FROM mesas m
                WHERE m.tenant_id = ?
                ORDER BY m.tipo ASC, CAST(m.numero AS UNSIGNED), m.numero
            `, [tenantId]);

            const mesas = mesasData.filter(m => m.tipo === 'fisica');
            const mesasVirtuales = mesasData.filter(m => m.tipo === 'virtual' && m.estado !== 'libre');

            // Cargar categorías y productos para el apartado de favoritos (solo activos)
            const categorias = await CategoryService.getAllActive(tenantId);
            const productos = await ProductRepository.findAll(tenantId);

            res.render('mesas/index', {
                mesas: mesas || [],
                mesasVirtuales: mesasVirtuales || [],
                categorias: categorias || [],
                productos: productos || [],
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            res.status(500).render('errors/internal', {
                error: { message: 'Error al cargar mesas', stack: error.stack }
            });
        }
    }

    // GET /mesas/listar
    static async list(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const [mesas] = await db.query(`
                SELECT m.*, (
                    SELECT COUNT(*) FROM pedidos p 
                    WHERE p.mesa_id = m.id AND p.estado NOT IN ('cerrado','cancelado')
                ) AS pedidos_abiertos
                FROM mesas m
                WHERE m.tenant_id = ? AND (m.tipo = 'fisica' OR m.estado <> 'libre')
                ORDER BY m.tipo ASC, CAST(m.numero AS UNSIGNED), m.numero
            `, [tenantId]);
            res.json(mesas);
        } catch (error) {
            console.error('Error al listar mesas:', error);
            res.status(500).json({ error: 'Error al listar mesas' });
        }
    }

    // POST /mesas/crear
    static async store(req, res) {
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
    }

    // PUT /mesas/:mesaId
    static async update(req, res) {
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
    }

    // POST /mesas/crear-masivas
    static async storeMasivas(req, res) {
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

                const [existing] = await connection.query('SELECT numero FROM mesas WHERE tenant_id = ?', [tenantId]);
                const existingNumbers = new Set(existing.map(m => m.numero));

                const created = [];
                const errors = [];

                let startNumber = 1;
                if (!prefijo) {
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

                for (let i = 0; i < cantidad; i++) {
                    const numeroMesa = prefijo ? `${prefijo}${startNumber + i}` : String(startNumber + i);

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
                        existingNumbers.add(numeroMesa);
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
    }

    // POST /mesas/abrir
    static async abrirPedido(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const { mesa_id, cliente_id, notas } = req.body || {};
            if (!mesa_id) return res.status(400).json({ error: 'El ID de la mesa es requerido' });

            // 🌟 1. Delegamos las transacciones al ACTION. (SRP / MVC correcto)
            const pedido = await AbrirPedidoService.execute({
                tenantId,
                mesa_id,
                cliente_id,
                notas
            });

            // 🌐 2. El controlador solo retorna la respuesta HTTP final.
            return res.status(201).json({ pedido });

        } catch (error) {
            console.error('Error al abrir pedido:', error.message);
            // 🐛 3. Manejo de Errores controlado por la nomenclatura del Servicio
            if (error.message === 'Mesa no encontrada') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Fallo interno al intentar abrir el pedido en base de datos' });
        }
    }

    // GET /mesas/pedidos/:pedidoId
    static async getPedido(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const pedidoId = req.params.pedidoId;
            const [pedidos] = await db.query(`
                SELECT p.*, c.nombre AS cliente_nombre 
                FROM pedidos p 
                LEFT JOIN clientes c ON c.id = p.cliente_id 
                WHERE p.id = ? AND p.tenant_id = ?`,
                [pedidoId, tenantId]);

            if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
            const pedido = pedidos[0];
            const [items] = await db.query(`
                SELECT i.*, 
                       COALESCE(p.nombre, s.nombre) AS producto_nombre 
                FROM pedido_items i
                LEFT JOIN productos p ON p.id = i.producto_id
                LEFT JOIN servicios s ON s.id = i.servicio_id
                WHERE i.pedido_id = ?
                ORDER BY i.created_at ASC
            `, [pedidoId]);
            res.json({ pedido, items });
        } catch (error) {
            console.error('Error al obtener pedido:', error);
            res.status(500).json({ error: 'Error al obtener pedido' });
        }
    }

    // PATCH /mesas/pedidos/:pedidoId/propina
    static async updatePropina(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const pedidoId = req.params.pedidoId;
            const propina = Math.max(0, parseFloat(req.body?.propina) || 0);
            const [result] = await db.query(
                'UPDATE pedidos SET propina = ? WHERE id = ? AND tenant_id = ?',
                [propina, pedidoId, tenantId]
            );
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
            res.json({ propina });
        } catch (error) {
            console.error('Error al actualizar propina:', error);
            res.status(500).json({ error: 'Error al actualizar propina' });
        }
    }

    // PUT /mesas/items/:itemId/cantidad
    static async updateItemCantidad(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const itemId = req.params.itemId;
            const { cantidad } = req.body || {};
            const cant = parseFloat(cantidad);
            if (cant == null || isNaN(cant) || cant < 0.01) {
                return res.status(400).json({ error: 'cantidad inválida (mínimo 0.01)' });
            }

            // Helper logic inside controller for now
            const [checkRows] = await db.query(
                'SELECT pi.id, pi.precio_unitario FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ?',
                [itemId, tenantId]
            );
            if (checkRows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

            const precio = Number(checkRows[0].precio_unitario);
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
    }

    // POST /mesas/pedidos/:pedidoId/items
    static async addItem(req, res) {
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
            const check = await InventarioService.checkStockParaProducto(tenantId, producto_id, parseFloat(cantidad) || 1);
            if (!check.ok) {
                const msg = (check.faltantes || []).map(f => `${f.insumo_nombre}: requiere ${f.requerido} ${f.unidad_base}, disponible ${f.disponible}`).join('; ');
                console.warn('[Inventario] Vendiendo sin stock suficiente: ' + msg);
                // No bloqueamos la venta, permitimos stock negativo
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
    }

    // POST /mesas/pedidos/:pedidoId/servicios
    static async addService(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const pedidoId = req.params.pedidoId;
            const { servicio_id, cantidad, precio, nota } = req.body || {};
            
            if (!servicio_id || !cantidad || !precio) {
                return res.status(400).json({ error: 'servicio_id, cantidad y precio son requeridos' });
            }

            const subtotal = Number(cantidad) * Number(precio);
            const [pedidoRow] = await db.query('SELECT mesa_id FROM pedidos WHERE id = ? AND tenant_id = ?', [pedidoId, tenantId]);
            if (pedidoRow.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
            
            const mesaId = pedidoRow[0].mesa_id;

            const [result] = await db.query(
                `INSERT INTO pedido_items (tenant_id, pedido_id, servicio_id, es_servicio, cantidad, unidad_medida, precio_unitario, subtotal, estado, nota)
                 VALUES (?, ?, ?, 1, ?, 'SERV', ?, ?, 'listo', ?)` ,
                [tenantId, pedidoId, servicio_id, cantidad, precio, subtotal, nota || null]
            );

            if (mesaId) await db.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ? AND tenant_id = ?", [mesaId, tenantId]);
            
            res.status(201).json({ id: result.insertId });
        } catch (error) {
            console.error('Error al agregar servicio:', error);
            res.status(500).json({ error: 'Error al agregar servicio' });
        }
    }

    // DELETE /mesas/items/:itemId
    static async destroyItem(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const itemId = req.params.itemId;
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [rows] = await connection.query(
                    'SELECT pi.id, p.id as pedido_id, p.mesa_id FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ? FOR UPDATE',
                    [itemId, tenantId]
                );
                
                if (rows.length === 0) {
                    await connection.rollback();
                    connection.release();
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                const { pedido_id, mesa_id } = rows[0];
                await connection.query('DELETE FROM pedido_items WHERE id = ?', [itemId]);

                // Validar si la mesa se queda sin productos en ese pedido
                const [restantes] = await connection.query(
                    'SELECT COUNT(*) as cnt FROM pedido_items WHERE pedido_id = ?',
                    [pedido_id]
                );

                if (restantes[0].cnt === 0) {
                    await connection.query("UPDATE pedidos SET estado = 'cancelado' WHERE id = ?", [pedido_id]);
                    const [abiertos] = await connection.query(
                        "SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')",
                        [mesa_id]
                    );
                    if (abiertos[0].cnt === 0) {
                        await connection.query("UPDATE mesas SET estado = 'libre' WHERE id = ?", [mesa_id]);
                    }
                }

                await connection.commit();
                connection.release();

                res.json({ message: 'Item eliminado y estado de mesa validado' });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('Error al eliminar item:', error);
            res.status(500).json({ error: 'Error al eliminar item' });
        }
    }

    // PUT /mesas/items/:itemId/enviar
    static async enviarItem(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const itemId = req.params.itemId;
            const [rows] = await db.query(
                'SELECT pi.id FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ?',
                [itemId, tenantId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

            await db.query(
                `UPDATE pedido_items SET estado = 'enviado', enviado_at = NOW() WHERE id = ?`,
                [itemId]
            );
            res.json({ message: 'Item enviado a cocina' });
        } catch (error) {
            console.error('Error al enviar item:', error);
            res.status(500).json({ error: 'Error al enviar item' });
        }
    }

    // PUT /mesas/items/:itemId/estado
    static async updateItemEstado(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const itemId = req.params.itemId;
            const [rows] = await db.query(
                'SELECT pi.id FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ?',
                [itemId, tenantId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

            const { estado } = req.body || {};
            const permitidos = ['pendiente', 'enviado', 'preparando', 'listo', 'servido', 'cancelado'];
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
                await db.query(`UPDATE pedido_items SET estado = ? WHERE id = ?`, [estado, itemId]);
            }

            res.json({ message: 'Estado actualizado' });
        } catch (error) {
            console.error('Error al actualizar estado de item:', error);
            res.status(500).json({ error: 'Error al actualizar estado' });
        }
    }

    // PUT /mesas/items/:itemId/pagar
    static async pagarItem(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const itemId = req.params.itemId;
            const { forma_pago } = req.body || {};
            
            if (!forma_pago || !['efectivo', 'transferencia'].includes(forma_pago)) {
                return res.status(400).json({ error: 'forma_pago requerida y debe ser efectivo o transferencia' });
            }

            const [rows] = await db.query(
                'SELECT pi.id FROM pedido_items pi INNER JOIN pedidos p ON pi.pedido_id = p.id WHERE pi.id = ? AND p.tenant_id = ?',
                [itemId, tenantId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

            await db.query(
                `UPDATE pedido_items SET pagado = 1, forma_pago = ? WHERE id = ?`,
                [forma_pago, itemId]
            );

            res.json({ message: 'Item pagado correctamente' });
        } catch (error) {
            console.error('Error al pagar item individual:', error);
            res.status(500).json({ error: 'Error al pagar item individual' });
        }
    }

    // POST /mesas/pedidos/:pedidoId/facturar
    static async facturarPedido(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const pedidoId = req.params.pedidoId;
            const { cliente_id, forma_pago, descuentos, propina: propinaBody } = req.body || {};
            
            if (!cliente_id) return res.status(400).json({ error: 'El ID de cliente es requerido para facturar' });
            if (!forma_pago) return res.status(400).json({ error: 'La forma de pago es requerida' });
            
            const descuentosMap = descuentos && typeof descuentos === 'object' ? descuentos : {};

            // 🌟 1. Delegar todo el SQL y Cálculos pesados (SRP)
            const resultado = await FacturarPedidoService.execute({
                tenantId,
                pedidoId,
                cliente_id,
                forma_pago,
                descuentosMap,
                propinaBody
            });

            // 🌐 2. Devolver JSON Bonito
            return res.status(201).json(resultado);

        } catch (error) {
            console.error('Error en facturación desde pedido:', error.message);
            if (error.message === 'Pedido no encontrado' || error.message === 'Pedido sin items') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message || 'Error al facturar pedido' });
        }
    }

    // PUT /mesas/pedidos/:pedidoId/mover
    static async moverPedido(req, res) {
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

                const [mesaDest] = await connection.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesa_destino_id, tenantId]);
                if (mesaDest.length === 0) throw new Error('Mesa destino no encontrada');

                const [abiertosDestino] = await connection.query(
                    `SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')`,
                    [mesa_destino_id]
                );
                if ((abiertosDestino[0]?.cnt || 0) > 0) {
                    throw new Error('La mesa destino tiene un pedido activo');
                }

                await connection.query('UPDATE pedidos SET mesa_id = ? WHERE id = ?', [mesa_destino_id, pedidoId]);

                const [restantesOrigen] = await connection.query(
                    `SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')`,
                    [pedido.mesa_id]
                );
                if ((restantesOrigen[0]?.cnt || 0) === 0) {
                    await connection.query('UPDATE mesas SET estado = "libre" WHERE id = ?', [pedido.mesa_id]);
                }

                await connection.query('UPDATE mesas SET estado = "ocupada" WHERE id = ?', [mesa_destino_id]);

                await connection.commit();
                connection.release();
                res.json({ message: 'Pedido movido', mesa_origen_id: pedido.mesa_id, mesa_destino_id });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('Error al mover pedido:', error);
            res.status(400).json({ error: error.message || 'Error al mover pedido' });
        }
    }

    // POST /mesas/pedidos/:pedidoId/mover-items
    static async moverItems(req, res) {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const pedidoOrigenId = req.params.pedidoId;
        const { itemIds, mesa_destino_id } = req.body || {};

        if (!Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ error: 'Seleccione al menos un producto' });
        if (!mesa_destino_id) return res.status(400).json({ error: 'Mesa destino requerida' });

        try {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [pedidos] = await connection.query('SELECT * FROM pedidos WHERE id = ? AND tenant_id = ? FOR UPDATE', [pedidoOrigenId, tenantId]);
                if (pedidos.length === 0) throw new Error('Pedido origen no encontrado');
                const pedidoOrigen = pedidos[0];

                const [mesaDest] = await connection.query('SELECT id, numero FROM mesas WHERE id = ? AND tenant_id = ?', [mesa_destino_id, tenantId]);
                if (mesaDest.length === 0) throw new Error('Mesa destino no encontrada');

                let [pedidoDest] = await connection.query(
                    `SELECT * FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado') LIMIT 1`,
                    [mesa_destino_id]
                );

                let pedidoDestinoId;
                if (pedidoDest.length > 0) {
                    pedidoDestinoId = pedidoDest[0].id;
                } else {
                    const [insert] = await connection.query(
                        `INSERT INTO pedidos (tenant_id, mesa_id, cliente_id, estado, total) VALUES (?, ?, ?, 'abierto', 0)`,
                        [tenantId, mesa_destino_id, pedidoOrigen.cliente_id]
                    );
                    pedidoDestinoId = insert.insertId;
                }

                await connection.query(
                    `UPDATE pedido_items SET pedido_id = ? WHERE id IN (?) AND pedido_id = ?`,
                    [pedidoDestinoId, itemIds, pedidoOrigenId]
                );

                const [restantes] = await connection.query(
                    `SELECT COUNT(*) as cnt FROM pedido_items WHERE pedido_id = ? AND estado <> 'cancelado'`,
                    [pedidoOrigenId]
                );

                if ((restantes[0]?.cnt || 0) === 0) {
                    await connection.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id = ?`, [pedidoOrigenId]);
                    const [abiertosOrigen] = await connection.query(
                        `SELECT COUNT(*) as cnt FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado')`,
                        [pedidoOrigen.mesa_id]
                    );
                    if ((abiertosOrigen[0]?.cnt || 0) === 0) {
                        await connection.query('UPDATE mesas SET estado = "libre" WHERE id = ?', [pedidoOrigen.mesa_id]);
                    }
                }

                await connection.query('UPDATE mesas SET estado = "ocupada" WHERE id = ?', [mesa_destino_id]);

                await connection.commit();
                connection.release();
                res.json({ success: true, message: 'Productos movidos exitosamente' });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('Error al mover productos:', error);
            res.status(400).json({ error: error.message || 'Error al mover productos' });
        }
    }

    // PUT /mesas/:mesaId/liberar
    static async liberarMesa(req, res) {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

        const mesaId = req.params.mesaId;
        try {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [mesas] = await connection.query('SELECT id FROM mesas WHERE id = ? AND tenant_id = ?', [mesaId, tenantId]);
                if (mesas.length === 0) throw new Error('Mesa no encontrada');

                const [abiertos] = await connection.query(
                    `SELECT p.id FROM pedidos p WHERE p.mesa_id = ? AND p.estado NOT IN ('cerrado','cancelado') FOR UPDATE`,
                    [mesaId]
                );

                if (abiertos.length > 0) {
                    const ids = abiertos.map(p => p.id);
                    const [items] = await connection.query(
                        `SELECT COUNT(*) as cnt FROM pedido_items WHERE pedido_id IN (?) AND estado <> 'cancelado'`,
                        [ids]
                    );
                    if ((items[0]?.cnt || 0) > 0) throw new Error('La mesa tiene items activos, no se puede liberar');
                    await connection.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id IN (?)`, [ids]);
                }

                await connection.query(`UPDATE mesas SET estado = 'libre' WHERE id = ?`, [mesaId]);
                await connection.commit();
                connection.release();
                res.json({ message: 'Mesa liberada' });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('Error al liberar mesa:', error);
            res.status(400).json({ error: error.message || 'Error al liberar mesa' });
        }
    }

    // PUT /pedidos/:pedidoId/cliente
    static async updatePedidoCliente(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const pedidoId = req.params.pedidoId;
            const { cliente_id } = req.body;

            let clienteAsociado = null;
            if (cliente_id !== null && cliente_id !== undefined) {
                const [rows] = await db.query('SELECT id, nombre FROM clientes WHERE id = ? AND tenant_id = ?', [cliente_id, tenantId]);
                if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
                clienteAsociado = rows[0];
            }

            const [result] = await db.query(
                'UPDATE pedidos SET cliente_id = ? WHERE id = ? AND tenant_id = ?',
                [cliente_id, pedidoId, tenantId]
            );

            if (result.affectedRows === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
            res.json({ message: 'Cliente asociado al pedido', cliente: clienteAsociado });
        } catch (error) {
            console.error('Error al asociar cliente al pedido:', error);
            res.status(500).json({ error: 'Error al asociar cliente' });
        }
    }

    // DELETE /mesas/:mesaId
    static async destroy(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });

            const mesaId = req.params.mesaId;

            // Verificar si la mesa tiene pedidos activos
            const [pedidos] = await db.query(
                `SELECT id FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado', 'cancelado') LIMIT 1`,
                [mesaId]
            );

            if (pedidos.length > 0) {
                return res.status(400).json({ error: 'No se puede eliminar la mesa porque tiene un pedido activo.' });
            }

            const [result] = await db.query(
                'DELETE FROM mesas WHERE id = ? AND tenant_id = ?',
                [mesaId, tenantId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Mesa no encontrada' });
            }

            res.json({ success: true, message: 'Mesa eliminada correctamente.' });
        } catch (error) {
            console.error('Error al eliminar mesa:', error);
            res.status(500).json({ error: 'Error al eliminar la mesa' });
        }
    }
}

module.exports = MesasController;
