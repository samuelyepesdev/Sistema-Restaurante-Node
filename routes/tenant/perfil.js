const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const TenantService = require('../../services/TenantService');
const StatsService = require('../../services/StatsService');
const { requirePermission } = require('../../middleware/auth');

// Configuración de Multer para el logo del negocio
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../public/uploads/logos');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = `tenant_${req.tenant.id}_logo_${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Máx 2 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo no permitido. Sube una imagen válida.'));
        }
    }
});

router.get('/', requirePermission('perfil.ver'), async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const stats = await StatsService.getDashboardStats(tenantId);
        res.render('perfil/index', { tenant: req.tenant, user: req.user, stats });
    } catch (error) {
        console.error('Error cargando perfil:', error);
        res.status(500).render('errors/internal', { error: { message: 'Error cargando perfil' } });
    }
});

router.post('/actualizar', requirePermission('perfil.editar'), upload.single('logo'), async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { nombre, direccion, telefono, colores } = req.body;

        let newConfig = req.tenant.config || {};
        if (typeof newConfig === 'string') {
            try { newConfig = JSON.parse(newConfig); } catch (e) { newConfig = {}; }
        }

        if (colores) {
            newConfig.colores = JSON.parse(colores);
        }

        if (req.file) {
            newConfig.logo = `/uploads/logos/${req.file.filename}`;
        }

        await TenantService.updateTenant(tenantId, {
            nombre,
            direccion,
            telefono,
            config: newConfig
        });

        res.json({ success: true, message: 'Perfil actualizado correctamente. Recarga la página para ver los cambios de color.' });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
