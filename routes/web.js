const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, restrictSuperadminToAdmin } = require('../middleware/auth');
const { attachTenantContext, costeoTenantContext } = require('../middleware/tenant');
const { requirePlanFeature } = require('../middleware/planFeature');

// Middlewares comunes
const requireAuthWithTenant = [requireAuth, restrictSuperadminToAdmin, attachTenantContext];

// Importar rutas
const authRoutes = require('./auth');
const productosRoutes = require('./tenant/productos');
const clientesRoutes = require('./tenant/clientes');
const facturasRoutes = require('./tenant/facturas');
const mesasRoutes = require('./tenant/mesas');
const cocinaRoutes = require('./tenant/cocina');
const configuracionRoutes = require('./tenant/configuracion');
const ventasRoutes = require('./tenant/ventas');
const dashboardRoutes = require('./tenant/dashboard');
const costeoRoutes = require('./tenant/costeo');
const analiticaRoutes = require('./tenant/analitica');
const adminTenantsRoutes = require('./admin/tenants');
const adminSistemaRoutes = require('./admin/sistema');
const adminPlanesRoutes = require('./admin/planes');
const adminPermisosRoutes = require('./admin/permisos');
const adminVentasRoutes = require('./admin/ventas');
const adminDashboardRoutes = require('./admin/dashboard');
const eventosRoutes = require('./tenant/eventos');
const inventarioRoutes = require('./tenant/inventario');
const recetasRoutes = require('./tenant/recetas');
const perfilRoutes = require('./tenant/perfil');

// --- RUTAS PÚBLICAS ---
router.use('/auth', authRoutes);

// --- RUTA PRINCIPAL ---
router.get('/', optionalAuth, (req, res) => {
    if (req.user) {
        const rol = String((req.user.rol || '')).toLowerCase();
        if (rol === 'superadmin') {
            res.redirect('/admin/dashboard');
        } else if (rol === 'admin') {
            res.redirect('/dashboard');
        } else if (rol === 'mesero') {
            res.redirect('/mesas');
        } else if (rol === 'cocinero') {
            res.redirect('/cocina');
        } else if (rol === 'cajero') {
            res.redirect('/ventas');
        } else {
            res.redirect('/mesas');
        }
    } else {
        res.redirect('/auth/login');
    }
});

// --- RUTAS DE TENANT (RESTAURANTE) ---

router.use('/productos', requireAuthWithTenant, requirePlanFeature('productos'), productosRoutes);
router.use('/perfil', requireAuthWithTenant, perfilRoutes);
router.use('/clientes', requireAuthWithTenant, requirePlanFeature('clientes'), clientesRoutes);
router.use('/facturas', requireAuthWithTenant, requirePlanFeature('ventas'), facturasRoutes);
router.use('/mesas', requireAuthWithTenant, requirePlanFeature('mesas'), mesasRoutes);
router.use('/cocina', requireAuthWithTenant, requirePlanFeature('cocina'), cocinaRoutes);
router.use('/configuracion', requireAuthWithTenant, requirePlanFeature('configuracion'), configuracionRoutes);
router.use('/ventas', requireAuthWithTenant, requirePlanFeature('ventas'), ventasRoutes);
router.use('/eventos', requireAuthWithTenant, requirePlanFeature('eventos'), eventosRoutes);
router.use('/inventario', requireAuthWithTenant, requirePlanFeature('inventario'), inventarioRoutes);
router.use('/recetas', requireAuthWithTenant, requirePlanFeature('recetas'), recetasRoutes);
router.use('/dashboard', requireAuthWithTenant, requirePlanFeature('dashboard'), dashboardRoutes);
router.use('/analitica', requireAuthWithTenant, requirePlanFeature('analitica'), analiticaRoutes);
router.use('/costeo', requireAuth, restrictSuperadminToAdmin, costeoTenantContext, requirePlanFeature('costeo'), costeoRoutes);

// --- RUTAS API (Opcional: puedes separarlas en api.js después) ---
router.use('/api/productos', requireAuthWithTenant, requirePlanFeature('productos'), productosRoutes);
router.use('/api/clientes', requireAuthWithTenant, requirePlanFeature('clientes'), clientesRoutes);
router.use('/api/facturas', requireAuthWithTenant, requirePlanFeature('ventas'), facturasRoutes);
router.use('/api/mesas', requireAuthWithTenant, requirePlanFeature('mesas'), mesasRoutes);
router.use('/api/cocina', requireAuthWithTenant, requirePlanFeature('cocina'), cocinaRoutes);
router.use('/api/dashboard', requireAuthWithTenant, requirePlanFeature('dashboard'), dashboardRoutes);

// --- RUTAS DE SUPERADMIN ---
router.use('/admin/dashboard', requireAuth, adminDashboardRoutes);
router.use('/admin/tenants', requireAuth, adminTenantsRoutes);
router.use('/admin/sistema', requireAuth, adminSistemaRoutes);
router.use('/admin/planes', requireAuth, adminPlanesRoutes);
router.use('/admin/permisos', requireAuth, adminPermisosRoutes);
router.use('/admin/ventas', requireAuth, adminVentasRoutes);

module.exports = router;
