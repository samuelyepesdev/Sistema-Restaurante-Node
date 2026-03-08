-- 042_whatsapp_payment_msg_config.sql
-- Añadir columna para configurar el mensaje de transferencia por tenant
ALTER TABLE whatsapp_configs 
ADD COLUMN mensaje_transferencia TEXT NULL AFTER mensaje_bienvenida;
