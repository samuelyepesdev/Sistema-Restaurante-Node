const db = require('../config/database');
const TemaRepository = require('../repositories/TemaRepository');
const ParametroRepository = require('../repositories/ParametroRepository');

const CATALOGOS = {
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

async function seedTemasParametros() {
    console.log('🚀 Iniciando seeding de Temas y Parámetros para Insumos...');

    try {
        const [tenants] = await db.query('SELECT id, nombre FROM tenants WHERE activo = 1');

        for (const tenant of tenants) {
            console.log(`  Procesando tenant: ${tenant.nombre} (ID: ${tenant.id})`);

            for (const [temaName, params] of Object.entries(CATALOGOS)) {

                let temaId = await TemaRepository.findByName(temaName, tenant.id);
                if (!temaId) {
                    temaId = await TemaRepository.create(tenant.id, { name: temaName, status: 1 });
                    console.log(`    Tema ${temaName} creado (ID: ${temaId})`);
                } else {
                    temaId = temaId.id;
                    console.log(`    Tema ${temaName} ya existe (ID: ${temaId})`);
                }

                for (const paramName of params) {
                    let p = await ParametroRepository.findByName(paramName, tenant.id);
                    let pid;
                    if (!p) {
                        pid = await ParametroRepository.create(tenant.id, { name: paramName, status: 1 });
                        console.log(`      Parámetro ${paramName} creado (ID: ${pid})`);
                    } else {
                        pid = p.id;
                    }
                    await TemaRepository.addParametroToTema(temaId, pid);
                }
            }
        }

        console.log('✅ Seeding completado exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante el seeding de temas y parámetros:', error);
        process.exit(1);
    }
}

seedTemasParametros();
