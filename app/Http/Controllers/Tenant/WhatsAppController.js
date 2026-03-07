const WhatsAppService = require('../../../../services/Tenant/WhatsAppService');
const db = require('../../../../config/database');

class WhatsAppController {
    /**
     * Vista principal de conexión
     */
    static async index(req, res) {
        try {
            const tenantId = req.tenant.id;

            // Obtener configuración actal
            let [rows] = await db.query('SELECT * FROM whatsapp_configs WHERE tenant_id = ?', [tenantId]);
            let config = rows[0];

            if (!config) {
                // Crear config inicial si no existe
                await db.query('INSERT INTO whatsapp_configs (tenant_id, nombre_instancia, estado) VALUES (?, ?, ?)',
                    [tenantId, `WhatsApp ${req.tenant.nombre}`, 'desconectado']);
                [rows] = await db.query('SELECT * FROM whatsapp_configs WHERE tenant_id = ?', [tenantId]);
                config = rows[0];
            }

            res.render('configuracion/whatsapp', {
                config,
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error en WhatsAppController.index:', error);
            res.status(500).render('errors/internal', { error: { message: 'Error cargando configuración de WhatsApp' } });
        }
    }

    /**
     * Iniciar proceso de conexión
     */
    static async connect(req, res) {
        try {
            const tenantId = req.tenant.id;
            await WhatsAppService.initializeClient(tenantId);
            res.json({ message: 'Proceso de conexión iniciado' });
        } catch (error) {
            console.error('Error en WhatsAppController.connect:', error);
            res.status(500).json({ error: 'No se pudo iniciar la conexión' });
        }
    }

    /**
     * Obtener estado en tiempo real (para el frontend polling)
     */
    static async status(req, res) {
        try {
            const tenantId = req.tenant.id;
            const [rows] = await db.query('SELECT estado, last_qr FROM whatsapp_configs WHERE tenant_id = ?', [tenantId]);
            res.json(rows[0] || { estado: 'desconectado' });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo estado' });
        }
    }
}

module.exports = WhatsAppController;
