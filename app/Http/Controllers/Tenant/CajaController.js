const CajaService = require('../../../../services/Tenant/CajaService');

class CajaController {
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const estado = await CajaService.getEstadoCaja(tenantId);

            res.render('caja/index', {
                estado,
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('errors/generic', { error: { message: 'Error al cargar módulo de caja' } });
        }
    }

    static async abrir(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const usuarioId = req.user?.id;
            await CajaService.abrirCaja(tenantId, usuarioId, req.body);
            res.json({ success: true, message: 'Turno de caja abierto' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async cerrar(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const sesionId = req.params.id;
            await CajaService.cerrarCaja(tenantId, sesionId, req.body);
            res.json({ success: true, message: 'Turno cerrado correctamente' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async movimiento(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const usuarioId = req.user?.id;
            const sesionId = req.params.id;
            await CajaService.registrarMovimiento(tenantId, sesionId, usuarioId, req.body);
            res.json({ success: true, message: 'Movimiento registrado' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async historial(req, res) {
        try {
            const tenantId = req.tenant.id;
            const sesiones = await CajaService.getHistorial(tenantId);
            res.render('caja/historial', {
                sesiones,
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error al cargar historial de caja:', error);
            res.status(500).render('errors/generic', { error });
        }
    }
}

module.exports = CajaController;
