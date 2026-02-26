-- Insumos: guardar precio de compra y cantidad de presentación; costo unitario se calcula (como en Excel).
-- costo_unitario_real = precio_compra / cantidad_convertida_a_base
-- No guardar costo_unitario para evitar desfases cuando cambia el precio.

ALTER TABLE insumos
    ADD COLUMN cantidad_compra DECIMAL(12,4) NOT NULL DEFAULT 1 AFTER unidad_compra,
    ADD COLUMN precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cantidad_compra;

UPDATE insumos SET cantidad_compra = 1, precio_compra = IFNULL(costo_unitario, 0) WHERE 1 = 1;

ALTER TABLE insumos DROP COLUMN costo_unitario;
