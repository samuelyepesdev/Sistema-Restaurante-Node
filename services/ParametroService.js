/**
 * ParametroService - Business logic for parametros (e.g. kg, lb, g, bebidas, comidas)
 * Related to: ParametroRepository, TemaRepository
 */
const ParametroRepository = require('../repositories/ParametroRepository');
const TemaRepository = require('../repositories/TemaRepository');

const CATALOGOS_INVENTARIO = {
    'CATEGORIAS DE INSUMO': [
        'Frutas, verduras, hortalizas, legumbres, cereales, semillas, frutos secos y aceites vegetales.',
        'Carnes (res, pollo, cerdo), pescados, mariscos, huevos y productos lácteos (leche, queso, yogur).',
        'Origen Mineral: Agua y sales minerales.'
    ],
    'UNIDADES DE COMPRA': [
        'GRAMOS', 'LIBRAS', 'KILOGRAMOS', 'ARROBA', 'QUINTAL', 'ONZA',
        'MILILITROS', 'LITROS', 'GALONES', 'ONZA LÍQUIDA', 'BARRIL',
        'UNIDADES', 'CAJAS', 'METROS', 'CENTIMETROS', 'PAQUETES',
        'ROLLOS', 'TABLETAS', 'TEST', 'SACKETS'
    ]
};

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

    static async getByTemaName(temaName, tenantId) {
        const tema = await TemaRepository.findByName(temaName, tenantId);
        if (!tema) return [];
        return ParametroRepository.getParametrosByTemaId(tema.id, tenantId);
    }

    static async getByTemaId(temaId, tenantId) {
        return ParametroRepository.getParametrosByTemaId(temaId, tenantId);
    }

    /**
     * Seed initial inventory parameters and themes for a tenant.
     * @param {number} tenantId 
     */
    static async seedInventoryParams(tenantId) {
        let created = 0;
        for (const [temaName, params] of Object.entries(CATALOGOS_INVENTARIO)) {
            let temaId;
            const existingTema = await TemaRepository.findByName(temaName, tenantId);

            if (!existingTema) {
                temaId = await TemaRepository.create(tenantId, { name: temaName, status: 1 });
            } else {
                temaId = existingTema.id;
            }

            for (const paramName of params) {
                const existingParam = await ParametroRepository.findByName(paramName, tenantId);
                let pid;

                if (!existingParam) {
                    pid = await ParametroRepository.create(tenantId, { name: paramName, status: 1 });
                    created++;
                } else {
                    pid = existingParam.id;
                }

                await TemaRepository.addParametroToTema(temaId, pid);
            }
        }
        return created;
    }
}

module.exports = ParametroService;
module.exports.CATALOGOS_INVENTARIO = CATALOGOS_INVENTARIO;
