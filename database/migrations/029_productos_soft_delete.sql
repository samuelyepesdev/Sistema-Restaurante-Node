-- 029_productos_soft_delete.sql
-- Soft delete para productos: en lugar de eliminar físicamente,
-- se marca activo = 0 para conservar integridad referencial con detalle_factura.

ALTER TABLE productos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
CREATE INDEX idx_productos_activo ON productos(tenant_id, activo);
