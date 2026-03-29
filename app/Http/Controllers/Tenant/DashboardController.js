const StatsService = require('../../../../services/Tenant/StatsService');
const StatsRepository = require('../../../../repositories/Tenant/StatsRepository');
const ReporteMensualService = require('../../../../services/Tenant/ReporteMensualService');
const EventoRepository = require('../../../../repositories/Tenant/EventoRepository');

class DashboardController {
    // GET /dashboard
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            let proximosEventos = [];
            if (tenantId) {
                proximosEventos = await EventoRepository.getProximosEventos(tenantId, 8);
            }

            res.render('dashboard/index', {
                user: req.user,
                tenant: req.tenant,
                proximosEventos
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
    }

    // GET /api/dashboard/stats
    static async getStats(req, res) {
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
    }

    // GET /api/dashboard/eventos-calendario
    static async getEventosCalendario(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const mes = req.query.mes;
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
    }

    // POST /test-reporte-mensual
    static async testReporteMensual(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const testEmail = req.body.email || req.user.email || null;
            const result = await ReporteMensualService.generarYEnviar(req.tenant, { testMesActual: true, testEmail });
            res.json({ success: true, message: 'Reporte generado y enviado con éxito', result });
        } catch (error) {
            console.error('Error al generar reporte mensual de prueba:', error);
            res.status(500).json({ error: 'Error al generar reporte mensual: ' + error.message });
        }
    }
}

module.exports = DashboardController;
