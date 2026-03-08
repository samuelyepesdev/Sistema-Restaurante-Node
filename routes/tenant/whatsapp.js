const express = require('express');
const router = express.Router();
const WhatsAppController = require('../../app/Http/Controllers/Tenant/WhatsAppController');
const { requirePermission } = require('../../middleware/auth');

// Todas estas rutas requieren estar logueado y en un contexto de tenant
router.get('/', WhatsAppController.index);
router.post('/connect', requirePermission('whatsapp.ajustes'), WhatsAppController.connect);
router.post('/disconnect', requirePermission('whatsapp.ajustes'), WhatsAppController.disconnect);
router.post('/save-config', requirePermission('whatsapp.ajustes'), WhatsAppController.saveConfig);
router.get('/status', WhatsAppController.status);

module.exports = router;
