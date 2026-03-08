-- Añadir columna de descripción detallada a los planes
USE restaurante;
ALTER TABLE planes ADD COLUMN descripcion_detallada TEXT NULL AFTER descripcion;

-- Actualizar descripciones detalladas iniciales para cada plan
UPDATE planes SET descripcion_detallada = 'Este plan está diseñado para pequeños emprendimientos que inician su digitalización. Incluye la gestión básica de mesas, inventarios simples y un dashboard de ventas diario.' WHERE slug = 'basico';
UPDATE planes SET descripcion_detallada = 'El plan preferido para restaurantes en crecimiento. Añade herramientas de control de inventario avanzado, recetas (costeo de platos) y reportes más detallados.' WHERE slug = 'pro';
UPDATE planes SET descripcion_detallada = 'Nuestra solución completa. Desbloquea todo el potencial con analítica avanzada, predicción de demanda con IA, gestión de eventos y soporte prioritario.' WHERE slug = 'premium';
