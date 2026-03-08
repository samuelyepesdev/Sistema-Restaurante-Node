const express = require('express');
const router = express.Router();
const ProveedoresController = require('../../app/Http/Controllers/Tenant/ProveedoresController');
const { requirePermission } = require('../../middleware/auth');

// Listar proveedores
router.get('/', requirePermission('proveedores.ver'), ProveedoresController.index);

// Obtener un proveedor
router.get('/:id', requirePermission('proveedores.ver'), ProveedoresController.show);

// Crear proveedor
router.post('/', requirePermission('proveedores.editar'), ProveedoresController.store);

// Actualizar proveedor
router.put('/:id', requirePermission('proveedores.editar'), ProveedoresController.update);

// Eliminar proveedor
router.delete('/:id', requirePermission('proveedores.editar'), ProveedoresController.destroy);

module.exports = router;
