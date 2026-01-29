/**
 * Dashboard Routes - Statistics and Analytics
 * Handles HTTP requests/responses for dashboard statistics
 * Related to: services/StatsService.js, views/dashboard.ejs
 */

const express = require('express');
const router = express.Router();
const StatsService = require('../services/StatsService');
const { requireRole } = require('../middleware/auth');

// GET /dashboard - Dashboard page (only for admin)
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        res.render('dashboard', { 
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.status(500).render('error', { 
            error: {
                message: 'Error al cargar dashboard',
                stack: error.stack
            }
        });
    }
});

// GET /api/dashboard/stats - Get dashboard statistics (only for admin, scoped by tenant)
router.get('/stats', requireRole('admin'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        }
        const filters = {
            desde: req.query.desde,
            hasta: req.query.hasta
        };
        const stats = await StatsService.getDashboardStats(tenantId, filters);
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;

