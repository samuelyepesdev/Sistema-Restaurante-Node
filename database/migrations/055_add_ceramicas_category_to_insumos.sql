-- Migración 055: Asegurar existencia de categoría 'Cerámicas' en insumos para todos los tenants
-- Esta versión evita el uso de PROCEDURES y DELIMITER para ser compatible con el script de migraciones de Node.js

-- 1. Asegurar que el tema 'CATEGORIAS DE INSUMO' exista para cada tenant
INSERT INTO temas (tenant_id, name, status)
SELECT t.id, 'CATEGORIAS DE INSUMO', 1
FROM tenants t
LEFT JOIN temas mt ON mt.tenant_id = t.id AND mt.name = 'CATEGORIAS DE INSUMO'
WHERE mt.id IS NULL;

-- 2. Asegurar que el parámetro 'Cerámicas' exista para cada tenant
INSERT INTO parametros (tenant_id, name, status)
SELECT t.id, 'Cerámicas', 1
FROM tenants t
LEFT JOIN parametros mp ON mp.tenant_id = t.id AND mp.name = 'Cerámicas'
WHERE mp.id IS NULL;

-- 3. Asegurar que el tema 'UNIDADES DE COMPRA' exista para cada tenant (necesario para el formulario)
INSERT INTO temas (tenant_id, name, status)
SELECT t.id, 'UNIDADES DE COMPRA', 1
FROM tenants t
LEFT JOIN temas mt ON mt.tenant_id = t.id AND mt.name = 'UNIDADES DE COMPRA'
WHERE mt.id IS NULL;

-- 4. Vincular tema 'CATEGORIAS DE INSUMO' con el parámetro 'Cerámicas'
INSERT IGNORE INTO tema_parametro (tema_id, parametro_id, status)
SELECT t.id, p.id, 1
FROM temas t
JOIN parametros p ON t.tenant_id = p.tenant_id
WHERE t.name = 'CATEGORIAS DE INSUMO' AND p.name = 'Cerámicas';
