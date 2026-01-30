USE restaurante;

CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    unidad_compra VARCHAR(20) NOT NULL DEFAULT 'UND',
    costo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_insumo_tenant_codigo (tenant_id, codigo),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_receta VARCHAR(150) NOT NULL,
    porciones DECIMAL(10,2) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_receta_producto (tenant_id, producto_id)
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receta_id INT NOT NULL,
    insumo_id INT NOT NULL,
    cantidad DECIMAL(12,4) NOT NULL,
    unidad VARCHAR(20) NOT NULL DEFAULT 'g',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS configuracion_costeo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL UNIQUE,
    metodo_indirectos ENUM('porcentaje','costo_fijo','factor') NOT NULL DEFAULT 'porcentaje',
    porcentaje_indirectos DECIMAL(5,2) NOT NULL DEFAULT 35,
    costo_fijo_mensual DECIMAL(12,2) NOT NULL DEFAULT 0,
    platos_estimados_mes INT NOT NULL DEFAULT 500,
    factor_carga DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    margen_objetivo_default DECIMAL(5,2) NOT NULL DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

INSERT INTO permisos (nombre, descripcion) VALUES
('costeo.ver', 'Ver costeo de platos e insumos'),
('costeo.editar', 'Gestionar insumos, recetas y configuración de costeo')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('costeo.ver','costeo.editar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
