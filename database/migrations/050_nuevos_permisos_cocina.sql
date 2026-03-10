-- Migration: Add specific kitchen permissions
USE restaurante;

INSERT INTO permisos (nombre, descripcion) VALUES
('cocina.ver_todo', 'Ver toda la cola de cocina (En cocina y Listos)'),
('cocina.ver_listos', 'Ver solo platos listos en cocina')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar cocina.ver_todo a admin y cocinero por defecto
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin', 'cocinero')
AND p.nombre = 'cocina.ver_todo'
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Asignar cocina.ver_listos a admin, cocinero y mesero por defecto
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin', 'cocinero', 'mesero')
AND p.nombre = 'cocina.ver_listos'
ON DUPLICATE KEY UPDATE rol_id = rol_id;
