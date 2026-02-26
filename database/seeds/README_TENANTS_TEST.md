# Seeds para pruebas (no se ejecutan automáticamente)

Esta carpeta contiene **referencias y documentación** para datos de prueba de multi-tenancy.  
**Ningún archivo aquí se ejecuta** en `run-migrations.js`.

## Cómo probar multi-tenancy (tenants)

### 1. Ejecutar migraciones (si no lo has hecho)

```bash
node scripts/run-migrations.js
```

### 2. Ejecutar el seeder de tenants (manual)

```bash
node scripts/seed-tenants-test.js
```

Este script:

- Crea o reutiliza 3 tenants: **Principal**, **Sucursal Norte**, **Sucursal Sur**
- Crea/actualiza 3 usuarios de prueba (uno por tenant):
  - `mesero_principal` / `test123` → tenant Principal
  - `mesero_norte` / `test123` → tenant Sucursal Norte
  - `mesero_sur` / `test123` → tenant Sucursal Sur
- Inserta mesas y productos **solo para Norte y Sur** (10, 11, 12 y 20, 21, 22; productos N-001… y S-001…)

### 3. Probar en la aplicación

1. Inicia el servidor: `node server.js` o `npm start`
2. Entra a `/auth/login`
3. Inicia sesión con **mesero_norte** / **test123**
   - En **Dashboard** y **Ventas** ya se filtra por tenant: solo verás datos de Sucursal Norte.
   - El **navbar** debe mostrar "Sucursal Norte" como nombre del local.
4. Cierra sesión e inicia con **mesero_sur** / **test123**
   - Dashboard y Ventas mostrarán solo datos de Sucursal Sur.
5. Con **mesero_principal** verás datos del tenant Principal.

**Nota:** Mesas, Productos, Clientes, Cocina, Ventas, Dashboard y Configuración ya filtran por tenant: cada usuario solo ve y gestiona datos de su restaurante/local.

## Seed de datos para costeo

Para validar el módulo de costeo con datos de prueba (insumos, recetas, configuración 30% ganancia y 2% merma):

```bash
node scripts/seed-costeo-datos.js
```

El script usa el tenant id 1 (Principal) o el primer tenant disponible. Crea:

- **Insumos**: Arroz, Pollo, Tomate, Aceite, Sal (con precio_compra y cantidad_compra).
- **Configuración**: margen objetivo 30%, porcentaje indirectos (merma) 2%, platos estimados 500.
- **Productos**: "Arroz con pollo" y "Ensalada fresca" (códigos COSTEO-01, COSTEO-02).
- **Recetas** ligadas a esos productos con cantidades por insumo.
- **Costos fijos** opcionales (Arriendo, Servicios).

Luego puedes revisar en la vista **Costeo** que el costo directo, indirecto (2%) y precio sugerido (30% ganancia) se calculen bien.

## Archivo SQL de referencia

- `004_seed_tenants_test_REFERENCIA.sql`: solo **documentación/referencia** de los datos que el seeder crea.  
  **No está incluido en `run-migrations.js`** y no debe ejecutarse como migración.
