/**
 * Prueba de carga rápida con autocannon.
 * Obtiene un token de login y dispara muchas peticiones a un endpoint protegido.
 *
 * Uso:
 *   node stress-tests/run-load.js
 *   node stress-tests/run-load.js --url http://localhost:3000 --connections 50 --duration 30
 *   node stress-tests/run-load.js --public  (solo GET /auth/login, sin auth)
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.STRESS_BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.STRESS_USERNAME || 'admin';
const PASSWORD = process.env.STRESS_PASSWORD || 'admin123';

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        url: BASE_URL,
        connections: 20,
        duration: 20,
        public: false,
        targetPath: '/api/dashboard/stats'
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url' && args[i + 1]) {
            opts.url = args[++i];
        } else if (args[i] === '--connections' && args[i + 1]) {
            opts.connections = parseInt(args[++i], 10) || 20;
        } else if (args[i] === '--duration' && args[i + 1]) {
            opts.duration = parseInt(args[++i], 10) || 20;
        } else if (args[i] === '--public') {
            opts.public = true;
            opts.targetPath = '/auth/login';
        } else if (args[i] === '--path' && args[i + 1]) {
            opts.targetPath = args[++i];
        }
    }
    return opts;
}

function parseUrl(url) {
    const u = new URL(url);
    return {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname
    };
}

function request(options, postData = null) {
    return new Promise((resolve, reject) => {
        const lib = options.protocol === 'https:' ? https : http;
        const req = lib.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    if (body && res.headers['content-type']?.includes('json')) {
                        body = JSON.parse(body);
                    }
                } catch (_) {}
                resolve({ statusCode: res.statusCode, headers: res.headers, body });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function login(baseUrl, username, password) {
    const u = parseUrl(baseUrl);
    const options = {
        hostname: u.hostname,
        port: u.port,
        path: '/auth/login',
        method: 'POST',
        protocol: u.protocol,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const res = await request(options, { username, password });
    if (res.statusCode !== 200 || !res.body?.token) {
        throw new Error('Login fallido: ' + (res.body?.error || res.statusCode));
    }
    const cookie = res.headers['set-cookie'];
    const token = res.body.token;
    return { token, cookie: Array.isArray(cookie) ? cookie.join('; ') : cookie };
}

function runAutocannon(targetUrl, opts) {
    return new Promise((resolve, reject) => {
        let autocannon;
        try {
            autocannon = require('autocannon');
        } catch (e) {
            reject(new Error('Instala autocannon: npm install -D autocannon'));
            return;
        }
        const config = {
            url: targetUrl,
            connections: opts.connections,
            duration: opts.duration,
            headers: opts.headers || {}
        };
        autocannon(config, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function printResults(result) {
    console.log('\n========== RESULTADOS AUTOCANNON ==========\n');
    console.log('  Peticiones totales:', result.requests.total);
    console.log('  Peticiones/segundo:', result.requests.average);
    console.log('  Latencia media (ms):', result.latency.mean);
    console.log('  Latencia p99 (ms):', result.latency.p99);
    console.log('  Errores:', result.errors);
    console.log('  Timeouts:', result.timeouts);
    console.log('\n============================================\n');
}

async function main() {
    const opts = parseArgs();
    const base = opts.url.replace(/\/$/, '');
    const targetUrl = base + opts.targetPath;

    console.log('Configuración:');
    console.log('  Base URL:', base);
    console.log('  Ruta:', opts.targetPath);
    console.log('  Conexiones:', opts.connections);
    console.log('  Duración (s):', opts.duration);
    console.log('  Modo:', opts.public ? 'público (sin auth)' : 'protegido (con token)');

    let headers = {};
    if (!opts.public) {
        try {
            const { token } = await login(base, USERNAME, PASSWORD);
            headers['Authorization'] = 'Bearer ' + token;
            console.log('  Login OK, usando token.');
        } catch (e) {
            console.error('Error en login:', e.message);
            process.exit(1);
        }
    }

    try {
        const result = await runAutocannon(targetUrl, {
            connections: opts.connections,
            duration: opts.duration,
            headers
        });
        printResults(result);
    } catch (e) {
        console.error('Error en autocannon:', e.message);
        process.exit(1);
    }
}

main();
