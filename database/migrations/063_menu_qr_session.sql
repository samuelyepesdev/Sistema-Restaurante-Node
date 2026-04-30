-- Migración para añadir campos de sesión y actividad a las mesas
-- Estos campos permiten gestionar la validez temporal del acceso QR

ALTER TABLE mesas 
ADD COLUMN qr_session_id VARCHAR(50) DEFAULT NULL,
ADD COLUMN last_qr_activity TIMESTAMP NULL DEFAULT NULL;
