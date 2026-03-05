-- Añadir columna precio_original a detalle_factura
-- Guarda el precio de catálogo del producto al momento de la venta,
-- útil para mostrar el precio antes de descuento en la factura impresa.
ALTER TABLE detalle_factura
ADD COLUMN precio_original DECIMAL(12,2) NULL DEFAULT NULL
COMMENT 'Precio de catálogo del producto al momento de la venta (antes de descuento)';
