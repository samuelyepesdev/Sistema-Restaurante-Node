-- 035_tenants_logo_blob.sql
-- Agrega columnas para guardar el logo del negocio como BLOB en la base de datos
-- Esto evita que se pierda la imagen al hacer deploy (que borra archivos locales)

ALTER TABLE tenants 
ADD COLUMN logo_data LONGBLOB AFTER config,
ADD COLUMN logo_tipo VARCHAR(50) AFTER logo_data;
