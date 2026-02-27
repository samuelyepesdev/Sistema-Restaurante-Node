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
        res.status(500).render('error', { error });
    }
});

module.exports = router;
