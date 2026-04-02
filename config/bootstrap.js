const db = require('./database');
const cron = require('node-cron');
const ReporteMensualService = require('../services/Tenant/ReporteMensualService');
const WhatsAppService = require('../services/Tenant/WhatsAppService');

const runBackgroundJobs = async () => {
    try {
        // Se ejecuta el primer (1) día de cada mes a las 6:00 AM (0 6 1 * *)
        cron.schedule('0 6 1 * *', async () => {
            console.log('--- CRON: Iniciando envío de reportes mensuales ---');
            await ReporteMensualService.procesarCierreMensual();
        });
        console.log('--- Cron jobs iniciados exitosamente ---');

        // Inicializar WhatsApp para tenants que ya estaban conectados
        try {
            // Limpiar estados inconsistentes (si el servidor se apagó esperando un QR, ese QR ya no sirve)
            await db.query('UPDATE whatsapp_configs SET estado = "desconectado", last_qr = NULL WHERE estado = "esperando_qr"');

            const [configs] = await db.query('SELECT tenant_id FROM whatsapp_configs WHERE estado = "conectado"');
            for (const row of configs) {
                WhatsAppService.initializeClient(row.tenant_id).catch(e => console.error(`Error reconectando WhatsApp tenant ${row.tenant_id}:`, e));
            }
        } catch (waErr) {
            console.error('Error inicializando WhatsApp Service:', waErr.message);
        }
    } catch (cronErr) {
        console.error('Error iniciando cron jobs:', cronErr.message);
    }
};

module.exports = { runBackgroundJobs };
