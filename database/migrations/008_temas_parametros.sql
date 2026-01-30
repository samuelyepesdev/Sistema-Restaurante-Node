-- Temas y parámetros (ej: tema "Unidades de masa" -> kg, lb, g; tema "Alimentos" -> bebidas, comidas)
USE restaurante;

CREATE TABLE IF NOT EXISTS temas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tema_tenant_name (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS parametros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_parametro_tenant_name (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tema_parametro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tema_id INT NOT NULL,
    parametro_id INT NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tema_parametro (tema_id, parametro_id),
    FOREIGN KEY (tema_id) REFERENCES temas(id) ON DELETE CASCADE,
    FOREIGN KEY (parametro_id) REFERENCES parametros(id) ON DELETE CASCADE
);

-- Vincular productos a parámetros (ej: producto "Coca Cola" -> parametro "bebidas" del tema "Alimentos")
CREATE TABLE IF NOT EXISTS producto_parametro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    parametro_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_producto_parametro (producto_id, parametro_id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (parametro_id) REFERENCES parametros(id) ON DELETE CASCADE
);
