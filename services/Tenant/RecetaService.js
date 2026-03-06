/**
 * RecetaService - Business logic for recipes
 * Related to: RecetaRepository, CosteoService, routes/costeo.js
 */

const RecetaRepository = require('../../repositories/Tenant/RecetaRepository');
const ProductRepository = require('../../repositories/Tenant/ProductRepository');

class RecetaService {
    static async list(tenantId, filters = {}) {
        return RecetaRepository.findAll(tenantId, filters);
    }

    static async getById(id, tenantId) {
        const receta = await RecetaRepository.findById(id, tenantId);
        if (!receta) return null;
        receta.ingredientes = await RecetaRepository.getIngredientes(id);
        return receta;
    }

    static async getByProductoId(productoId, tenantId) {
        const receta = await RecetaRepository.findByProductoId(productoId, tenantId);
        if (!receta) return null;
        receta.ingredientes = await RecetaRepository.getIngredientes(receta.id);
        return receta;
    }

    static async create(tenantId, data) {
        if (!data.producto_id || !data.nombre_receta) {
            throw new Error('Producto y nombre de receta son requeridos');
        }
        const product = await ProductRepository.findById(data.producto_id, tenantId);
        if (!product) throw new Error('Producto no encontrado');
        const exists = await RecetaRepository.findByProductoId(data.producto_id, tenantId);
        if (exists) throw new Error('Este producto ya tiene una receta');
        const recetaId = await RecetaRepository.create(tenantId, {
            producto_id: data.producto_id,
            nombre_receta: data.nombre_receta.trim(),
            porciones: data.porciones || 1,
            costos_adicionales: data.costos_adicionales
        });
        if (data.ingredientes && data.ingredientes.length > 0) {
            await RecetaRepository.setIngredientes(recetaId, data.ingredientes);
        }
        return recetaId;
    }

    static async update(id, tenantId, data) {
        const receta = await RecetaRepository.findById(id, tenantId);
        if (!receta) throw new Error('Receta no encontrada');
        await RecetaRepository.update(id, tenantId, {
            nombre_receta: data.nombre_receta !== undefined ? data.nombre_receta.trim() : receta.nombre_receta,
            porciones: data.porciones !== undefined ? parseFloat(data.porciones) : receta.porciones,
            costos_adicionales: data.costos_adicionales
        });
        if (data.ingredientes !== undefined) {
            await RecetaRepository.setIngredientes(id, data.ingredientes);
        }
        return { message: 'Receta actualizada' };
    }

    static async delete(id, tenantId) {
        const receta = await RecetaRepository.findById(id, tenantId);
        if (!receta) throw new Error('Receta no encontrada');
        await RecetaRepository.delete(id, tenantId);
        return { message: 'Receta eliminada' };
    }
}

module.exports = RecetaService;
