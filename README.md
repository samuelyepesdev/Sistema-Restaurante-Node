# Sistema de Gestión para Restaurantes

Sistema web multi-tenant para la gestión operativa y comercial de restaurantes: productos, clientes, mesas, pedidos, cocina, facturación, ventas, eventos y analítica. Incluye planes de suscripción (Básico, Pro, Premium), permisos por rol y por usuario, y costeo de platos.

---

## ¿Qué es este proyecto?

Aplicación Node.js (Express + EJS + MySQL) que permite:

- **Varios restaurantes (tenants)** en la misma instalación, cada uno con sus datos aislados.
- **Planes**: Básico (módulos esenciales), Pro (+ plantillas, import/export, costeo), Premium (+ analítica y predicción).
- **Permisos granulares**: por rol (admin, mesero, cocinero, cajero) y permisos extra por usuario asignados desde el panel superadmin (por ejemplo, dar Analítica o Eventos a un usuario aunque su plan no los incluya).
- **Superadmin**: crea y gestiona restaurantes, asigna planes y permisos por usuario; no opera dentro de un solo restaurante.

Está pensado para uso en local (LAN), en un servidor privado o en despliegues tipo Railway/Render.

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Productos** | CRUD, categorías, precios por unidad/kg/libra, importación masiva desde Excel. |
| **Clientes** | CRUD de clientes para facturación y ventas. |
| **Mesas** | Mesas virtuales, pedidos por mesa, mover pedidos entre mesas, liberar mesas. |
| **Cocina** | Cola de pedidos, estados (enviado, preparando, listo, servido), notas por ítem. |
| **Facturación** | POS (punto de venta), facturas con cliente, forma de pago (efectivo/transferencia). |
| **Ventas** | Listado y filtros de ventas, exportación a Excel con logo y totales. |
| **Eventos** | Eventos por fechas, ventas asociadas a evento, listado de ventas por evento. *(Asignación por permiso.)* |
| **Dashboard** | Resumen de ventas, gráficas, mini calendario de días con evento. |
| **Configuración** | Datos de empresa, impresión (logo, QR, ancho de papel). |
| **Costeo** | Recetas, insumos, costos por plato, márgenes y alertas. *(Plan Pro/Premium.)* |
| **Analítica** | Resumen de ventas últimos 3 meses, predicción próximo mes. *(Asignación por permiso o plan Premium.)* |
| **Planes** | Básico, Pro, Premium; el superadmin asigna el plan a cada restaurante. |
| **Permisos** | Por restaurante y usuario: secciones (Productos, Clientes, Eventos, Analítica, etc.) con checkbox “marcar todos”. |

---

## Uso del proyecto

### Requisitos

- **Node.js** v18 (recomendado)
- **MySQL** 5.7 o superior
- Git (opcional)

### Instalación

1. **Clonar o descargar** el repositorio y entrar en la carpeta del proyecto.

2. **Crear la base de datos** (si no existe):
   ```sql
   CREATE DATABASE IF NOT EXISTS restaurante;
   ```

3. **Instalar dependencias**:
   ```bash
   npm install
   ```

4. **Variables de entorno** (opcional; hay valores por defecto en `config/database.js`):
   - Crear `.env` en la raíz con, por ejemplo:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=restaurante
   PORT=3000
   JWT_SECRET=cambiar_en_produccion
   JWT_EXPIRES_IN=24h
   ```
   - Para el **superadmin** (solo se crean si no existen; en deploy no se resetean):
     - `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_EMAIL`, `SUPERADMIN_NOMBRE`
   - Para el **admin del tenant principal** (mismo criterio):
     - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NOMBRE`

5. **Iniciar**:
   ```bash
   npm start
   ```
   Este comando ejecuta en orden: migraciones (solo las pendientes), creación de admin/superadmin (solo si no existen) y arranque del servidor.

6. **Acceso**:
   - Local: `http://localhost:3000`
   - Misma red (LAN): `http://TU_IP:3000` (el servidor escucha en `0.0.0.0`)

### Primer uso

1. Iniciar sesión como **superadmin** (p. ej. `superadmin` / `superadmin123` si no cambiaste las variables).
2. En **Restaurantes** crear o elegir un restaurante y asignarle un plan.
3. En **Permisos** elegir el restaurante, un usuario y marcar los permisos por sección (incluidos Eventos y Analítica si quieres darlos sin plan Premium).
4. Para operar como **admin** de un restaurante, iniciar sesión con un usuario de ese tenant (p. ej. `admin` / `admin123` en el tenant principal).

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Migraciones + create-admin (solo si no existen) + servidor |
| `npm run dev` | Servidor con nodemon (sin migraciones ni create-admin) |
| `npm run migrate` | Solo ejecutar migraciones |
| `npm run create-admin` | Crear/verificar admin y superadmin (no sobrescribe si ya existen) |
| `npm run create-test-users` | Crear usuarios de prueba (mesero, cocinero, cajero) |
| `npm run seed-tenants` | Seed de tenants de prueba (ver `database/seeds/`) |
| `npm run build` | Generar ejecutable con pkg (ver `package.json`) |

**Nota:** En producción, `create-admin` solo **crea** los usuarios admin y superadmin si no existen; **no** actualiza contraseñas en cada deploy. Para forzar actualización desde `.env`, usar `CREATE_ADMIN_OVERWRITE=true`.

---

## Estructura del proyecto

```
├── config/           # Base de datos
├── database/
│   ├── migrations/   # SQL versionados (se ejecutan en orden al hacer migrate/start)
│   └── seeds/        # Datos de prueba (tenants, etc.)
├── middleware/       # auth, tenant, planFeature
├── public/           # CSS, JS, uploads
├── repositories/     # Acceso a datos (productos, clientes, permisos, etc.)
├── routes/           # Rutas por módulo (auth, productos, mesas, cocina, facturas, ventas, eventos, analitica, costeo, admin)
├── services/         # Lógica de negocio (Auth, Tenant, Analitica, Costeo, etc.)
├── utils/            # Constantes, planPermissions
├── views/             # Plantillas EJS (layout, navbar, módulos, admin)
├── scripts/
│   ├── run-migrations.js   # Aplica solo migraciones pendientes (detecta archivos en migrations/)
│   ├── create-admin.js    # Crea admin/superadmin solo si no existen
│   ├── create-test-users.js
│   └── seed-tenants-test.js
├── server.js         # Entrada de la aplicación
├── package.json
└── README.md
```

---

## Especificaciones técnicas

### Stack

| Capa | Tecnología |
|------|------------|
| **Runtime** | Node.js v18 (recomendado) |
| **Framework web** | Express 4.x |
| **Motor de vistas** | EJS 3.x |
| **Base de datos** | MySQL 5.7+ (driver `mysql2` con pool de conexiones) |
| **Autenticación** | JWT (jsonwebtoken), cookie `auth_token` + header `Authorization: Bearer` |
| **Contraseñas** | bcrypt |
| **Validación** | express-validator |
| **Archivos** | multer (subida de imágenes); exceljs (import/export Excel) |
| **Variables de entorno** | dotenv |

### Arquitectura

- **Patrón**: MVC + capa de servicios + repositorios. Rutas delgadas; lógica en servicios; acceso a datos en repositorios.
- **Multi-tenant**: Tablas con `tenant_id`; middleware `attachTenantContext` inyecta `req.tenant` según el usuario; superadmin sin tenant.
- **Autorización**: Roles (admin, mesero, cocinero, cajero, superadmin), permisos por rol (`rol_permisos`) y permisos extra por usuario (`user_permisos`). Middleware `requirePermission`, `requireRole`, `requirePlanFeature` (plan o permiso desbloquea módulo).
- **Planes**: Tabla `planes` con `caracteristicas` (JSON); `tenant.plan_id`; `planPermissions.js` mapea permisos a módulos y comprueba si el plan incluye el módulo.

### Base de datos

- **Motor**: MySQL. Conexión vía `config/database.js` (pool); soporta `MYSQL_URL`/`DATABASE_URL` o `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **Migraciones**: SQL en `database/migrations/`; el script `run-migrations.js` detecta todos los `.sql`, los ordena por nombre y ejecuta solo los no registrados en `schema_migrations`.
- **Tablas principales**: `usuarios`, `roles`, `permisos`, `rol_permisos`, `user_permisos`, `tenants`, `planes`, `productos`, `clientes`, `mesas`, `pedidos`, `pedido_items`, `facturas`, `eventos`, `configuracion_impresion`, etc.

### API y rutas

- **Autenticación**: login (cookie + JSON), logout, cambio de contraseña.
- **Rutas de página**: HTML vía EJS (productos, clientes, mesas, cocina, facturas, ventas, dashboard, configuracion, costeo, analitica, eventos, admin/tenants, admin/planes, admin/permisos).
- **Rutas API**: bajo prefijos como `/api/productos`, `/api/clientes`, `/api/mesas`, `/api/cocina`, `/api/facturas`, `/api/dashboard` para peticiones JSON (listados, crear, actualizar, eliminar).

### Frontend

- **Vistas**: EJS con `layout` y `partials` (navbar). Sin framework JS; vanilla JavaScript en el cliente.
- **Estilos**: Bootstrap 5, Bootstrap Icons.
- **UX**: SweetAlert2 para alertas y confirmaciones; formularios con validación en servidor.

### Despliegue y entorno

- **Puerto**: `PORT` (por defecto 3000). Servidor escucha en `0.0.0.0` para acceso en LAN.
- **Build**: `npm run build` genera ejecutable con `pkg` (target `node18-win-x64`); assets: `views/**/*`, `public/**/*`, `node_modules/ejs/**/*`.

---

## Documentación adicional

- **`README-SETUP.md`** – Instalación detallada y solución de problemas.
- **`docs/ROLES_Y_PERMISOS.md`** – Roles (admin, mesero, cocinero, cajero) y lista de permisos.
- **`docs/COSTEO-FLUJO-REFERENCIA.md`** – Flujo de costeo y recetas (si aplica).

---

## Seguridad

- Cambiar **JWT_SECRET** en producción.
- Cambiar contraseñas de admin y superadmin tras el primer acceso.
- No subir `.env` al repositorio.
- Usar HTTPS en producción y restringir acceso a la base de datos.

---

## Licencia y soporte

Para dudas o incidencias, abrir un issue o contactar al equipo del proyecto.
