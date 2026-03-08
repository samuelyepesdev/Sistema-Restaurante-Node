const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPdf() {
    console.log('Iniciando prueba de Puppeteer...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent('<h1>Hola mundo</h1><p>Prueba de PDF</p>');
        const pdf = await page.pdf({ format: 'A4' });
        const outputPath = path.join(__dirname, 'test.pdf');
        fs.writeFileSync(outputPath, pdf);
        console.log('PDF generado exitosamente en:', outputPath);
    } catch (error) {
        console.error('Error en Puppeteer:', error);
    } finally {
        if (browser) await browser.close();
    }
}

testPdf();
