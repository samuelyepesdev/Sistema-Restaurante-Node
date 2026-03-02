-- 031_tenants_info_fiscal.sql
-- Agrega campos de identificación fiscal para el restaurante (Emisor).

ALTER TABLE tenants 
ADD COLUMN nit VARCHAR(20) DEFAULT NULL,
ADD COLUMN direccion VARCHAR(255) DEFAULT NULL,
ADD COLUMN telefono VARCHAR(50) DEFAULT NULL,
ADD COLUMN ciudad VARCHAR(100) DEFAULT NULL,
ADD COLUMN regimen_fiscal ENUM('Responsable de IVA', 'No responsable de IVA', 'Régimen Simple') DEFAULT 'No responsable de IVA';

-- Índice para búsquedas rápidas por NIT (aunque generalmente se busca por ID o slug)
CREATE INDEX idx_tenants_nit ON tenants(nit);
