const express = require('express');
const router = express.Router();
const AnaliticaController = require('../../app/Http/Controllers/Tenant/AnaliticaController');
const { requireRole } = require('../../middleware/auth');

// GET /analitica - Vista principal
router.get(['/', ''], requireRole('admin'), AnaliticaController.index);

// API Datos
router.get('/datos', requireRole('admin'), AnaliticaController.getDatos);

module.exports = router;
