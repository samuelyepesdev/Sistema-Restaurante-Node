-- Permiso para editar mesas (número y descripción).
-- Solo se asigna desde el panel de permisos (superadmin); sin este permiso no se puede editar mesa.

USE restaurante;

INSERT INTO permisos (nombre, descripcion) VALUES
('mesas.editar', 'Editar mesas (número y descripción)')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);
