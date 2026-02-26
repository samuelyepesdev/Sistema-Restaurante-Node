-- Ganancia neta deseada mensual: para calcular ventas necesarias (PE + ganancia).
ALTER TABLE configuracion_costeo
ADD COLUMN ganancia_neta_deseada_mensual DECIMAL(12,2) NOT NULL DEFAULT 0
COMMENT 'Meta de ganancia neta mensual ($) para calcular ventas necesarias';
