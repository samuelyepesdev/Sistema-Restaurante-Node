-- Migration: Fix ENUM issues for services in both pedido_items and detalle_factura

USE restaurante;

-- 1. Modify pedito_items to allow 'SERV' or use VARCHAR
ALTER TABLE pedido_items MODIFY COLUMN unidad_medida VARCHAR(20) DEFAULT 'UND';

-- 2. Update existing service items if any (unlikely as it was erroring)
UPDATE pedido_items SET unidad_medida = 'SERV' WHERE es_servicio = 1;

-- 3. Modify detalle_factura to allow 'SERV'
ALTER TABLE detalle_factura MODIFY COLUMN unidad_medida VARCHAR(20) DEFAULT 'UND';

-- 4. Update existing service items in details if any
UPDATE detalle_factura SET unidad_medida = 'SERV' WHERE es_servicio = 1;
