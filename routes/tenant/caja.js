const express = require('express');
const router = express.Router();
const CajaController = require('../../app/Http/Controllers/Tenant/CajaController');
const { requirePermission } = require('../../middleware/auth');

router.get('/', requirePermission('caja.ver'), CajaController.index);
router.get('/historial', requirePermission('caja.ver'), CajaController.historial);
router.post('/abrir', requirePermission('caja.abrir_cerrar'), CajaController.abrir);
router.post('/:id/cerrar', requirePermission('caja.abrir_cerrar'), CajaController.cerrar);
router.post('/:id/movimiento', requirePermission('caja.movimientos'), CajaController.movimiento);

module.exports = router;
