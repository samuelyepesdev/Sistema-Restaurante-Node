/**
 * Configuración global para Jest (variables de entorno, timeouts, etc.)
 * Se ejecuta una vez antes de cada archivo de tests.
 */
require('dotenv').config({ path: '.env.test' });
require('dotenv').config(); // fallback a .env

// Evitar que las pruebas que usan BD fallen por timeout en CI
jest.setTimeout(10000);
