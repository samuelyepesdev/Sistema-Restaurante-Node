-- 033_add_email_to_tenants.sql
-- Agrega columna de correo electrónico a los tenants para envíos automáticos (como reportes mensuales)

ALTER TABLE tenants 
ADD COLUMN email VARCHAR(150) DEFAULT NULL AFTER nombre;

-- Crear un índice para búsquedas por correo si fuera necesario
CREATE INDEX idx_tenants_email ON tenants(email);
