-- Permisos para módulos Analítica y Predicción (plan Premium).
-- Solo se asignan desde el panel de permisos (superadmin); ningún rol los tiene por defecto.

USE restaurante;

INSERT INTO permisos (nombre, descripcion) VALUES
('analitica.ver', 'Ver analítica y reportes avanzados'),
('prediccion.ver', 'Ver predicción y modelos')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);
