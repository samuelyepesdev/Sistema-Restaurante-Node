const express = require('express');
const router = express.Router();
const DashboardController = require('../../app/Http/Controllers/Tenant/DashboardController');
const { requireRole, requirePermission } = require('../../middleware/auth');

// GET /dashboard - Vista principal (admin)
router.get('/', requireRole('admin'), DashboardController.index);

// API Dashboard Stats
router.get('/stats', requireRole('admin'), DashboardController.getStats);
router.get('/eventos-calendario', requireRole('admin'), DashboardController.getEventosCalendario);

// Reporte mensual test
router.post('/test-reporte-mensual', requirePermission('reporte_mensual.test'), DashboardController.testReporteMensual);

module.exports = router;
