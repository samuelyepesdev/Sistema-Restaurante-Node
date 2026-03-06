const express = require('express');
const router = express.Router();
const ClientesController = require('../../app/Http/Controllers/Tenant/ClientesController');
const { requirePermission } = require('../../middleware/auth');
const BaseRequest = require('../../app/Http/Requests/BaseRequest');
const StoreClienteRequest = require('../../app/Http/Requests/Tenant/StoreClienteRequest');

// GET /clientes - Listado
router.get('/', requirePermission('clientes.ver'), ClientesController.index);

// GET /clientes/buscar - Buscar
router.get('/buscar', requirePermission('clientes.ver'), ClientesController.search);

// GET /clientes/:id - Ver por ID
router.get('/:id', requirePermission('clientes.ver'), ClientesController.show);

// POST /clientes - Crear (con validación modular)
router.post('/', [
    requirePermission('clientes.crear'),
    ...BaseRequest.validate(StoreClienteRequest)
], ClientesController.store);

// PUT /clientes/:id - Actualizar (mismas reglas que store por ahora)
router.put('/:id', [
    requirePermission('clientes.editar'),
    ...BaseRequest.validate(StoreClienteRequest)
], ClientesController.update);

// DELETE /clientes/:id - Eliminar
router.delete('/:id', requirePermission('clientes.eliminar'), ClientesController.destroy);

module.exports = router;
