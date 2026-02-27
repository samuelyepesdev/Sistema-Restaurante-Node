-- Categoría de eventos: ocasional (no se usa en analítica) vs permanente (sí se usa en analítica)
USE restaurante;

ALTER TABLE eventos
ADD COLUMN tipo ENUM('ocasional','permanente') NOT NULL DEFAULT 'permanente'
COMMENT 'ocasional: no analítica. permanente: sí analítica'
AFTER activo;
