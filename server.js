require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first'); // FUERZA IPv4 A NIVEL GLOBAL

const app = require('./app');
const db = require('./config/database');
const { createRequiredDirectories } = require('./config/setup');
const { runBackgroundJobs } = require('./config/bootstrap');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // 1. Inicializar estructura de archivos
        createRequiredDirectories();

        // 2. Verificar la conexión a la base de datos
        console.log('Intentando conectar a la base de datos...');
        const connection = await db.getConnection();
        connection.release();
        console.log('Conexión exitosa a la base de datos');

        // 3. Iniciar el servidor Express
        const server = app.listen(PORT, '0.0.0.0', async () => {
            console.log(`Servidor corriendo en http://localhost:${PORT} (LAN habilitada)`);
            console.log('Rutas principales activas:');
            console.log('- GET  / (Página principal)');
            console.log('- POST /api/facturas (Generar factura)');

            // 4. Iniciar procesos en segundo plano (Cron y WhatsApp)
            await runBackgroundJobs();
        });

        // 5. Manejar errores del puerto
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`El puerto ${PORT} está en uso. Intenta con otro puerto.`);
            } else {
                console.error('Error al iniciar el servidor:', error);
            }
            process.exit(1);
        });

    } catch (err) {
        console.error('Error fatal al conectar a la base de datos o Iniciar sistema:', err);
        process.exit(1);
    }
}

// Interceptores de apagado del servidor
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT. Cerrando servidor...');
    process.exit(0);
});

// Arrancar en entorno común o exportar app para tests
if (require.main === module && process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, startServer };
