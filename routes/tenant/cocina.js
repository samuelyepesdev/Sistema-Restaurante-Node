/**
 * Kitchen Routes - Refactored to use Services
 * Handles HTTP requests/responses for kitchen queue
 * Related to: services/CocinaService.js, views/cocina.ejs
 */

const express = require('express');
const router = express.Router();
const CocinaService = require('../../services/CocinaService');

// GET /cocina - Kitchen queue view (solo del tenant)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
        const items = await CocinaService.getQueue(tenantId);
        res.render('cocina/index', {
            items: items || [],
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al cargar cocina:', error);
        res.status(500).render('errors/internal', {
            error: { message: 'Error al cargar cocina', stack: error.stack }
        });
    }
});

// GET /cocina/cola - API: Get kitchen queue (del tenant)
router.get('/cola', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const items = await CocinaService.getQueue(tenantId);
        res.json(items);
    } catch (error) {
        console.error('Error al obtener cola:', error);
        res.status(500).json({ error: 'Error al obtener cola' });
    }
});

// PUT /cocina/item/:id/estado - API: Update item state in kitchen (item del tenant)
router.put('/item/:id/estado', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const id = parseInt(req.params.id);
        const { estado } = req.body || {};
        const result = await CocinaService.updateItemEstado(id, tenantId, estado);
        res.json(result);
    } catch (error) {
        console.error('Error al actualizar estado en cocina:', error);
        if (error.message === 'Estado inválido' || error.message.includes('no encontrado')) {
            const statusCode = error.message === 'Estado inválido' ? 400 : 404;
            return res.status(statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

module.exports = router;

