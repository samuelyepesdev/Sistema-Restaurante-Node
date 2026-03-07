const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('../../config/database');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.clients = new Map(); // client_id -> WhatsApp Client
        this.qrCodes = new Map(); // tenant_id -> QR Base64
    }

    /**
     * Inicializa un cliente para un tenant específico
     */
    async initializeClient(tenantId) {
        if (this.clients.has(tenantId)) return;

        console.log(`[WhatsApp] Inicializando cliente para Tenant ${tenantId}`);

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: `tenant_${tenantId}`,
                dataPath: path.join(__dirname, '../../.wwebjs_auth')
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        client.on('qr', async (qr) => {
            console.log(`[WhatsApp] QR recibido para Tenant ${tenantId}`);
            const qrBase64 = await qrcode.toDataURL(qr);
            this.qrCodes.set(tenantId, qrBase64);

            // Actualizar estado en DB
            await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = ? WHERE tenant_id = ?',
                ['esperando_qr', qrBase64, tenantId]);
        });

        client.on('ready', async () => {
            console.log(`[WhatsApp] Cliente listo para Tenant ${tenantId}`);
            this.qrCodes.delete(tenantId);
            this.clients.set(tenantId, client);

            await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = NULL WHERE tenant_id = ?',
                ['conectado', tenantId]);
        });

        client.on('disconnected', async (reason) => {
            console.log(`[WhatsApp] Cliente desconectado para Tenant ${tenantId}: ${reason}`);
            this.clients.delete(tenantId);
            await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = NULL WHERE tenant_id = ?',
                ['desconectado', tenantId]);
        });

        client.on('message', async (msg) => {
            try {
                await this.handleIncomingMessage(tenantId, msg);
            } catch (error) {
                console.error(`[WhatsApp] Error procesando mensaje para Tenant ${tenantId}:`, error);
            }
        });

        try {
            await client.initialize();
        } catch (error) {
            console.error(`[WhatsApp] Error inicializando cliente para Tenant ${tenantId}:`, error);
        }
    }

    /**
     * Lógica del Bot
     */
    async handleIncomingMessage(tenantId, msg) {
        const from = msg.from; // Teléfono del cliente
        const body = msg.body.trim().toLowerCase();

        // Evitar grupos
        if (from.includes('@g.us')) return;

        console.log(`[WhatsApp] Mensaje de ${from} para Tenant ${tenantId}: ${body}`);

        // 1. Obtener o crear conversación
        let [rows] = await db.query('SELECT * FROM whatsapp_conversations WHERE tenant_id = ? AND customer_phone = ?',
            [tenantId, from]);

        let conversation = rows[0];
        if (!conversation) {
            await db.query('INSERT INTO whatsapp_conversations (tenant_id, customer_phone, current_state) VALUES (?, ?, ?)',
                [tenantId, from, 'welcome']);
            conversation = { current_state: 'welcome' };
        }

        // 2. Manejar estados
        switch (conversation.current_state) {
            case 'welcome':
                await msg.reply('¡Hola! 👋 Bienvenido a nuestro sistema de pedidos.\n\nEscribe *MENU* para ver nuestra carta o *AYUDA* para hablar con un asesor.');
                await this.updateConversationState(tenantId, from, 'browsing_menu');
                break;

            case 'browsing_menu':
                if (body === 'menu') {
                    // Obtener productos (solo los que tengan precio > 0)
                    const [productos] = await db.query('SELECT nombre, precio_unidad FROM productos WHERE tenant_id = ? AND precio_unidad > 0 LIMIT 10', [tenantId]);

                    let menuMsg = '📖 *Nuestra Carta:*\n\n';
                    productos.forEach((p, i) => {
                        menuMsg += `${i + 1}. *${p.nombre}* - $${Number(p.precio_unidad).toLocaleString('es-CO')}\n`;
                    });
                    menuMsg += '\nEscribe el número del producto para añadirlo.';
                    await msg.reply(menuMsg);
                } else {
                    await msg.reply('No entendí. Escribe *MENU* para ver la carta.');
                }
                break;

            default:
                await msg.reply('Estamos mejorando nuestro bot. Pronto podrás realizar pedidos completos por aquí. Por ahora, escribe *MENU* para ver qué tenemos para ofrecerte.');
        }
    }

    async updateConversationState(tenantId, from, state) {
        await db.query('UPDATE whatsapp_conversations SET current_state = ? WHERE tenant_id = ? AND customer_phone = ?',
            [state, tenantId, from]);
    }

    getClient(tenantId) {
        return this.clients.get(tenantId);
    }

    getQR(tenantId) {
        return this.qrCodes.get(tenantId);
    }
}

// Singleton para usar en toda la app
module.exports = new WhatsAppService();
