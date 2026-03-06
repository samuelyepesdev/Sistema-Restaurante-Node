const authService = require('../../../services/AuthService');
const TenantRepository = require('../../../repositories/TenantRepository');
const { validationResult } = require('express-validator');
const { ROLES } = require('../../../utils/constants');

class AuthController {
    // GET /auth/login
    static async showLogin(req, res) {
        const mensaje = req.query.mensaje || '';
        res.render('auth/login', { title: 'Iniciar Sesión', mensaje });
    }

    // POST /auth/login
    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Datos inválidos',
                    details: errors.array()
                });
            }

            const { username, password } = req.body;
            const result = await authService.authenticateUser(username, password);

            if (!result.success) {
                return res.status(401).json({ error: result.message });
            }

            const tenantId = result.user.tenant_id;
            const rol = String(result.user.rol || '').toLowerCase();
            if (tenantId != null && rol !== ROLES.SUPERADMIN) {
                const tenant = await TenantRepository.findById(tenantId);
                if (tenant && !tenant.activo) {
                    const msg = 'Tu restaurante "' + (tenant.nombre || '') + '" está desactivado. Contacta al administrador.';
                    return res.status(403).json({ error: msg });
                }
            }

            res.cookie('auth_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({
                success: true,
                user: result.user,
                token: result.token
            });
        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }

    // GET /auth/logout
    static async logout(req, res) {
        res.clearCookie('auth_token');
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Sesión cerrada' });
        }
        res.redirect('/auth/login');
    }

    // POST /auth/logout (duplicate for convenience)
    static async logoutPost(req, res) {
        res.clearCookie('auth_token');
        res.json({ success: true, message: 'Sesión cerrada' });
    }

    // GET /auth/me
    static async me(req, res) {
        try {
            const user = await authService.getUserById(req.user.id);
            if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
            res.json({ user });
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            res.status(500).json({ error: 'Error al obtener usuario' });
        }
    }

    // GET /auth/cambiar-password
    static async showChangePassword(req, res) {
        res.render('auth/cambiar-password', {
            title: 'Cambiar contraseña',
            user: req.user,
            success: req.query.ok === '1'
        });
    }

    // POST /auth/cambiar-password
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const msg = errors.array().map(e => e.msg).join('. ');
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({ error: msg });
                }
                return res.render('auth/cambiar-password', {
                    title: 'Cambiar contraseña',
                    user: req.user,
                    error: msg
                });
            }

            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            const result = await authService.changePassword(userId, currentPassword, newPassword);

            if (!result.success) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({ error: result.message });
                }
                return res.render('auth/cambiar-password', {
                    title: 'Cambiar contraseña',
                    user: req.user,
                    error: result.message
                });
            }

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Contraseña actualizada.' });
            }
            res.redirect('/auth/cambiar-password?ok=1');
        } catch (error) {
            console.error('Error en cambiar-password:', error);
            res.status(500).json({ error: 'Error al procesar la solicitud' });
        }
    }
}

module.exports = AuthController;
