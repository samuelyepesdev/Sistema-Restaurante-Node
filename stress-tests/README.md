# Pruebas de estrés – Sistema Restaurante

Este directorio contiene el **entorno de pruebas de estrés y carga** para ver cómo se comporta la aplicación con muchas peticiones simultáneas.

## Requisitos

- **Node.js** (ya usado por el proyecto).
- Aplicación y base de datos en marcha (por ejemplo `npm start` o `npm run dev` en otra terminal).
- Usuario de prueba: por defecto se usa `admin` / `admin123` (creado con `npm run create-admin`). Si usas otros usuarios, configura las variables de entorno o el archivo de entorno de Artillery.

## Herramientas

| Herramienta   | Uso principal                          | Instalación        |
|---------------|----------------------------------------|--------------------|
| **Artillery** | Escenarios complejos (login + varias rutas), reportes | `npm install` (dev) |
| **autocannon** | Prueba de carga rápida a una URL       | `npm install` (dev) |

Tras `npm install`, no hace falta instalar nada más.

## Opción 1: Artillery (recomendado para estrés completo)

Artillery simula muchos usuarios que hacen **login** y luego **varias peticiones** (dashboard, categorías, productos, mesas). Incluye fases de calentamiento, rampa y pico.

### Prueba rápida (poca carga, poco tiempo)

```bash
npm run stress:quick
```

- Duración: ~20 s, 10 peticiones/segundo.
- Sirve para comprobar que el servidor responde bien antes de una prueba larga.

### Prueba de estrés completa

```bash
npm run stress
```

- Calentamiento 30 s → rampa 60 s → carga sostenida 120 s → pico 60 s.
- Hasta ~20–40 peticiones/segundo según la fase.
- Al final verás en consola: peticiones totales, latencias (p95, p99), tasa de errores, etc.

### Usar otro entorno o credenciales

1. Copia el archivo de ejemplo de entorno:
   ```bash
   cp stress-tests/env-stress.example.yml stress-tests/env-stress.yml
   ```
2. Edita `stress-tests/env-stress.yml` y ajusta `baseUrl`, `username` y `password`.
3. Ejecuta apuntando a ese archivo:
   ```bash
   npx artillery run stress-tests/artillery-stress.yml -e stress-tests/env-stress.yml
   ```

### Reporte HTML (opcional)

Para generar un reporte HTML con gráficas:

```bash
npx artillery run stress-tests/artillery-stress.yml --output report.json
npx artillery report report.json --output report.html
```

Abre `report.html` en el navegador.

---

## Opción 2: Script de carga rápida (autocannon)

El script `run-load.js` hace **login una vez**, obtiene el token y dispara muchas peticiones contra un endpoint protegido (por defecto `/api/dashboard/stats`).

### Uso por defecto

```bash
npm run stress:load
```

- 20 conexiones, 20 segundos.
- Usa `admin` / `admin123` y `http://localhost:3000` salvo que indiques otra cosa.

### Opciones

```bash
node stress-tests/run-load.js --url http://localhost:3000 --connections 50 --duration 30
```

- `--url`       Base URL del servidor (o `STRESS_BASE_URL`).
- `--connections`  Número de conexiones simultáneas (default: 20).
- `--duration`  Duración en segundos (default: 20).
- `--path`      Ruta a golpear (default: `/api/dashboard/stats`).
- `--public`    Probar solo la ruta pública `/auth/login` (GET), sin token.

### Variables de entorno

Puedes fijar credenciales y URL sin tocar el código:

- `STRESS_BASE_URL`  → base URL (ej. `http://localhost:3000`).
- `STRESS_USERNAME`  → usuario (ej. `admin`).
- `STRESS_PASSWORD`  → contraseña (ej. `admin123`).

---

## Qué observar durante las pruebas

- **Consola del servidor**: errores, tiempo de respuesta, uso de CPU/memoria.
- **Base de datos**: en `config/database.js` el pool tiene `connectionLimit: 10`. Con mucha carga puedes ver cola o timeouts; en ese caso valora subir el límite o escalar.
- **Métricas de Artillery/autocannon**: peticiones/segundo, latencia media y p99, tasa de errores y timeouts.

## Recomendaciones

1. Ejecutar las pruebas contra un **entorno de desarrollo o staging**, no contra producción con datos reales.
2. Tener **usuarios y tenants de prueba** creados (`npm run create-admin` y, si aplica, `npm run seed-tenants`).
3. Si la base de datos está en la misma máquina, el cuello de botella suele ser MySQL o el límite del pool; monitorea conexiones y consultas lentas.
4. Añadir `env-stress.yml` (con credenciales) al `.gitignore` si no quieres subirlo al repositorio.
