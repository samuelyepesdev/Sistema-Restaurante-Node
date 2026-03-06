const TenantService = require('../../../../services/Admin/TenantService');
const db = require('../../../../config/database');

class DashboardController {
    // GET /admin/dashboard
    static async index(req, res) {
        try {
            const stats = await TenantService.getDashboardStats();
            res.render('admin/dashboard', {
                user: req.user,
                stats
            });
        } catch (error) {
            console.error('Error al cargar dashboard superadmin:', error);
            res.status(500).render('errors/internal', { error });
        }
    }

    // GET /admin/dashboard/live-stats
    static async getLiveStats(req, res) {
        try {
            const hoyColombia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

            const [ventasHoyRows] = await db.query(`
                SELECT t.nombre AS tenant_nombre, 
                       COALESCE(SUM(f.total), 0) AS total, 
                       COUNT(f.id) AS facturas
                FROM tenants t
                LEFT JOIN facturas f ON f.tenant_id = t.id
                    AND DATE(CONVERT_TZ(f.fecha, '+00:00', '-05:00')) = ?
                WHERE t.activo = 1
                GROUP BY t.id, t.nombre
                ORDER BY total DESC
            `, [hoyColombia]);

            const ventasHoyPorTenant = ventasHoyRows.map(r => ({
                nombre: r.tenant_nombre,
                total: parseFloat(r.total || 0),
                facturas: parseInt(r.facturas || 0, 10)
            }));

            const ventasHoyTotalGlobal = ventasHoyPorTenant.reduce((sum, v) => sum + v.total, 0);

            // Resumen global rápido
            const [[factRow]] = await db.query('SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS monto FROM facturas');

            res.json({
                ok: true,
                hoyColombia,
                ventasHoyPorTenant,
                ventasHoyTotalGlobal,
                totalFacturas: parseInt(factRow.cnt || 0, 10),
                totalVentasMonto: parseFloat(factRow.monto || 0)
            });
        } catch (error) {
            console.error('Error en live-stats:', error);
            res.status(500).json({ ok: false, error: 'Error al obtener estadísticas en vivo' });
        }
    }
}

module.exports = DashboardController;
