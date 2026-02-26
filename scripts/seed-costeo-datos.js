/**
 * Seed de datos para validar el módulo de costeo.
 * Crea: insumos, recetas ligadas a productos, configuración (30% ganancia, 2% merma) y opcionalmente costos fijos.
 *
 * Ejecutar: node scripts/seed-costeo-datos.js
 * Requisito: migraciones ejecutadas (006_costeo, 018, 019, 020) y al menos un tenant existente.
 */

require('dotenv').config();
const db = require('../config/database');

/** Tenant a usar: 1 = Principal, o el primer tenant disponible */
const TENANT_ID = 1;

const INSUMOS = [
    { codigo: 'ARR-001', nombre: 'Arroz', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3000 },
    { codigo: 'PLL-001', nombre: 'Pollo', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 12000 },
    { codigo: 'TOM-001', nombre: 'Tomate', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 2500 },
    { codigo: 'ACE-001', nombre: 'Aceite', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 15000 },
    { codigo: 'SAL-001', nombre: 'Sal', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 2000 },
    // Hamburguesa, perro, salchipapa, pastel
    { codigo: 'PAN-HAM', nombre: 'Pan hamburguesa', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 800 },
    { codigo: 'CARN-01', nombre: 'Carne molida', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 18000 },
    { codigo: 'LECH-01', nombre: 'Lechuga', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3500 },
    { codigo: 'QUE-01', nombre: 'Queso rebanado', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 22000 },
    { codigo: 'PAN-PER', nombre: 'Pan perro caliente', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 600 },
    { codigo: 'SALCH-01', nombre: 'Salchicha', unidad_compra: 'UND', cantidad_compra: 1, precio_compra: 1200 },
    { codigo: 'PAPA-01', nombre: 'Papa para fritar', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 2500 },
    { codigo: 'KET-01', nombre: 'Salsa ketchup', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 12000 },
    { codigo: 'MAY-01', nombre: 'Mayonesa', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 15000 },
    { codigo: 'OREO-01', nombre: 'Galletas Oreo', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 8000 },
    { codigo: 'QC-01', nombre: 'Queso crema', unidad_compra: 'g', cantidad_compra: 250, precio_compra: 4500 },
    { codigo: 'MANT-01', nombre: 'Mantequilla', unidad_compra: 'g', cantidad_compra: 500, precio_compra: 7500 },
    { codigo: 'AZU-01', nombre: 'Azúcar', unidad_compra: 'kg', cantidad_compra: 1, precio_compra: 3500 },
    { codigo: 'LECH-02', nombre: 'Leche', unidad_compra: 'L', cantidad_compra: 1, precio_compra: 4500 },
    { codigo: 'CREM-01', nombre: 'Crema de leche', unidad_compra: 'ml', cantidad_compra: 500, precio_compra: 6000 },
];

/** Configuración: 30% ganancia esperada, 2% merma (porcentaje indirectos) */
const CONFIG_COSTEO = {
    metodo_indirectos: 'porcentaje',
    porcentaje_indirectos: 2,
    costo_fijo_mensual: 0,
    platos_estimados_mes: 500,
    factor_carga: 2.5,
    margen_objetivo_default: 30,
    margen_minimo_alerta: 20,
    ganancia_neta_deseada_mensual: 0,
};

const COSTOS_FIJOS = [
    { nombre: 'Arriendo', monto_mensual: 800000 },
    { nombre: 'Servicios (luz, agua, gas)', monto_mensual: 150000 },
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
            ['Platos de prueba costeo', 'Para validar costeo', tenantId]
        );
        categoriaId = r.insertId;
        console.log('   Categoría creada (id:', categoriaId, ')');
    }

    const productos = [
        { codigo: 'COSTEO-01', nombre: 'Arroz con pollo', precio: 8500 },
        { codigo: 'COSTEO-02', nombre: 'Ensalada fresca', precio: 5500 },
        { codigo: 'COSTEO-03', nombre: 'Hamburguesa', precio: 12000 },
        { codigo: 'COSTEO-04', nombre: 'Perro caliente', precio: 6500 },
        { codigo: 'COSTEO-05', nombre: 'Salchipapa', precio: 9500 },
        { codigo: 'COSTEO-06', nombre: 'Pastel de Oreo', precio: 8500 },
    ];
    const productoIds = [];
    for (const p of productos) {
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
            insumoIds[i.codigo] = existentes[0].id;
            await db.query(
                'UPDATE insumos SET nombre = ?, unidad_compra = ?, cantidad_compra = ?, precio_compra = ? WHERE id = ?',
                [i.nombre, i.unidad_compra, i.cantidad_compra, i.precio_compra, insumoIds[i.codigo]]
            );
        } else {
            const [r] = await db.query(
                'INSERT INTO insumos (tenant_id, codigo, nombre, unidad_compra, cantidad_compra, precio_compra) VALUES (?, ?, ?, ?, ?, ?)',
                [tenantId, i.codigo, i.nombre, i.unidad_compra, i.cantidad_compra, i.precio_compra]
            );
            insumoIds[i.codigo] = r.insertId;
            console.log('   Insumo creado:', i.nombre, '(' + i.codigo + ')');
        }
    }
    return insumoIds;
}

async function upsertConfiguracionCosteo(tenantId) {
    const [existentes] = await db.query('SELECT id FROM configuracion_costeo WHERE tenant_id = ?', [tenantId]);
    if (existentes.length > 0) {
        await db.query(
            `UPDATE configuracion_costeo SET 
             metodo_indirectos = ?, porcentaje_indirectos = ?, costo_fijo_mensual = ?,
             platos_estimados_mes = ?, factor_carga = ?, margen_objetivo_default = ?, margen_minimo_alerta = ?, ganancia_neta_deseada_mensual = ?
             WHERE tenant_id = ?`,
            [
                CONFIG_COSTEO.metodo_indirectos,
                CONFIG_COSTEO.porcentaje_indirectos,
                CONFIG_COSTEO.costo_fijo_mensual,
                CONFIG_COSTEO.platos_estimados_mes,
                CONFIG_COSTEO.factor_carga,
                CONFIG_COSTEO.margen_objetivo_default,
                CONFIG_COSTEO.margen_minimo_alerta,
                CONFIG_COSTEO.ganancia_neta_deseada_mensual,
                tenantId,
            ]
        );
        console.log('   Configuración de costeo actualizada (30% ganancia, 2% merma).');
    } else {
        await db.query(
            `INSERT INTO configuracion_costeo 
             (tenant_id, metodo_indirectos, porcentaje_indirectos, costo_fijo_mensual, platos_estimados_mes, factor_carga, margen_objetivo_default, margen_minimo_alerta, ganancia_neta_deseada_mensual) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                CONFIG_COSTEO.metodo_indirectos,
                CONFIG_COSTEO.porcentaje_indirectos,
                CONFIG_COSTEO.costo_fijo_mensual,
                CONFIG_COSTEO.platos_estimados_mes,
                CONFIG_COSTEO.factor_carga,
                CONFIG_COSTEO.margen_objetivo_default,
                CONFIG_COSTEO.margen_minimo_alerta,
                CONFIG_COSTEO.ganancia_neta_deseada_mensual,
            ]
        );
        console.log('   Configuración de costeo creada (30% ganancia, 2% merma).');
    }
}

async function seedCostosFijos(tenantId) {
    for (const cf of COSTOS_FIJOS) {
        const [existentes] = await db.query(
            'SELECT id FROM costos_fijos WHERE tenant_id = ? AND nombre = ?',
            [tenantId, cf.nombre]
        );
        if (existentes.length === 0) {
            await db.query(
                'INSERT INTO costos_fijos (tenant_id, nombre, monto_mensual, activo) VALUES (?, ?, ?, 1)',
                [tenantId, cf.nombre, cf.monto_mensual]
            );
            console.log('   Costo fijo creado:', cf.nombre);
        }
    }
}

async function seedRecetas(tenantId, productoIds, insumoIds) {
    const recetas = [
        {
            producto_id: productoIds[0],
            nombre_receta: 'Arroz con pollo',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['ARR-001'], cantidad: 200, unidad: 'g' },
                { insumo_id: insumoIds['PLL-001'], cantidad: 150, unidad: 'g' },
                { insumo_id: insumoIds['TOM-001'], cantidad: 50, unidad: 'g' },
                { insumo_id: insumoIds['ACE-001'], cantidad: 10, unidad: 'ml' },
                { insumo_id: insumoIds['SAL-001'], cantidad: 5, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[1],
            nombre_receta: 'Ensalada fresca',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['TOM-001'], cantidad: 100, unidad: 'g' },
                { insumo_id: insumoIds['ACE-001'], cantidad: 20, unidad: 'ml' },
                { insumo_id: insumoIds['SAL-001'], cantidad: 3, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[2],
            nombre_receta: 'Hamburguesa',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['PAN-HAM'], cantidad: 1, unidad: 'UND' },
                { insumo_id: insumoIds['CARN-01'], cantidad: 120, unidad: 'g' },
                { insumo_id: insumoIds['LECH-01'], cantidad: 30, unidad: 'g' },
                { insumo_id: insumoIds['TOM-001'], cantidad: 20, unidad: 'g' },
                { insumo_id: insumoIds['QUE-01'], cantidad: 25, unidad: 'g' },
                { insumo_id: insumoIds['ACE-001'], cantidad: 15, unidad: 'ml' },
                { insumo_id: insumoIds['SAL-001'], cantidad: 2, unidad: 'g' },
                { insumo_id: insumoIds['KET-01'], cantidad: 20, unidad: 'ml' },
            ],
        },
        {
            producto_id: productoIds[3],
            nombre_receta: 'Perro caliente',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['PAN-PER'], cantidad: 1, unidad: 'UND' },
                { insumo_id: insumoIds['SALCH-01'], cantidad: 1, unidad: 'UND' },
                { insumo_id: insumoIds['LECH-01'], cantidad: 40, unidad: 'g' },
                { insumo_id: insumoIds['KET-01'], cantidad: 25, unidad: 'ml' },
                { insumo_id: insumoIds['MAY-01'], cantidad: 15, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[4],
            nombre_receta: 'Salchipapa',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['PAPA-01'], cantidad: 200, unidad: 'g' },
                { insumo_id: insumoIds['SALCH-01'], cantidad: 2, unidad: 'UND' },
                { insumo_id: insumoIds['KET-01'], cantidad: 30, unidad: 'ml' },
                { insumo_id: insumoIds['MAY-01'], cantidad: 25, unidad: 'g' },
                { insumo_id: insumoIds['ACE-001'], cantidad: 20, unidad: 'ml' },
                { insumo_id: insumoIds['SAL-001'], cantidad: 2, unidad: 'g' },
            ],
        },
        {
            producto_id: productoIds[5],
            nombre_receta: 'Pastel de Oreo',
            porciones: 1,
            ingredientes: [
                { insumo_id: insumoIds['OREO-01'], cantidad: 300, unidad: 'g' },
                { insumo_id: insumoIds['QC-01'], cantidad: 200, unidad: 'g' },
                { insumo_id: insumoIds['MANT-01'], cantidad: 50, unidad: 'g' },
                { insumo_id: insumoIds['AZU-01'], cantidad: 80, unidad: 'g' },
                { insumo_id: insumoIds['LECH-02'], cantidad: 50, unidad: 'ml' },
                { insumo_id: insumoIds['CREM-01'], cantidad: 30, unidad: 'ml' },
            ],
        },
    ];
    for (const rec of recetas) {
        await upsertReceta(tenantId, rec);
    }
}

async function upsertReceta(tenantId, { producto_id, nombre_receta, porciones, ingredientes }) {
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
        await db.query(
            'INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad, unidad) VALUES (?, ?, ?, ?)',
            [recetaId, it.insumo_id, it.cantidad, it.unidad || 'g']
        );
    }
}

async function run() {
    console.log('\n🌱 Seed de datos para costeo (30% ganancia, 2% merma)\n');

    try {
        const [tables] = await db.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'configuracion_costeo'"
        );
        if (tables.length === 0) {
            console.error('❌ Tabla configuracion_costeo no existe. Ejecuta: node scripts/run-migrations.js');
            process.exit(1);
        }

        const tenantId = await getOrCreateTenant();
        console.log('Tenant id:', tenantId, '\n');

        console.log('1. Categoría y productos de prueba:');
        const productoIds = await ensureCategoriaYProductos(tenantId);

        console.log('\n2. Insumos:');
        const insumoIds = await seedInsumos(tenantId);

        console.log('\n3. Configuración de costeo (margen 30%, merma 2%):');
        await upsertConfiguracionCosteo(tenantId);

        console.log('\n4. Costos fijos (opcional):');
        await seedCostosFijos(tenantId);

        console.log('\n5. Recetas e ingredientes:');
        await seedRecetas(tenantId, productoIds, insumoIds);

        console.log('\n' + '='.repeat(60));
        console.log('✅ SEED COSTEO COMPLETADO');
        console.log('='.repeat(60));
        console.log('\nValida en la vista de Costeo:');
        console.log('  - Costo directo por receta (suma insumos).');
        console.log('  - Costo indirecto = 2% del directo (merma).');
        console.log('  - Precio sugerido con 30% de ganancia esperada.');
        console.log('  - Resumen financiero (PE, ventas necesarias si aplica).\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.code) console.error('   Código:', err.code);
        process.exit(1);
    }
}

run();
