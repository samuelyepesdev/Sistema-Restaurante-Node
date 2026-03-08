-- 044_whatsapp_permissions.sql
-- Añadir permisos específicos para el bot de WhatsApp

USE restaurante;

INSERT INTO permisos (nombre, descripcion) VALUES
('whatsapp.ver', 'Ver y acceder al panel de WhatsApp'),
('whatsapp.ajustes', 'Configurar mensajes y opciones del bot de WhatsApp')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar a roles administrativos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin') 
AND p.nombre IN ('whatsapp.ver', 'whatsapp.ajustes')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
