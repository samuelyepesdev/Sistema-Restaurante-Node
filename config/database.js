const mysql = require('mysql2');

// Unified database configuration
// Uses environment variables with fallback to defaults
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurante',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Verify connection on startup
pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

module.exports = pool; 