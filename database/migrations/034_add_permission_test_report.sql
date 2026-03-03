-- 034_add_permission_test_report.sql
-- Agrega permiso para probar reportes mensuales manualmente

-- 1. Insertar el permiso si no existe
INSERT INTO permisos (nombre, descripcion) VALUES
('reporte_mensual.test', 'Permite generar y enviar reportes mensuales de prueba manualmente')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- 2. Asignar el permiso al rol 'admin' (para que los dueños de locales puedan probar)
-- Superadmin ya tiene acceso a todo por su rol, pero esto asegura consistencia.
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'admin'
AND p.nombre = 'reporte_mensual.test'
ON DUPLICATE KEY UPDATE rol_id = rol_id;
