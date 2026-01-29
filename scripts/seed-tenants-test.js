/**
 * Seeder para probar multi-tenancy (tenants).
 * NO se ejecuta en las migraciones; ejecutar manualmente: node scripts/seed-tenants-test.js
 *
 * Crea:
 * - 3 tenants: Principal, Sucursal Norte, Sucursal Sur
 * - 3 usuarios de prueba (uno por tenant): mesero_principal, mesero_norte, mesero_sur (password: test123)
 * - Mesas y productos por tenant para ver diferencias al iniciar sesión
 *
 * Requisito: haber ejecutado antes node scripts/run-migrations.js (incluye 003_add_multi_tenancy)
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');

const PASSWORD_TEST = 'test123';

const TENANTS = [
    { nombre: 'Principal', slug: 'principal' },
    { nombre: 'Sucursal Norte', slug: 'norte' },
    { nombre: 'Sucursal Sur', slug: 'sur' }
];

const USUARIOS_PRUEBA = [
    { username: 'mesero_principal', nombreCompleto: 'Mesero Principal', tenantSlug: 'principal' },
    { username: 'mesero_norte', nombreCompleto: 'Mesero Norte', tenantSlug: 'norte' },
    { username: 'mesero_sur', nombreCompleto: 'Mesero Sur', tenantSlug: 'sur' }
];

async function asegurarTenants() {
    const tenantIds = {};
    for (const t of TENANTS) {
        const [existentes] = await db.query('SELECT id FROM tenants WHERE slug = ?', [t.slug]);
        if (existentes.length > 0) {
            tenantIds[t.slug] = existentes[0].id;
            console.log(`   Tenant existente: ${t.nombre} (id: ${tenantIds[t.slug]})`);
        } else {
            const [r] = await db.query(
                'INSERT INTO tenants (nombre, slug, activo) VALUES (?, ?, TRUE)',
                [t.nombre, t.slug]
            );
            tenantIds[t.slug] = r.insertId;
            console.log(`   Tenant creado: ${t.nombre} (id: ${tenantIds[t.slug]})`);
        }
    }
    return tenantIds;
}

async function asegurarUsuarios(tenantIds) {
    const [roles] = await db.query("SELECT id FROM roles WHERE nombre = 'mesero'");
    const rolId = roles[0]?.id;
    if (!rolId) throw new Error('Rol "mesero" no encontrado. Ejecuta las migraciones (001).');

    const passwordHash = await bcrypt.hash(PASSWORD_TEST, 10);

    for (const u of USUARIOS_PRUEBA) {
        const tenantId = tenantIds[u.tenantSlug];
        if (!tenantId) continue;

        const [existentes] = await db.query('SELECT id FROM usuarios WHERE username = ?', [u.username]);
        if (existentes.length > 0) {
            await db.query(
                'UPDATE usuarios SET password_hash = ?, nombre_completo = ?, tenant_id = ?, activo = TRUE WHERE username = ?',
                [passwordHash, u.nombreCompleto, tenantId, u.username]
            );
            console.log(`   Usuario actualizado: ${u.username} → tenant ${u.tenantSlug}`);
        } else {
            await db.query(
                'INSERT INTO usuarios (username, password_hash, email, nombre_completo, rol_id, tenant_id, activo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
                [u.username, passwordHash, `${u.username}@test.com`, u.nombreCompleto, rolId, tenantId]
            );
            console.log(`   Usuario creado: ${u.username} → tenant ${u.tenantSlug}`);
        }
    }
}

async function seedDatosPorTenant(tenantIds) {
    const norteId = tenantIds.norte;
    const surId = tenantIds.sur;
    if (!norteId || !surId) return;

    // Categorías por tenant (nombres únicos globalmente)
    const categoriasNorte = [
        { nombre: 'Bebidas Norte', descripcion: 'Bebidas Sucursal Norte' },
        { nombre: 'Comidas Norte', descripcion: 'Comidas Sucursal Norte' }
    ];
    const categoriasSur = [
        { nombre: 'Bebidas Sur', descripcion: 'Bebidas Sucursal Sur' },
        { nombre: 'Comidas Sur', descripcion: 'Comidas Sucursal Sur' }
    ];

    for (const c of categoriasNorte) {
        await db.query(
            'INSERT INTO categorias (nombre, descripcion, activa, tenant_id) VALUES (?, ?, TRUE, ?) ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id), descripcion = VALUES(descripcion)',
            [c.nombre, c.descripcion, norteId]
        );
    }
    for (const c of categoriasSur) {
        await db.query(
            'INSERT INTO categorias (nombre, descripcion, activa, tenant_id) VALUES (?, ?, TRUE, ?) ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id), descripcion = VALUES(descripcion)',
            [c.nombre, c.descripcion, surId]
        );
    }
    const [catNorte] = await db.query('SELECT id FROM categorias WHERE tenant_id = ? ORDER BY id', [norteId]);
    const [catSur] = await db.query('SELECT id FROM categorias WHERE tenant_id = ? ORDER BY id', [surId]);
    const catNorteIds = catNorte.map(r => r.id);
    const catSurIds = catSur.map(r => r.id);

    // Productos por tenant (códigos únicos)
    const catN1 = catNorteIds[0] || 1;
    const catN2 = catNorteIds[1] || catN1;
    const catS1 = catSurIds[0] || 1;
    const catS2 = catSurIds[1] || catS1;
    const productosNorte = [
        { codigo: 'N-001', nombre: 'Café Norte', precio: 2500, catId: catN1 },
        { codigo: 'N-002', nombre: 'Jugo Norte', precio: 3500, catId: catN1 },
        { codigo: 'N-003', nombre: 'Almuerzo Norte', precio: 12000, catId: catN2 }
    ];
    const productosSur = [
        { codigo: 'S-001', nombre: 'Café Sur', precio: 2800, catId: catS1 },
        { codigo: 'S-002', nombre: 'Jugo Sur', precio: 3200, catId: catS1 },
        { codigo: 'S-003', nombre: 'Almuerzo Sur', precio: 11000, catId: catS2 }
    ];

    for (const p of productosNorte) {
        await db.query(
            'INSERT IGNORE INTO productos (tenant_id, codigo, nombre, categoria_id, precio_unidad) VALUES (?, ?, ?, ?, ?)',
            [norteId, p.codigo, p.nombre, p.catId, p.precio]
        );
    }
    for (const p of productosSur) {
        await db.query(
            'INSERT IGNORE INTO productos (tenant_id, codigo, nombre, categoria_id, precio_unidad) VALUES (?, ?, ?, ?, ?)',
            [surId, p.codigo, p.nombre, p.catId, p.precio]
        );
    }
    console.log('   Productos de prueba creados para Norte y Sur.');

    // Mesas por tenant (números únicos: 10,11,12 para Norte; 20,21,22 para Sur)
    const mesasNorte = ['10', '11', '12'];
    const mesasSur = ['20', '21', '22'];
    for (const num of mesasNorte) {
        await db.query(
            'INSERT IGNORE INTO mesas (tenant_id, numero, descripcion, estado) VALUES (?, ?, ?, ?)',
            [norteId, num, `Mesa ${num} Norte`, 'libre']
        );
    }
    for (const num of mesasSur) {
        await db.query(
            'INSERT IGNORE INTO mesas (tenant_id, numero, descripcion, estado) VALUES (?, ?, ?, ?)',
            [surId, num, `Mesa ${num} Sur`, 'libre']
        );
    }
    console.log('   Mesas de prueba creadas: 10,11,12 (Norte) y 20,21,22 (Sur).');
}

async function run() {
    console.log('\n🌱 Seed de tenants para pruebas (multi-tenancy)\n');
    console.log('Requisito: migraciones ejecutadas (node scripts/run-migrations.js)\n');

    try {
        const [tenantsExist] = await db.query("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'tenants'");
        if (tenantsExist.length === 0) {
            console.error('❌ La tabla "tenants" no existe. Ejecuta primero: node scripts/run-migrations.js');
            process.exit(1);
        }

        console.log('1. Tenants:');
        const tenantIds = await asegurarTenants();

        console.log('\n2. Usuarios de prueba (mesero por tenant):');
        await asegurarUsuarios(tenantIds);

        console.log('\n3. Datos de prueba por tenant (Norte y Sur):');
        await seedDatosPorTenant(tenantIds);

        console.log('\n' + '='.repeat(60));
        console.log('✅ SEED COMPLETADO');
        console.log('='.repeat(60));
        console.log('\n📋 CÓMO PROBAR MULTI-TENANCY:\n');
        console.log('   Inicia sesión con cada usuario y verifica que solo ves datos de su tenant:\n');
        console.log('   • mesero_principal / ' + PASSWORD_TEST + '  → Tenant: Principal (mesas/productos que ya tengas)');
        console.log('   • mesero_norte     / ' + PASSWORD_TEST + '  → Tenant: Sucursal Norte (mesas 10, 11, 12 y productos N-001, N-002, N-003)');
        console.log('   • mesero_sur       / ' + PASSWORD_TEST + '  → Tenant: Sucursal Sur (mesas 20, 21, 22 y productos S-001, S-002, S-003)');
        console.log('\n   En Mesas: solo deben listarse las mesas del tenant del usuario.');
        console.log('   En Productos / Ventas / Dashboard: solo datos de ese tenant.\n');
        console.log('='.repeat(60) + '\n');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error en seed:', err.message);
        if (err.code) console.error('   Código:', err.code);
        process.exit(1);
    }
}

run();
