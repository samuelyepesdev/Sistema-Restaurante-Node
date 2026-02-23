# Desplegar en Railway – Paso a paso

## Requisitos previos

- Cuenta en [railway.app](https://railway.app) (con GitHub).
- Código del proyecto en un **repositorio de GitHub**.

---

## 1. Subir el código a GitHub

Si aún no lo tienes:

```bash
git init
git add .
git commit -m "Preparar despliegue Railway"
```

Crea un repo en GitHub (por ejemplo `Sistema-Restaurante-Node`) y enlázalo:

```bash
git remote add origin https://github.com/TU_USUARIO/Sistema-Restaurante-Node.git
git branch -M main
git push -u origin main
```

Asegúrate de tener un **.gitignore** que incluya `node_modules/` y `.env` (no subas secretos).

---

## 2. Crear proyecto en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión con GitHub.
2. **"New Project"**.
3. Elige **"Deploy from GitHub repo"**.
4. Autoriza Railway para acceder a tu GitHub si te lo pide.
5. Selecciona el repositorio **Sistema-Restaurante-Node** (o el nombre que tenga).
6. Railway creará un proyecto y empezará un primer despliegue (fallará hasta que añadas MySQL y variables).

---

## 3. Añadir la base de datos MySQL

1. En el **dashboard del proyecto**, pulsa **"+ New"** (o "Add Service").
2. Elige **"Database"** → **"Add MySQL"**.
3. Railway crea un servicio MySQL y te muestra variables como:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQL_URL`
4. No hace falta copiarlas a mano; en el siguiente paso las enlazamos al servicio Node.

---

## 4. Configurar el servicio Node (tu app)

1. En el mismo proyecto deberías ver **dos servicios**: uno es tu repo (Web Service) y otro es **MySQL**.
2. Haz clic en el **servicio de tu aplicación** (el que sale del repo).
3. Ve a la pestaña **"Variables"**.
4. Añade las variables de entorno. Puedes hacerlo de dos formas:

### Opción A – Usar la URL de MySQL (recomendada)

1. Pulsa **"New Variable"** → **"Add Reference"** (o "Reference").
2. Elige el **servicio MySQL**.
3. Selecciona la variable **`MYSQL_URL`**.
4. Railway creará algo como `MYSQL_URL = ${{MySQL.MYSQL_URL}}`.
5. Añade además:

| Variable       | Valor                    |
|----------------|--------------------------|
| `NODE_ENV`     | `production`             |
| `JWT_SECRET`   | Una frase larga y aleatoria (guárdala en un lugar seguro) |

La app ya está preparada para usar `MYSQL_URL` (ver `config/database.js`).

### Opción B – Variables sueltas

Si prefieres no usar la URL:

1. **"New Variable"** → **"Add Reference"**.
2. Referencia del servicio MySQL: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
3. En tu servicio Node crea variables que mapeen a las del MySQL:
   - `DB_HOST` = referencia a `MySQL.MYSQLHOST`
   - `DB_USER` = referencia a `MySQL.MYSQLUSER`
   - `DB_PASSWORD` = referencia a `MySQL.MYSQLPASSWORD`
   - `DB_NAME` = referencia a `MySQL.MYSQLDATABASE`
4. Añade también `NODE_ENV=production` y `JWT_SECRET=<tu-secreto>`.

---

## 5. Comando de inicio

1. En tu **servicio Node**, ve a **"Settings"**.
2. En **"Build Command"** puedes dejar vacío o poner: `npm install`.
3. En **"Start Command"** (o "Start") pon: **`npm start`**.
4. En **"Root Directory"** déjalo vacío si el `package.json` está en la raíz del repo.

Railway suele detectar Node y usar `npm start` por defecto; compruébalo.

---

## 6. Dominio público

1. En el **servicio Node**, ve a **"Settings"**.
2. Busca **"Networking"** o **"Public Networking"**.
3. Pulsa **"Generate Domain"** (o "Add Domain").
4. Railway te dará una URL tipo: `tu-app.up.railway.app`.

Ya puedes abrir esa URL en el navegador (después de ejecutar migraciones y tener al menos un usuario).

---

## 7. Ejecutar migraciones (solo la primera vez)

La base en Railway está vacía; hay que crear tablas con tus migraciones.

### Desde tu PC (recomendado)

1. En el servicio **MySQL** de Railway, entra en **"Connect"** o **"Variables"**.
2. Si usas **MYSQL_URL**: Railway suele mostrar una URL pública (TCP Proxy). Cópiala.
3. En tu máquina, en la carpeta del proyecto, crea un `.env.railway` (o usa el terminal sin guardar el secreto):

```bash
# Pega la MYSQL_URL que Railway te da (con usuario y contraseña)
MYSQL_URL="mysql://usuario:contraseña@containers-us-west-xxx.railway.app:puerto/railway"
```

4. Ejecuta las migraciones:

```bash
# Windows (PowerShell)
$env:MYSQL_URL="mysql://..."; node scripts/run-migrations.js

# O con dotenv (si tienes el .env.railway)
# Renombra temporalmente a .env o copia MYSQL_URL a tu .env
node scripts/run-migrations.js
```

Si en Railway solo tienes referencias (`${{MySQL.MYSQL_URL}}`) y no ves la URL real, usa **Railway CLI**:

1. Instala: `npm i -g @railway/cli`.
2. `railway login` y luego `railway link` (elige el proyecto y el servicio MySQL).
3. `railway run node scripts/run-migrations.js` (ejecuta en el entorno de Railway, con las variables inyectadas).

### Crear usuario admin

Después de las migraciones, crea un superadmin o admin:

```bash
# Con las mismas variables de DB (MYSQL_URL o DB_*)
node scripts/create-admin.js
```

O usa las variables que prefieras (ver `scripts/create-admin.js`):  
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SUPERADMIN_USERNAME`, etc.

---

## 8. Resumen de variables en Railway (servicio Node)

| Variable     | Cómo obtenerla                          |
|-------------|------------------------------------------|
| `MYSQL_URL` | Referencia: `${{MySQL.MYSQL_URL}}`      |
| `NODE_ENV`  | `production`                             |
| `JWT_SECRET`| Texto largo aleatorio (ej. 32+ caracteres) |

Opcional: `JWT_EXPIRES_IN` (por defecto la app usa `24h`).

---

## 9. Después de cada cambio en el código

Cada vez que hagas **push a la rama conectada** (por ejemplo `main`), Railway volverá a desplegar automáticamente. No hace falta volver a ejecutar migraciones salvo que añadas nuevas.

---

## 10. Archivos subidos (logo, QR)

En Railway el disco del servicio es **efímero**: si el servicio se reinicia, se pierde lo guardado en `public/uploads`. Para producción seria conviene más adelante usar un almacenamiento externo (por ejemplo **Railway Volumes**, o S3/Vercel Blob). Para empezar puedes desplegar así y asumir que los logos/QR pueden perderse en reinicios; si quieres persistencia, lo siguiente sería configurar un volumen o un storage externo.

---

## Checklist rápido

- [ ] Código en GitHub.
- [ ] Proyecto Railway creado desde el repo.
- [ ] Servicio MySQL añadido al proyecto.
- [ ] En el servicio Node: `MYSQL_URL` (referencia), `NODE_ENV=production`, `JWT_SECRET` definido.
- [ ] Start command: `npm start`.
- [ ] Dominio público generado.
- [ ] Migraciones ejecutadas una vez (desde PC con `MYSQL_URL` o con `railway run`).
- [ ] Admin creado con `create-admin.js`.
- [ ] Abrir la URL de Railway y probar login.

Si algo falla, revisa los **logs** del servicio Node en Railway (pestaña "Deployments" → último deploy → "View Logs").
