-- Eventos por tenant: ventas pueden asociarse a un evento (no afectan análisis predictivo)
-- Permisos: eventos.ver, eventos.crear, eventos.editar, eventos.eliminar, ventas_evento.realizar

USE restaurante;

-- Tabla eventos (por tenant)
CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    descripcion TEXT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_eventos_tenant_fechas (tenant_id, fecha_inicio, fecha_fin)
);

-- Columna evento_id en facturas (NULL = venta diaria). Si la columna ya existe, el error es ignorable.
ALTER TABLE facturas ADD COLUMN evento_id INT NULL AFTER forma_pago;
ALTER TABLE facturas ADD CONSTRAINT fk_facturas_evento FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL;

-- Permisos de eventos
INSERT INTO permisos (nombre, descripcion) VALUES
('eventos.ver', 'Ver listado y detalle de eventos'),
('eventos.crear', 'Crear eventos'),
('eventos.editar', 'Editar eventos'),
('eventos.eliminar', 'Eliminar eventos'),
('ventas_evento.realizar', 'Realizar ventas asociadas a un evento')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar permisos de eventos al rol admin (superadmin ya tiene todos por rol_permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'admin'
AND p.nombre IN ('eventos.ver', 'eventos.crear', 'eventos.editar', 'eventos.eliminar', 'ventas_evento.realizar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
