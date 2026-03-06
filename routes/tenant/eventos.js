const express = require('express');
const router = express.Router();
const EventosController = require('../../app/Http/Controllers/Tenant/EventosController');
const { requirePermission } = require('../../middleware/auth');

// GET /eventos - Listado
router.get('/', requirePermission('eventos.ver'), EventosController.index);

// GET /eventos/activos - Listado activos API
router.get('/activos', requirePermission('eventos.ver', 'ventas_evento.realizar'), EventosController.listActivos);

// POST /eventos - Crear
router.post('/', requirePermission('eventos.crear'), EventosController.store);

// PUT /eventos/:id - Editar
router.put('/:id', requirePermission('eventos.editar'), EventosController.update);

// DELETE /eventos/:id - Eliminar
router.delete('/:id', requirePermission('eventos.eliminar'), EventosController.destroy);

module.exports = router;
