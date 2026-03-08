const WhatsAppService = require('../../../../services/Tenant/WhatsAppService');
const db = require('../../../../config/database');

class WhatsAppController {
    /**
     * Vista principal de conexión
     */
    static async index(req, res) {
        try {
            const tenantId = req.tenant.id;

            // Obtener configuración actual
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
            const { phoneNumber } = req.body || {};
            await WhatsAppService.initializeClient(tenantId, phoneNumber);
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
            const [rows] = await db.query('SELECT estado, last_qr, last_pairing_code FROM whatsapp_configs WHERE tenant_id = ?', [tenantId]);
            res.json(rows[0] || { estado: 'desconectado' });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo estado' });
        }
    }

    /**
     * Cerrar sesión y destruir cliente
     */
    static async disconnect(req, res) {
        try {
            const tenantId = req.tenant.id;
            await WhatsAppService.destroyClient(tenantId);
            res.json({ message: 'WhatsApp desconectado correctamente' });
        } catch (error) {
            console.error('Error en WhatsAppController.disconnect:', error);
            res.status(500).json({ error: 'No se pudo desconectar' });
        }
    }

    /**
     * Guardar configuración (mensaje de bienvenida, etc)
     */
    static async saveConfig(req, res) {
        try {
            const tenantId = req.tenant.id;
            const { mensaje_bienvenida, mensaje_transferencia } = req.body;

            await db.query('UPDATE whatsapp_configs SET mensaje_bienvenida = ?, mensaje_transferencia = ? WHERE tenant_id = ?',
                [mensaje_bienvenida, mensaje_transferencia, tenantId]);

            res.json({ success: true, message: 'Configuración guardada' });
        } catch (error) {
            console.error('Error en WhatsAppController.saveConfig:', error);
            res.status(500).json({ error: 'Error al guardar configuración' });
        }
    }
}

module.exports = WhatsAppController;
