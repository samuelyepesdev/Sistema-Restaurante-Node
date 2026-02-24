-- Permisos por usuario (además del rol): user_permisos
-- Añadir eventos al plan premium y módulo eventos en planPermissions

USE restaurante;

-- Tabla permisos adicionales por usuario (se fusionan con los del rol)
CREATE TABLE IF NOT EXISTS user_permisos (
    user_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (user_id, permiso_id),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);

-- Añadir módulo "eventos" al plan Premium (caracteristicas JSON)
UPDATE planes
SET caracteristicas = '["productos","clientes","mesas","ventas","dashboard","configuracion","plantillas","importar_exportar","costeo","analitica","prediccion_ml","eventos"]'
WHERE slug = 'premium';
