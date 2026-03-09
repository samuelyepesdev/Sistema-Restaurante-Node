const ProveedorRepository = require('../../repositories/Tenant/ProveedorRepository');

class ProveedorService {
    static async getAll(tenantId) {
        return ProveedorRepository.findAll(tenantId);
    }

    static async getById(id, tenantId) {
        const proveedor = await ProveedorRepository.findById(id, tenantId);
        if (!proveedor) throw new Error('Proveedor no encontrado');
        return proveedor;
    }

    static async create(tenantId, data) {
        if (!data.nombre) throw new Error('El nombre es requerido');
        const id = await ProveedorRepository.create(tenantId, data);
        return { id, message: 'Proveedor creado correctamente' };
    }

    static async update(id, tenantId, data) {
        if (!data.nombre) throw new Error('El nombre es requerido');
        const affectedRows = await ProveedorRepository.update(id, tenantId, data);
        if (affectedRows === 0) throw new Error('Proveedor no encontrado');
        return { message: 'Proveedor actualizado correctamente' };
    }

    static async delete(id, tenantId) {
        if (await ProveedorRepository.hasInsumos(id, tenantId)) {
            throw new Error('No se puede eliminar el proveedor porque tiene insumos asociados');
        }
        if (await ProveedorRepository.hasMovimientos(id, tenantId)) {
            throw new Error('No se puede eliminar el proveedor porque tiene movimientos de inventario asociados');
        }

        const affectedRows = await ProveedorRepository.delete(id, tenantId);
        if (affectedRows === 0) throw new Error('Proveedor no encontrado');
        return { message: 'Proveedor eliminado correctamente' };
    }
}

module.exports = ProveedorService;
