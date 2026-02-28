-- Propina: en pedidos (para registrar la propina que deja el cliente) y en facturas (para reportes).
USE restaurante;

ALTER TABLE pedidos ADD COLUMN propina DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total;
ALTER TABLE facturas ADD COLUMN propina DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total;
