const TemaRepository = require('../../../repositories/Shared/TemaRepository');
const ParametroRepository = require('../../../repositories/Shared/ParametroRepository');

class TenantSeederService {
    /**
     * Seed initial data for a newly created tenant (Ej: Tipos de Documento)
     * @param {number} tenantId - The newly created Tenant ID
     */
    static async seedInitialData(tenantId) {
        // 1. TIPO_DOCUMENTO
        const temaId = await TemaRepository.create(tenantId, { name: 'TIPO_DOCUMENTO', status: 1 });
        const docs = ['CC', 'NIT', 'CE', 'PA', 'TI', 'PEP'];
        for (const name of docs) {
            const pid = await ParametroRepository.create(tenantId, { name, status: 1 });
            await TemaRepository.addParametroToTema(temaId, pid);
        }

        // 2. CATEGORIAS DE INSUMO (Necesario para Cerámicas y stock)
        const temaCatId = await TemaRepository.create(tenantId, { name: 'CATEGORIAS DE INSUMO', status: 1 });
        const cats = ['Cerámicas', 'Carnes', 'Verduras', 'Abarrotes', 'Líquidos', 'Empaques'];
        for (const name of cats) {
            const pid = await ParametroRepository.create(tenantId, { name, status: 1 });
            await TemaRepository.addParametroToTema(temaCatId, pid);
        }

        // 3. UNIDADES DE COMPRA
        const temaUniId = await TemaRepository.create(tenantId, { name: 'UNIDADES DE COMPRA', status: 1 });
        const unis = ['UND', 'KG', 'G', 'L', 'ML', 'PAQUETE', 'CAJA'];
        for (const name of unis) {
            const pid = await ParametroRepository.create(tenantId, { name, status: 1 });
            await TemaRepository.addParametroToTema(temaUniId, pid);
        }
    }
}

module.exports = TenantSeederService;
