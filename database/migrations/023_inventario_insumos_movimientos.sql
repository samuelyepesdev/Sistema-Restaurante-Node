-- Inventario: campos en insumos + tabla movimientos. Recetas usan insumos con stock.
-- Costeo se deshabilita; inventario y recetas son los módulos activos.

USE restaurante;

-- Insumos: stock y unidad base para inventario y recetas (ejecutar una sola vez)
ALTER TABLE insumos ADD COLUMN unidad_base VARCHAR(20) NOT NULL DEFAULT 'g' AFTER unidad_compra;
ALTER TABLE insumos ADD COLUMN stock_actual DECIMAL(12,4) NOT NULL DEFAULT 0.0000 AFTER nombre;
ALTER TABLE insumos ADD COLUMN stock_minimo DECIMAL(12,4) NOT NULL DEFAULT 0.0000 AFTER stock_actual;
ALTER TABLE insumos ADD COLUMN costo_promedio DECIMAL(12,4) NULL DEFAULT NULL COMMENT 'Promedio ponderado' AFTER precio_compra;

-- Tabla movimientos de inventario (entrada, salida, ajuste)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    insumo_id INT NOT NULL,
    tipo ENUM('entrada','salida','ajuste') NOT NULL,
    cantidad DECIMAL(12,4) NOT NULL,
    costo_unitario DECIMAL(12,4) NULL,
    referencia VARCHAR(100) NULL COMMENT 'Ej: factura_id, pedido_id, ajuste manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT
);

-- Permisos inventario y recetas
INSERT INTO permisos (nombre, descripcion) VALUES
('inventario.ver', 'Ver inventario (insumos y stock)'),
('inventario.editar', 'Gestionar insumos y movimientos de inventario'),
('recetas.ver', 'Ver recetas'),
('recetas.editar', 'Crear y editar recetas (vinculadas a productos)')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar a admin y superadmin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('inventario.ver','inventario.editar','recetas.ver','recetas.editar')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
