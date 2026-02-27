/**
 * Seed de datos para pruebas del módulo de inventario.
 * Crea: categoría, productos, insumos (con stock_actual, stock_minimo, unidad_base),
 *       recetas ligadas a productos y receta_ingredientes (insumos por receta).
 *
 * Ejecutar: node scripts/seed-inventario.js
 * Requisito: migraciones ejecutadas (006_costeo, 018, 023_inventario) y al menos un tenant.
 */

require('dotenv').config();
const db = require('../config/database');

const TENANT_ID = 1;

/** Insumos con stock inicial y mínimo para pruebas (algunos bajos de stock) */
const INSUMOS = [
    { codigo: 'ARR-001', nombre: 'Arroz', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3000, unidad_base: 'g', stock_minimo: 2000, stock_actual: 5000, costo_promedio: 3 },
    { codigo: 'PLL-001', nombre: 'Pollo', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 12000, unidad_base: 'g', stock_minimo: 3000, stock_actual: 2500, costo_promedio: 12 },
    { codigo: 'TOM-001', nombre: 'Tomate', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 2500, unidad_base: 'g', stock_minimo: 1000, stock_actual: 800, costo_promedio: 2.5 },
    { codigo: 'ACE-001', nombre: 'Aceite', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 15000, unidad_base: 'ml', stock_minimo: 500, stock_actual: 1200, costo_promedio: 15 },
    { codigo: 'SAL-001', nombre: 'Sal', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 2000, unidad_base: 'g', stock_minimo: 200, stock_actual: 450, costo_promedio: 4 },
    { codigo: 'PAN-HAM', nombre: 'Pan hamburguesa', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 800, unidad_base: 'UND', stock_minimo: 20, stock_actual: 50, costo_promedio: 800 },
    { codigo: 'CARN-01', nombre: 'Carne molida', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 18000, unidad_base: 'g', stock_minimo: 2000, stock_actual: 1500, costo_promedio: 18 },
    { codigo: 'LECH-01', nombre: 'Lechuga', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3500, unidad_base: 'g', stock_minimo: 500, stock_actual: 600, costo_promedio: 3.5 },
    { codigo: 'QUE-01', nombre: 'Queso rebanado', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 22000, unidad_base: 'g', stock_minimo: 500, stock_actual: 300, costo_promedio: 22 },
    { codigo: 'PAN-PER', nombre: 'Pan perro caliente', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 600, unidad_base: 'UND', stock_minimo: 30, stock_actual: 80, costo_promedio: 600 },
    { codigo: 'SALCH-01', nombre: 'Salchicha', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 1200, unidad_base: 'UND', stock_minimo: 40, stock_actual: 100, costo_promedio: 1200 },
    { codigo: 'PAPA-01', nombre: 'Papa para fritar', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 2500, unidad_base: 'g', stock_minimo: 3000, stock_actual: 5000, costo_promedio: 2.5 },
    { codigo: 'KET-01', nombre: 'Salsa ketchup', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 12000, unidad_base: 'ml', stock_minimo: 500, stock_actual: 800, costo_promedio: 12 },
    { codigo: 'MAY-01', nombre: 'Mayonesa', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 15000, unidad_base: 'g', stock_minimo: 1000, stock_actual: 2000, costo_promedio: 15 },
    { codigo: 'OREO-01', nombre: 'Galletas Oreo', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 8000, unidad_base: 'g', stock_minimo: 400, stock_actual: 200, costo_promedio: 16 },
    { codigo: 'QC-01', nombre: 'Queso crema', unidad_compra: 'g', cantidad_compra: 250, precio_compra: 4500, unidad_base: 'g', stock_minimo: 300, stock_actual: 500, costo_promedio: 18 },
    { codigo: 'MANT-01', nombre: 'Mantequilla', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 7500, unidad_base: 'g', stock_minimo: 200, stock_actual: 150, costo_promedio: 15 },
    { codigo: 'AZU-01', nombre: 'Azúcar', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3500, unidad_base: 'g', stock_minimo: 1000, stock_actual: 2500, costo_promedio: 3.5 },
    { codigo: 'LECH-02', nombre: 'Leche', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 4500, unidad_base: 'ml', stock_minimo: 500, stock_actual: 1200, costo_promedio: 4.5 },
    { codigo: 'CREM-01', nombre: 'Crema de leche', unidad_compra: 'ml', cantidad_compra: 500, precio_compra: 6000, unidad_base: 'ml', stock_minimo: 200, stock_actual: 400, costo_promedio: 12 },
];

const PRODUCTOS = [
    { codigo: 'INV-01', nombre: 'Arroz con pollo', precio: 8500 },
    { codigo: 'INV-02', nombre: 'Ensalada fresca', precio: 5500 },
    { codigo: 'INV-03', nombre: 'Hamburguesa', precio: 12000 },
    { codigo: 'INV-04', nombre: 'Perro caliente', precio: 6500 },
    { codigo: 'INV-05', nombre: 'Salchipapa', precio: 9500 },
    { codigo: 'INV-06', nombre: 'Pastel de Oreo', precio: 8500 },
];

async function getOrCreateTenant() {
    let [rows] = await db.query('SELECT id FROM tenants WHERE id = ? LIMIT 1', [TENANT_ID]);
    if (rows.length === 0) {
        [rows] = await db.query('SELECT id FROM tenants ORDER BY id LIMIT 1');
    }
    const tenant = rows[0];
    if (!tenant) throw new Error('No hay ningún tenant. Ejecuta antes las migraciones (003_add_multi_tenancy).');
    return tenant.id;
}

async function ensureCategoriaYProductos(tenantId) {
    let [cats] = await db.query('SELECT id FROM categorias WHERE tenant_id = ? LIMIT 1', [tenantId]);
    let categoriaId = cats[0]?.id;
    if (!categoriaId) {
        const [r] = await db.query(
            'INSERT INTO categorias (nombre, descripcion, activa, tenant_id) VALUES (?, ?, TRUE, ?)',
            ['Platos prueba inventario', 'Para validar inventario y recetas', tenantId]
        );
        categoriaId = r.insertId;
        console.log('   Categoría creada (id:', categoriaId, ')');
    }

    const productoIds = [];
    for (const p of PRODUCTOS) {
        const [existentes] = await db.query(
            'SELECT id FROM productos WHERE tenant_id = ? AND codigo = ?',
            [tenantId, p.codigo]
        );
        if (existentes.length > 0) {
            productoIds.push(existentes[0].id);
        } else {
            const [ins] = await db.query(
                'INSERT INTO productos (tenant_id, codigo, nombre, categoria_id, precio_unidad) VALUES (?, ?, ?, ?, ?)',
                [tenantId, p.codigo, p.nombre, categoriaId, p.precio]
            );
            productoIds.push(ins.insertId);
            console.log('   Producto creado:', p.nombre, '(id:', ins.insertId, ')');
        }
    }
    return productoIds;
}

async function seedInsumos(tenantId) {
    const insumoIds = {};
    for (const i of INSUMOS) {
        const [existentes] = await db.query(
            'SELECT id FROM insumos WHERE tenant_id = ? AND codigo = ?',
            [tenantId, i.codigo]
        );
        if (existentes.length > 0) {
            const id = existentes[0].id;
            insumoIds[i.codigo] = id;
            await db.query(
                `UPDATE insumos SET nombre = ?, unidad_compra = ?, cantidad_compra = ?, precio_compra = ?,
                 unidad_base = ?, stock_minimo = ?, stock_actual = ?, costo_promedio = ? WHERE id = ? AND tenant_id = ?`,
                [
                    i.nombre, i.unidad_compra, i.cantidad_compra, i.precio_compra,
                    i.unidad_base, i.stock_minimo, i.stock_actual, i.costo_promedio != null ? i.costo_promedio : null,
                    id, tenantId
                ]
            );
            console.log('   Insumo actualizado (stock):', i.nombre, '(' + i.codigo + ')');
        } else {
            const [r] = await db.query(
                `INSERT INTO insumos (tenant_id, codigo, nombre, stock_actual, stock_minimo, unidad_compra, cantidad_compra, precio_compra, unidad_base, costo_promedio)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId, i.codigo, i.nombre, i.stock_actual, i.stock_minimo,
                    i.unidad_compra, i.cantidad_compra, i.precio_compra, i.unidad_base,
                    i.costo_promedio != null ? i.costo_promedio : null
                ]
            );
            insumoIds[i.codigo] = r.insertId;
            console.log('   Insumo creado:', i.nombre, '(' + i.codigo + ')');
        }
    }
    return insumoIds;
}

async function upsertReceta(tenantId, { producto_id, nombre_receta, porciones, ingredientes }, insumoIds) {
    const [existentes] = await db.query(
        'SELECT id FROM recetas WHERE tenant_id = ? AND producto_id = ?',
        [tenantId, producto_id]
    );
    let recetaId;
    if (existentes.length > 0) {
        recetaId = existentes[0].id;
        await db.query(
            'UPDATE recetas SET nombre_receta = ?, porciones = ? WHERE id = ? AND tenant_id = ?',
            [nombre_receta, porciones, recetaId, tenantId]
        );
        console.log('   Receta actualizada:', nombre_receta);
    } else {
        const [r] = await db.query(
            'INSERT INTO recetas (tenant_id, producto_id, nombre_receta, porciones) VALUES (?, ?, ?, ?)',
            [tenantId, producto_id, nombre_receta, porciones]
        );
        recetaId = r.insertId;
        console.log('   Receta creada:', nombre_receta, '(id:', recetaId, ')');
    }
    await db.query('DELETE FROM receta_ingredientes WHERE receta_id = ?', [recetaId]);
    for (const it of ingredientes) {
        const insumoId = typeof it.insumo_id === 'number' ? it.insumo_id : insumoIds[it.insumo_id];
        if (!insumoId) continue;
        await db.query(
            'INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad, unidad) VALUES (?, ?, ?, ?)',
            [recetaId, insumoId, it.cantidad, it.unidad || 'g']
        );
    }
}

async function seedRecetas(tenantId, productoIds, insumoIds) {
    const recetas = [
        {
            producto_id: productoIds[0],
            nombre_receta: 'Arroz con pollo',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'ARR-001', cantidad: 200, unidad: 'g' },
                { insumo_id: 'PLL-001', cantidad: 150, unidad: 'g' },
                { insumo_id: 'TOM-001', cantidad: 50, unidad: 'g' },
                { insumo_id: 'ACE-001', cantidad: 10, unidad: 'ml' },
                { insumo_id: 'SAL-001', cantidad: 5, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[1],
            nombre_receta: 'Ensalada fresca',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'TOM-001', cantidad: 100, unidad: 'g' },
                { insumo_id: 'ACE-001', cantidad: 20, unidad: 'ml' },
                { insumo_id: 'SAL-001', cantidad: 3, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[2],
            nombre_receta: 'Hamburguesa',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'PAN-HAM', cantidad: 1, unidad: 'UND' },
                { insumo_id: 'CARN-01', cantidad: 120, unidad: 'g' },
                { insumo_id: 'LECH-01', cantidad: 30, unidad: 'g' },
                { insumo_id: 'TOM-001', cantidad: 20, unidad: 'g' },
                { insumo_id: 'QUE-01', cantidad: 25, unidad: 'g' },
                { insumo_id: 'ACE-001', cantidad: 15, unidad: 'ml' },
                { insumo_id: 'SAL-001', cantidad: 2, unidad: 'g' },
                { insumo_id: 'KET-01', cantidad: 20, unidad: 'ml' },
            ],
        },
        {
            producto_id: productoIds[3],
            nombre_receta: 'Perro caliente',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'PAN-PER', cantidad: 1, unidad: 'UND' },
                { insumo_id: 'SALCH-01', cantidad: 1, unidad: 'UND' },
                { insumo_id: 'LECH-01', cantidad: 40, unidad: 'g' },
                { insumo_id: 'KET-01', cantidad: 25, unidad: 'ml' },
                { insumo_id: 'MAY-01', cantidad: 15, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[4],
            nombre_receta: 'Salchipapa',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'PAPA-01', cantidad: 200, unidad: 'g' },
                { insumo_id: 'SALCH-01', cantidad: 2, unidad: 'UND' },
                { insumo_id: 'KET-01', cantidad: 30, unidad: 'ml' },
                { insumo_id: 'MAY-01', cantidad: 25, unidad: 'g' },
                { insumo_id: 'ACE-001', cantidad: 20, unidad: 'ml' },
                { insumo_id: 'SAL-001', cantidad: 2, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[5],
            nombre_receta: 'Pastel de Oreo',
            porciones: 1,
            ingredientes: [
                { insumo_id: 'OREO-01', cantidad: 300, unidad: 'g' },
                { insumo_id: 'QC-01', cantidad: 200, unidad: 'g' },
                { insumo_id: 'MANT-01', cantidad: 50, unidad: 'g' },
                { insumo_id: 'AZU-01', cantidad: 80, unidad: 'g' },
                { insumo_id: 'LECH-02', cantidad: 50, unidad: 'ml' },
                { insumo_id: 'CREM-01', cantidad: 30, unidad: 'ml' },
            ],
        },
    ];
    for (const rec of recetas) {
        await upsertReceta(tenantId, rec, insumoIds);
    }
}

async function run() {
    console.log('\n🌱 Seed de datos para inventario (productos, insumos con stock, recetas)\n');

    try {
        const [tables] = await db.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'insumos'"
        );
        if (tables.length === 0) {
            console.error('❌ Tabla insumos no existe. Ejecuta: node scripts/run-migrations.js');
            process.exit(1);
        }
        const [col] = await db.query(
            "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'insumos' AND column_name = 'stock_actual'"
        );
        if (col.length === 0) {
            console.error('❌ Columna stock_actual no existe en insumos. Ejecuta la migración 023_inventario_insumos_movimientos.');
            process.exit(1);
        }

        const tenantId = await getOrCreateTenant();
        console.log('Tenant id:', tenantId, '\n');

        console.log('1. Categoría y productos:');
        const productoIds = await ensureCategoriaYProductos(tenantId);

        console.log('\n2. Insumos (con stock_actual, stock_minimo, unidad_base):');
        const insumoIds = await seedInsumos(tenantId);

        console.log('\n3. Recetas e ingredientes (ligadas a productos):');
        await seedRecetas(tenantId, productoIds, insumoIds);

        console.log('\n' + '='.repeat(60));
        console.log('✅ SEED INVENTARIO COMPLETADO');
        console.log('='.repeat(60));
        console.log('\nPuedes probar en:');
        console.log('  - /inventario: lista de insumos con stock (algunos bajo stock mínimo).');
        console.log('  - /recetas: recetas por producto con ingredientes.');
        console.log('  - Ventas/Mesas: al facturar un producto con receta se descuenta el inventario.\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.code) console.error('   Código:', err.code);
        process.exit(1);
    }
}

run();
