/**
 * Invoice Routes - Refactored to use Services
 * Handles HTTP requests/responses for invoices
 * Related to: services/FacturaService.js, views/factura.ejs
 */

const express = require('express');
const router = express.Router();
const FacturaService = require('../services/FacturaService');

// POST /facturas - Create new invoice
router.post('/', async (req, res) => {
    try {
        const result = await FacturaService.create(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear factura:', error);
        if (error.message === 'Datos incompletos') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear factura' });
    }
});

// GET /facturas/:id/imprimir - Print invoice view
router.get('/:id/imprimir', async (req, res) => {
    try {
        const ConfiguracionService = require('../services/ConfiguracionService');
        const facturaId = parseInt(req.params.id);
        const { factura, detalles } = await FacturaService.getByIdForPrint(facturaId);
        
        // Get configuration for printing
        const config = await ConfiguracionService.getForPreview();
        
        res.render('factura', {
            factura,
            detalles,
            config
        });
    } catch (error) {
        console.error('Error al obtener datos de factura:', error);
        if (error.message === 'Factura no encontrada' || error.message.includes('detalles') || error.message.includes('configurado')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al obtener datos de factura' });
    }
});

// GET /facturas/:id/detalles - Get invoice details for API
router.get('/:id/detalles', async (req, res) => {
    try {
        const facturaId = parseInt(req.params.id);
        const details = await FacturaService.getDetails(facturaId);
        res.json(details);
    } catch (error) {
        console.error('Error al obtener detalles de la factura:', error);
        if (error.message === 'Factura no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al obtener detalles de la factura' });
    }
});

module.exports = router;

