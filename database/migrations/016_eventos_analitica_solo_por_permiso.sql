-- Eventos y Analítica son de plan Premium: solo si el superadmin asigna el permiso al usuario.
-- Quitar del rol admin estos permisos para que nadie los tenga por defecto.

USE restaurante;

DELETE rp FROM rol_permisos rp
INNER JOIN roles r ON rp.rol_id = r.id
INNER JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'admin'
AND p.nombre IN (
    'eventos.ver', 'eventos.crear', 'eventos.editar', 'eventos.eliminar', 'ventas_evento.realizar',
    'analitica.ver', 'prediccion.ver'
);
