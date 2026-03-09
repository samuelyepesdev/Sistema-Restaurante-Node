-- 047_proveedor_facturas.sql
-- Tabla para almacenar facturas de proveedores (PDF/Imágenes) en la base de datos

USE restaurante;

CREATE TABLE IF NOT EXISTS proveedor_facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    numero_factura VARCHAR(100) NULL,
    fecha_emision DATE NULL,
    monto_total DECIMAL(15, 2) DEFAULT 0,
    archivo_nombre VARCHAR(255) NOT NULL,
    archivo_contenido LONGBLOB NOT NULL,
    archivo_tipo VARCHAR(100) NOT NULL COMMENT 'MIME type (ej: application/pdf)',
    archivo_size INT NOT NULL COMMENT 'Tamaño en bytes',
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- Permisos adicionales
INSERT INTO permisos (nombre, descripcion) VALUES
('proveedores.facturas', 'Gestionar facturas y documentos de proveedores')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar permisos a admin y superadmin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('proveedores.facturas')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
