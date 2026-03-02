const db = require('../config/database');
const TemaRepository = require('../repositories/TemaRepository');
const ParametroRepository = require('../repositories/ParametroRepository');

async function seedDocTypes() {
    console.log('🚀 Iniciando seeding de Tipos de Documento...');

    try {
        const [tenants] = await db.query('SELECT id, nombre FROM tenants WHERE activo = 1');

        for (const tenant of tenants) {
            console.log(`  Procesando tenant: ${tenant.nombre} (ID: ${tenant.id})`);

            // 1. Verificar si ya existe el tema "TIPO_DOCUMENTO"
            let temaId = await TemaRepository.findByName('TIPO_DOCUMENTO', tenant.id);
            if (!temaId) {
                temaId = await TemaRepository.create(tenant.id, { name: 'TIPO_DOCUMENTO', status: 1 });
                console.log(`    Tema TIPO_DOCUMENTO creado (ID: ${temaId})`);
            } else {
                temaId = temaId.id;
                console.log(`    Tema TIPO_DOCUMENTO ya existe (ID: ${temaId})`);
            }

            // 2. Definir los parámetros predeterminados
            const defaultParams = [
                { name: 'CC', desc: 'Cédula de Ciudadanía' },
                { name: 'NIT', desc: 'Número de Identificación Tributaria' },
                { name: 'CE', desc: 'Cédula de Extranjería' },
                { name: 'PA', desc: 'Pasaporte' },
                { name: 'TI', desc: 'Tarjeta de Identidad' },
                { name: 'PEP', desc: 'Permiso Especial de Permanencia' }
            ];

            for (const param of defaultParams) {
                // Verificar si existe el parámetro
                let p = await ParametroRepository.findByName(param.name, tenant.id);
                let pid;
                if (!p) {
                    pid = await ParametroRepository.create(tenant.id, { name: param.name, status: 1 });
                    console.log(`      Parámetro ${param.name} creado (ID: ${pid})`);
                } else {
                    pid = p.id;
                    console.log(`      Parámetro ${param.name} ya existe (ID: ${pid})`);
                }

                // Asociar al tema
                await TemaRepository.addParametroToTema(temaId, pid);
            }
        }

        console.log('✅ Seeding completado exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante el seeding:', error);
        process.exit(1);
    }
}

seedDocTypes();
