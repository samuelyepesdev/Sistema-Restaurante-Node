const express = require('express');
const router = express.Router();
const multer = require('multer');
const ConfiguracionController = require('../../app/Http/Controllers/Tenant/ConfiguracionController');

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

// GET /configuracion - Vista principal
router.get('/', ConfiguracionController.index);

// POST /configuracion - Guardar config
router.post('/', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'qr', maxCount: 1 }
]), ConfiguracionController.store);

// Helpers
router.get('/impresoras', ConfiguracionController.getPrinters);
router.get('/preview', ConfiguracionController.preview);

module.exports = router;
