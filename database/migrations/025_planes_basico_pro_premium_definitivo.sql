-- Planes definitivos: Básico, Pro, Premium según módulos acordados.
-- Básico: dashboard, productos, clientes, mesas, cocina, ventas, configuracion
-- Pro: Básico + inventario, recetas
-- Premium: Pro + eventos, analitica (incluye prediccion)

USE restaurante;

-- Plan Básico
UPDATE planes SET
  descripcion = 'Módulos esenciales: dashboard, productos, clientes, mesas, cocina, ventas y configuración',
  caracteristicas = '["dashboard","productos","clientes","mesas","cocina","ventas","configuracion"]'
WHERE slug = 'basico';

-- Plan Pro (Básico + inventario, recetas)
UPDATE planes SET
  descripcion = 'Todo lo del Básico más inventario y recetas',
  caracteristicas = '["dashboard","productos","clientes","mesas","cocina","ventas","configuracion","inventario","recetas"]'
WHERE slug = 'pro';

-- Plan Premium (Pro + eventos, analítica y predicción)
UPDATE planes SET
  descripcion = 'Sistema completo: Pro más eventos, analítica y predicción',
  caracteristicas = '["dashboard","productos","clientes","mesas","cocina","ventas","configuracion","inventario","recetas","eventos","analitica","prediccion_ml"]'
WHERE slug = 'premium';
