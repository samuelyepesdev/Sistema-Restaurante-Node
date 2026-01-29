USE restaurante;

CREATE TABLE IF NOT EXISTS tenant_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL,
    user_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
