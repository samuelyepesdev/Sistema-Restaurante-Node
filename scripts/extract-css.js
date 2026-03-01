/**
 * extract-css.js
 * Extrae los bloques <style>...</style> de todos los archivos .ejs,
 * crea el .css correspondiente en public/css/ y reemplaza el bloque
 * inlineado por un <link rel="stylesheet">.
 * También corre fix-ejs-lines para reparar líneas EJS rotas por Prettier.
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// ── Configuración ─────────────────────────────────────────────────────────────
const VIEWS_DIR = path.join(__dirname, '..', 'views');
const CSS_DIR = path.join(__dirname, '..', 'public', 'css');

// Archivos ya procesados (tienen su CSS separado)
const SKIP = new Set([
    'partials/navbar.ejs',
    'mesas.ejs',
    'inventario.ejs',
    'dashboard.ejs',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAllEjs(dir, base = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(getAllEjs(full, base));
        } else if (entry.name.endsWith('.ejs')) {
            files.push(path.relative(base, full).replace(/\\/g, '/'));
        }
    }
    return files;
}

function cssNameFromEjs(rel) {
    // partials/navbar.ejs → navbar.css
    // admin/dashboard.ejs → admin-dashboard.css
    return rel.replace(/\//g, '-').replace(/\.ejs$/, '.css');
}

/** Une líneas donde EJS abre sin cerrar (igual que fix-ejs-lines.js) */
function fixEjsLines(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let i = 0;
    while (i < lines.length) {
        let line = lines[i];
        const opens = (line.match(/<%/g) || []).length;
        const closes = (line.match(/%>/g) || []).length;
        if (opens > closes) {
            while (i + 1 < lines.length) {
                i++;
                const next = lines[i];
                line = line.trimEnd() + ' ' + next.trimStart();
                const o = (line.match(/<%/g) || []).length;
                const c = (line.match(/%>/g) || []).length;
                if (o <= c) break;
            }
        }
        result.push(line);
        i++;
    }
    return result.join('\r\n');
}

// ── Procesar ──────────────────────────────────────────────────────────────────
const ejsFiles = getAllEjs(VIEWS_DIR);
let processed = 0;
let skipped = 0;
let errors = 0;

for (const rel of ejsFiles) {
    if (SKIP.has(rel)) { skipped++; continue; }

    const ejsPath = path.join(VIEWS_DIR, rel);
    let content = fs.readFileSync(ejsPath, 'utf8');

    // Buscar bloque <style>...</style> (greedy mínimo)
    const styleRe = /<style>([\s\S]*?)<\/style>/i;
    const match = styleRe.exec(content);
    if (!match) { skipped++; continue; }

    const cssContent = match[1].trim();
    const cssName = cssNameFromEjs(rel);
    const cssPath = path.join(CSS_DIR, cssName);
    const cssHref = `/css/${cssName}`;

    // Crear archivo CSS si no existe (si existe, agregar al final)
    if (fs.existsSync(cssPath)) {
        // Agregar al existente (caso raro, por si hay dos bloques)
        const existing = fs.readFileSync(cssPath, 'utf8');
        if (!existing.includes(cssContent.substring(0, 40))) {
            fs.appendFileSync(cssPath, '\n\n' + cssContent, 'utf8');
        }
    } else {
        const header = `/* ========================================\n   ${cssName} — extraído de ${rel}\n   ======================================== */\n\n`;
        fs.writeFileSync(cssPath, header + cssContent, 'utf8');
    }

    // Reemplazar bloque <style>...</style> por <link>
    const indent = (match[0].match(/^(\s*)<style>/m) || ['', ''])[1] || '    ';
    content = content.replace(styleRe, `${indent}<link rel="stylesheet" href="${cssHref}">`);

    // Reparar EJS partido por Prettier
    content = fixEjsLines(content);

    // Escribir EJS corregido
    fs.writeFileSync(ejsPath, content, 'utf8');

    // Verificar
    try {
        ejs.compile(fs.readFileSync(ejsPath, 'utf8'));
        console.log(`✓  ${rel} → ${cssName}`);
        processed++;
    } catch (e) {
        console.log(`✗  ${rel} — ERROR EJS: ${e.message.substring(0, 80)}`);
        errors++;
    }
}

console.log(`\nResumen: ${processed} procesados, ${skipped} omitidos, ${errors} errores`);
