-- Permiso para descargar/exportar plantillas Excel (ventas, productos, insumos)
-- Plan Pro incluye el módulo "plantillas"

USE restaurante;

INSERT INTO permisos (nombre, descripcion) VALUES
('plantillas.ver', 'Descargar plantillas Excel y exportar reportes (ventas, productos, insumos)')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar a admin y superadmin (roles que gestionan reportes y datos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin')
AND p.nombre = 'plantillas.ver'
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Cajero puede exportar ventas si tiene plantillas.ver (opcional: descomentar para dar también a cajero)
-- INSERT INTO rol_permisos (rol_id, permiso_id)
-- SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
-- WHERE r.nombre = 'cajero' AND p.nombre = 'plantillas.ver'
-- ON DUPLICATE KEY UPDATE rol_id = rol_id;
