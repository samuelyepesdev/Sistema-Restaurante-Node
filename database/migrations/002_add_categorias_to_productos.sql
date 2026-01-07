-- Migration: Add categories to products and remove precio_kg/precio_libra
-- Related to: database.sql, routes/productos.js, views/productos.ejs

USE restaurante;

-- Create categorias table
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT IGNORE INTO categorias (nombre, descripcion) VALUES
('Bebidas', 'Bebidas frías y calientes'),
('Postres', 'Dulces y postres'),
('Comidas', 'Platos principales y comidas'),
('Acompañamientos', 'Acompañamientos y guarniciones'),
('Extras', 'Extras y adicionales');

-- Add categoria_id to productos table (ignore error if column already exists)
SET @dbname = DATABASE();
SET @tablename = "productos";
SET @columnname = "categoria_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column categoria_id already exists' AS message",
  "ALTER TABLE productos ADD COLUMN categoria_id INT DEFAULT 1 AFTER nombre, ADD FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Remove precio_kg and precio_libra columns
-- First, ensure all products have precio_unidad set (use precio_kg or precio_libra if precio_unidad is 0)
UPDATE productos 
SET precio_unidad = CASE 
    WHEN precio_unidad > 0 THEN precio_unidad
    WHEN precio_kg > 0 THEN precio_kg
    WHEN precio_libra > 0 THEN precio_libra
    ELSE 0
END
WHERE (precio_unidad = 0 AND (precio_kg > 0 OR precio_libra > 0));

-- Drop precio_kg column if it exists
SET @columnname = "precio_kg";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "ALTER TABLE productos DROP COLUMN precio_kg",
  "SELECT 'Column precio_kg does not exist' AS message"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Drop precio_libra column if it exists
SET @columnname = "precio_libra";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "ALTER TABLE productos DROP COLUMN precio_libra",
  "SELECT 'Column precio_libra does not exist' AS message"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Update any existing productos to have a default category if they don't have one
UPDATE productos SET categoria_id = 1 WHERE categoria_id IS NULL;
