-- 041_whatsapp_payment_method.sql
-- Añadir soporte para selección de método de pago en WhatsApp (Efectivo/Transferencia)

-- 1. Añadir columna metodo_pago a pedidos para persistir la elección del cliente
ALTER TABLE pedidos 
ADD COLUMN metodo_pago ENUM('Efectivo', 'Transferencia', 'Datafono') DEFAULT 'Efectivo' AFTER canal;

-- 2. Ampliar los estados de la conversación
ALTER TABLE whatsapp_conversations 
MODIFY COLUMN current_state ENUM('welcome', 'selecting_category', 'browsing_menu', 'ordering', 'selecting_order_type', 'selecting_payment_method', 'confirming', 'completed', 'cancelled') DEFAULT 'welcome';
