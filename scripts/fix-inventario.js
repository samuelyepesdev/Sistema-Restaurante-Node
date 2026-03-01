const fs = require('fs');
let c = fs.readFileSync('views/inventario.ejs', 'utf8');

// Los botones E, S, A fueron partidos en 2 líneas por Prettier (lines 137-145)
// Los patronamos con regex simple línea por línea

const lines = c.split('\n');
const result = [];
let i = 0;
while (i < lines.length) {
    const line = lines[i];
    // Detectar apertura de botón de inventario partido en 2 líneas
    if (
        line.trimEnd().endsWith('" btn-outline-success"') ||
        line.trimEnd().endsWith('" btn-outline-danger"') ||
        line.trimEnd().endsWith('" btn btn-sm btn-outline-secondary"')
    ) {
        const nextLine = lines[i + 1] ? lines[i + 1] : '';
        // Si la siguiente línea empieza con onclick= (patrón de rotura)
        if (nextLine.trim().startsWith('onclick=')) {
            result.push(line.trimEnd() + ' ' + nextLine.trim());
            i += 2;
            continue;
        }
    }
    result.push(line);
    i++;
}
c = result.join('\n');
fs.writeFileSync('views/inventario.ejs', c, 'utf8');
console.log('Hecho');

// Verificar compilacion
const ejs = require('ejs');
try {
    ejs.compile(c);
    console.log('EJS compile: OK');
} catch (e) {
    console.log('EJS compile ERROR:', e.message.substring(0, 100));
}
