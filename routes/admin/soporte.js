const express = require('express');
const router = express.Router();
const SoporteController = require('../../app/Http/Controllers/Admin/SoporteController');

router.get('/', SoporteController.index);
router.post('/:id/responder', SoporteController.responder);
router.post('/:id/estado', SoporteController.cambiarEstado);

module.exports = router;
