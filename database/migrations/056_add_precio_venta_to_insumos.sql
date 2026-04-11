-- Migración 056: Añadir campo precio_venta a la tabla de insumos
-- Esto permite definir el precio al que se venderán los insumos de tipo 'Cerámica'

ALTER TABLE insumos ADD COLUMN precio_venta DECIMAL(12,2) DEFAULT 0.00 AFTER precio_compra;
