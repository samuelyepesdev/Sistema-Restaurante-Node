/**
 * Client Routes - Refactored to use Services
 * Handles HTTP requests/responses for clients
 * Related to: services/ClienteService.js, views/clientes.ejs
 */

const express = require('express');
const router = express.Router();
const ClienteService = require('../services/ClienteService');

// GET /clientes - Show clients page (solo del tenant)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });
        const clientes = await ClienteService.getAll(tenantId);
        res.render('clientes', { 
            clientes: clientes || [],
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).render('error', { 
            error: {
                message: 'Error al obtener clientes',
                stack: error.stack
            }
        });
    }
});

// GET /clientes/buscar - Search clients (del tenant)
router.get('/buscar', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const query = req.query.q || '';
        const clientes = await ClienteService.search(query, tenantId);
        res.json(clientes);
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        res.status(500).json({ error: 'Error al buscar clientes' });
    }
});

// GET /clientes/:id - Get client by ID (del tenant)
router.get('/:id', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const cliente = await ClienteService.getById(parseInt(req.params.id), tenantId);
        res.json(cliente);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        if (error.message === 'Cliente no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

// POST /clientes - Create new client (del tenant)
router.post('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const result = await ClienteService.create(tenantId, req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear cliente:', error);
        if (error.message.includes('requerido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// PUT /clientes/:id - Update client (del tenant)
router.put('/:id', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const result = await ClienteService.update(parseInt(req.params.id), tenantId, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        if (error.message === 'Cliente no encontrado' || error.message.includes('requerido')) {
            const statusCode = error.message === 'Cliente no encontrado' ? 404 : 400;
            return res.status(statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

// DELETE /clientes/:id - Delete client (del tenant)
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const result = await ClienteService.delete(parseInt(req.params.id), tenantId);
        res.json(result);
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        if (error.message === 'Cliente no encontrado' || error.message.includes('facturas asociadas')) {
            const statusCode = error.message === 'Cliente no encontrado' ? 404 : 400;
            return res.status(statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

module.exports = router;

