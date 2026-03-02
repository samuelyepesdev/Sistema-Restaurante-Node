/**
 * Dashboard Routes - Statistics and Analytics
 * Handles HTTP requests/responses for dashboard statistics
 * Related to: services/StatsService.js, views/dashboard.ejs
 */

const express = require('express');
const router = express.Router();
const StatsService = require('../../services/StatsService');
const StatsRepository = require('../../repositories/StatsRepository');
const { requireRole } = require('../../middleware/auth');

// GET /dashboard - Dashboard page (only for admin)
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        res.render('dashboard/index', {
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.status(500).render('errors/internal', {
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

// GET /api/dashboard/eventos-calendario?mes=YYYY-MM - Eventos de un mes para el calendario
router.get('/eventos-calendario', requireRole('admin'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        }
        const mes = req.query.mes; // YYYY-MM
        let desde, hasta;
        if (mes && /^\d{4}-\d{2}$/.test(mes)) {
            const [y, m] = mes.split('-').map(Number);
            desde = `${y}-${String(m).padStart(2, '0')}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            hasta = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
            const now = new Date();
            desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            hasta = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
        const eventosCalendario = await StatsRepository.getEventosEnRango(tenantId, desde, hasta);
        res.json({ eventosCalendario });
    } catch (error) {
        console.error('Error al obtener eventos para calendario:', error);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
});

module.exports = router;

