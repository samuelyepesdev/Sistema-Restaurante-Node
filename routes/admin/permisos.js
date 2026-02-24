/**
 * Panel de permisos - Solo superadmin. Asignar permisos a cada rol.
 */

const express = require('express');
const router = express.Router();
const authService = require('../../services/AuthService');
const PermisoRepository = require('../../repositories/PermisoRepository');
const { ROLES } = require('../../utils/constants');

router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET /admin/permisos - Página del panel
router.get('/', async (req, res) => {
    try {
        const [roles, permisos] = await Promise.all([
            PermisoRepository.getAllRoles(),
            PermisoRepository.getAllPermisos()
        ]);
        const permisosPorRol = {};
        for (const r of roles) {
            permisosPorRol[r.id] = await PermisoRepository.getPermisoIdsByRol(r.id);
        }
        res.render('admin/permisos', {
            user: req.user,
            roles,
            permisos,
            permisosPorRol
        });
    } catch (error) {
        console.error('Error al cargar permisos:', error);
        res.status(500).render('error', { error });
    }
});

// PUT /admin/permisos/roles/:rolId - Actualizar permisos de un rol
router.put('/roles/:rolId', async (req, res) => {
    try {
        const rolId = parseInt(req.params.rolId);
        const permisoIds = Array.isArray(req.body.permiso_ids) ? req.body.permiso_ids.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        await PermisoRepository.setPermisosForRol(rolId, permisoIds);
        res.json({ success: true, message: 'Permisos actualizados. Los usuarios deberán volver a iniciar sesión para que se apliquen.' });
    } catch (error) {
        console.error('Error al actualizar permisos:', error);
        res.status(500).json({ error: error.message || 'Error al actualizar' });
    }
});

module.exports = router;
