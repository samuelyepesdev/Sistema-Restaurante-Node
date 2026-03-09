const ProveedorService = require('../../../../services/Tenant/ProveedorService');
const ProveedorFacturaService = require('../../../../services/Tenant/ProveedorFacturaService');
const ProveedorReporteRepository = require('../../../../repositories/Tenant/ProveedorReporteRepository');

class ProveedoresController {
    // GET /proveedores
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).render('errors/generic', { error: { message: 'Contexto de tenant no disponible' } });

            const proveedores = await ProveedorService.getAll(tenantId);

            res.render('proveedores/index', {
                proveedores: proveedores || [],
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            res.status(500).render('errors/generic', {
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

    // --- FACTURAS DE PROVEEDORES ---

    // GET /proveedores/:id/facturas
    static async listFacturas(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const facturas = await ProveedorFacturaService.listByProveedor(tenantId, parseInt(req.params.id));
            res.json(facturas);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /proveedores/:id/facturas
    static async storeFactura(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const proveedorId = parseInt(req.params.id);
            if (!req.file) throw new Error('No se subió ningún archivo');

            const data = {
                proveedor_id: proveedorId,
                numero_factura: req.body.numero_factura,
                fecha_emision: req.body.fecha_emision,
                monto_total: req.body.monto_total,
                archivo_nombre: req.file.originalname,
                archivo_contenido: req.file.buffer,
                archivo_tipo: req.file.mimetype,
                archivo_size: req.file.size,
                notas: req.body.notas
            };

            const id = await ProveedorFacturaService.create(tenantId, data);
            res.status(201).json({ id, message: 'Factura cargada correctamente' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // GET /proveedores/facturas/:facturaId/ver
    static async showFactura(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const factura = await ProveedorFacturaService.getById(parseInt(req.params.facturaId), tenantId);

            res.setHeader('Content-Type', factura.archivo_tipo);
            res.setHeader('Content-Disposition', `inline; filename="${factura.archivo_nombre}"`);
            res.send(factura.archivo_contenido);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    // DELETE /proveedores/facturas/:facturaId
    static async destroyFactura(req, res) {
        try {
            const tenantId = req.tenant?.id;
            await ProveedorFacturaService.delete(parseInt(req.params.facturaId), tenantId);
            res.json({ success: true, message: 'Factura eliminada' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // --- REPORTES Y ESTADÍSTICAS ---

    // GET /proveedores/:id/historial-costos
    static async getHistorialCostos(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const history = await ProveedorReporteRepository.getHistorialCostos(tenantId, parseInt(req.params.id));
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ProveedoresController;
