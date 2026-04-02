const express = require('express');
const router = express.Router();
const multer = require('multer');
const PerfilController = require('../../app/Http/Controllers/Tenant/PerfilController');
const { requirePermission } = require('../../middleware/auth');

// Configuración de Multer para el logo
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // Máx 2 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo no permitido. Sube una imagen válida.'));
        }
    }
});

// GET /perfil - Vista perfil
router.get('/', requirePermission('perfil.ver'), PerfilController.index);

// POST /perfil/actualizar - Actualizar datos y logo
router.post('/actualizar', requirePermission('perfil.editar'), upload.single('logo'), PerfilController.update);

// POST /perfil/test-report - Enviar reporte de prueba
router.post('/test-report', requirePermission('perfil.editar'), PerfilController.testReport);

module.exports = router;
