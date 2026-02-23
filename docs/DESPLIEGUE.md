# Guía de despliegue – Sistema Restaurante Node

## ¿Vercel es buena opción para este proyecto?

**En resumen: no es la opción más adecuada** para esta aplicación tal como está.

| Característica de tu app        | En Vercel                          |
|---------------------------------|-------------------------------------|
| Servidor Express siempre activo | Vercel es **serverless**: no hay proceso persistente |
| MySQL con pool de conexiones     | Cada invocación es nueva; conexiones no persisten bien |
| Subida de archivos (logo, QR)    | El sistema de archivos es **efímero**; se pierde al reiniciar |
| Sesiones / cookies               | Posible, pero con límites de tiempo y frío de función |
| Migraciones y scripts al inicio  | No hay “inicio” único; todo es por petición |

Para que funcione **en Vercel** tendrías que:

1. Exponer la app como **una o varias serverless functions** (por ejemplo un único handler que reciba todas las rutas).
2. Usar una **base MySQL externa** (PlanetScale, Railway, Neon, etc.) y configurar bien el pool/cierres para serverless.
3. Guardar archivos subidos en **almacenamiento externo** (Vercel Blob, S3, Cloudinary), no en disco local.
4. Aceptar **límites de tiempo** (p. ej. 10–60 s por request) y **cold starts**.

Por eso, para este proyecto suele ser más simple y estable desplegar en una plataforma que ejecute **Node como servidor tradicional**.

---

## Opciones recomendadas (mejor que Vercel para tu caso)

### 1. **Railway** (muy recomendada)

- Soporta **Node + MySQL** en un mismo proyecto.
- Despliegue desde GitHub; detecta `node` y usa `npm start`.
- Base de datos MySQL gestionada (o puedes conectar una externa).
- Variables de entorno fáciles.
- Tiene plan gratuito limitado; luego de pago.

**Pasos mínimos:**

1. Sube el código a GitHub.
2. En [railway.app](https://railway.app) crea un proyecto → “Deploy from GitHub” y elige el repo.
3. Añade el servicio “MySQL” en el mismo proyecto (o usa una DB externa).
4. En tu servicio Node, configura variables de entorno:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (si usas MySQL de Railway, te dan una URL o estos valores).
   - `JWT_SECRET` (o el que uses para sesión).
   - Cualquier otra que leas en `process.env` (por ejemplo `PORT`).
5. En “Settings” del servicio, pon el **comando de inicio**: `npm start` (o `node server.js`).
6. Opcional: en “Deploy” puedes añadir un comando de “build” si en el futuro usas uno (por ahora no es obligatorio).
7. Ejecuta migraciones **una vez** (desde tu máquina apuntando a la DB de producción, o con un job/script que Railway ejecute).

---

### 2. **Render**

- “Web Service” para Node; “PostgreSQL” o DB externa (MySQL vía variable de entorno).
- Plan gratuito con el servicio dormido tras inactividad; planes de pago para siempre activo.

**Pasos mínimos:**

1. Repo en GitHub.
2. En [render.com](https://render.com): New → Web Service → conecta el repo.
3. Build command: `npm install` (o vacío si solo usas `npm start`).
4. Start command: `npm start`.
5. Añade variables de entorno (DB, JWT, etc.).
6. Para MySQL: usa un servicio externo (p. ej. PlanetScale, Railway DB, o un MySQL en un VPS) y configura `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

---

### 3. **Fly.io**

- Ejecuta un **contenedor** (Docker) o “buildpack” con Node.
- Bueno si quieres control total; un poco más técnico.

Necesitas un `Dockerfile` o que Fly use el buildpack de Node y el comando `npm start`.

---

### 4. **DigitalOcean App Platform**

- Similar a Render: eliges “App” tipo Node, conectas repo, pones `npm start`.
- Base de datos: “Database” de DO (MySQL/Postgres) o externa.
- De pago, pero predecible.

---

## Checklist común para cualquier despliegue

1. **Variables de entorno** (nunca subas `.env` al repo):
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET` (o el nombre que uses para firmar tokens)
   - `NODE_ENV=production`
   - `PORT` (muchas plataformas lo inyectan automáticamente)

2. **Base de datos en producción**:
   - Crear la base MySQL (Railway, PlanetScale, etc.).
   - Ejecutar migraciones una vez:  
     `DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... node scripts/run-migrations.js`  
     (desde tu PC con esas variables o desde un script/job en la plataforma).

3. **Archivos subidos (logo, QR)**:
   - En plataformas con disco efímero (incluido Vercel si lo usas), guardar en **almacenamiento externo** (S3, Vercel Blob, etc.) y cambiar el código para leer/escribir ahí en lugar de `public/uploads`.

4. **`server.js` y puerto**:
   - Que el servidor use `process.env.PORT` si existe:
     ```js
     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => console.log(`Servidor en ${PORT}`));
     ```
   - Así Railway, Render, Fly, etc. pueden inyectar el puerto.

5. **Dependencias**:
   - En producción instalar solo prod: `npm ci --omit=dev` o `npm install --production`.

---

## Si aun así quieres usar Vercel

1. **Base de datos**: contrata MySQL en PlanetScale, Railway o similar; configura `DB_*` en Vercel.
2. **Adaptar a serverless**:  
   - Crear en la raíz algo como `api/index.js` que importe tu app Express y exporte un handler que reciba `(req, res)` y llame a `app(req, res)`.  
   - En `vercel.json` redirigir todas las rutas a esa función.
3. **Subidas**: no usar `public/uploads`; integrar Vercel Blob o S3 y guardar/leer desde ahí.
4. **Tiempos y conexiones**: reducir tiempo de respuestas, cerrar conexiones MySQL tras cada request si hace falta, y aceptar cold starts.

Para este tipo de sistema (restaurante, multi-tenant, archivos, sesiones), **Railway o Render suelen ser la opción más rápida y estable** comparado con Vercel.
