const RecetaService = require('../../../../services/Tenant/RecetaService');
const ProductService = require('../../../../services/Tenant/ProductService');
const InventarioService = require('../../../../services/Tenant/InventarioService');
const RecetaRepository = require('../../../../repositories/Tenant/RecetaRepository');

class RecetasController {
    // GET /recetas
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });

            let recetas = await RecetaService.list(tenantId);
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
            console.error('Error recetas:', e);
            res.status(500).render('errors/internal', { error: e });
        }
    }

    // GET /recetas/api/recetas
    static async list(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const list = await RecetaService.list(tenantId);
            res.json(list || []);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // GET /recetas/api/recetas/:id
    static async show(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const receta = await RecetaService.getById(req.params.id, tenantId);
            if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
            res.json(receta);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // GET /recetas/api/recetas/producto/:productoId
    static async showByProductoId(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const receta = await RecetaService.getByProductoId(req.params.productoId, tenantId);
            res.json(receta || null);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // GET /recetas/api/productos
    static async listProductos(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const { productos } = await ProductService.getAllForView(tenantId);
            res.json(productos || []);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // GET /recetas/api/insumos
    static async listInsumos(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const list = await InventarioService.listInsumos(tenantId, {});
            res.json(list || []);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // POST /recetas/api/recetas
    static async store(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const id = await RecetaService.create(tenantId, req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }

    // PUT /recetas/api/recetas/:id
    static async update(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            await RecetaService.update(req.params.id, tenantId, req.body);
            res.json({ ok: true });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }

    // DELETE /recetas/api/recetas/:id
    static async destroy(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            await RecetaService.delete(req.params.id, tenantId);
            res.json({ ok: true });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
}

module.exports = RecetasController;
