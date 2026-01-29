-- Migration: Create users, roles and permissions tables
-- This migration adds authentication and authorization system to the restaurant app

USE restaurante;

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    nombre_completo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    rol_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Table: permisos
CREATE TABLE IF NOT EXISTS permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: rol_permisos (many-to-many relationship)
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);

-- Insert default roles
INSERT INTO roles (nombre, descripcion) VALUES
('superadmin', 'Superadministrador con control total del sistema'),
('admin', 'Administrador del sistema con acceso completo'),
('mesero', 'Mesero que puede gestionar mesas y pedidos'),
('cocinero', 'Cocinero que gestiona la cola de cocina'),
('cajero', 'Cajero que puede facturar y ver ventas')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Insert default permissions
INSERT INTO permisos (nombre, descripcion) VALUES
('productos.ver', 'Ver productos'),
('productos.crear', 'Crear productos'),
('productos.editar', 'Editar productos'),
('productos.eliminar', 'Eliminar productos'),
('productos.importar', 'Importar productos desde Excel'),
('clientes.ver', 'Ver clientes'),
('clientes.crear', 'Crear clientes'),
('clientes.editar', 'Editar clientes'),
('clientes.eliminar', 'Eliminar clientes'),
('mesas.ver', 'Ver mesas'),
('mesas.gestionar', 'Gestionar mesas y pedidos'),
('cocina.ver', 'Ver cola de cocina'),
('cocina.gestionar', 'Gestionar estados de cocina'),
('facturas.crear', 'Crear facturas'),
('facturas.ver', 'Ver facturas'),
('ventas.ver', 'Ver ventas'),
('ventas.exportar', 'Exportar ventas a Excel'),
('configuracion.ver', 'Ver configuración'),
('configuracion.editar', 'Editar configuración'),
('usuarios.ver', 'Ver usuarios'),
('usuarios.gestionar', 'Gestionar usuarios y roles')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Assign all permissions to admin role
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin','superadmin')
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Assign permissions to mesero role
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'mesero'
AND p.nombre IN (
    'productos.ver',
    'clientes.ver',
    'clientes.crear',
    'mesas.ver',
    'mesas.gestionar',
    'facturas.crear'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Assign permissions to cocinero role
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'cocinero'
AND p.nombre IN (
    'cocina.ver',
    'cocina.gestionar',
    'productos.ver'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Assign permissions to cajero role
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'cajero'
AND p.nombre IN (
    'productos.ver',
    'clientes.ver',
    'clientes.crear',
    'facturas.crear',
    'facturas.ver',
    'ventas.ver',
    'ventas.exportar'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- Note: Admin user should be created using the script: node scripts/create-admin.js
-- This ensures proper password hashing with bcrypt

