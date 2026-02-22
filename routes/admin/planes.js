/**
 * Rutas de administración de planes (superadmin)
 */

const express = require('express');
const router = express.Router();
const PlanService = require('../../services/PlanService');
const authService = require('../../services/AuthService');
const { ROLES } = require('../../utils/constants');

router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

router.get('/', async (req, res) => {
    try {
        const plans = await PlanService.getAll();
        res.render('admin/planes', {
            user: req.user,
            plans
        });
    } catch (error) {
        console.error('Error al listar planes:', error);
        res.status(500).render('error', { error });
    }
});

module.exports = router;
