const express = require('express');
const router = express.Router();
const ClientesController = require('../../app/Http/Controllers/Tenant/ClientesController');
const { requirePermission } = require('../../middleware/auth');

// GET /clientes - Listado
router.get('/', requirePermission('clientes.ver'), ClientesController.index);

// GET /clientes/buscar - Buscar
router.get('/buscar', requirePermission('clientes.ver'), ClientesController.search);

// GET /clientes/:id - Ver por ID
router.get('/:id', requirePermission('clientes.ver'), ClientesController.show);

// POST /clientes - Crear
router.post('/', requirePermission('clientes.crear'), ClientesController.store);

// PUT /clientes/:id - Actualizar
router.put('/:id', requirePermission('clientes.editar'), ClientesController.update);

// DELETE /clientes/:id - Eliminar
router.delete('/:id', requirePermission('clientes.eliminar'), ClientesController.destroy);

module.exports = router;
