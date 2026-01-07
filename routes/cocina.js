const express = require('express');
const router = express.Router();
const db = require('../db');

// Rutas para la vista/cola de cocina
// - Renderiza pedidos/items en orden de envío (FIFO por enviado_at, luego created_at)
// - Permite avanzar estados: preparando -> listo -> servido

// GET /cocina - vista de cola de cocina
router.get('/', async (req, res) => {
    try {
        const [items] = await db.query(`
            SELECT i.*, p.mesa_id, m.numero AS mesa_numero, pr.nombre AS producto_nombre
            FROM pedido_items i
            JOIN pedidos p ON p.id = i.pedido_id
            JOIN mesas m ON m.id = p.mesa_id
            JOIN productos pr ON pr.id = i.producto_id
            WHERE i.estado IN ('enviado','preparando','listo')
            ORDER BY COALESCE(i.enviado_at, i.created_at) ASC, i.id ASC
        `);

        res.render('cocina', { items: items || [] });
    } catch (error) {
        console.error('Error al cargar cocina:', error);
        res.status(500).render('error', { error: { message: 'Error al cargar cocina', stack: error.stack } });
    }
});

// GET /cocina/cola - API: obtener cola de cocina
router.get('/cola', async (req, res) => {
    try {
        const [items] = await db.query(`
            SELECT i.*, p.mesa_id, m.numero AS mesa_numero, pr.nombre AS producto_nombre
            FROM pedido_items i
            JOIN pedidos p ON p.id = i.pedido_id
            JOIN mesas m ON m.id = p.mesa_id
            JOIN productos pr ON pr.id = i.producto_id
            WHERE i.estado IN ('enviado','preparando','listo')
            ORDER BY COALESCE(i.enviado_at, i.created_at) ASC, i.id ASC
        `);
        res.json(items);
    } catch (error) {
        console.error('Error al obtener cola:', error);
        res.status(500).json({ error: 'Error al obtener cola' });
    }
});

// PUT /cocina/item/:id/estado - API: actualizar estado de preparación
router.put('/item/:id/estado', async (req, res) => {
    try {
        const id = req.params.id;
        const { estado } = req.body || {};
        const permitidos = ['preparando','listo'];
        if (!permitidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

        const timestampField = estado === 'preparando' ? 'preparado_at' : 'listo_at';
        const [result] = await db.query(
            `UPDATE pedido_items SET estado = ?, ${timestampField} = NOW() WHERE id = ? AND estado IN ('enviado','preparando')`,
            [estado, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Item no encontrado o en estado no válido' });
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error al actualizar estado en cocina:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

module.exports = router;


