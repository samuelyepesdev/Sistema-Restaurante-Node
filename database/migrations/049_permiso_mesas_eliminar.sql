-- 049_permiso_mesas_eliminar.sql
-- Permiso para eliminar mesas definitivamente del sistema.
-- Esto asegura que solo usuarios autorizados (admin/superadmin) puedan borrar mesas.

USE restaurante;

-- 1. Insertar el permiso si no existe
INSERT INTO permisos (nombre, descripcion) VALUES
('mesas.eliminar', 'Eliminar mesas definitivamente del sistema')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- 2. Asignar permiso a los roles administrativos automáticamente
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('mesas.eliminar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
