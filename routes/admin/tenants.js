const express = require('express');
const router = express.Router();
const TenantService = require('../../services/TenantService');
const TenantUserService = require('../../services/TenantUserService');
const TenantAuditService = require('../../services/TenantAuditService');
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
        const tenantId = Number(req.query.tenantId) || (tenants[0] && tenants[0].id);
        const tenantUsers = tenantId ? await TenantUserService.getUsersByTenant(tenantId) : [];
        res.render('admin/tenants', {
            user: req.user,
            tenants,
            tenantUsers,
            activeTenantId: tenantId
        });
    } catch (error) {
        console.error('Error al listar tenants:', error);
        res.status(500).render('error', { error });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, slug, config, admin_username, admin_password, admin_email, admin_nombre_completo } = req.body;
        if (!nombre || !slug || !admin_username || !admin_password) {
            return res.status(400).send('Faltan nombre del restaurante, slug, usuario admin o contraseña.');
        }
        const tenant = await TenantService.createTenant({ nombre, slug, config: JSON.parse(config || '{}') });
        const tenantId = tenant.id;
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
        const { nombre, activo, config } = req.body;
        await TenantService.updateTenant(req.params.id, {
            nombre,
            activo: activo === 'true',
            config: JSON.parse(config || '{}')
        });
        await TenantAuditService.log({
            tenantId: req.params.id,
            userId: req.user?.id || null,
            accion: 'actualizar_config',
            detalles: `Activo=${activo}`
        });
        res.sendStatus(204);
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
        await TenantUserService.changeTenantUserStatus(req.params.userId, req.params.tenantId, activo === 'true');
        await TenantAuditService.log({
            tenantId: req.params.tenantId,
            userId: req.params.userId,
            accion: activo === 'true' ? 'activar_usuario' : 'bloquear_usuario',
            detalles: null
        });
        res.sendStatus(204);
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        res.status(400).send(error.message);
    }
});

router.post('/:id/status', async (req, res) => {
    try {
        const { activo } = req.body;
        await TenantService.changeTenantStatus(req.params.id, activo === 'true');
        await TenantAuditService.log({
            tenantId: req.params.id,
            userId: req.user?.id || null,
            accion: activo === 'true' ? 'activar_tenant' : 'desactivar_tenant',
            detalles: null
        });
        res.sendStatus(204);
    } catch (error) {
        console.error('Error al cambiar estado del tenant:', error);
        res.status(400).send(error.message);
    }
});

module.exports = router;
