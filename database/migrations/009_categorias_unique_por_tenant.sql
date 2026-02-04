-- Categorías: permitir mismo nombre en distintos tenants (UNIQUE por tenant_id + nombre).
-- Antes: UNIQUE(nombre) global. Después: UNIQUE(tenant_id, nombre).

USE restaurante;

-- Eliminar índice único sobre nombre (el nombre del índice en MySQL suele ser el de la columna)
ALTER TABLE categorias DROP INDEX nombre;

-- Índice único por tenant + nombre
ALTER TABLE categorias ADD UNIQUE KEY unique_categoria_tenant_nombre (tenant_id, nombre);
