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
        if (!from.endsWith('@c.us')) return;

        console.log(`[WhatsApp] Mensaje de ${from} para Tenant ${tenantId}: ${body}`);

        // 1. Obtener Configuración y Conversación
        const [configRows] = await db.query('SELECT mensaje_bienvenida FROM whatsapp_configs WHERE tenant_id = ?', [tenantId]);
        const config = configRows[0];
        const welcomeMsg = config?.mensaje_bienvenida || '¡Hola! 👋 Bienvenido.\nEscribe *MENU* para empezar.';

        let [convRows] = await db.query('SELECT * FROM whatsapp_conversations WHERE tenant_id = ? AND customer_phone = ?',
            [tenantId, from]);

        let conversation = convRows[0];
        if (!conversation) {
            await db.query('INSERT INTO whatsapp_conversations (tenant_id, customer_phone, current_state) VALUES (?, ?, ?)',
                [tenantId, from, 'welcome']);
            conversation = { current_state: 'welcome' };
        }

        // 2. Comandos globales (Reset)
        if (body === 'menu' || body === 'hola' || body === 'inicio') {
            await this.updateConversationState(tenantId, from, 'selecting_category');
            await this.sendCategories(tenantId, msg);
            return;
        }

        // 3. Manejar estados
        switch (conversation.current_state) {
            case 'welcome':
                await msg.reply(welcomeMsg);
                await this.updateConversationState(tenantId, from, 'selecting_category');
                break;

            case 'selecting_category':
                const [cats] = await db.query('SELECT id, nombre FROM categorias WHERE activa = 1');
                const catIdx = parseInt(body) - 1;

                if (!isNaN(catIdx) && catIdx >= 0 && catIdx < cats.length) {
                    const selectedCat = cats[catIdx];

                    // Guardar categoría elegida en pending_order_data temporalmente
                    let cartData = conversation.pending_order_data || {};
                    if (typeof cartData === 'string') cartData = JSON.parse(cartData);
                    cartData.selected_category_id = selectedCat.id;

                    await db.query('UPDATE whatsapp_conversations SET current_state = "browsing_menu", pending_order_data = ? WHERE tenant_id = ? AND customer_phone = ?',
                        [JSON.stringify(cartData), tenantId, from]);

                    await this.sendProductsByCategory(tenantId, msg, selectedCat.id, selectedCat.nombre);
                } else {
                    await msg.reply('Por favor, elige un número de categoría válido.');
                    await this.sendCategories(tenantId, msg);
                }
                break;

            case 'browsing_menu':
                let cartData = conversation.pending_order_data;
                if (typeof cartData === 'string') cartData = JSON.parse(cartData);
                const categoryId = cartData.selected_category_id;

                const [prods] = await db.query(
                    'SELECT id, nombre, precio_unidad FROM productos WHERE tenant_id = ? AND categoria_id = ? AND activo = 1 AND precio_unidad > 0',
                    [tenantId, categoryId]
                );

                if (!isNaN(body)) {
                    const pIdx = parseInt(body) - 1;
                    if (pIdx >= 0 && pIdx < prods.length) {
                        const selectedP = prods[pIdx];
                        if (!cartData.cart) cartData.cart = [];

                        cartData.cart.push({
                            id: selectedP.id,
                            nombre: selectedP.nombre,
                            precio: selectedP.precio_unidad,
                            cantidad: 1
                        });

                        await db.query('UPDATE whatsapp_conversations SET pending_order_data = ? WHERE tenant_id = ? AND customer_phone = ?',
                            [JSON.stringify(cartData), tenantId, from]);

                        let resMsg = `✅ *${selectedP.nombre}* añadido.\n\n`;
                        resMsg += '*Tu pedido:*\n';
                        cartData.cart.forEach(item => resMsg += `- ${item.nombre}\n`);
                        resMsg += '\nEscribe otro número para añadir más, *MENU* para ver otras categorías, o *PEDIR* para finalizar.';
                        await msg.reply(resMsg);
                    } else {
                        await msg.reply('Número de producto no válido.');
                    }
                } else if (body === 'pedir') {
                    if (!cartData.cart || cartData.cart.length === 0) {
                        await msg.reply('Tu carrito está vacío. Elige algo del menú primero.');
                        return;
                    }
                    await msg.reply('¿Cómo prefieres tu pedido?\n\n1. 🛵 *Domicilio*\n2. 🥡 *Para recoger / En local*');
                    await this.updateConversationState(tenantId, from, 'selecting_order_type');
                } else {
                    await msg.reply('Opción no válida. Escribe el número del producto o *PEDIR* para terminar.');
                }
                break;

            case 'selecting_order_type':
                let cData = conversation.pending_order_data;
                if (typeof cData === 'string') cData = JSON.parse(cData);

                if (body === '1' || body.includes('domicilio')) {
                    cData.order_type = 'Domicilio';
                    await db.query('UPDATE whatsapp_conversations SET current_state = "confirming", pending_order_data = ? WHERE tenant_id = ? AND customer_phone = ?',
                        [JSON.stringify(cData), tenantId, from]);
                    await msg.reply('¡Perfecto! 🛵\n\nPor favor envíanos tu *Nombre* y *Dirección* para el envío (ejemplo: Yasney Hernandez - Calle 29a #26-41).');
                } else if (body === '2' || body.includes('recoger') || body.includes('local')) {
                    cData.order_type = 'Pickup / Local';
                    await db.query('UPDATE whatsapp_conversations SET current_state = "confirming", pending_order_data = ? WHERE tenant_id = ? AND customer_phone = ?',
                        [JSON.stringify(cData), tenantId, from]);
                    await msg.reply('¡Entendido! 🥡\n\nPor favor envíanos tu *Nombre* para tener listo tu pedido.');
                } else {
                    await msg.reply('Por favor elige una opción:\n1. Domicilio\n2. Para recoger');
                }
                break;

            case 'confirming':
                try {
                    await this.finalizeOrder(tenantId, from, msg.body, conversation);
                    await msg.reply('¡Pedido recibido! 🎉\n\nEstamos procesando tu orden. En un momento te confirmaremos. ¡Gracias por elegirnos!');
                    await this.updateConversationState(tenantId, from, 'completed');
                } catch (error) {
                    console.error('[WhatsApp] Error al finalizar pedido:', error);
                    await msg.reply('Error al procesar. Por favor intenta de nuevo.');
                }
                break;

            default:
                await msg.reply(welcomeMsg);
                await this.updateConversationState(tenantId, from, 'selecting_category');
        }
    }

    async sendCategories(tenantId, msg) {
        const [cats] = await db.query('SELECT nombre FROM categorias WHERE activa = 1');
        let catMsg = '🍽️ *¿Qué te gustaría pedir hoy?*\n\nElige una categoría:\n';
        cats.forEach((c, i) => {
            catMsg += `${i + 1}. ${c.nombre}\n`;
        });
        await msg.reply(catMsg);
    }

    async sendProductsByCategory(tenantId, msg, categoryId, categoryName) {
        const [prods] = await db.query(
            'SELECT nombre, precio_unidad FROM productos WHERE tenant_id = ? AND categoria_id = ? AND activo = 1 AND precio_unidad > 0 LIMIT 20',
            [tenantId, categoryId]
        );

        if (prods.length === 0) {
            await msg.reply(`Lo sentimos, no hay productos disponibles en *${categoryName}* en este momento.`);
            await this.sendCategories(tenantId, msg);
            await this.updateConversationState(tenantId, msg.from, 'selecting_category');
            return;
        }

        let menuMsg = `📖 *Menú de ${categoryName}:*\n\n`;
        prods.forEach((p, i) => {
            menuMsg += `${i + 1}. *${p.nombre}* - $${Number(p.precio_unidad).toLocaleString('es-CO')}\n`;
        });
        menuMsg += '\nEscribe el *número* para añadirlo al carrito.';
        await msg.reply(menuMsg);
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

    /**
     * Finaliza el pedido creando los registros en la BD del POS
     */
    async finalizeOrder(tenantId, phone, customerInfo, conversation) {
        let cartData = conversation.pending_order_data;
        if (typeof cartData === 'string') cartData = JSON.parse(cartData);

        if (!cartData || !cartData.cart || cartData.cart.length === 0) {
            throw new Error('Carrito vacío');
        }

        // 1. Buscar o crear mesa virtual para este pedido
        const tableNumber = `WA-${phone.substring(phone.length - 4)}`;

        // Intentar extraer solo el nombre para la descripción de la mesa
        let nombreMostrable = customerInfo.split(/[-–—]/)[0].trim();
        if (nombreMostrable.length > 25) nombreMostrable = nombreMostrable.substring(0, 22) + '...';

        let [mesaRows] = await db.query(
            'SELECT id FROM mesas WHERE tenant_id = ? AND numero = ? AND tipo = "virtual"',
            [tenantId, tableNumber]
        );

        let mesaId;
        if (mesaRows.length > 0) {
            mesaId = mesaRows[0].id;
            await db.query('UPDATE mesas SET estado = "ocupada", descripcion = ? WHERE id = ?',
                [nombreMostrable, mesaId]);
        } else {
            const [result] = await db.query(
                'INSERT INTO mesas (tenant_id, numero, descripcion, tipo, estado) VALUES (?, ?, ?, ?, ?)',
                [tenantId, tableNumber, nombreMostrable, 'virtual', 'ocupada']
            );
            mesaId = result.insertId;
        }

        // 2. Calcular total
        const total = cartData.cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        // 3. Crear el pedido principal
        const orderType = cartData.order_type || 'WhatsApp';
        const [orderResult] = await db.query(
            'INSERT INTO pedidos (tenant_id, mesa_id, estado, canal, total, notas) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, mesaId, 'abierto', 'whatsapp', total, `[${orderType}] ${customerInfo}\nTel: ${phone}`]
        );
        const pedidoId = orderResult.insertId;

        // 4. Insertar los items del pedido
        for (const item of cartData.cart) {
            await db.query(
                'INSERT INTO pedido_items (tenant_id, pedido_id, producto_id, cantidad, precio_unitario, subtotal, estado, unidad_medida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [tenantId, pedidoId, item.id, item.cantidad, item.precio, item.precio * item.cantidad, 'pendiente', 'UND']
            );
        }

        // 5. Limpiar datos temporales de la conversación
        await db.query('UPDATE whatsapp_conversations SET pending_order_data = NULL WHERE tenant_id = ? AND customer_phone = ?',
            [tenantId, phone]);

        console.log(`[WhatsApp] SE CREÓ PEDIDO #${pedidoId} en Mesa ${mesaId} para Tenant ${tenantId}`);
    }
}

// Singleton para usar en toda la app
module.exports = new WhatsAppService();
