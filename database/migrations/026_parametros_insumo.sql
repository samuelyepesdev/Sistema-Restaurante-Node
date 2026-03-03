USE restaurante;

-- Agregar nuevos campos a la tabla de insumos
ALTER TABLE insumos 
ADD COLUMN categoria_id INT DEFAULT NULL AFTER nombre,
ADD COLUMN unidad_medida_id INT DEFAULT NULL AFTER unidad_compra;

-- Relaciones
ALTER TABLE insumos 
ADD CONSTRAINT fk_insumos_categoria FOREIGN KEY (categoria_id) REFERENCES parametros(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_insumos_unidad FOREIGN KEY (unidad_medida_id) REFERENCES parametros(id) ON DELETE SET NULL;
