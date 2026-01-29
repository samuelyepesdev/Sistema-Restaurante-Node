-- Permite que cada tenant tenga sus propias mesas (mismo número) y productos (mismo código).
-- Antes: UNIQUE(numero) en mesas y UNIQUE(codigo) en productos (global).
-- Después: UNIQUE(tenant_id, numero) y UNIQUE(tenant_id, codigo).

USE restaurante;

-- Mesas: quitar UNIQUE(numero) y poner UNIQUE(tenant_id, numero)
ALTER TABLE mesas DROP INDEX numero;
ALTER TABLE mesas ADD UNIQUE KEY unique_mesa_tenant_numero (tenant_id, numero);

-- Productos: quitar UNIQUE(codigo) y poner UNIQUE(tenant_id, codigo)
ALTER TABLE productos DROP INDEX codigo;
ALTER TABLE productos ADD UNIQUE KEY unique_producto_tenant_codigo (tenant_id, codigo);
