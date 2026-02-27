-- Deshabilitar costeo en planes; habilitar inventario y recetas.

USE restaurante;

-- Pro: quitar costeo, añadir inventario y recetas
UPDATE planes SET caracteristicas = '["productos","clientes","mesas","ventas","dashboard","configuracion","plantillas","importar_exportar","inventario","recetas"]' WHERE slug = 'pro';

-- Premium: quitar costeo, añadir inventario y recetas
UPDATE planes SET caracteristicas = '["productos","clientes","mesas","ventas","dashboard","configuracion","plantillas","importar_exportar","inventario","recetas","analitica","prediccion_ml","eventos"]' WHERE slug = 'premium';

-- Básico: añadir inventario y recetas
UPDATE planes SET caracteristicas = '["productos","clientes","mesas","ventas","dashboard","configuracion","inventario","recetas"]' WHERE slug = 'basico';
