const db = require('../config/database');

async function updatePlans() {
    try {
        console.log('Actualizando características de los planes...');

        // Plan 1 (Básico)
        await db.query(`
            UPDATE planes 
            SET caracteristicas = '["dashboard", "productos", "clientes", "mesas", "cocina", "ventas", "configuracion", "caja", "costeo"]' 
            WHERE id = 1
        `);

        // Plan 2 (Pro)
        await db.query(`
            UPDATE planes 
            SET caracteristicas = '["dashboard", "productos", "clientes", "mesas", "cocina", "ventas", "configuracion", "inventario", "recetas", "caja", "costeo"]' 
            WHERE id = 2
        `);

        // Plan 3 (Premium)
        await db.query(`
            UPDATE planes 
            SET caracteristicas = '["dashboard", "productos", "clientes", "mesas", "cocina", "ventas", "configuracion", "inventario", "recetas", "eventos", "analitica", "prediccion_ml", "caja", "costeo"]' 
            WHERE id = 3
        `);

        console.log('✅ Planes actualizados correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando planes:', error);
        process.exit(1);
    }
}

updatePlans();
