-- 040_whatsapp_pairing_code.sql
-- Añadir soporte para vinculación por código de emparejamiento

ALTER TABLE whatsapp_configs 
ADD COLUMN last_pairing_code VARCHAR(15) NULL AFTER last_qr;
