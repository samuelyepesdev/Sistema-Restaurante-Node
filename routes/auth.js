const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authService = require('../services/AuthService');
const TenantRepository = require('../repositories/TenantRepository');
const { requireAuth } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

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

        // Si tiene tenant_id (no es superadmin), comprobar que el restaurante esté activo antes de dar sesión
        const tenantId = result.user.tenant_id;
        const rol = String(result.user.rol || '').toLowerCase();
        if (tenantId != null && rol !== ROLES.SUPERADMIN) {
            const tenant = await TenantRepository.findById(tenantId);
            if (tenant && !tenant.activo) {
                const msg = 'Tu restaurante "' + (tenant.nombre || '') + '" está desactivado. Contacta al administrador.';
                return res.status(403).json({ error: msg });
            }
        }

        // Siempre guardar token en cookie para que la siguiente navegación (GET /admin/tenants, etc.) tenga sesión
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

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
 * Show login page (mensaje en query para mostrar tenant desactivado, etc.)
 */
router.get('/login', (req, res) => {
    const mensaje = req.query.mensaje || '';
    res.render('auth/login', { title: 'Iniciar Sesión', mensaje });
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

