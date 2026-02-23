/**
 * Seeder de datos de prueba para el módulo de Analítica y Predicción.
 * Inserta facturas en los últimos 3 meses para poder probar resumen y predicción.
 *
 * Uso:
 *   node scripts/seed-analitica-datos.js              # usa el primer tenant
 *   node scripts/seed-analitica-datos.js --tenant=2   # tenant id 2
 *   node scripts/seed-analitica-datos.js --cantidad=50
 *
 * Requisito: tenant existente; se crea un cliente "Cliente ventas prueba" si no hay clientes.
 */

require('dotenv').config();
const db = require('../config/database');

const FORMAS_PAGO = ['efectivo', 'transferencia'];

/**
 * Obtener tenant_id: por argumento --tenant=N o el primero de la BD
 */
function getTenantId() {
    const arg = process.argv.find(a => a.startsWith('--tenant='));
    if (arg) return parseInt(arg.split('=')[1], 10);
    return null;
}

function getCantidad() {
    const arg = process.argv.find(a => a.startsWith('--cantidad='));
    if (arg) return parseInt(arg.split('=')[1], 10);
    return 25;
}

/**
 * Fecha aleatoria entre start y end (objetos Date)
 */
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Entero aleatorio entre min y max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Total de factura realista (en pesos): entre 15.000 y 180.000
 */
function randomTotal() {
    return randomInt(15000, 180000);
}

async function getOrCreateCliente(tenantId) {
    const [clientes] = await db.query(
        'SELECT id FROM clientes WHERE tenant_id = ? LIMIT 1',
        [tenantId]
    );
    if (clientes.length > 0) return clientes[0].id;

    const [r] = await db.query(
        'INSERT INTO clientes (tenant_id, nombre, telefono) VALUES (?, ?, ?)',
        [tenantId, 'Cliente ventas prueba', '3000000000']
    );
    console.log('   Cliente creado: "Cliente ventas prueba"');
    return r.insertId;
}

async function run() {
    const tenantIdArg = getTenantId();
    const cantidad = Math.max(10, Math.min(200, getCantidad()));

    console.log('Seed datos para Analítica\n');

    let tenantId = tenantIdArg;
    if (tenantId == null) {
        const [tenants] = await db.query('SELECT id, nombre FROM tenants WHERE activo = TRUE ORDER BY id LIMIT 1');
        if (tenants.length === 0) {
            console.error('No hay ningún tenant activo. Crea uno antes de ejecutar este script.');
            process.exit(1);
        }
        tenantId = tenants[0].id;
        console.log(`Usando tenant: ${tenants[0].nombre} (id: ${tenantId})`);
    } else {
        const [t] = await db.query('SELECT id, nombre FROM tenants WHERE id = ?', [tenantId]);
        if (t.length === 0) {
            console.error(`Tenant con id ${tenantId} no encontrado.`);
            process.exit(1);
        }
        console.log(`Usando tenant: ${t[0].nombre} (id: ${tenantId})`);
    }

    const clienteId = await getOrCreateCliente(tenantId);

    const now = new Date();
    const hace3Meses = new Date(now);
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    console.log(`Insertando ${cantidad} facturas entre ${hace3Meses.toISOString().slice(0, 10)} y ${now.toISOString().slice(0, 10)}...`);

    let insertadas = 0;
    for (let i = 0; i < cantidad; i++) {
        const fecha = randomDate(hace3Meses, now);
        const total = randomTotal();
        const forma_pago = FORMAS_PAGO[randomInt(0, FORMAS_PAGO.length - 1)];

        await db.query(
            'INSERT INTO facturas (tenant_id, cliente_id, fecha, total, forma_pago) VALUES (?, ?, ?, ?, ?)',
            [tenantId, clienteId, fecha, total, forma_pago]
        );
        insertadas++;
    }

    console.log(`\nListo. Se insertaron ${insertadas} facturas para el tenant ${tenantId}.`);
    console.log('Recarga la página de Analítica para ver el resumen y la predicción.\n');
    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
