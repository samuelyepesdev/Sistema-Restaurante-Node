const express = require('express');
const router = express.Router();
const AuthController = require('../app/Http/Controllers/AuthController');
const { requireAuth } = require('../middleware/auth');
const BaseRequest = require('../app/Http/Requests/BaseRequest');
const LoginRequest = require('../app/Http/Requests/Auth/LoginRequest');
const ChangePasswordRequest = require('../app/Http/Requests/Auth/ChangePasswordRequest');

// GET /auth/login - Vista
router.get('/login', AuthController.showLogin);

// POST /auth/login - Logic
router.post('/login', BaseRequest.validate(LoginRequest), AuthController.login);

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
