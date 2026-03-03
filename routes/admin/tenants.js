const express = require('express');
const router = express.Router();
const TenantService = require('../../services/TenantService');
const TenantUserService = require('../../services/TenantUserService');
const TenantAuditService = require('../../services/TenantAuditService');
const CategoryService = require('../../services/CategoryService');
const PlanService = require('../../services/PlanService');
const { syncPlanPermissionsToTenantUsers } = require('../../services/PlanPermissionSyncService');
const { ROLES } = require('../../utils/constants');
const authService = require('../../services/AuthService');

// Solo superadmins: si no lo es, redirigir a / (no mostrar 403 para no dejar pegado)
router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

router.get('/', async (req, res) => {
    try {
        const tenants = await TenantService.getAllTenants();
        const plans = await PlanService.getAll();
        const tenantId = Number(req.query.tenantId) || (tenants[0] && tenants[0].id);
        const tenantUsers = tenantId ? await TenantUserService.getUsersByTenant(tenantId) : [];
        res.render('admin/tenants', {
            user: req.user,
            tenants,
            plans,
            tenantUsers,
            activeTenantId: tenantId
        });
    } catch (error) {
        console.error('Error al listar tenants:', error);
        res.status(500).render('errors/internal', { error });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, email, slug, config, plan_id, admin_username, admin_password, admin_email, admin_nombre_completo, nit, direccion, telefono, ciudad, regimen_fiscal } = req.body;
        if (!nombre || !slug || !admin_username || !admin_password) {
            return res.status(400).send('Faltan nombre del restaurante, slug, usuario admin o contraseña.');
        }
        const configObj = typeof config === 'string' ? JSON.parse(config || '{}') : (config || {});
        const tenant = await TenantService.createTenant({
            nombre, email, slug, config: configObj, plan_id: plan_id || 1,
            nit, direccion, telefono, ciudad, regimen_fiscal
        });
        const tenantId = tenant.id;
        const tipoNegocio = configObj.tipo_negocio || 'restaurante';
        await CategoryService.seedDefaultCategories(tenantId, tipoNegocio);
        await TenantUserService.createTenantUser(tenantId, {
            username: admin_username,
            password: admin_password,
            email: admin_email || null,
            nombre_completo: admin_nombre_completo || null,
            rol_nombre: 'admin'
        });
        await TenantAuditService.log({
            tenantId,
            userId: req.user?.id || null,
            accion: 'crear_tenant',
            detalles: `slug=${slug} admin=${admin_username}`
        });
        res.redirect('/admin/tenants');
    } catch (error) {
        console.error('Error al crear tenant:', error);
        res.status(400).send(error.message);
    }
});

router.put('/:id', async (req, res) => {
    try {
        const update = {};

        // Campos de texto simples
        const textFields = ['nombre', 'email', 'nit', 'direccion', 'telefono', 'ciudad', 'regimen_fiscal'];
        textFields.forEach(f => {
            if (req.body[f] !== undefined) {
                update[f] = req.body[f];
            }
        });

        // Estado activo
        if (req.body.activo !== undefined && req.body.activo !== null && req.body.activo !== '') {
            update.activo = req.body.activo === 'true' || req.body.activo === true || req.body.activo === 1 || req.body.activo === '1';
        }

        // Configuración JSON
        if (req.body.config !== undefined && req.body.config !== null) {
            update.config = typeof req.body.config === 'string' ? JSON.parse(req.body.config) : req.body.config;
        }

        // Plan de suscripción
        const { plan_id } = req.body;
        const planChanged = plan_id !== undefined && plan_id !== null && plan_id !== '';
        if (planChanged) update.plan_id = plan_id;
        await TenantService.updateTenant(req.params.id, update);
        if (planChanged && plan_id) {
            await syncPlanPermissionsToTenantUsers(Number(req.params.id), Number(plan_id));
        }
        await TenantAuditService.log({
            tenantId: req.params.id,
            userId: req.user?.id || null,
            accion: 'actualizar_config',
            detalles: `Activo=${req.body.activo}${planChanged ? ` Plan=${plan_id}` : ''}`
        });
        if (planChanged) {
            res.status(200).json({ planUpdated: true });
        } else {
            res.sendStatus(204);
        }
    } catch (error) {
        console.error('Error al actualizar tenant:', error);
        res.status(400).send(error.message);
    }
});

router.post('/:id/users', async (req, res) => {
    try {
        const { username, password, email, nombre_completo, rol_nombre } = req.body;
        const userId = await TenantUserService.createTenantUser(req.params.id, {
            username,
            password,
            email,
            nombre_completo,
            rol_nombre
        });
        await TenantAuditService.log({
            tenantId: req.params.id,
            userId: userId || null,
            accion: 'crear_usuario',
            detalles: `user=${username} rol=${rol_nombre}`
        });
        res.redirect('/admin/tenants');
    } catch (error) {
        console.error('Error al crear usuario del tenant:', error);
        res.status(400).send(error.message);
    }
});

router.patch('/:tenantId/users/:userId/roles', async (req, res) => {
    try {
        const { rol_nombre } = req.body;
        await TenantUserService.assignRoles(req.params.userId, req.params.tenantId, rol_nombre);
        await TenantAuditService.log({
            tenantId: req.params.tenantId,
            userId: req.params.userId,
            accion: 'asignar_rol',
            detalles: `rol=${rol_nombre}`
        });
        res.sendStatus(204);
    } catch (error) {
        console.error('Error al actualizar rol del usuario:', error);
        res.status(400).send(error.message);
    }
});

router.post('/:tenantId/users/:userId/status', async (req, res) => {
    try {
        const { activo } = req.body;
        const activoBool = activo === true || activo === 'true';
        await TenantUserService.changeTenantUserStatus(req.params.userId, req.params.tenantId, activoBool);
        await TenantAuditService.log({
            tenantId: req.params.tenantId,
            userId: req.params.userId,
            accion: activoBool ? 'activar_usuario' : 'bloquear_usuario',
            detalles: null
        });
        res.sendStatus(204);
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        res.status(400).send(error.message);
    }
});

// PUT /admin/tenants/:tenantId/users/:userId/password - Establecer nueva contraseña (solo superadmin; sin contraseña actual)
router.put('/:tenantId/users/:userId/password', async (req, res) => {
    try {
        const { newPassword, newPasswordConfirm } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }
        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({ error: 'La confirmación no coincide con la nueva contraseña.' });
        }
        await TenantUserService.setPassword(req.params.userId, req.params.tenantId, newPassword);
        await TenantAuditService.log({
            tenantId: req.params.tenantId,
            userId: req.user?.id || null,
            accion: 'cambiar_password_usuario',
            detalles: `usuario_id=${req.params.userId}`
        });
        res.status(200).json({ success: true, message: 'Contraseña actualizada.' });
    } catch (error) {
        console.error('Error al cambiar contraseña del usuario:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar la contraseña.' });
    }
});

router.post('/:id/status', async (req, res) => {
    try {
        const { activo } = req.body;
        const activoBool = activo === true || activo === 'true';
        await TenantService.changeTenantStatus(req.params.id, activoBool);
        await TenantAuditService.log({
            tenantId: req.params.id,
            userId: req.user?.id || null,
            accion: activoBool ? 'activar_tenant' : 'desactivar_tenant',
            detalles: null
        });
        res.sendStatus(204);
    } catch (error) {
        console.error('Error al cambiar estado del tenant:', error);
        res.status(400).send(error.message);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (req.params.id == 1) { // No permitimos borrar el tenant principal para evitar desastres
            return res.status(403).json({ success: false, message: 'No se puede eliminar el restaurante principal.' });
        }
        await TenantService.deleteTenant(req.params.id);

        // Log auditing globally against a null tenant or super tenant?
        // Wait, the tenant vanishes, so logging against it fails if FK tenant_id is on tenant_audit.
        // That's why we deleted tenant_audit for this tenant_id in the service!

        res.status(200).json({ success: true, message: 'Restaurante eliminado permanentemente.' });
    } catch (error) {
        console.error('Error al eliminar tenant:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al eliminar restaurante.' });
    }
});

// POST /admin/tenants/:id/seed-categorias - Crear categorías por defecto según tipo de negocio
router.post('/:id/seed-categorias', async (req, res) => {
    try {
        const tenantId = req.params.id;
        const tenant = await TenantService.getTenantById(tenantId);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant no encontrado' });
        }
        const tipoNegocio = (tenant.config && tenant.config.tipo_negocio) ? tenant.config.tipo_negocio : 'restaurante';
        const result = await CategoryService.seedDefaultCategories(tenantId, tipoNegocio);
        return res.json({ message: 'Categorías creadas', inserted: result.inserted });
    } catch (error) {
        console.error('Error al sembrar categorías:', error);
        res.status(500).json({ error: error.message || 'Error al crear categorías' });
    }
});

module.exports = router;
