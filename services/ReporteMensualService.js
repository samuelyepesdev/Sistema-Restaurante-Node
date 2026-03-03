const ejs = require('ejs');
const path = require('path');
const puppeteer = require('puppeteer');
const MailerService = require('./MailerService');
const StatsRepository = require('../repositories/StatsRepository');
const TenantService = require('./TenantService');

function formatMoney(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

class ReporteMensualService {
    /**
     * Generar reporte mensual y enviarlo.
     * Si no se da fecha, asume el mes anterior al mes actual.
     * Si no se da correo de prueba (testEmail), se envía al tenant.correo.
     */
    static async generarYEnviar(tenant, options = {}) {
        let firstDay, lastDayStr, mesNombre;

        if (options.testMesActual) {
            // Pruebas: Usamos el mes actual
            const date = new Date();
            const y = date.getFullYear();
            const m = date.getMonth() + 1; // 1 a 12
            firstDay = `${y}-${m.toString().padStart(2, '0')}-01`;
            lastDayStr = `${y}-${m.toString().padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
            mesNombre = date.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
        } else {
            // Producción normal: Cierre del MES ANTERIOR
            const date = new Date();
            date.setMonth(date.getMonth() - 1); // Restamos un mes
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            firstDay = `${y}-${m.toString().padStart(2, '0')}-01`;
            lastDayStr = `${y}-${m.toString().padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
            mesNombre = date.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
        }

        console.log(`Generando reporte para ${tenant.nombre} - Rango: ${firstDay} a ${lastDayStr}...`);

        const totalMes = await StatsRepository.getTotalSales(tenant.id, { desde: firstDay, hasta: lastDayStr });
        const facturasMes = await StatsRepository.getTotalInvoices(tenant.id, { desde: firstDay, hasta: lastDayStr });
        const topProductos = await StatsRepository.getTopProducts(tenant.id, 5, { desde: firstDay, hasta: lastDayStr });
        const porCategoria = await StatsRepository.getSalesByCategory(tenant.id, { desde: firstDay, hasta: lastDayStr });

        const templatePath = path.join(__dirname, '../views/reportes/mensual.ejs');
        const data = {
            tenant,
            mes: mesNombre.toUpperCase(),
            totalMes,
            facturasMes,
            topProductos,
            porCategoria,
            formatMoney
        };

        const html = await ejs.renderFile(templatePath, data);

        // Render PDF usando Puppeteer
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
        await browser.close();

        // Determinar destinatario
        let to = options.testEmail;
        if (!to) {
            to = tenant.email || (tenant.config && tenant.config.correo) || process.env.ADMIN_EMAIL || 'contacto@ejemplo.com';
        }

        const subject = `Reporte Mensual - ${tenant.nombre} - ${data.mes}`;
        const bodyContent = `Hola,<br><br>Adjunto enviamos el reporte de resumen de ventas de <strong>${data.mes}</strong> para <strong>${tenant.nombre}</strong>.<br><br>Saludos cordiales,<br>Tu Sistema Ecl-Fruver`;

        try {
            const mailResult = await MailerService.sendMail({
                to,
                subject,
                html: bodyContent,
                attachments: [{
                    filename: `Reporte_${data.mes.replace(/ /g, '_')}_${tenant.nombre.replace(/ /g, '_')}.pdf`,
                    content: pdfBuffer
                }]
            });
            return { ...mailResult, emailValido: to };
        } catch (mailError) {
            console.error('Error enviando el correo desde ReporteMensual:', mailError);
            throw mailError;
        }
    }

    /**
     * Función llamada por el CRON el día 1 de cada mes
     */
    static async procesarCierreMensual() {
        console.log('--- Iniciando CRON de cierre mensual de reportes ---');
        const tenants = await TenantService.getAllTenants();

        for (const t of tenants) {
            if (t.activo) {
                try {
                    await this.generarYEnviar(t, { testMesActual: false }); // Envía mes anterior
                } catch (err) {
                    console.error(`Error enviando reporte mensual a tenant ${t.nombre}:`, err.message);
                }
            }
        }
        console.log('--- Fin de CRON de cierre mensual ---');
    }
}

module.exports = ReporteMensualService;
