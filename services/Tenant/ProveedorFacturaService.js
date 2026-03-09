const ProveedorFacturaRepository = require('../../repositories/Tenant/ProveedorFacturaRepository');
const ProveedorRepository = require('../../repositories/Tenant/ProveedorRepository');

class ProveedorFacturaService {
    static async listByProveedor(tenantId, proveedorId) {
        return ProveedorFacturaRepository.findAllByProveedor(tenantId, proveedorId);
    }

    static async getById(id, tenantId) {
        const factura = await ProveedorFacturaRepository.findById(id, tenantId);
        if (!factura) throw new Error('Factura no encontrada');
        return factura;
    }

    static async create(tenantId, data) {
        // Validar que el proveedor existe y pertenece al tenant
        const proveedor = await ProveedorRepository.findById(data.proveedor_id, tenantId);
        if (!proveedor) throw new Error('Proveedor no válido');

        // El size limit ya debe venir validado desde el middleware (multer)
        // pero podemos ser precavidos.
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        if (data.archivo_size > MAX_SIZE) {
            throw new Error('El archivo supera los 2MB permitidos.');
        }

        return ProveedorFacturaRepository.create(tenantId, data);
    }

    static async delete(id, tenantId) {
        return ProveedorFacturaRepository.delete(id, tenantId);
    }
}

module.exports = ProveedorFacturaService;
