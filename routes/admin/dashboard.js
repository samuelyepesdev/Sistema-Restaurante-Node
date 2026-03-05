/**
 * Dashboard del superadministrador.
 * Muestra resumen de restaurantes, activos/inactivos, por plan y usuarios.
 */

const express = require('express');
const router = express.Router();
const authService = require('../../services/AuthService');
const TenantService = require('../../services/TenantService');
const { ROLES } = require('../../utils/constants');

router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET /admin/dashboard/live-stats - API JSON: retorna ventas en tiempo real por tenant (para auto-refresh)
router.get('/live-stats', async (req, res) => {
    try {
        const db = require('../../config/database');
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
});

// GET /admin/dashboard - Vista principal del superadmin
router.get('/', async (req, res) => {
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
});

module.exports = router;
