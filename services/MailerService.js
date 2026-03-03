const nodemailer = require('nodemailer');

class MailerService {
    static async getTransporter() {
        console.log(`Buscando configuración SMTP: HOST=${process.env.SMTP_HOST}, PORT=${process.env.SMTP_PORT}, USER=${process.env.SMTP_USER}`);
        if (process.env.SMTP_HOST) {
            console.log('--- Usando TRANSPORE SMTP REAL ---');
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: String(process.env.SMTP_SECURE) === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }

        // Ethereal test account if no real config
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
    }

    static async sendMail({ to, subject, html, attachments }) {
        console.log(`Iniciando envío de correo a: ${to}`);
        try {
            const transporter = await this.getTransporter();
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Sistema Restaurante/Fruver" <no-reply@sistema-restaurante.com>',
                to,
                subject,
                html,
                attachments
            });

            console.log(`¡Mensaje enviado! ID: ${info.messageId}`);

            if (info.messageId && !process.env.SMTP_HOST) {
                console.log("-----------------------------------------");
                console.log("¡CORREO ENVIADO EN MODO PRUEBA (ETHEREAL)!");
                console.log("URL de vista previa del correo: %s", nodemailer.getTestMessageUrl(info));
                console.log("-----------------------------------------");
                return { ok: true, previewUrl: nodemailer.getTestMessageUrl(info) };
            }
            return { ok: true };
        } catch (error) {
            console.error('Error detallado en MailerService:', error);
            throw error;
        }
    }
}
module.exports = MailerService;
