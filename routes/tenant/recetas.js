const express = require('express');
const router = express.Router();
const RecetasController = require('../../app/Http/Controllers/Tenant/RecetasController');
const { requirePermission } = require('../../middleware/auth');

// GET /recetas - Vista principal
router.get('/', RecetasController.index);

// API Recetas
router.get('/api/recetas', RecetasController.list);
router.get('/api/recetas/:id', RecetasController.show);
router.get('/api/recetas/producto/:productoId', RecetasController.showByProductoId);
router.post('/api/recetas', requirePermission('recetas.editar'), RecetasController.store);
router.put('/api/recetas/:id', requirePermission('recetas.editar'), RecetasController.update);
router.delete('/api/recetas/:id', requirePermission('recetas.editar'), RecetasController.destroy);

// API Helpers
router.get('/api/productos', RecetasController.listProductos);
router.get('/api/insumos', RecetasController.listInsumos);

module.exports = router;
