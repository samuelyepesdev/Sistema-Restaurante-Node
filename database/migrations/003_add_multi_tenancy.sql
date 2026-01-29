-- Migration: Add multi-tenancy (tenants table + tenant_id on main tables)
-- Run after 001 and 002. tenant_id is nullable for existing data; default tenant is created and assigned.

USE restaurante;

-- Table: tenants
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    config JSON NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add tenant_id to each table (run-migrations ignores "Duplicate column" / "Duplicate key" if already applied)

ALTER TABLE usuarios ADD COLUMN tenant_id INT NULL AFTER rol_id;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE clientes ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE clientes ADD CONSTRAINT fk_clientes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE facturas ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE facturas ADD CONSTRAINT fk_facturas_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE mesas ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE mesas ADD CONSTRAINT fk_mesas_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE pedidos ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE pedido_items ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE pedido_items ADD CONSTRAINT fk_pedido_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE productos ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE productos ADD CONSTRAINT fk_productos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE configuracion_impresion ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE configuracion_impresion ADD CONSTRAINT fk_configuracion_impresion_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE categorias ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE categorias ADD CONSTRAINT fk_categorias_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- Default tenant
INSERT INTO tenants (nombre, slug, activo) VALUES ('Principal', 'principal', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Assign existing rows to default tenant
SET @default_tenant_id = (SELECT id FROM tenants WHERE slug = 'principal' LIMIT 1);

UPDATE usuarios SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE clientes SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE facturas SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE mesas SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE pedidos SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE pedido_items SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE productos SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE configuracion_impresion SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE categorias SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
