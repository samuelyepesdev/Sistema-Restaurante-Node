const db = require('../../../../config/database');
const MailerService = require('../../../../services/Shared/MailerService');

class SoporteController {
    static async index(req, res) {
        try {
            const tenantId = req.tenant.id;
            const usuarioId = req.user.id;
            
            // Get user's previous tickets
            const [tickets] = await db.query(`
                SELECT * FROM soporte_tickets 
                WHERE tenant_id = ? AND usuario_id = ? 
                ORDER BY created_at DESC
            `, [tenantId, usuarioId]);

            res.render('soporte/index', { 
                tenant: req.tenant, 
                user: req.user,
                tickets,
                path: '/soporte'
            });
        } catch (error) {
            console.error('Error cargando soporte:', error);
            res.status(500).render('errors/internal', { error: { message: 'Error cargando soporte' } });
        }
    }

    static async enviar(req, res) {
        try {
            const tenantId = req.tenant.id;
            const usuarioId = req.user.id;
            const { tipo, descripcion } = req.body;

            // Save to DB
            const [result] = await db.query(`
                INSERT INTO soporte_tickets (tenant_id, usuario_id, tipo, descripcion, estado)
                VALUES (?, ?, ?, ?, 'abierto')
            `, [tenantId, usuarioId, tipo, descripcion]);

            // Try to get superadmin emails or configuration. For now we use env variable or default email
            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@sistema-restaurante.com';

            // Send Email
            const htmlEmail = `
                <h2>Nuevo Ticket de Soporte</h2>
                <p><strong>Tenant:</strong> ${req.tenant.nombre} (ID: ${tenantId})</p>
                <p><strong>Usuario:</strong> ${req.user.nombre_completo || req.user.username} (ID: ${usuarioId})</p>
                <p><strong>Tipo:</strong> ${tipo}</p>
                <p><strong>Descripción:</strong></p>
                <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #007bff;">${descripcion}</blockquote>
                <p>Inicia sesión en el panel SuperAdmin para responder.</p>
            `;

            try {
                await MailerService.sendMail({
                    to: adminEmail,
                    subject: `Nuevo Ticket: [${tipo.toUpperCase()}] de ${req.tenant.nombre}`,
                    html: htmlEmail
                });
            } catch (mailError) {
                console.error("Error enviando email de soporte (el ticket se guardó):", mailError);
            }

            res.json({ success: true, message: 'Ticket de soporte enviado correctamente. Te contactaremos pronto.' });
        } catch (error) {
            console.error('Error enviando ticket de soporte:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = SoporteController;
