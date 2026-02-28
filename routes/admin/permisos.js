/**
 * Panel de permisos - Solo superadmin.
 * Por restaurante: listar usuarios del tenant y asignar permisos por usuario (agrupados por sección).
 * Un usuario con permiso (ej. analitica.ver, eventos.ver) puede usar esa función aunque el plan no la incluya.
 */

const express = require('express');
const router = express.Router();
const authService = require('../../services/AuthService');
const PermisoRepository = require('../../repositories/PermisoRepository');
const TenantService = require('../../services/TenantService');
const { ROLES } = require('../../utils/constants');

router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET /admin/permisos - Página: selector restaurante → usuarios → permisos por secciones
router.get('/', async (req, res) => {
    try {
        const tenants = await TenantService.getAllTenants();
        const secciones = await PermisoRepository.getPermisosAgrupadosPorSeccion();
        const activeTenantId = Number(req.query.tenantId) || (tenants[0] && tenants[0].id) || null;
        const usuarios = activeTenantId ? await PermisoRepository.getUsuariosByTenantId(activeTenantId) : [];
        res.render('admin/permisos', {
            user: req.user,
            tenants,
            secciones,
            usuarios,
            activeTenantId
        });
    } catch (error) {
        console.error('Error al cargar permisos:', error);
        res.status(500).render('error', { error });
    }
});

// GET /admin/permisos/usuarios?tenantId=1 - API: usuarios del tenant
router.get('/usuarios', async (req, res) => {
    try {
        const tenantId = parseInt(req.query.tenantId);
        if (!tenantId) return res.json({ usuarios: [] });
        const usuarios = await PermisoRepository.getUsuariosByTenantId(tenantId);
        res.json({ usuarios });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: error.message || 'Error' });
    }
});

// GET /admin/permisos/usuario/:userId - API: permisos efectivos (para mostrar en panel; si hay user_permisos son esos, si no los del rol)
router.get('/usuario/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (!userId) return res.status(400).json({ error: 'userId inválido' });
        const permisoIds = await PermisoRepository.getEffectivePermisoIdsByUser(userId);
        res.json({ permiso_ids: permisoIds });
    } catch (error) {
        console.error('Error al cargar permisos del usuario:', error);
        res.status(500).json({ error: error.message || 'Error' });
    }
});

// PUT /admin/permisos/usuario/:userId - Asignar permisos directos al usuario
router.put('/usuario/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const permisoIds = Array.isArray(req.body.permiso_ids) ? req.body.permiso_ids.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        if (!userId) return res.status(400).json({ error: 'userId inválido' });
        await PermisoRepository.setPermisosForUser(userId, permisoIds);
        res.json({ success: true, message: 'Permisos guardados. Los cambios se aplican al instante en la próxima recarga o al volver a iniciar sesión.' });
    } catch (error) {
        console.error('Error al actualizar permisos del usuario:', error);
        res.status(500).json({ error: error.message || 'Error al actualizar' });
    }
});

module.exports = router;
