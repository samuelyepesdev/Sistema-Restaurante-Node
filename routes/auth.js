const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const AuthController = require('../app/Http/Controllers/AuthController');
const { requireAuth } = require('../middleware/auth');

// GET /auth/login - Vista
router.get('/login', AuthController.showLogin);

// POST /auth/login - Logic
router.post('/login', [
    body('username').notEmpty().withMessage('Usuario es requerido'),
    body('password').notEmpty().withMessage('Contraseña es requerida')
], AuthController.login);

// GET /auth/logout - Redirect
router.get('/logout', AuthController.logout);

// POST /auth/logout - API
router.post('/logout', AuthController.logoutPost);

// GET /auth/me - Profile API
router.get('/me', requireAuth, AuthController.me);

// GET /auth/cambiar-password - Vista
router.get('/cambiar-password', requireAuth, AuthController.showChangePassword);

// POST /auth/cambiar-password - Logic
router.post('/cambiar-password', requireAuth, [
    body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
    body('newPasswordConfirm').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('La confirmación no coincide con la nueva contraseña');
        }
        return true;
    })
], AuthController.changePassword);

module.exports = router;
