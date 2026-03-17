USE restaurante;

CREATE TABLE IF NOT EXISTS soporte_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL,
    usuario_id INT NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    estado ENUM('abierto', 'en_proceso', 'resuelto', 'cerrado') DEFAULT 'abierto',
    respuesta_admin TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
