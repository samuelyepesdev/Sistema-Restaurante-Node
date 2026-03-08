-- 038_update_whatsapp_conv_states.sql
-- Actualizar estados para la conversación de WhatsApp

ALTER TABLE whatsapp_conversations 
MODIFY COLUMN current_state ENUM('welcome', 'browsing_menu', 'ordering', 'confirming', 'completed', 'cancelled') DEFAULT 'welcome';

-- Limpiar posibles entradas corruptas de estados/broadcast que causen errores duplicados
DELETE FROM whatsapp_conversations WHERE customer_phone LIKE '%@broadcast';
