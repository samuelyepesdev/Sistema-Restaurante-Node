-- =============================================================================
-- REFERENCIA ÚNICAMENTE - NO EJECUTAR EN MIGRACIONES
-- =============================================================================
-- Este archivo documenta los datos que crea el seeder de pruebas de tenants.
-- Los datos reales se insertan con: node scripts/seed-tenants-test.js
-- Este SQL NO está en la lista de run-migrations.js.
-- =============================================================================

USE restaurante;

-- Tenants de prueba (el seeder usa INSERT o reutiliza existentes)
-- Principal (slug: principal) - suele existir por migración 003
-- Sucursal Norte (slug: norte)
-- Sucursal Sur (slug: sur)

-- Ejemplo de inserts que hace el seeder (lógica real en seed-tenants-test.js):
-- INSERT INTO tenants (nombre, slug, activo) VALUES ('Sucursal Norte', 'norte', TRUE);
-- INSERT INTO tenants (nombre, slug, activo) VALUES ('Sucursal Sur', 'sur', TRUE);

-- Usuarios de prueba (mesero por tenant, password hasheada en el script)
-- mesero_principal -> tenant_id = id de Principal
-- mesero_norte     -> tenant_id = id de Norte
-- mesero_sur       -> tenant_id = id de Sur

-- Categorías por tenant (nombres únicos globales)
-- Norte: 'Bebidas Norte', 'Comidas Norte'
-- Sur:   'Bebidas Sur', 'Comidas Sur'

-- Productos por tenant (códigos únicos)
-- Norte: N-001, N-002, N-003
-- Sur:   S-001, S-002, S-003

-- Mesas por tenant (número único)
-- Norte: 10, 11, 12
-- Sur:   20, 21, 22
