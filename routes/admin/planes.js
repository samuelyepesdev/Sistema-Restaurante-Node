const express = require('express');
const router = express.Router();
const PlanesController = require('../../app/Http/Controllers/Admin/PlanesController');
const authService = require('../../services/AuthService');
const { ROLES } = require('../../utils/constants');

// Guard: solo superadmin
router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) return res.redirect('/');
    next();
});

// GET / - Vista principal
router.get('/', PlanesController.index);

// API Planes & Precios
router.put('/api/planes/:id/precios', PlanesController.updatePrices);

// API Add-ons
router.get('/api/addons', PlanesController.listAddons);
router.put('/api/addons/:id', PlanesController.updateAddon);

// API Tenant Add-ons & Tamano
router.get('/api/tenant/:tenantId/addons', PlanesController.getTenantAddons);
router.post('/api/tenant/:tenantId/addons', PlanesController.addAddonToTenant);
router.delete('/api/tenant/:tenantId/addons/:addonId', PlanesController.removeAddonFromTenant);
router.put('/api/tenant/:tenantId/tamano', PlanesController.updateTenantTamano);

module.exports = router;
