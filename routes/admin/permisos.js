const express = require('express');
const router = express.Router();
const PermisosController = require('../../app/Http/Controllers/Admin/PermisosController');
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
router.get('/', PermisosController.index);

// API Usuarios por tenant
router.get('/usuarios', PermisosController.listUsuarios);

// API Permisos por usuario
router.get('/usuario/:userId', PermisosController.getUsuarioPermisos);
router.put('/usuario/:userId', PermisosController.updateUsuarioPermisos);

module.exports = router;
