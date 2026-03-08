const ProveedorService = require('../../../../services/Tenant/ProveedorService');

class ProveedoresController {
    // GET /proveedores
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });

            const proveedores = await ProveedorService.getAll(tenantId);

            res.render('proveedores/index', {
                proveedores: proveedores || [],
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            res.status(500).render('errors/internal', {
                error: { message: 'Error al obtener proveedores' }
            });
        }
    }

    // GET /proveedores/:id
    static async show(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const proveedor = await ProveedorService.getById(parseInt(req.params.id), tenantId);
            res.json(proveedor);
        } catch (error) {
            res.status(error.message === 'Proveedor no encontrado' ? 404 : 500).json({ error: error.message });
        }
    }

    // POST /proveedores
    static async store(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const result = await ProveedorService.create(tenantId, req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // PUT /proveedores/:id
    static async update(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const result = await ProveedorService.update(parseInt(req.params.id), tenantId, req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // DELETE /proveedores/:id
    static async destroy(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const result = await ProveedorService.delete(parseInt(req.params.id), tenantId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = ProveedoresController;
