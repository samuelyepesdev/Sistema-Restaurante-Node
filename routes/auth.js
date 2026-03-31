const express = require('express');
const router = express.Router();
const AuthController = require('../app/Http/Controllers/AuthController');
const { requireAuth } = require('../middleware/auth');
const BaseRequest = require('../app/Http/Requests/BaseRequest');
const LoginRequest = require('../app/Http/Requests/Auth/LoginRequest');
const ChangePasswordRequest = require('../app/Http/Requests/Auth/ChangePasswordRequest');

const rateLimit = require('express-rate-limit');

// Bloquear ataques de fuerza bruta al login (máx 5 intentos / 15 min)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: 'Demasiados intentos de inicio de sesión fallidos, por favor intente de nuevo en 15 minutos.' },
    standardHeaders: true, 
    legacyHeaders: false,
});

// GET /auth/login - Vista
router.get('/login', AuthController.showLogin);

// POST /auth/login - Logic
router.post('/login', loginLimiter, BaseRequest.validate(LoginRequest), AuthController.login);

// GET /auth/logout - Redirect
router.get('/logout', AuthController.logout);

// POST /auth/logout - API
router.post('/logout', AuthController.logoutPost);

// GET /auth/me - Profile API
router.get('/me', requireAuth, AuthController.me);

// GET /auth/cambiar-password - Vista
router.get('/cambiar-password', requireAuth, AuthController.showChangePassword);

// POST /auth/cambiar-password - Logic
router.post('/cambiar-password', requireAuth, BaseRequest.validate(ChangePasswordRequest), AuthController.changePassword);

module.exports = router;
