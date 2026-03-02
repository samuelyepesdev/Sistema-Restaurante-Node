/**
 * Panel superadmin: listar y eliminar ventas (facturas) de cualquier restaurante.
 * Solo superadmin.
 */

const express = require('express');
const router = express.Router();
const authService = require('../../services/AuthService');
const TenantService = require('../../services/TenantService');
const VentaService = require('../../services/VentaService');
const FacturaRepository = require('../../repositories/FacturaRepository');
const { ROLES } = require('../../utils/constants');

router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET /admin/ventas - Página: selector restaurante y listado de ventas para eliminar
router.get('/', async (req, res) => {
    try {
        const tenants = await TenantService.getAllTenants();
        const activeTenantId = Number(req.query.tenantId) || (tenants[0] && tenants[0].id) || null;
        let ventas = [];
        if (activeTenantId) {
            ventas = await VentaService.getWithFilters(activeTenantId, {
                desde: req.query.desde || undefined,
                hasta: req.query.hasta || undefined,
                q: req.query.q || undefined
            });
        }
        res.render('admin/ventas', {
            user: req.user,
            tenants,
            ventas,
            activeTenantId
        });
    } catch (error) {
        console.error('Error al cargar ventas admin:', error);
        res.status(500).render('errors/internal', { error });
    }
});

// DELETE /admin/ventas/:id - Eliminar una factura (solo superadmin)
router.delete('/:id', async (req, res) => {
    try {
        const facturaId = parseInt(req.params.id);
        if (!facturaId) return res.status(400).json({ error: 'ID inválido' });
        const result = await FacturaRepository.deleteById(facturaId);
        if (!result.deleted) return res.status(404).json({ error: 'Venta no encontrada' });
        res.json({ success: true, message: 'Venta eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar venta:', error);
        res.status(500).json({ error: error.message || 'Error al eliminar' });
    }
});

module.exports = router;
