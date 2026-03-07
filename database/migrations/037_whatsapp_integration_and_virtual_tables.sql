-- 037_whatsapp_integration_and_virtual_tables.sql
-- Preparación para integración de WhatsApp y Mesas Virtuales

-- 1. Actualizar tabla de mesas para soportar mesas virtuales (domicilios/whatsapp)
ALTER TABLE mesas 
ADD COLUMN tipo ENUM('fisica', 'virtual') DEFAULT 'fisica' AFTER descripcion;

-- 2. Añadir canal al pedido para rastrear el origen
ALTER TABLE pedidos 
ADD COLUMN canal ENUM('local', 'whatsapp', 'otro') DEFAULT 'local' AFTER estado;

-- 3. Tabla para gestionar las configuraciones de WhatsApp por cada restaurante (Tenant)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nombre_instancia VARCHAR(100) NOT NULL,
    estado ENUM('desconectado', 'conectado', 'esperando_qr', 'error') DEFAULT 'desconectado',
    session_data TEXT NULL, -- Datos de sesión persistente
    last_qr TEXT NULL,      -- Base64 del último QR generado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE KEY unique_whatsapp_tenant (tenant_id)
);

-- 4. Tabla para el estado de la conversación con el cliente (Máquina de Estados)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    current_state ENUM('welcome', 'browsing_menu', 'ordering', 'confirming') DEFAULT 'welcome',
    pending_order_data JSON NULL, -- Carrito temporal del bot
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE KEY unique_conv_tenant_phone (tenant_id, customer_phone)
);
