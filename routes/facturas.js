/**
 * Invoice Routes - Refactored to use Services
 * Handles HTTP requests/responses for invoices
 * Related to: services/FacturaService.js, views/factura.ejs
 */

const express = require('express');
const router = express.Router();
const FacturaService = require('../services/FacturaService');
const EventoService = require('../services/EventoService');
const { toFechaISOUtc } = require('../utils/dateHelpers');

// GET /facturas/facturar - Pantalla para realizar venta (POS). Opcional: ?evento_id=X para venta de evento
router.get('/facturar', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });
        let eventoFiltro = null;
        if (req.query.evento_id) {
            const ev = await EventoService.getById(req.query.evento_id, tenantId);
            if (ev) eventoFiltro = { id: ev.id, nombre: ev.nombre };
        }
        res.render('index', { user: req.user, tenant: req.tenant, eventoFiltro: eventoFiltro || null });
    } catch (error) {
        console.error('Error al cargar pantalla de facturación:', error);
        res.status(500).render('error', { error, user: req.user });
    }
});

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
        const returnUrl = (req.query.return && typeof req.query.return === 'string') ? req.query.return : '/ventas';
        factura.fechaISO = toFechaISOUtc(factura.fecha);
        
        res.render('factura', {
            factura,
            detalles,
            config,
            returnUrl
        });
    } catch (error) {
        console.error('Error al obtener datos de factura:', error);
        if (error.message === 'Factura no encontrada' || error.message.includes('detalles') || error.message.includes('configurado')) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Error al obtener datos de factura' });
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

