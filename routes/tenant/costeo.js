const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const CosteoController = require('../../app/Http/Controllers/Tenant/CosteoController');
const { requirePermission, requireRole } = require('../../middleware/auth');
const { requirePlanFeature } = require('../../middleware/planFeature');

const isSuperadminMiddleware = (req, res, next) => {
    if (req.user && String(req.user.rol || '').toLowerCase() === 'superadmin') {
        return next();
    }
    res.status(403).json({ error: 'Solo el superadmin puede realizar esta acción.' });
};

// GET /costeo - Vista principal
router.get('/', CosteoController.index);

// --- Insumos API ---
router.get('/api/insumos', CosteoController.listInsumos);
router.post('/api/insumos', CosteoController.storeInsumo);
router.get('/api/insumos/plantilla', requirePermission('plantillas.ver'), requirePlanFeature('plantillas'), CosteoController.downloadPlantillaInsumos);
router.post('/api/insumos/cargar', requirePermission('plantillas.ver'), requirePlanFeature('plantillas'), upload.single('archivo'), CosteoController.importInsumos);
router.get('/api/insumos/:id', CosteoController.showInsumo);
router.put('/api/insumos/:id', CosteoController.updateInsumo);
router.delete('/api/insumos/:id', CosteoController.destroyInsumo);

// --- Recetas API ---
router.get('/api/recetas', CosteoController.listRecetas);
router.get('/api/recetas/:id', CosteoController.showReceta);
router.post('/api/recetas', CosteoController.storeReceta);
router.put('/api/recetas/:id', CosteoController.updateReceta);
router.delete('/api/recetas/:id', CosteoController.destroyReceta);

// --- Otros Cálculos ---
router.get('/api/costeo/producto/:productoId', CosteoController.getCosteoProducto);
router.get('/api/costeo/receta/:id', CosteoController.getCosteoReceta);
router.get('/api/costeo/alertas', CosteoController.getAlertas);
router.get('/api/costeo/config', CosteoController.getConfig);
router.put('/api/costeo/config', CosteoController.saveConfig);
router.get('/api/costeo/resumen-financiero', CosteoController.getResumenFinanciero);

// --- Costos Fijos ---
router.get('/api/costeo/costos-fijos', CosteoController.listCostosFijos);
router.post('/api/costeo/costos-fijos', CosteoController.storeCostoFijo);
router.put('/api/costeo/costos-fijos/:id', CosteoController.updateCostoFijo);
router.delete('/api/costeo/costos-fijos/:id', CosteoController.destroyCostoFijo);

// --- Temas & Parámetros ---
router.get('/api/temas', CosteoController.listTemas);
router.get('/api/temas/:id', CosteoController.showTema);
router.post('/api/temas', isSuperadminMiddleware, CosteoController.storeTema);
router.put('/api/temas/:id', isSuperadminMiddleware, CosteoController.updateTema);
router.delete('/api/temas/:id', isSuperadminMiddleware, CosteoController.destroyTema);
router.get('/api/temas/:id/parametros', CosteoController.listParametrosTema);
router.put('/api/temas/:id/parametros', isSuperadminMiddleware, CosteoController.setParametrosTema);

router.get('/api/parametros', CosteoController.listParametros);
router.get('/api/parametros/:id', CosteoController.showParametro);
router.post('/api/parametros', isSuperadminMiddleware, CosteoController.storeParametro);
router.put('/api/parametros/:id', isSuperadminMiddleware, CosteoController.updateParametro);
router.delete('/api/parametros/:id', isSuperadminMiddleware, CosteoController.destroyParametro);

router.get('/api/productos/:id/parametros', CosteoController.listParametrosProducto);
router.put('/api/productos/:id/parametros', CosteoController.setParametrosProducto);

module.exports = router;
