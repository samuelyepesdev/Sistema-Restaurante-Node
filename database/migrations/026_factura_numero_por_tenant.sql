-- Numeración de factura por tenant: secuencial 1, 2, 3... por restaurante.
-- Al ejecutar esta migración, las facturas existentes se RENUMERAN a 1, 2, 3... por tenant (orden por id).
-- Así en producción la lista pasa a verse: Factura #1, #2, #3, #4... en lugar de con huecos (22, 21, 20, 15, 10...).

USE restaurante;

-- 1. Agregar columna numero (nullable al inicio)
ALTER TABLE facturas ADD COLUMN numero INT NULL AFTER tenant_id;

-- 2. Asignar 1, 2, 3... por tenant (orden por id). Requiere MySQL 8.0+ (ROW_NUMBER).
--    Si usas MySQL 5.7: después del ALTER anterior ejecuta: node scripts/backfill-factura-numero.js
--    y luego en MySQL: ALTER TABLE facturas MODIFY COLUMN numero INT NOT NULL;
--                      ALTER TABLE facturas ADD UNIQUE KEY unique_factura_tenant_numero (tenant_id, numero);
UPDATE facturas f
INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY id) AS rn
    FROM facturas
) t ON f.id = t.id
SET f.numero = t.rn;

-- 3. Hacer NOT NULL y única la combinación tenant_id + numero
ALTER TABLE facturas MODIFY COLUMN numero INT NOT NULL;
ALTER TABLE facturas ADD UNIQUE KEY unique_factura_tenant_numero (tenant_id, numero);
