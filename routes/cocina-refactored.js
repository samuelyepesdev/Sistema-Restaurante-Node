/**
 * Kitchen Routes - Refactored to use Services
 * Handles HTTP requests/responses for kitchen queue
 * Related to: services/CocinaService.js, views/cocina.ejs
 */

const express = require('express');
const router = express.Router();
const CocinaService = require('../services/CocinaService');

// GET /cocina - Kitchen queue view
router.get('/', async (req, res) => {
    try {
        const items = await CocinaService.getQueue();
        res.render('cocina', { 
            items: items || [],
            user: req.user
        });
    } catch (error) {
        console.error('Error al cargar cocina:', error);
        res.status(500).render('errors/internal', { 
            error: { message: 'Error al cargar cocina', stack: error.stack } 
        });
    }
});

// GET /cocina/cola - API: Get kitchen queue
router.get('/cola', async (req, res) => {
    try {
        const items = await CocinaService.getQueue();
        res.json(items);
    } catch (error) {
        console.error('Error al obtener cola:', error);
        res.status(500).json({ error: 'Error al obtener cola' });
    }
});

// PUT /cocina/item/:id/estado - API: Update item state in kitchen
router.put('/item/:id/estado', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body || {};
        const result = await CocinaService.updateItemEstado(id, estado);
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

