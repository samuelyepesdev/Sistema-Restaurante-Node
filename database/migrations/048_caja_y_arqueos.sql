-- 048_caja_y_arqueos.sql
-- Sistema de control de turnos, caja inicial y arqueo para restaurantes y locales

USE restaurante;

-- 1. Tabla de Sesiones de Caja (Turnos)
CREATE TABLE IF NOT EXISTS caja_sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    usuario_id INT NOT NULL,
    monto_inicial DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Base o caja inicial',
    monto_final_teorico DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Ventas + Base - Gastos',
    monto_final_real DECIMAL(15, 2) NULL COMMENT 'Efectivo contado al finalizar',
    diferencia DECIMAL(15, 2) NULL COMMENT 'Sobrante (+) o Faltante (-)',
    estado ENUM('abierta', 'cerrada') DEFAULT 'abierta',
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 2. Tabla de Movimientos de Caja (Entradas/Salidas manuales como gasto hormiga)
CREATE TABLE IF NOT EXISTS caja_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    sesion_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo ENUM('entrada', 'salida') NOT NULL,
    monto DECIMAL(15, 2) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (sesion_id) REFERENCES caja_sesiones(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 3. Vincular Facturas/Ventas con la Sesión de Caja
ALTER TABLE facturas ADD COLUMN caja_sesion_id INT NULL AFTER tenant_id;
ALTER TABLE facturas ADD CONSTRAINT fk_factura_caja FOREIGN KEY (caja_sesion_id) REFERENCES caja_sesiones(id) ON DELETE SET NULL;

-- 4. Permisos para el módulo de caja
INSERT INTO permisos (nombre, descripcion) VALUES
('caja.ver', 'Ver historial de arqueos y sesiones de caja'),
('caja.abrir_cerrar', 'Abrir y cerrar turnos de caja'),
('caja.movimientos', 'Registrar entradas y salidas manuales de efectivo')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Asignar permisos a admin y superadmin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin') AND p.nombre IN ('caja.ver', 'caja.abrir_cerrar', 'caja.movimientos')
ON DUPLICATE KEY UPDATE rol_id = rol_id;
