/**
 * Seeder de productos de prueba para un tenant.
 * Crea categorías por defecto si no existen e inserta productos de ejemplo.
 *
 * Uso:
 *   node scripts/seed-productos-datos.js              # primer tenant
 *   node scripts/seed-productos-datos.js --tenant=2
 *   node scripts/seed-productos-datos.js --cantidad=20
 *
 * Requisito: tenant existente; se crean categorías por defecto si no hay.
 */

require('dotenv').config();
const db = require('../config/database');
const CategoryService = require('../services/CategoryService');
const CategoryRepository = require('../repositories/CategoryRepository');

function getTenantId() {
    const arg = process.argv.find(a => a.startsWith('--tenant='));
    if (arg) return parseInt(arg.split('=')[1], 10);
    return null;
}

function getCantidad() {
    const arg = process.argv.find(a => a.startsWith('--cantidad='));
    if (arg) return parseInt(arg.split('=')[1], 10);
    return null; // por defecto inserta toda la lista
}

/** Productos de ejemplo por categoría (nombre estándar de categoría → productos) */
const PRODUCTOS_PRUEBA = [
    { codigo: 'BEB-001', nombre: 'Coca-Cola 400ml', categoria: 'Bebidas', precio: 2500 },
    { codigo: 'BEB-002', nombre: 'Agua mineral 500ml', categoria: 'Bebidas', precio: 1500 },
    { codigo: 'BEB-003', nombre: 'Jugo de naranja natural', categoria: 'Bebidas', precio: 3500 },
    { codigo: 'BEB-004', nombre: 'Café tinto', categoria: 'Bebidas', precio: 1800 },
    { codigo: 'BEB-005', nombre: 'Café con leche', categoria: 'Bebidas', precio: 2200 },
    { codigo: 'BEB-006', nombre: 'Limonada', categoria: 'Bebidas', precio: 2800 },
    { codigo: 'BEB-007', nombre: 'Cerveza nacional', categoria: 'Bebidas', precio: 4000 },
    { codigo: 'COM-001', nombre: 'Bandeja paisa', categoria: 'Comidas', precio: 18500 },
    { codigo: 'COM-002', nombre: 'Sancocho de gallina', categoria: 'Comidas', precio: 12000 },
    { codigo: 'COM-003', nombre: 'Arroz con pollo', categoria: 'Comidas', precio: 11500 },
    { codigo: 'COM-004', nombre: 'Hamburguesa clásica', categoria: 'Comidas', precio: 9500 },
    { codigo: 'COM-005', nombre: 'Pizza personal', categoria: 'Comidas', precio: 8500 },
    { codigo: 'COM-006', nombre: 'Pasta a la boloñesa', categoria: 'Comidas', precio: 12500 },
    { codigo: 'COM-007', nombre: 'Pechuga a la plancha', categoria: 'Comidas', precio: 14000 },
    { codigo: 'POS-001', nombre: 'Tres leches', categoria: 'Postres', precio: 6500 },
    { codigo: 'POS-002', nombre: 'Brownie', categoria: 'Postres', precio: 4500 },
    { codigo: 'POS-003', nombre: 'Helado 2 bolas', categoria: 'Postres', precio: 5000 },
    { codigo: 'POS-004', nombre: 'Flan', categoria: 'Postres', precio: 4000 },
    { codigo: 'POS-005', nombre: 'Ensalada de frutas', categoria: 'Postres', precio: 5500 },
    { codigo: 'ACO-001', nombre: 'Papas fritas', categoria: 'Acompañamientos', precio: 4500 },
    { codigo: 'ACO-002', nombre: 'Ensalada verde', categoria: 'Acompañamientos', precio: 5000 },
    { codigo: 'ACO-003', nombre: 'Arroz blanco', categoria: 'Acompañamientos', precio: 2500 },
    { codigo: 'ACO-004', nombre: 'Patacón', categoria: 'Acompañamientos', precio: 3500 },
    { codigo: 'EXT-001', nombre: 'Queso adicional', categoria: 'Extras', precio: 2000 },
    { codigo: 'EXT-002', nombre: 'Tocino extra', categoria: 'Extras', precio: 3000 },
    { codigo: 'EXT-003', nombre: 'Salsa adicional', categoria: 'Extras', precio: 500 },
    { codigo: 'EXT-004', nombre: 'Pan de ajo', categoria: 'Extras', precio: 4000 }
];

async function run() {
    const tenantIdArg = getTenantId();
    const cantidad = getCantidad();

    console.log('🌱 Seed de productos de prueba\n');

    let tenantId = tenantIdArg;
    if (tenantId == null) {
        const [tenants] = await db.query('SELECT id, nombre FROM tenants WHERE activo = TRUE ORDER BY id LIMIT 1');
        if (tenants.length === 0) {
            console.error('No hay ningún tenant activo. Crea uno antes.');
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

    const tipoNegocio = 'restaurante';
    const { inserted: catInserted } = await CategoryService.seedDefaultCategories(tenantId, tipoNegocio);
    if (catInserted > 0) {
        console.log(`   Categorías creadas: ${catInserted}`);
    }

    const categorias = await CategoryRepository.findAllActive(tenantId);
    const catPorNombre = new Map();
    categorias.forEach(c => catPorNombre.set(c.nombre.toLowerCase(), c.id));

    const lista = cantidad ? PRODUCTOS_PRUEBA.slice(0, cantidad) : PRODUCTOS_PRUEBA;
    let insertados = 0;
    let omitidos = 0;

    for (const p of lista) {
        const catId = catPorNombre.get(p.categoria.toLowerCase());
        if (!catId) {
            console.warn(`   ⚠️  Categoría "${p.categoria}" no encontrada para tenant ${tenantId}, omitiendo ${p.codigo}`);
            omitidos++;
            continue;
        }
        try {
            await db.query(
                'INSERT INTO productos (tenant_id, codigo, nombre, categoria_id, precio_unidad) VALUES (?, ?, ?, ?, ?)',
                [tenantId, p.codigo, p.nombre, catId, p.precio]
            );
            insertados++;
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY' || (e.message && e.message.includes('Duplicate entry'))) {
                omitidos++;
            } else {
                throw e;
            }
        }
    }

    console.log(`\n✅ Listo. Insertados: ${insertados}, omitidos (duplicados): ${omitidos}.`);
    console.log('   Revisa la sección Productos en la app.\n');
    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
