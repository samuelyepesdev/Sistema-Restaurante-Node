-- 030_clientes_informacion_fiscal.sql
-- Agrega campos de identificación fiscal y contacto para cumplimiento legal en Colombia.

ALTER TABLE clientes 
ADD COLUMN tipo_documento VARCHAR(10) DEFAULT 'CC',
ADD COLUMN numero_documento VARCHAR(20) DEFAULT NULL,
ADD COLUMN email VARCHAR(100) DEFAULT NULL;

-- Crear un índice para búsquedas rápidas por documento dentro de un mismo restaurante
CREATE INDEX idx_clientes_documento ON clientes(tenant_id, numero_documento);
