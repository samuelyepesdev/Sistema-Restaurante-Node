const express = require('express');
const router = express.Router();
const VentasController = require('../../app/Http/Controllers/Admin/VentasController');
const authService = require('../../services/AuthService');
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
router.get('/', VentasController.index);

// DELETE /:id - Eliminar factura
router.delete('/:id', VentasController.destroy);

module.exports = router;
