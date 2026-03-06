const express = require('express');
const router = express.Router();
const VentasController = require('../../app/Http/Controllers/Tenant/VentasController');
const { requirePermission } = require('../../middleware/auth');
const { requirePlanFeature } = require('../../middleware/planFeature');

// GET /ventas - Listado con filtros
router.get('/', VentasController.index);

// GET /ventas/export - Exportar Excel
router.get('/export', requirePermission('plantillas.ver'), requirePlanFeature('plantillas'), VentasController.export);

module.exports = router;
