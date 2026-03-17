const express = require('express');
const router = express.Router();
const SoporteController = require('../../app/Http/Controllers/Tenant/SoporteController');

router.get('/', SoporteController.index);
router.post('/enviar', SoporteController.enviar);

module.exports = router;
