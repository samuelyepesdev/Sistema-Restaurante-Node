const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('../../config/database');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.clients = new Map(); // client_id -> WhatsApp Client
        this.qrCodes = new Map(); // tenant_id -> QR Base64
        this.initializing = new Set(); // tenant_id -> boolean
    }

    /**
     * Inicializa un cliente para un tenant específico
     */
    async initializeClient(tenantId) {
        if (this.clients.has(tenantId) || this.initializing.has(tenantId)) {
            console.log(`[WhatsApp] Init omitido para Tenant ${tenantId} (Ya en proceso o conectado)`);
            return;
        }
        this.initializing.add(tenantId);

        console.log(`[WhatsApp] Inicializando cliente para Tenant ${tenantId}`);

        // Actualizar estado inmediatamente a esperando_qr (sin código aún)
        await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = NULL WHERE tenant_id = ?',
            ['esperando_qr', tenantId]);

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
            this.initializing.delete(tenantId);

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
            this.initializing.delete(tenantId);

            // Si falla el arranque, volver a estado desconectado para que el usuario pueda intentar de nuevo
            await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = NULL WHERE tenant_id = ?',
                ['desconectado', tenantId]);
        }
    }

    /**
     * Lógica del Bot
     */
    async handleIncomingMessage(tenantId, msg) {
        const from = msg.from; // Teléfono del cliente
        const body = (msg.body || '').trim().toLowerCase().replace(/\.$/, '');

        // SEGURIDAD CRÍTICA: Solo permitir chats individuales (@c.us)
        // Esto ignora: @g.us (grupos), @broadcast (estados/difusión), @newsletter, etc.
        if (!from.endsWith('@c.us')) {
            if (from.includes('@broadcast')) {
                console.log(`[WhatsApp] Seguridad: Ignorando actualización de estado (status@broadcast) para Tenant ${tenantId}`);
            } else if (from.endsWith('@g.us')) {
                console.log(`[WhatsApp] Seguridad: Ignorando mensaje de grupo para Tenant ${tenantId}`);
            } else {
                console.log(`[WhatsApp] Seguridad: Ignorando remitente no admitido (${from}) para Tenant ${tenantId}`);
            }
            return;
        }

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
                const [productos] = await db.query('SELECT id, nombre, precio_unidad FROM productos WHERE tenant_id = ? AND precio_unidad > 0 AND activo = 1 LIMIT 20', [tenantId]);

                if (body === 'menu') {
                    let menuMsg = '📖 *Nuestra Carta:*\n\n';
                    productos.forEach((p, i) => {
                        menuMsg += `${i + 1}. *${p.nombre}* - $${Number(p.precio_unidad).toLocaleString('es-CO')}\n`;
                    });
                    menuMsg += '\nEscribe el *número* del producto para añadirlo.';
                    await msg.reply(menuMsg);
                }
                else if (!isNaN(body)) {
                    const index = parseInt(body) - 1;
                    if (index >= 0 && index < productos.length) {
                        const selected = productos[index];

                        // Guardar en pending_order_data (carrito)
                        let cartData = conversation.pending_order_data || { cart: [] };
                        if (typeof cartData === 'string') cartData = JSON.parse(cartData);
                        if (!cartData.cart) cartData.cart = [];

                        cartData.cart.push({
                            id: selected.id,
                            nombre: selected.nombre,
                            precio: selected.precio_unidad,
                            cantidad: 1
                        });

                        await db.query('UPDATE whatsapp_conversations SET pending_order_data = ? WHERE tenant_id = ? AND customer_phone = ?',
                            [JSON.stringify(cartData), tenantId, from]);

                        let cartMsg = `✅ *${selected.nombre}* añadido.\n\n`;
                        cartMsg += '*Tu pedido actual:*\n';
                        cartData.cart.forEach(item => {
                            cartMsg += `- ${item.nombre} ($${Number(item.precio).toLocaleString('es-CO')})\n`;
                        });
                        cartMsg += '\nEscribe otro número para añadir más, o escribe *PEDIR* para finalizar.';
                        await msg.reply(cartMsg);
                    } else {
                        await msg.reply('Número inválido. Por favor elige un número de la lista o escribe *MENU*.');
                    }
                }
                else if (body.includes('pedir')) {
                    await msg.reply('¡Excelente decisión! 📝\n\nPor favor envíanos tu *Nombre* y *Dirección* para completar el pedido (ejemplo: Samuel Yepes - Calle 10 #20-30).');
                    await this.updateConversationState(tenantId, from, 'confirming');
                }
                else {
                    await msg.reply('No entendí. Escribe *MENU* para ver la carta o el número del producto deseado.');
                }
                break;

            case 'confirming':
                await msg.reply('¡Pedido recibido! 🎉\n\nEstamos procesando tu orden. En un momento un asesor te confirmará por aquí. ¡Gracias por elegirnos!');
                await this.updateConversationState(tenantId, from, 'completed');
                break;

            default:
                await msg.reply('Hola de nuevo. 👋 Escribe *MENU* para iniciar un nuevo pedido.');
                await this.updateConversationState(tenantId, from, 'browsing_menu');
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
    async destroyClient(tenantId) {
        this.initializing.delete(tenantId);
        const client = this.clients.get(tenantId);
        if (client) {
            try {
                await client.logout();
                await client.destroy();
                console.log(`[WhatsApp] Cliente destruido para Tenant ${tenantId}`);
            } catch (error) {
                console.error(`[WhatsApp] Error al destruir cliente para Tenant ${tenantId}:`, error);
            }
            this.clients.delete(tenantId);
        }
        this.qrCodes.delete(tenantId);

        // Actualizar DB
        await db.query('UPDATE whatsapp_configs SET estado = ?, last_qr = NULL WHERE tenant_id = ?',
            ['desconectado', tenantId]);
    }
}

// Singleton para usar en toda la app
module.exports = new WhatsAppService();
