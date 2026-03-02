/**
 * Configuration Routes - Refactored to use Services
 * Handles HTTP requests/responses for print configuration
 * Related to: services/ConfiguracionService.js, views/configuracion.ejs
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ConfiguracionService = require('../../services/ConfiguracionService');

// Multer configuration for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

// GET /configuracion - Configuration page (del tenant)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
        await ConfiguracionService.initializeIfNeeded(tenantId);
        const config = await ConfiguracionService.getForView(tenantId);
        res.render('configuracion/index', {
            config,
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).render('errors/internal', { error: { message: 'Error al obtener configuración' } });
    }
});

// POST /configuracion - Save configuration (del tenant)
router.post('/', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'qr', maxCount: 1 }
]), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).redirect('/configuracion');
        await ConfiguracionService.save(tenantId, req.body, req.files);
        res.redirect('/configuracion');
    } catch (error) {
        console.error('Error en el procesamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /configuracion/impresoras - Printers endpoint (not used, returns empty)
router.get('/impresoras', (req, res) => {
    res.json([]);
});

// GET /configuracion/preview - Invoice preview with example data (del tenant). Query params sobrescriben config para ver cambios sin guardar.
router.get('/preview', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        let config = await ConfiguracionService.getForPreview(tenantId);
        if (req.query.nombre_negocio !== undefined) config = { ...config, nombre_negocio: req.query.nombre_negocio };
        if (req.query.direccion !== undefined) config = { ...config, direccion: req.query.direccion };
        if (req.query.telefono !== undefined) config = { ...config, telefono: req.query.telefono };
        if (req.query.nit !== undefined) config = { ...config, nit: req.query.nit };
        if (req.query.pie_pagina !== undefined) config = { ...config, pie_pagina: req.query.pie_pagina };
        if (req.query.ancho_papel !== undefined) config = { ...config, ancho_papel: parseInt(req.query.ancho_papel, 10) || config.ancho_papel };
        if (req.query.font_size !== undefined) config = { ...config, font_size: parseInt(req.query.font_size, 10) || 1 };

        // Example data for preview
        const facturaEjemplo = {
            id: 999,
            fecha: new Date(),
            cliente_nombre: 'Cliente de Ejemplo',
            direccion: 'Calle Ejemplo 123',
            telefono: '3001234567',
            total: 125000,
            forma_pago: 'efectivo'
        };

        const detallesEjemplo = [
            {
                producto_nombre: 'Producto Ejemplo 1',
                cantidad: 2,
                unidad_medida: 'UND',
                precio_unitario: 25000,
                subtotal: 50000
            },
            {
                producto_nombre: 'Producto Ejemplo 2',
                cantidad: 1.5,
                unidad_medida: 'KG',
                precio_unitario: 50000,
                subtotal: 75000
            }
        ];

        res.render('facturas/impresion', {
            factura: facturaEjemplo,
            detalles: detallesEjemplo,
            config: config,
            tenant: req.tenant,
            isPreview: true
        });
    } catch (error) {
        console.error('Error al generar vista previa:', error);
        res.status(500).json({ error: error.message || 'Error al generar vista previa' });
    }
});

module.exports = router;

