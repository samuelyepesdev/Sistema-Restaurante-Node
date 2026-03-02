/**
 * Client Routes - Refactored to use Services
 * Handles HTTP requests/responses for clients
 * Related to: services/ClienteService.js, views/clientes.ejs
 */

const express = require('express');
const router = express.Router();
const ClienteService = require('../services/ClienteService');

// GET /clientes - Show clients page
router.get('/', async (req, res) => {
    try {
        const clientes = await ClienteService.getAll();
        res.render('clientes', { 
            clientes: clientes || [],
            user: req.user
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).render('errors/internal', { 
            error: {
                message: 'Error al obtener clientes',
                stack: error.stack
            }
        });
    }
});

// GET /clientes/buscar - Search clients
router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q || '';
        const clientes = await ClienteService.search(query);
        res.json(clientes);
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        res.status(500).json({ error: 'Error al buscar clientes' });
    }
});

// GET /clientes/:id - Get client by ID
router.get('/:id', async (req, res) => {
    try {
        const cliente = await ClienteService.getById(parseInt(req.params.id));
        res.json(cliente);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        if (error.message === 'Cliente no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

// POST /clientes - Create new client
router.post('/', async (req, res) => {
    try {
        const result = await ClienteService.create(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear cliente:', error);
        if (error.message.includes('requerido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// PUT /clientes/:id - Update client
router.put('/:id', async (req, res) => {
    try {
        const result = await ClienteService.update(parseInt(req.params.id), req.body);
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

// DELETE /clientes/:id - Delete client
router.delete('/:id', async (req, res) => {
    try {
        const result = await ClienteService.delete(parseInt(req.params.id));
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

