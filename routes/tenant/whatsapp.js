const express = require('express');
const router = express.Router();
const WhatsAppController = require('../../app/Http/Controllers/Tenant/WhatsAppController');
const { requireAuth } = require('../../middleware/auth');
const { attachTenantContext } = require('../../middleware/tenant');

// Todas estas rutas requieren estar logueado y en un contexto de tenant
router.get('/', WhatsAppController.index);
router.post('/connect', WhatsAppController.connect);
router.post('/disconnect', WhatsAppController.disconnect);
router.get('/status', WhatsAppController.status);

module.exports = router;
