const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authService = require('../services/AuthService');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', [
    body('username').notEmpty().withMessage('Usuario es requerido'),
    body('password').notEmpty().withMessage('Contraseña es requerida')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors.array()
            });
        }

        const { username, password } = req.body;

        // Authenticate user
        const result = await authService.authenticateUser(username, password);

        if (!result.success) {
            return res.status(401).json({ error: result.message });
        }

        // Set token in cookie so server-side redirects and page loads see the user
        const isJsonRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') !== -1);
        if (!isJsonRequest) {
            res.cookie('auth_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }

        // Return user data and token
        res.json({
            success: true,
            user: result.user,
            token: result.token
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

/**
 * GET /auth/login
 * Show login page
 */
router.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Iniciar Sesión' });
});

/**
 * POST /auth/logout
 * Logout user (clear token)
 */
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true, message: 'Sesión cerrada' });
});

/**
 * GET /auth/logout
 * Logout user (web redirect)
 */
router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/auth/login');
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

module.exports = router;

