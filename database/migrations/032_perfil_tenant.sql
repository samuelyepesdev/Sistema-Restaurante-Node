-- 032_perfil_tenant.sql
-- Agrega permisos para el módulo de perfil del negocio (editar colores, datos generales, etc.)

INSERT IGNORE INTO permisos (nombre, descripcion) VALUES 
('perfil.ver', 'Ver perfil del negocio y estadísticas'),
('perfil.editar', 'Editar datos del negocio y cambiar paleta de colores');

-- Asignar al rol admin automáticamente
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.nombre = 'admin' AND p.nombre IN ('perfil.ver', 'perfil.editar');
