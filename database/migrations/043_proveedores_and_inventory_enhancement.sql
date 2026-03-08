-- 043_proveedores_and_inventory_enhancement.sql
-- Implementación de módulo de proveedores e integración con inventario

USE restaurante;

-- 1. Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    nit VARCHAR(50) NULL COMMENT 'Documento de identidad o NIT',
    contacto VARCHAR(100) NULL COMMENT 'Nombre de la persona de contacto',
    telefono VARCHAR(50) NULL,
    email VARCHAR(100) NULL,
    direccion TEXT NULL,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

-- 2. Vincular Insumos con Proveedores
ALTER TABLE insumos 
ADD COLUMN proveedor_id INT NULL AFTER tenant_id,
ADD CONSTRAINT fk_insumo_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

-- 3. Mejorar tabla de Movimientos de Inventario
ALTER TABLE movimientos_inventario
ADD COLUMN proveedor_id INT NULL AFTER insumo_id,
ADD COLUMN documento_referencia VARCHAR(100) NULL COMMENT 'Número de factura o remisión' AFTER referencia,
ADD CONSTRAINT fk_movimiento_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

-- 4. Permisos para el módulo de proveedores
INSERT INTO permisos (nombre, descripcion) VALUES
('proveedores.ver', 'Ver lista de proveedores'),
('proveedores.editar', 'Crear, editar y eliminar proveedores')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar permisos a admin y superadmin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('proveedores.ver','proveedores.editar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
