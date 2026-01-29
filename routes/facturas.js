/**
 * Invoice Routes - Refactored to use Services
 * Handles HTTP requests/responses for invoices
 * Related to: services/FacturaService.js, views/factura.ejs
 */

const express = require('express');
const router = express.Router();
const FacturaService = require('../services/FacturaService');

// POST /facturas - Create new invoice (del tenant)
router.post('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const result = await FacturaService.create(tenantId, req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear factura:', error);
        if (error.message === 'Datos incompletos') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear factura' });
    }
});

// GET /facturas/:id/imprimir - Print invoice view (solo si factura pertenece al tenant)
router.get('/:id/imprimir', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const ConfiguracionService = require('../services/ConfiguracionService');
        const facturaId = parseInt(req.params.id);
        const { factura, detalles } = await FacturaService.getByIdForPrint(facturaId, tenantId);
        
        const config = await ConfiguracionService.getForPreview(tenantId);
        
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

// GET /facturas/:id/detalles - Get invoice details for API (del tenant)
router.get('/:id/detalles', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const facturaId = parseInt(req.params.id);
        const details = await FacturaService.getDetails(facturaId, tenantId);
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

