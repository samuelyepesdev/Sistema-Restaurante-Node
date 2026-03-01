/**
 * Repara EJS donde Prettier rompió etiquetas <%=...%> en múltiples líneas.
 * Une la línea actual con las siguientes hasta completar el tag EJS o el atributo HTML.
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const filePath = process.argv[2];
if (!filePath) { console.error('Falta ruta de archivo'); process.exit(1); }

let content = fs.readFileSync(filePath, 'utf8');
// Normalizar a \r\n para Windows
const lines = content.split(/\r?\n/);
const result = [];

let i = 0;
while (i < lines.length) {
    let line = lines[i];

    // Contar cuántos <% abren y %> cierran en la línea
    const opens = (line.match(/<%/g) || []).length;
    const closes = (line.match(/%>/g) || []).length;

    // Si hay más aperturas que cierres, unir con líneas siguientes
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

const fixed = result.join('\r\n');
fs.writeFileSync(filePath, fixed, 'utf8');
console.log(`Escrito: ${filePath}`);

// Verificar
try {
    ejs.compile(fs.readFileSync(filePath, 'utf8'));
    console.log('EJS compile: OK ✓');
} catch (e) {
    console.log('EJS compile ERROR:', e.message.substring(0, 200));
}
