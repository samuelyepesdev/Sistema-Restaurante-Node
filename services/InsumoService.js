/**
 * InsumoService - Business logic for ingredients (insumos)
 * Related to: InsumoRepository, routes/costeo.js
 */

const InsumoRepository = require('../repositories/InsumoRepository');

class InsumoService {
    static async list(tenantId) {
        return InsumoRepository.findAll(tenantId);
    }

    static async getById(id, tenantId) {
        return InsumoRepository.findById(id, tenantId);
    }

    static async create(tenantId, data) {
        if (!data.codigo || !data.nombre) {
            throw new Error('Código y nombre son requeridos');
        }
        const exists = await InsumoRepository.findByCodigo(data.codigo.trim(), tenantId);
        if (exists) {
            throw new Error('Ya existe un insumo con ese código');
        }
        return InsumoRepository.create(tenantId, {
            codigo: data.codigo.trim(),
            nombre: data.nombre.trim(),
            unidad_compra: data.unidad_compra || 'UND',
            costo_unitario: parseFloat(data.costo_unitario) || 0
        });
    }

    static async update(id, tenantId, data) {
        const insumo = await InsumoRepository.findById(id, tenantId);
        if (!insumo) throw new Error('Insumo no encontrado');
        if (data.codigo && data.codigo.trim() !== insumo.codigo) {
            const exists = await InsumoRepository.findByCodigo(data.codigo.trim(), tenantId, id);
            if (exists) throw new Error('Ya existe un insumo con ese código');
        }
        await InsumoRepository.update(id, tenantId, {
            codigo: (data.codigo || insumo.codigo).trim(),
            nombre: (data.nombre || insumo.nombre).trim(),
            unidad_compra: data.unidad_compra || insumo.unidad_compra,
            costo_unitario: data.costo_unitario !== undefined ? parseFloat(data.costo_unitario) : insumo.costo_unitario
        });
        return { message: 'Insumo actualizado' };
    }

    static async delete(id, tenantId) {
        const insumo = await InsumoRepository.findById(id, tenantId);
        if (!insumo) throw new Error('Insumo no encontrado');
        await InsumoRepository.delete(id, tenantId);
        return { message: 'Insumo eliminado' };
    }
}

module.exports = InsumoService;
