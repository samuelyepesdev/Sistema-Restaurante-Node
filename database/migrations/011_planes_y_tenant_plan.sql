-- Planes de suscripción y asignación a tenants
-- Planes: basico, pro, premium

USE restaurante;

CREATE TABLE IF NOT EXISTS planes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    slug VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL,
    caracteristicas JSON NULL COMMENT 'Lista de módulos/características del plan',
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE tenants ADD COLUMN plan_id INT NULL AFTER config;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_plan FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE SET NULL;

INSERT IGNORE INTO planes (id, nombre, slug, descripcion, caracteristicas, orden) VALUES
(1, 'Básico', 'basico', 'Módulos esenciales para operar tu negocio', 
 '["productos","clientes","mesas","ventas","dashboard","configuracion"]', 1),
(2, 'Pro', 'pro', 'Todo lo del Básico más plantillas, importación/exportación y costeo',
 '["productos","clientes","mesas","ventas","dashboard","configuracion","plantillas","importar_exportar","costeo"]', 2),
(3, 'Premium', 'premium', 'Sistema desbloqueado con analítica y predicción',
 '["productos","clientes","mesas","ventas","dashboard","configuracion","plantillas","importar_exportar","costeo","analitica","prediccion_ml"]', 3);

UPDATE tenants SET plan_id = 1 WHERE plan_id IS NULL;
