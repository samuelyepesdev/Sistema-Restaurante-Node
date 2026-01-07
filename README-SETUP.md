# Guía de Instalación y Configuración - Sistema de Restaurante

## Requisitos Previos
1. Node.js (v18 recomendado)
2. MySQL (versión 5.7 o superior)
3. Git (opcional)

## Instalación Paso a Paso

### 1. Base de Datos

#### 1.1 Crear Base de Datos
```sql
CREATE DATABASE IF NOT EXISTS restaurante;
USE restaurante;
```

#### 1.2 Ejecutar Migraciones
Ejecuta los scripts SQL en orden:

1. Primero ejecuta `database.sql` (tablas base del sistema)
2. Luego ejecuta `database/migrations/001_create_users_and_roles.sql` (sistema de autenticación)

O ejecuta ambos en MySQL Workbench o tu cliente MySQL preferido.

### 2. Instalación de Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias incluyendo:
- express, ejs, mysql2
- jsonwebtoken, bcrypt (autenticación)
- express-validator (validación)
- exceljs, multer (importación/exportación)

### 3. Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (opcional, tiene valores por defecto):

```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=restaurante

# Servidor
PORT=3000

# JWT (cambiar en producción)
JWT_SECRET=restaurante_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Usuario administrador inicial (opcional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@restaurante.com
ADMIN_NOMBRE=Administrador
```

### 4. Crear Usuario Administrador

Después de ejecutar las migraciones, crea el usuario administrador:

```bash
node scripts/create-admin.js
```

Esto creará un usuario `admin` con la contraseña `admin123` (o las que definas en `.env`).

**⚠️ IMPORTANTE**: Cambia la contraseña después del primer inicio de sesión.

### 5. Iniciar el Sistema

```bash
npm start
```

O en modo desarrollo con auto-reload:

```bash
npm run dev
```

El servidor estará disponible en:
- Local: `http://localhost:3000`
- Red local: `http://TU_IP_LOCAL:3000`

### 6. Primer Acceso

1. Abre el navegador en `http://localhost:3000`
2. Serás redirigido a `/auth/login`
3. Ingresa las credenciales del administrador:
   - Usuario: `admin`
   - Contraseña: `admin123`

## Roles y Permisos

El sistema incluye 4 roles predefinidos:

### Admin
- Acceso completo a todas las funcionalidades
- Gestión de usuarios y roles
- Configuración del sistema

### Mesero
- Ver productos y clientes
- Gestionar mesas y pedidos
- Crear facturas

### Cocinero
- Ver cola de cocina
- Gestionar estados de preparación
- Ver productos

### Cajero
- Ver productos y clientes
- Crear y ver facturas
- Ver y exportar ventas

## Estructura del Proyecto

```
Restaurante/
├── config/
│   └── database.js          # Configuración unificada de BD
├── database/
│   ├── migrations/           # Migraciones de BD
│   └── database.sql         # Script inicial de BD
├── middleware/
│   └── auth.js              # Middleware de autenticación JWT
├── routes/
│   ├── auth.js             # Rutas de autenticación
│   ├── productos.js        # Rutas de productos
│   ├── clientes.js         # Rutas de clientes
│   ├── mesas.js            # Rutas de mesas
│   ├── cocina.js           # Rutas de cocina
│   ├── facturas.js         # Rutas de facturas
│   ├── ventas.js           # Rutas de ventas
│   └── configuracion.js    # Rutas de configuración
├── services/
│   └── AuthService.js      # Servicio de autenticación
├── utils/
│   └── constants.js        # Constantes del sistema
├── views/
│   ├── auth/
│   │   └── login.ejs       # Vista de login
│   ├── partials/
│   │   └── navbar.ejs      # Navbar con info de usuario
│   └── ...                 # Otras vistas
├── scripts/
│   └── create-admin.js     # Script para crear admin
└── server.js               # Archivo principal
```

## Solución de Problemas

### Error de conexión a base de datos
- Verifica que MySQL esté corriendo
- Verifica las credenciales en `.env` o `config/database.js`
- Asegúrate de que la base de datos `restaurante` exista

### Error al crear usuario admin
- Verifica que las migraciones se hayan ejecutado correctamente
- Verifica que el rol `admin` exista en la tabla `roles`

### Token inválido o expirado
- El token JWT expira después de 24 horas por defecto
- Inicia sesión nuevamente

## Seguridad

- **Cambia el JWT_SECRET** en producción
- **Cambia la contraseña del admin** después del primer login
- **No expongas el archivo `.env`** en el repositorio
- Usa HTTPS en producción

## Próximos Pasos

1. Cambiar contraseña del administrador
2. Crear usuarios adicionales según roles necesarios
3. Configurar la impresión (logo, datos de empresa)
4. Importar productos desde Excel si es necesario

