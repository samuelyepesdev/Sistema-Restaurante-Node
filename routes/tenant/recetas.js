/**
 * Recetas - Recetas vinculadas a productos (usan insumos del inventario)
 */

const express = require('express');
const router = express.Router();
const RecetaService = require('../../services/RecetaService');
const ProductService = require('../../services/ProductService');
const InventarioService = require('../../services/InventarioService');
const { requirePermission } = require('../../middleware/auth');

function getTenantId(req) {
    const id = req.tenant?.id;
    if (!id) throw new Error('Contexto de tenant no disponible');
    return id;
}

// GET /recetas - Vista principal
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        let recetas = await RecetaService.list(tenantId);
        const RecetaRepository = require('../../repositories/RecetaRepository');
        if (recetas && recetas.length) {
            recetas = await Promise.all(recetas.map(async (r) => {
                r.ingredientes = await RecetaRepository.getIngredientes(r.id);
                return r;
            }));
        }
        const { productos } = await ProductService.getAllForView(tenantId);
        res.render('recetas/index', {
            user: req.user,
            tenant: req.tenant,
            recetas: recetas || [],
            productos: productos || [],
            allowedByPlan: res.locals.allowedByPlan || {}
        });
    } catch (e) {
        if (e.message === 'Contexto de tenant no disponible') {
            return res.status(403).render('errors/internal', { error: { message: e.message } });
        }
        console.error('Error recetas:', e);
        res.status(500).render('errors/internal', { error: e });
    }
});

// GET /recetas/api/recetas
router.get('/api/recetas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await RecetaService.list(tenantId);
        res.json(list || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /recetas/api/recetas/:id
router.get('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const receta = await RecetaService.getById(req.params.id, tenantId);
        if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(receta);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /recetas/api/recetas/producto/:productoId
router.get('/api/recetas/producto/:productoId', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const receta = await RecetaService.getByProductoId(req.params.productoId, tenantId);
        res.json(receta || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /recetas/api/productos - Para dropdown
router.get('/api/productos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { productos } = await ProductService.getAllForView(tenantId);
        res.json(productos || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /recetas/api/insumos - Insumos para ingredientes
router.get('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await InventarioService.listInsumos(tenantId, {});
        res.json(list || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /recetas/api/recetas
router.post('/api/recetas', requirePermission('recetas.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = await RecetaService.create(tenantId, req.body);
        res.status(201).json({ id });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT /recetas/api/recetas/:id
router.put('/api/recetas/:id', requirePermission('recetas.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await RecetaService.update(req.params.id, tenantId, req.body);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE /recetas/api/recetas/:id
router.delete('/api/recetas/:id', requirePermission('recetas.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await RecetaService.delete(req.params.id, tenantId);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
