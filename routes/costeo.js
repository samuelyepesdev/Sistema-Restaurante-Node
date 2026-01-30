/**
 * Costeo Routes - Insumos, recetas y configuración de costeo
 * Related to: InsumoService, RecetaService, CosteoService, views/costeo.ejs
 */

const express = require('express');
const router = express.Router();
const InsumoService = require('../services/InsumoService');
const RecetaService = require('../services/RecetaService');
const CosteoService = require('../services/CosteoService');
const ProductService = require('../services/ProductService');

function getTenantId(req) {
    const id = req.tenant?.id;
    if (!id) throw new Error('Contexto de tenant no disponible');
    return id;
}

// GET /costeo - Página principal del módulo
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { productos } = await ProductService.getAllForView(tenantId);
        res.render('costeo', {
            productos: productos || [],
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error al cargar costeo:', error);
        if (error.message === 'Contexto de tenant no disponible') {
            return res.status(403).render('error', { error: { message: error.message } });
        }
        res.status(500).render('error', {
            error: { message: 'Error al cargar costeo', stack: error.stack }
        });
    }
});

// --- Insumos ---
router.get('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await InsumoService.list(tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar insumos:', error);
        res.status(500).json({ error: error.message || 'Error al listar insumos' });
    }
});

router.post('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const created = await InsumoService.create(tenantId, req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(400).json({ error: error.message || 'Error al crear insumo' });
    }
});

router.get('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const insumo = await InsumoService.getById(id, tenantId);
        if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
        res.json(insumo);
    } catch (error) {
        console.error('Error al obtener insumo:', error);
        res.status(500).json({ error: error.message || 'Error al obtener insumo' });
    }
});

router.put('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await InsumoService.update(id, tenantId, req.body);
        res.json({ message: 'Insumo actualizado' });
    } catch (error) {
        console.error('Error al actualizar insumo:', error);
        if (error.message === 'Insumo no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || 'Error al actualizar insumo' });
    }
});

router.delete('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await InsumoService.delete(id, tenantId);
        res.json({ message: 'Insumo eliminado' });
    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        if (error.message === 'Insumo no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Error al eliminar insumo' });
    }
});

// --- Recetas ---
router.get('/api/recetas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await RecetaService.list(tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar recetas:', error);
        res.status(500).json({ error: error.message || 'Error al listar recetas' });
    }
});

router.get('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const receta = await RecetaService.getById(id, tenantId);
        if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(receta);
    } catch (error) {
        console.error('Error al obtener receta:', error);
        res.status(500).json({ error: error.message || 'Error al obtener receta' });
    }
});

router.post('/api/recetas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const recetaId = await RecetaService.create(tenantId, req.body);
        res.status(201).json({ id: recetaId, message: 'Receta creada' });
    } catch (error) {
        console.error('Error al crear receta:', error);
        res.status(400).json({ error: error.message || 'Error al crear receta' });
    }
});

router.put('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await RecetaService.update(id, tenantId, req.body);
        res.json({ message: 'Receta actualizada' });
    } catch (error) {
        console.error('Error al actualizar receta:', error);
        if (error.message === 'Receta no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || 'Error al actualizar receta' });
    }
});

router.delete('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await RecetaService.delete(id, tenantId);
        res.json({ message: 'Receta eliminada' });
    } catch (error) {
        console.error('Error al eliminar receta:', error);
        if (error.message === 'Receta no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Error al eliminar receta' });
    }
});

// --- Costeo por producto (para pantalla de productos) ---
router.get('/api/costeo/producto/:productoId', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const productoId = parseInt(req.params.productoId, 10);
        const costeo = await CosteoService.getCosteoByProductoId(productoId, tenantId);
        if (!costeo) return res.status(404).json({ error: 'Este producto no tiene receta asociada' });
        res.json(costeo);
    } catch (error) {
        console.error('Error al obtener costeo por producto:', error);
        res.status(500).json({ error: error.message || 'Error al obtener costeo' });
    }
});

// --- Costeo (cálculo por receta) ---
router.get('/api/costeo/receta/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const costeo = await CosteoService.getCosteoReceta(id, tenantId);
        if (!costeo) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(costeo);
    } catch (error) {
        console.error('Error al calcular costeo:', error);
        res.status(500).json({ error: error.message || 'Error al calcular costeo' });
    }
});

// --- Alertas de costeo ---
router.get('/api/costeo/alertas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const alertas = await CosteoService.getAlertas(tenantId);
        res.json(alertas);
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ error: error.message || 'Error al obtener alertas' });
    }
});

// --- Configuración costeo ---
router.get('/api/costeo/config', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const config = await CosteoService.getConfig(tenantId);
        res.json(config);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ error: error.message || 'Error al obtener configuración' });
    }
});

router.put('/api/costeo/config', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await CosteoService.saveConfig(tenantId, req.body);
        res.json({ message: 'Configuración guardada' });
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        res.status(400).json({ error: error.message || 'Error al guardar configuración' });
    }
});

module.exports = router;
