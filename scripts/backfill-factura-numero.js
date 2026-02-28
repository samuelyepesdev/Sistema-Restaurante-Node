/**
 * Backfill de numero en facturas: asigna 1, 2, 3... por tenant (orden por id).
 * Usar si la migración 026 falla en el UPDATE (p. ej. MySQL 5.7 sin ROW_NUMBER):
 * 1) Ejecutar solo el ALTER que agrega la columna numero.
 * 2) Ejecutar: node scripts/backfill-factura-numero.js
 * 3) En MySQL: ALTER TABLE facturas MODIFY COLUMN numero INT NOT NULL;
 *             ALTER TABLE facturas ADD UNIQUE KEY unique_factura_tenant_numero (tenant_id, numero);
 *
 * Uso: node scripts/backfill-factura-numero.js
 */

require('dotenv').config();
const db = require('../config/database');

async function main() {
    const [tenants] = await db.query('SELECT DISTINCT tenant_id FROM facturas WHERE tenant_id IS NOT NULL');
    for (const { tenant_id } of tenants) {
        const [rows] = await db.query(
            'SELECT id FROM facturas WHERE tenant_id = ? ORDER BY id ASC',
            [tenant_id]
        );
        let n = 1;
        for (const row of rows) {
            await db.query('UPDATE facturas SET numero = ? WHERE id = ?', [n, row.id]);
            n++;
        }
        console.log('Tenant', tenant_id, ':', rows.length, 'facturas numeradas');
    }
    const [nullTenant] = await db.query('SELECT id FROM facturas WHERE tenant_id IS NULL ORDER BY id ASC');
    if (nullTenant.length) {
        let n = 1;
        for (const row of nullTenant) {
            await db.query('UPDATE facturas SET numero = ? WHERE id = ?', [n, row.id]);
            n++;
        }
        console.log('Sin tenant:', nullTenant.length, 'facturas numeradas');
    }
    console.log('Backfill terminado.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
