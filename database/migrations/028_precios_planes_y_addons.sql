-- ============================================================
-- 028_precios_planes_y_addons.sql
-- Precios por tamaño en planes, catálogo de add-ons y asignación por tenant
-- ============================================================

-- 1. Precios por tamaño del negocio en la tabla planes
ALTER TABLE planes ADD COLUMN precio_pequeno DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE planes ADD COLUMN precio_mediano DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE planes ADD COLUMN precio_grande  DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Valores iniciales basados en la propuesta comercial
UPDATE planes SET precio_pequeno = 49900,  precio_mediano = 79900,  precio_grande = 119900 WHERE slug = 'basico';
UPDATE planes SET precio_pequeno = 89900,  precio_mediano = 149900, precio_grande = 229900 WHERE slug = 'pro';
UPDATE planes SET precio_pequeno = 149900, precio_mediano = 229900, precio_grande = 349900 WHERE slug = 'premium';

-- 2. Tamaño del negocio en tenants
ALTER TABLE tenants ADD COLUMN tamano ENUM('pequeno','mediano','grande') NOT NULL DEFAULT 'pequeno';

-- 3. Catálogo de add-ons disponibles
CREATE TABLE IF NOT EXISTS addons (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    slug        VARCHAR(50)  NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio      DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_addon_slug (slug)
);

INSERT IGNORE INTO addons (slug, nombre, descripcion, precio) VALUES
('inventario',   'Inventario',                   'Control de stock de insumos, movimientos entrada/salida, alertas de bajo stock', 29900),
('recetas',      'Recetas',                      'Fichas técnicas por producto, desglose de insumos por porción', 24900),
('costeo',       'Costeo + Punto de Equilibrio', 'Costo por plato, margen de ganancia, costos fijos, punto de equilibrio mensual', 29900),
('excel',        'Exportar / Importar Excel',    'Exportar ventas a Excel, importar insumos desde plantilla Excel', 14900),
('eventos',      'Eventos',                      'Gestión de eventos especiales, ventas separadas por evento, historial', 24900),
('analitica',    'Analítica Avanzada',           'Gráficos de tendencia, reportes por categoría, ventas por período', 34900),
('prediccion_ml','Predicción ML',                'Predicción de demanda futura usando historial de ventas', 39900),
('usuarios_plus','Usuarios Adicionales (+5)',    'Cinco usuarios extra sobre el límite del plan actual', 19900);

-- 4. Add-ons asignados a cada tenant
CREATE TABLE IF NOT EXISTS tenant_addons (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id  INT NOT NULL,
    addon_id   INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_addon (tenant_id, addon_id),
    CONSTRAINT fk_ta_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_addon  FOREIGN KEY (addon_id)  REFERENCES addons(id)  ON DELETE CASCADE
);
