/**
 * Admin Sistema - Temas y parámetros por restaurante (solo superadmin)
 * El superadmin elige el restaurante (tenant) y crea/gestiona temas y parámetros para ese tenant.
 */

const express = require('express');
const router = express.Router();
const TenantService = require('../../services/TenantService');
const TemaService = require('../../services/TemaService');
const ParametroService = require('../../services/ParametroService');
const { ROLES } = require('../../utils/constants');
const authService = require('../../services/AuthService');

function requireSuperadmin(req, res, next) {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
}

function getTenantId(req) {
    const id = req.query.tenant_id || req.body.tenant_id;
    const num = id != null ? parseInt(id, 10) : null;
    if (!num) throw new Error('Seleccioná un restaurante (tenant_id requerido).');
    return num;
}

router.use(requireSuperadmin);

async function renderSistemaPage(req, res) {
    try {
        const tenants = await TenantService.getAllTenants();
        const tenantId = req.query.tenant_id ? parseInt(req.query.tenant_id, 10) : (tenants[0] && tenants[0].id);
        const activeTenant = tenants.find(t => t.id === tenantId) || null;
        res.render('admin/sistema', {
            user: req.user,
            tenants: tenants || [],
            activeTenantId: tenantId || null,
            activeTenant
        });
    } catch (error) {
        console.error('Error al cargar Sistema:', error);
        res.status(500).render('errors/internal', { error: { message: error.message } });
    }
}

// GET /admin/sistema - Página Sistema (temas y parámetros)
router.get('/', renderSistemaPage);
router.get('', renderSistemaPage);

// --- API Temas (siempre con ?tenant_id= o body.tenant_id) ---
router.get('/api/temas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await TemaService.list(tenantId);
        res.json(list);
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        console.error('Error al listar temas:', error);
        res.status(500).json({ error: error.message || 'Error al listar temas' });
    }
});

router.get('/api/temas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const tema = await TemaService.getById(id, tenantId);
        if (!tema) return res.status(404).json({ error: 'Tema no encontrado' });
        res.json(tema);
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error' });
    }
});

router.post('/api/temas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = await TemaService.create(tenantId, req.body);
        res.status(201).json({ id, message: 'Tema creado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error al crear tema' });
    }
});

router.put('/api/temas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await TemaService.update(id, tenantId, req.body);
        res.json({ message: 'Tema actualizado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        if (error.message === 'Tema no encontrado') return res.status(404).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error' });
    }
});

router.delete('/api/temas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await TemaService.delete(id, tenantId);
        res.json({ message: 'Tema eliminado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        if (error.message === 'Tema no encontrado') return res.status(404).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error' });
    }
});

router.get('/api/temas/:id/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const temaId = parseInt(req.params.id, 10);
        const list = await ParametroService.getByTemaId(temaId, tenantId);
        res.json(list);
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error' });
    }
});

router.put('/api/temas/:id/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const temaId = parseInt(req.params.id, 10);
        await TemaService.setParametros(temaId, tenantId, req.body.parametro_ids || []);
        res.json({ message: 'Parámetros del tema actualizados' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error' });
    }
});

// --- API Parámetros ---
router.get('/api/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await ParametroService.list(tenantId);
        res.json(list);
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error al listar parámetros' });
    }
});

router.get('/api/parametros/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const param = await ParametroService.getById(id, tenantId);
        if (!param) return res.status(404).json({ error: 'Parámetro no encontrado' });
        res.json(param);
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error' });
    }
});

router.post('/api/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = await ParametroService.create(tenantId, req.body);
        res.status(201).json({ id, message: 'Parámetro creado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error al crear parámetro' });
    }
});

router.put('/api/parametros/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await ParametroService.update(id, tenantId, req.body);
        res.json({ message: 'Parámetro actualizado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        if (error.message === 'Parámetro no encontrado') return res.status(404).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error' });
    }
});

router.delete('/api/parametros/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await ParametroService.delete(id, tenantId);
        res.json({ message: 'Parámetro eliminado' });
    } catch (error) {
        if (error.message && error.message.includes('tenant_id')) return res.status(400).json({ error: error.message });
        if (error.message === 'Parámetro no encontrado') return res.status(404).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error' });
    }
});

module.exports = router;
