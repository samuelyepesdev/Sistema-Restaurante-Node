/**
 * Configuration Routes - Refactored to use Services
 * Handles HTTP requests/responses for print configuration
 * Related to: services/ConfiguracionService.js, views/configuracion.ejs
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ConfiguracionService = require('../services/ConfiguracionService');

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

// Initialize configuration if needed (called once on module load)
ConfiguracionService.initializeIfNeeded().catch(err => {
    console.error('Error al inicializar configuración:', err);
});

// GET /configuracion - Configuration page
router.get('/', async (req, res) => {
    try {
        const config = await ConfiguracionService.getForView();
        res.render('configuracion', { 
            config,
            user: req.user 
        });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

// POST /configuracion - Save configuration
router.post('/', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'qr', maxCount: 1 }
]), async (req, res) => {
    try {
        await ConfiguracionService.save(req.body, req.files);
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

// GET /configuracion/preview - Invoice preview with example data
router.get('/preview', async (req, res) => {
    try {
        const config = await ConfiguracionService.getForPreview();

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

        res.render('factura', {
            factura: facturaEjemplo,
            detalles: detallesEjemplo,
            config: config,
            isPreview: true
        });
    } catch (error) {
        console.error('Error al generar vista previa:', error);
        res.status(500).json({ error: error.message || 'Error al generar vista previa' });
    }
});

module.exports = router;

