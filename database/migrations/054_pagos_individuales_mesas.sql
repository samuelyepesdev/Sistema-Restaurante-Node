ALTER TABLE facturas MODIFY COLUMN forma_pago ENUM('efectivo', 'transferencia', 'mixto') NOT NULL DEFAULT 'efectivo';
ALTER TABLE facturas ADD COLUMN monto_efectivo DECIMAL(10,2) DEFAULT 0;
ALTER TABLE facturas ADD COLUMN monto_transferencia DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pedido_items ADD COLUMN pagado BOOLEAN DEFAULT 0;
ALTER TABLE pedido_items ADD COLUMN forma_pago VARCHAR(50) NULL;
