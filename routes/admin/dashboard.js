const express = require('express');
const router = express.Router();
const DashboardController = require('../../app/Http/Controllers/Admin/DashboardController');
const authService = require('../../services/Shared/AuthService');
const { ROLES } = require('../../utils/constants');

// Guard: solo superadmin
router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET / - Vista principal
router.get('/', DashboardController.index);

// API Stats en vivo
router.get('/live-stats', DashboardController.getLiveStats);

module.exports = router;
