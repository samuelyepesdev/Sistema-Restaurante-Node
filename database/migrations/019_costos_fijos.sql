-- Estructura de costos fijos por tenant (arriendo, mesero, internet, etc.).
-- No es un número global: cada restaurante tiene sus propios ítems.
-- Total costos fijos = SUM(monto_mensual) WHERE activo = 1.
-- Costo fijo por plato = Total costos fijos / platos_estimados_mes (en configuracion_costeo).

CREATE TABLE IF NOT EXISTS costos_fijos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    monto_mensual DECIMAL(12,2) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_costos_fijos_tenant (tenant_id),
    INDEX idx_costos_fijos_activo (tenant_id, activo),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
