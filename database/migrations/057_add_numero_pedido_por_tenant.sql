-- database/migrations/057_add_numero_pedido_por_tenant.sql
-- Añade numeración de pedidos secuencial e independiente por cada restaurante (tenant)

ALTER TABLE pedidos ADD COLUMN numero INT DEFAULT 0 AFTER id;

-- Poblar pedidos existentes con una numeración base (aproximada por el ID actual)
-- Nota: Para nuevos pedidos se usará MAX(numero) + 1 por tenantId
UPDATE pedidos SET numero = id;
