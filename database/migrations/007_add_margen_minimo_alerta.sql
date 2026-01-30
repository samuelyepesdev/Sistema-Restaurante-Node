-- Add margen_minimo_alerta to configuracion_costeo (threshold below which we show "low margin" alert)
ALTER TABLE configuracion_costeo
ADD COLUMN margen_minimo_alerta DECIMAL(5,2) NOT NULL DEFAULT 30
COMMENT 'Margen mínimo (%) para alerta de margen bajo';
