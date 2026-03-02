const express = require('express');
const router = express.Router();
const TenantService = require('../../services/TenantService');
const StatsService = require('../../services/StatsService');
const { requirePermission } = require('../../middleware/auth');

router.get('/', requirePermission('perfil.ver'), async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const stats = await StatsService.getDashboardStats(tenantId);
        res.render('perfil/index', { tenant: req.tenant, user: req.user, stats });
    } catch (error) {
        console.error('Error cargando perfil:', error);
        res.status(500).render('errors/internal', { error: { message: 'Error cargando perfil' } });
    }
});

router.post('/actualizar', requirePermission('perfil.editar'), async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { nombre, direccion, telefono, colores } = req.body;

        let newConfig = req.tenant.config || {};
        if (colores) {
            newConfig.colores = JSON.parse(colores);
        }

        await TenantService.updateTenant(tenantId, {
            nombre,
            direccion,
            telefono,
            config: newConfig
        });

        res.json({ success: true, message: 'Perfil actualizado correctamente. Recarga la página para ver los cambios de color.' });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
