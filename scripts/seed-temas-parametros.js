require('dotenv').config();
const db = require('../config/database');
const ParametroService = require('../services/Shared/ParametroService');

async function runSeed() {
    console.log('🚀 Iniciando seeding de Temas y Parámetros para Insumos...');

    try {
        const [tenants] = await db.query('SELECT id, nombre FROM tenants WHERE activo = 1');

        for (const tenant of tenants) {
            const createdCount = await ParametroService.seedInventoryParams(tenant.id);
            if (createdCount > 0) {
                console.log(`    [Tenant: ${tenant.nombre}] ${createdCount} parámetros/temas creados.`);
            }
        }

        console.log('✅ Seeding de temas y parámetros completado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante el seeding de temas y parámetros:', error);
        process.exit(1);
    }
}

runSeed();
