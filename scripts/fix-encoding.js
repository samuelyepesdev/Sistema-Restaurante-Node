/**
 * fix-encoding.js — Corrige mojibake UTF-8→Latin-1 en archivos EJS
 * Causado por PowerShell Get-Content sin -Encoding UTF8
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const FIXES = [
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
    ['Ã ', 'à'], ['Ã¨', 'è'], ['Ã¬', 'ì'], ['Ã²', 'ò'], ['Ã¹', 'ù'],
    ['\u00c3\u0081', 'Á'], ['\u00c3\u0089', 'É'], ['\u00c3\u008d', 'Í'],
    ['\u00c3\u0093', 'Ó'], ['\u00c3\u009a', 'Ú'],
    ['Ã±', 'ñ'], ['\u00c3\u0091', 'Ñ'],
    ['\u00c2\u00bf', '¿'], ['\u00c2\u00a1', '¡'],
    ['\u00c3\u00bc', 'ü'], ['\u00c3\u009c', 'Ü'],
    ['\u00c3\u00a7', 'ç'],
];

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [bad, good] of FIXES) {
        if (content.includes(bad)) {
            content = content.split(bad).join(good);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        try {
            ejs.compile(content);
            console.log('✓ Corregido: ' + path.basename(filePath));
        } catch (e) {
            console.log('✗ ERROR EJS en: ' + path.basename(filePath) + ' — ' + e.message.substring(0, 60));
        }
    } else {
        console.log('  Sin cambios: ' + path.basename(filePath));
    }
}

// Procesar los args o todos los .ejs
const args = process.argv.slice(2);
if (args.length > 0) {
    args.forEach(f => fixFile(f));
} else {
    // Procesar todos los .ejs en views/
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.ejs')) fixFile(full);
        }
    }
    walk(path.join(__dirname, '..', 'views'));
}
