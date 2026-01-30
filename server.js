require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const db = require('./config/database');

// Crear directorios necesarios
const createRequiredDirectories = () => {
    const directories = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'public', 'uploads'),
        path.join(__dirname, 'public', 'css'),
        path.join(__dirname, 'public', 'js')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Directorio creado: ${dir}`);
        }
    });
};

// Crear directorios al iniciar
createRequiredDirectories();

// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cookie parser for JWT tokens
app.use(cookieParser());

// Aumentar el límite de tamaño del cuerpo de la petición
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración de archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Headers de seguridad y CORS
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Middleware de autenticación y tenant
const { requireAuth, optionalAuth, restrictSuperadminToAdmin } = require('./middleware/auth');
const { attachTenantContext, costeoTenantContext } = require('./middleware/tenant');

// Rutas de app: superadmin solo puede ver /admin/tenants y /costeo; el resto requiere tenant
const requireAuthWithTenant = [requireAuth, restrictSuperadminToAdmin, attachTenantContext];

// Rutas de autenticación (públicas)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Rutas protegidas
const productosRoutes = require('./routes/productos');
const clientesRoutes = require('./routes/clientes');
const facturasRoutes = require('./routes/facturas');
const mesasRoutes = require('./routes/mesas');
const cocinaRoutes = require('./routes/cocina');
const configuracionRoutes = require('./routes/configuracion');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');
const costeoRoutes = require('./routes/costeo');
const adminTenantsRoutes = require('./routes/admin/tenants');

// Ruta principal - redirige según autenticación y rol
app.get('/', optionalAuth, (req, res) => {
    if (req.user) {
        const rol = String((req.user.rol || '')).toLowerCase();
        if (rol === 'superadmin') {
            res.redirect('/admin/tenants');
        } else if (rol === 'admin') {
            res.redirect('/dashboard');
        } else if (rol === 'mesero') {
            res.redirect('/mesas');
        } else if (rol === 'cocinero') {
            res.redirect('/cocina');
        } else if (rol === 'cajero') {
            res.redirect('/ventas');
        } else {
            res.redirect('/mesas');
        }
    } else {
        res.redirect('/auth/login');
    }
});

// Proteger todas las rutas con autenticación + contexto tenant
app.use('/productos', requireAuthWithTenant, productosRoutes);
app.use('/api/productos', requireAuthWithTenant, productosRoutes);
app.use('/clientes', requireAuthWithTenant, clientesRoutes);
app.use('/api/clientes', requireAuthWithTenant, clientesRoutes);
app.use('/facturas', requireAuthWithTenant, facturasRoutes);
app.use('/api/facturas', requireAuthWithTenant, facturasRoutes);
app.use('/mesas', requireAuthWithTenant, mesasRoutes);
app.use('/api/mesas', requireAuthWithTenant, mesasRoutes);
app.use('/cocina', requireAuthWithTenant, cocinaRoutes);
app.use('/api/cocina', requireAuthWithTenant, cocinaRoutes);
app.use('/configuracion', requireAuthWithTenant, configuracionRoutes);
app.use('/ventas', requireAuthWithTenant, ventasRoutes);
app.use('/dashboard', requireAuthWithTenant, dashboardRoutes);
app.use('/api/dashboard', requireAuthWithTenant, dashboardRoutes);
app.use('/costeo', requireAuth, restrictSuperadminToAdmin, costeoTenantContext, costeoRoutes);
// Superadmin: solo requireAuth (no tenant); el panel solo permite rol superadmin
app.use('/admin/tenants', requireAuth, adminTenantsRoutes);


// Manejo de errores 404
app.use((req, res, next) => {
    console.log('404 - Ruta no encontrada:', req.url);
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(404).json({ error: 'Ruta no encontrada' });
    } else {
        res.status(404).render('404');
    }
});

// Manejo de errores generales
app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', err);
    
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(500).json({ 
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
        });
    } else {
        res.status(500).render('error', {
            error: {
                message: 'Error interno del servidor',
                stack: process.env.NODE_ENV === 'development' ? err.stack : ''
            }
        });
    }
});

const PORT = process.env.PORT || 3000;

// Verificar la conexión a la base de datos antes de iniciar el servidor
async function startServer() {
    try {
        console.log('Intentando conectar a la base de datos...');
        const connection = await db.getConnection();
        connection.release();
        console.log('Conexión exitosa a la base de datos');
        
        // Iniciar el servidor solo si la conexión a la base de datos es exitosa
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor corriendo en http://localhost:${PORT} (LAN habilitada)`);
            console.log('Rutas disponibles:');
            console.log('- GET  /', '(Página principal)');
            console.log('- POST /api/facturas', '(Generar factura)');
            console.log('- GET  /api/facturas/:id/imprimir', '(Imprimir factura)');
        });

        // Manejar errores del servidor
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`El puerto ${PORT} está en uso. Intenta con otro puerto.`);
            } else {
                console.error('Error al iniciar el servidor:', error);
            }
            process.exit(1);
        });

    } catch (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1);
    }
}

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT. Cerrando servidor...');
    process.exit(0);
});

startServer(); 