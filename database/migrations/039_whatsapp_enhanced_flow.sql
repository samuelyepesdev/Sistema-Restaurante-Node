-- 039_whatsapp_enhanced_flow.sql
-- Mejoras para el flujo de WhatsApp: mensaje de bienvenida configurable y nuevos estados

-- 1. Añadir columna para mensaje de bienvenida configurable
ALTER TABLE whatsapp_configs 
ADD COLUMN mensaje_bienvenida TEXT NULL AFTER estado;

-- 2. Actualizar el mensaje de bienvenida por defecto para el tenant principal
UPDATE whatsapp_configs 
SET mensaje_bienvenida = '¡Hola! 👋 Bienvenido a nuestro sistema de pedidos.\n\nEscribe *MENU* para ver nuestra carta o *AYUDA* para hablar con un asesor.'
WHERE tenant_id = 1 AND mensaje_bienvenida IS NULL;

-- 3. Ampliar los estados de la conversación para soportar categorías y tipo de pedido
ALTER TABLE whatsapp_conversations 
MODIFY COLUMN current_state ENUM('welcome', 'selecting_category', 'browsing_menu', 'ordering', 'selecting_order_type', 'confirming', 'completed', 'cancelled') DEFAULT 'welcome';
