# Sistema de Facturación para Restaurante

## Requisitos Previos
1. Node.js (v18 recomendado)
2. MySQL (versión 5.7 o superior)
3. Git (opcional)

## Pasos de Instalación

### 1. Base de Datos
1. Abrir MySQL Workbench o el cliente MySQL de tu preferencia
2. Ejecutar el script `database.sql` que se encuentra en la raíz del proyecto

### 2. Aplicación
1. Clonar o descargar este repositorio
2. Abrir una terminal en la carpeta del proyecto
3. Instalar las dependencias:
```bash
npm install
```
4. Variables de entorno (opcional):
   - El sistema usa estos valores por defecto (ver `config/database.js`):
     - `DB_HOST=localhost`
     - `DB_USER=root`
     - `DB_PASSWORD=111`
     - `DB_NAME=reconocimiento`
     - `PORT=3000`
   - Puedes sobreescribirlos creando un archivo `.env` o exportando variables.

### 3. Iniciar el Sistema
1. Ejecutar el siguiente comando:
```bash
npm start
```
2. Abrir el navegador y acceder a: `http://localhost:3000`
3. Acceso desde otra PC o celular en la misma red (LAN):
   - La app escucha en `0.0.0.0`. Usa tu IP local: `http://TU_IP_LOCAL:3000`
   - Si es necesario, permite el puerto 3000 en el Firewall de Windows.
   - Ejemplo PowerShell (Admin):
     ```bash
     New-NetFirewallRule -DisplayName "Restaurante-3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
     ```

## Estructura de Carpetas
- `/public` - Archivos estáticos (CSS, JS, imágenes)
- `/routes` - Rutas de la aplicación
- `/views` - Plantillas EJS
- `/config` - Configuración de la base de datos
- `/uploads` - Carpeta donde se guardan las imágenes subidas
 - `/dist` - Ejecutable y artefactos de distribución

## Funcionalidades
- Gestión de productos
- Gestión de clientes
- Generación de facturas y vista de ventas con filtros/búsqueda
- Configuración de impresión (logo, QR, ancho de papel, etc.)
- Restaurante: Mesas, pedidos por mesa y Cocina (cola en orden)
- Notas por ítem para cocina (en rojo), y estados: enviado, preparando, listo, servido
- Mover pedidos entre mesas y liberar mesas sin ítems activos
- Exportación de ventas a Excel (.xlsx) con encabezado de empresa, logo y totales
- Importación masiva de productos desde Excel (plantilla descargable)

## Importación masiva de productos
1. Ir a Productos → botón "Plantilla Excel" para descargar `plantilla_productos.xlsx`.
2. La plantilla incluye una hoja de Instrucciones y otra "Productos" con columnas:
   - `codigo` (obligatorio, único)
   - `nombre` (obligatorio)
   - `precio_kg`, `precio_unidad`, `precio_libra` (números ≥ 0, usar punto decimal)
3. Completar la hoja "Productos" (hay ejemplos). No cambiar los encabezados.
4. En Productos → botón "Importar Excel" y seleccionar el archivo.
5. Se realiza upsert por `codigo` (si existe, actualiza precios/nombre).

## Exportación de ventas a Excel
- En Ventas, aplicar filtros (fecha y búsqueda) y presionar "Exportar".
- Se descarga `ventas.xlsx` con:
  - Encabezado con nombre, datos de empresa y rango aplicado
  - Logo (si está configurado)
  - Encabezados estilizados, autoajuste de columnas y bandas de color
  - Totales por forma de pago (efectivo/transferencia) y total general

## Construir ejecutable (Windows)
Requisitos: `pkg` instalado globalmente o usar `npx`.

- Usando script ya definido:
```bash
npm run build
```

- Alternativa directa:
```bash
npx pkg . --public --target node18-win-x64 --out-path dist
```

El ejecutable queda en `dist/`.

## Soporte
Para soporte o preguntas, abrir un issue o contactar al equipo. 