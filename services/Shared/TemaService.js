/**
 * TemaService - Business logic for temas (e.g. Unidades de masa, Alimentos)
 * Related to: TemaRepository, ParametroRepository
 */

const TemaRepository = require('../../repositories/Shared/TemaRepository');
const ParametroRepository = require('../../repositories/Shared/ParametroRepository');

class TemaService {
    static async list(tenantId, activeOnly = true) {
        return TemaRepository.findAll(tenantId, activeOnly);
    }

    static async getById(id, tenantId) {
        const tema = await TemaRepository.findById(id, tenantId);
        if (!tema) return null;
        tema.parametros = await TemaRepository.getParametros(id, tenantId);
        return tema;
    }

    static async create(tenantId, data) {
        if (!data.name || !data.name.trim()) {
            throw new Error('El nombre del tema es requerido');
        }
        const exists = await TemaRepository.findByName(data.name.trim(), tenantId);
        if (exists) throw new Error('Ya existe un tema con ese nombre');
        return TemaRepository.create(tenantId, {
            name: data.name.trim(),
            status: data.status !== undefined ? data.status : 1
        });
    }

    static async update(id, tenantId, data) {
        const tema = await TemaRepository.findById(id, tenantId);
        if (!tema) throw new Error('Tema no encontrado');
        if (data.name && data.name.trim() !== tema.name) {
            const exists = await TemaRepository.findByName(data.name.trim(), tenantId, id);
            if (exists) throw new Error('Ya existe un tema con ese nombre');
        }
        await TemaRepository.update(id, tenantId, {
            name: (data.name || tema.name).trim(),
            status: data.status !== undefined ? data.status : tema.status
        });
        if (data.parametro_ids !== undefined) {
            await TemaRepository.setParametros(id, data.parametro_ids);
        }
        return { message: 'Tema actualizado' };
    }

    static async delete(id, tenantId) {
        const tema = await TemaRepository.findById(id, tenantId);
        if (!tema) throw new Error('Tema no encontrado');
        await TemaRepository.delete(id, tenantId);
        return { message: 'Tema eliminado' };
    }

    static async getParametros(temaId, tenantId) {
        return TemaRepository.getParametros(temaId, tenantId);
    }

    static async setParametros(temaId, tenantId, parametroIds) {
        const tema = await TemaRepository.findById(temaId, tenantId);
        if (!tema) throw new Error('Tema no encontrado');
        await TemaRepository.setParametros(temaId, parametroIds || []);
        return { message: 'Parámetros actualizados' };
    }
}

module.exports = TemaService;
