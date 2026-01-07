/**
 * Dashboard Routes - Statistics and Analytics
 * Handles HTTP requests/responses for dashboard statistics
 * Related to: services/StatsService.js, views/dashboard.ejs
 */

const express = require('express');
const router = express.Router();
const StatsService = require('../services/StatsService');

// GET /dashboard - Dashboard page
router.get('/', async (req, res) => {
    try {
        res.render('dashboard', { 
            user: req.user 
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

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const filters = {
            desde: req.query.desde,
            hasta: req.query.hasta
        };
        const stats = await StatsService.getDashboardStats(filters);
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;

