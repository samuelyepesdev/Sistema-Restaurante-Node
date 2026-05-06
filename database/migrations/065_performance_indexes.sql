-- Agrega índices de alto rendimiento para optimizar estadísticas globales y locales
ALTER TABLE facturas ADD INDEX idx_facturas_tenant_fecha (tenant_id, fecha);
ALTER TABLE facturas ADD INDEX idx_facturas_forma_pago (forma_pago);
ALTER TABLE facturas ADD INDEX idx_facturas_evento (evento_id);

ALTER TABLE productos ADD INDEX idx_productos_tenant (tenant_id);
ALTER TABLE clientes ADD INDEX idx_clientes_tenant (tenant_id);
