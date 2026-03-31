require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first'); // FUERZA IPv4 A NIVEL GLOBAL
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de autenticación y tenant (requeridos antes de optionalAuth y planes)
const { requireAuth, optionalAuth, restrictSuperadminToAdmin } = require('./middleware/auth');
const { attachTenantContext, costeoTenantContext } = require('./middleware/tenant');
const { requirePlanFeature } = require('./middleware/planFeature');
const PlanService = require('./services/Admin/PlanService');

// Opcional: adjuntar user si hay token (para res.locals.plans en navbar)
app.use(optionalAuth);
// Planes para navbar (dropdown de plan del tenant)
app.use(async (req, res, next) => {
    try {
        res.locals.plans = req.user ? await PlanService.getAll() : [];
    } catch (_) {
        res.locals.plans = [];
    }
    next();
});
// Pre-computa variables del navbar (evita lógica en EJS que el IDE puede romper)
const navbarLocals = require('./middleware/navbarLocals');
app.use(navbarLocals);

// Configuración de archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Seguridad: Limitador de peticiones (Rate Limit General para prevenir DDoS básico)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Límite de 1000 peticiones por ventana por IP (general)
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' }
});
app.use(limiter);

// Headers de seguridad y CORS estricto
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Solo permitir CORS al dominio de producción o de desarrollo (no global '*')
    const allowedOrigin = process.env.APP_URL || process.env.FRONTEND_URL || '';
    if (allowedOrigin && req.headers.origin === allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Rutas de app: centralizadas en routes/web.js
const webRoutes = require('./routes/web');
app.use('/', webRoutes);

// Favicon: servir logo.png como icono de pestaña (el navegador pide /favicon.ico)
const faviconPath = path.join(__dirname, 'public', 'logo.png');
app.get('/favicon.ico', (req, res) => {
    if (fs.existsSync(faviconPath)) {
        res.type('image/png').sendFile(faviconPath);
    } else {
        res.status(204).end();
    }
});

// Manejo de errores 404
app.use((req, res, next) => {
    console.log('404 - Ruta no encontrada:', req.url);
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(404).json({ error: 'Ruta no encontrada' });
    } else {
        res.status(404).render('errors/404');
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
        res.status(500).render('errors/internal', {
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
        const server = app.listen(PORT, '0.0.0.0', async () => {
            console.log(`Servidor corriendo en http://localhost:${PORT} (LAN habilitada)`);
            console.log('Rutas disponibles:');
            console.log('- GET  /', '(Página principal)');
            console.log('- POST /api/facturas', '(Generar factura)');
            console.log('- GET  /api/facturas/:id/imprimir', '(Imprimir factura)');

            // Programar tareas automáticas (Cron Jobs)
            try {
                const cron = require('node-cron');
                const ReporteMensualService = require('./services/Tenant/ReporteMensualService');
                // Se ejecuta el primer (1) día de cada mes a las 6:00 AM (0 6 1 * *)
                cron.schedule('0 6 1 * *', async () => {
                    console.log('--- CRON: Iniciando envío de reportes mensuales ---');
                    await ReporteMensualService.procesarCierreMensual();
                });
                console.log('--- Cron jobs iniciados exitosamente ---');

                // Inicializar WhatsApp para tenants que ya estaban conectados
                try {
                    const WhatsAppService = require('./services/Tenant/WhatsAppService');
                    // Limpiar estados inconsistentes (si el servidor se apagó esperando un QR, ese QR ya no sirve)
                    await db.query('UPDATE whatsapp_configs SET estado = "desconectado", last_qr = NULL WHERE estado = "esperando_qr"');

                    const [configs] = await db.query('SELECT tenant_id FROM whatsapp_configs WHERE estado = "conectado"');
                    for (const row of configs) {
                        WhatsAppService.initializeClient(row.tenant_id).catch(e => console.error(`Error reconectando WhatsApp tenant ${row.tenant_id}:`, e));
                    }
                } catch (waErr) {
                    console.error('Error inicializando WhatsApp Service:', waErr.message);
                }
            } catch (cronErr) {
                console.error('Error iniciando cron jobs:', cronErr.message);
            }
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

// Exportar app para tests (supertest); no iniciar servidor en entorno test
if (require.main === module && process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app }; 
