-- Guardar porcentaje de descuento por línea en la factura (para mostrar en impresión)
-- Solo aplica a esta venta; el producto en catálogo no cambia.
ALTER TABLE detalle_factura
ADD COLUMN descuento_porcentaje DECIMAL(5,2) NULL DEFAULT NULL
COMMENT 'Porcentaje de descuento aplicado a esta línea (ej: 10 = 10%)';
