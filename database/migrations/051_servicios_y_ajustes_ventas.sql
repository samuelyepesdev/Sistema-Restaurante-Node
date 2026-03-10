-- Migration: Create Servicios module and update orders/invoices
-- This allows adding external services (like delivery) that don't count as sales volume/profit

USE restaurante;

-- 1. Table for available services
CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    es_externo BOOLEAN DEFAULT TRUE, -- TRUE: El costo es igual al precio, ganancia 0.
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 2. Update pedido_items to distinguish services
ALTER TABLE pedido_items MODIFY COLUMN producto_id INT NULL;
ALTER TABLE pedido_items ADD COLUMN es_servicio BOOLEAN DEFAULT FALSE;
ALTER TABLE pedido_items ADD COLUMN servicio_id INT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT fk_pedido_items_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;

-- 3. Update detalle_factura to distinguish services
ALTER TABLE detalle_factura MODIFY COLUMN producto_id INT NULL;
ALTER TABLE detalle_factura ADD COLUMN es_servicio BOOLEAN DEFAULT FALSE;
ALTER TABLE detalle_factura ADD COLUMN servicio_id INT NULL;
ALTER TABLE detalle_factura ADD CONSTRAINT fk_detalle_factura_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;

-- 4. New permissions for services
INSERT INTO permisos (nombre, descripcion) VALUES
('servicios.ver', 'Ver catálogo de servicios'),
('servicios.crear', 'Crear nuevos servicios'),
('servicios.editar', 'Editar servicios existentes'),
('servicios.eliminar', 'Eliminar servicios'),
('servicios.gestionar', 'Agregar servicios a pedidos/facturas')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- 5. Assign permissions to roles
-- Admin and Cajero can manage services
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin', 'cajero')
AND p.nombre LIKE 'servicios.%'
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Mesero can only "gestionar" (add to orders) and "ver"
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'mesero'
AND p.nombre IN ('servicios.ver', 'servicios.gestionar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
