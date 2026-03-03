/**
 * Inventario - Insumos con stock y movimientos (entrada, salida, ajuste)
 */

const express = require('express');
const router = express.Router();
const InventarioService = require('../../services/InventarioService');
const InsumoService = require('../../services/InsumoService');
const { requirePermission } = require('../../middleware/auth');

function getTenantId(req) {
    const id = req.tenant?.id;
    if (!id) throw new Error('Contexto de tenant no disponible');
    return id;
}

// GET /inventario - Vista principal
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const insumos = await InventarioService.listInsumos(tenantId, {});
        const resumen = await InventarioService.getResumenValorizacion(tenantId);

        const TemaRepository = require('../../repositories/TemaRepository');
        const ParametroService = require('../../services/ParametroService');
        const temaCat = await TemaRepository.findByName('CATEGORIAS DE INSUMO', tenantId);
        const temaUni = await TemaRepository.findByName('UNIDADES DE COMPRA', tenantId);
        let categoriasInsumo = [], unidadesCompra = [];
        if (temaCat) categoriasInsumo = await ParametroService.getByTemaId(temaCat.id, tenantId);
        if (temaUni) unidadesCompra = await ParametroService.getByTemaId(temaUni.id, tenantId);

        res.render('inventario/index', {
            user: req.user,
            tenant: req.tenant,
            insumos: insumos || [],
            resumen: resumen || {},
            allowedByPlan: res.locals.allowedByPlan || {},
            categoriasInsumo,
            unidadesCompra
        });
    } catch (e) {
        if (e.message === 'Contexto de tenant no disponible') {
            return res.status(403).render('errors/internal', { error: { message: e.message } });
        }
        console.error('Error inventario:', e);
        res.status(500).render('errors/internal', { error: e });
    }
});

// GET /inventario/api/insumos - Listar insumos con stock
router.get('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await InventarioService.listInsumos(tenantId, { q: req.query.q });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message || 'Error al listar' });
    }
});

// GET /inventario/api/resumen
router.get('/api/resumen', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const resumen = await InventarioService.getResumenValorizacion(tenantId);
        res.json(resumen);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /inventario/api/lista-mercado?incluir_cerca=1 - Insumos bajo stock (y opcionalmente cerca del mínimo) para lista de compras
router.get('/api/lista-mercado', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const incluirCerca = req.query.incluir_cerca === '1' || req.query.incluir_cerca === 'true';
        const result = await InventarioService.getListaMercado(tenantId, incluirCerca);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /inventario/api/check-producto/:productoId?cantidad=1 - Para POS/mesas: verificar si hay stock para producto con receta
router.get('/api/check-producto/:productoId', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const cantidad = parseInt(req.query.cantidad, 10) || 1;
        const result = await InventarioService.checkStockParaProducto(tenantId, req.params.productoId, cantidad);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /inventario/api/movimientos
router.get('/api/movimientos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await InventarioService.getMovimientos(tenantId, {
            insumo_id: req.query.insumo_id,
            tipo: req.query.tipo
        });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /inventario/api/insumos - Crear insumo (inventario.editar)
router.post('/api/insumos', requirePermission('inventario.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = await InsumoService.create(tenantId, req.body);

        if (req.body.stock_inicial && parseFloat(req.body.stock_inicial) > 0) {
            const stock_inicial = parseFloat(req.body.stock_inicial);
            const cantidad_compra = parseFloat(req.body.cantidad_compra) || 1;
            const precio_compra = parseFloat(req.body.precio_compra) || 0;
            const costo_unitario = (precio_compra / cantidad_compra) || 0;

            await InventarioService.registrarEntrada(tenantId, {
                insumo_id: id,
                cantidad: stock_inicial,
                costo_unitario: costo_unitario,
                referencia: 'Stock inicial'
            });
        }

        res.status(201).json({ id });
    } catch (e) {
        res.status(400).json({ error: e.message || 'Error al crear' });
    }
});

// PUT /inventario/api/insumos/:id
router.put('/api/insumos/:id', requirePermission('inventario.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await InsumoService.update(req.params.id, tenantId, req.body);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// POST /inventario/api/movimientos/entrada
router.post('/api/movimientos/entrada', requirePermission('inventario.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { insumo_id, cantidad, costo_unitario, referencia } = req.body;
        const result = await InventarioService.registrarEntrada(tenantId, { insumo_id, cantidad, costo_unitario, referencia });
        res.status(201).json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// POST /inventario/api/movimientos/salida
router.post('/api/movimientos/salida', requirePermission('inventario.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { insumo_id, cantidad, referencia } = req.body;
        const result = await InventarioService.registrarSalida(tenantId, { insumo_id, cantidad, referencia });
        res.status(201).json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// POST /inventario/api/movimientos/ajuste
router.post('/api/movimientos/ajuste', requirePermission('inventario.editar'), async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { insumo_id, cantidad, referencia } = req.body;
        const result = await InventarioService.registrarAjuste(tenantId, { insumo_id, cantidad, referencia });
        res.status(201).json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
