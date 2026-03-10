const express = require('express');
const router = express.Router();
const ServicioController = require('../../app/Http/Controllers/Tenant/ServicioController');
const { requirePermission } = require('../../middleware/auth');

// Web Routes
router.get('/', requirePermission('servicios.ver'), ServicioController.index);
router.post('/', requirePermission('servicios.crear'), ServicioController.store);
router.post('/:id/update', requirePermission('servicios.editar'), ServicioController.update);
router.post('/:id/delete', requirePermission('servicios.eliminar'), ServicioController.destroy);

// API Routes
router.get('/lista', requirePermission('servicios.ver'), ServicioController.listActive);

module.exports = router;
