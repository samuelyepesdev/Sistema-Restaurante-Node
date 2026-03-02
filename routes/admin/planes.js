/**
 * routes/admin/planes.js
 * Superadmin — Gestión de planes, add-ons y suscripción por tenant.
 */

const express = require('express');
const router = express.Router();
const PlanService = require('../../services/PlanService');
const AddonService = require('../../services/AddonService');
const TenantService = require('../../services/TenantService');
const authService = require('../../services/AuthService');
const { ROLES } = require('../../utils/constants');

// Guard: solo superadmin
router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) return res.redirect('/');
    next();
});

// ─── GET / — Vista principal ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const [plans, tenantsRaw, addons] = await Promise.all([
            PlanService.getAll(),
            TenantService.getAllTenants(),
            AddonService.getAll()
        ]);
        const tenants = await AddonService.enrichTenants(tenantsRaw, plans);

        const serverData = JSON.stringify({
            addons,
            plans,
            tenants: tenants.map(t => ({
                id: t.id,
                nombre: t.nombre,
                slug: t.slug,
                plan_id: t.plan_id || null,
                plan_nombre: t.plan_nombre || 'Sin plan',
                plan_slug: t.plan_slug || '',
                tamano: t.tamano || 'pequeno',
                addonIds: (t.addons || []).map(a => a.id)
            }))
        });

        res.render('admin/planes', { user: req.user, plans, tenants, addons, serverData });
    } catch (error) {
        console.error('Error al cargar planes:', error);
        res.status(500).render('errors/internal', { error });
    }
});

// ─── PUT /api/planes/:id/precios — Editar precios de un plan ────────────────
router.put('/api/planes/:id/precios', async (req, res) => {
    try {
        const { precio_pequeno, precio_mediano, precio_grande } = req.body;
        const plan = await PlanService.updatePrecios(Number(req.params.id), {
            precio_pequeno, precio_mediano, precio_grande
        });
        res.json({ ok: true, plan });
    } catch (error) {
        console.error('Error al actualizar precios del plan:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar precios' });
    }
});

// ─── GET /api/addons — Listar add-ons ───────────────────────────────────────
router.get('/api/addons', async (req, res) => {
    try {
        const addons = await AddonService.getAll();
        res.json(addons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── PUT /api/addons/:id — Editar precio/nombre de un add-on ────────────────
router.put('/api/addons/:id', async (req, res) => {
    try {
        const addon = await AddonService.update(Number(req.params.id), req.body);
        res.json({ ok: true, addon });
    } catch (error) {
        console.error('Error al actualizar add-on:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar add-on' });
    }
});

// ─── GET /api/tenant/:tenantId/addons — Add-ons de un tenant ────────────────
router.get('/api/tenant/:tenantId/addons', async (req, res) => {
    try {
        const addons = await AddonService.getByTenant(Number(req.params.tenantId));
        res.json(addons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/tenant/:tenantId/addons — Agregar add-on a tenant ───────────
router.post('/api/tenant/:tenantId/addons', async (req, res) => {
    try {
        const { addon_id } = req.body;
        if (!addon_id) return res.status(400).json({ error: 'addon_id requerido' });
        await AddonService.addToTenant(Number(req.params.tenantId), Number(addon_id));
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al agregar add-on al tenant:', error);
        res.status(400).json({ error: error.message || 'Error al agregar add-on' });
    }
});

// ─── DELETE /api/tenant/:tenantId/addons/:addonId — Quitar add-on ──────────
router.delete('/api/tenant/:tenantId/addons/:addonId', async (req, res) => {
    try {
        await AddonService.removeFromTenant(
            Number(req.params.tenantId),
            Number(req.params.addonId)
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al quitar add-on del tenant:', error);
        res.status(400).json({ error: error.message || 'Error al quitar add-on' });
    }
});

// ─── PUT /api/tenant/:tenantId/tamano — Actualizar tamaño del tenant ────────
router.put('/api/tenant/:tenantId/tamano', async (req, res) => {
    try {
        const { tamano } = req.body;
        await AddonService.updateTamano(Number(req.params.tenantId), tamano);
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al actualizar tamaño del tenant:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar tamaño' });
    }
});

module.exports = router;
