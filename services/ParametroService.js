/**
 * ParametroService - Business logic for parametros (e.g. kg, lb, g, bebidas, comidas)
 * Related to: ParametroRepository, TemaRepository
 */

const ParametroRepository = require('../repositories/ParametroRepository');
const TemaRepository = require('../repositories/TemaRepository');

class ParametroService {
    static async list(tenantId, activeOnly = true) {
        return ParametroRepository.findAll(tenantId, activeOnly);
    }

    static async getById(id, tenantId) {
        const param = await ParametroRepository.findById(id, tenantId);
        if (!param) return null;
        param.temas = await ParametroRepository.getTemas(id, tenantId);
        return param;
    }

    static async create(tenantId, data) {
        if (!data.name || !data.name.trim()) {
            throw new Error('El nombre del parámetro es requerido');
        }
        const exists = await ParametroRepository.findByName(data.name.trim(), tenantId);
        if (exists) throw new Error('Ya existe un parámetro con ese nombre');
        return ParametroRepository.create(tenantId, {
            name: data.name.trim(),
            status: data.status !== undefined ? data.status : 1
        });
    }

    static async update(id, tenantId, data) {
        const param = await ParametroRepository.findById(id, tenantId);
        if (!param) throw new Error('Parámetro no encontrado');
        if (data.name && data.name.trim() !== param.name) {
            const exists = await ParametroRepository.findByName(data.name.trim(), tenantId, id);
            if (exists) throw new Error('Ya existe un parámetro con ese nombre');
        }
        await ParametroRepository.update(id, tenantId, {
            name: (data.name || param.name).trim(),
            status: data.status !== undefined ? data.status : param.status
        });
        return { message: 'Parámetro actualizado' };
    }

    static async delete(id, tenantId) {
        const param = await ParametroRepository.findById(id, tenantId);
        if (!param) throw new Error('Parámetro no encontrado');
        await ParametroRepository.delete(id, tenantId);
        return { message: 'Parámetro eliminado' };
    }

    static async getByTemaId(temaId, tenantId) {
        return ParametroRepository.getParametrosByTemaId(temaId, tenantId);
    }
}

module.exports = ParametroService;
