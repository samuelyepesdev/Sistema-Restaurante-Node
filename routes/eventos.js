/**
 * Eventos - CRUD de eventos por tenant. Acceso solo con permiso eventos.ver / eventos.crear / etc.
 * Las ventas asociadas a un evento no afectan el análisis predictivo.
 */

const express = require('express');
const router = express.Router();
const EventoService = require('../services/EventoService');
const { requirePermission } = require('../middleware/auth');

// GET /eventos - Lista (requiere eventos.ver)
router.get('/', requirePermission('eventos.ver'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });
        const eventos = await EventoService.list(tenantId);
        res.render('eventos', {
            eventos,
            user: req.user,
            tenant: req.tenant
        });
    } catch (error) {
        console.error('Error listando eventos:', error);
        res.status(500).render('error', { error, user: req.user });
    }
});

// GET /eventos/activos - Lista activos para selector (API, requiere eventos.ver o ventas_evento.realizar)
router.get('/activos', requirePermission('eventos.ver', 'ventas_evento.realizar'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
        const eventos = await EventoService.list(tenantId, { activo: true });
        const activosEnFecha = eventos.filter(e => {
            const d = fecha.slice(0, 10);
            return d >= e.fecha_inicio && d <= e.fecha_fin;
        });
        res.json(activosEnFecha.map(e => ({ id: e.id, nombre: e.nombre })));
    } catch (error) {
        console.error('Error listando eventos activos:', error);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
});

// POST /eventos - Crear (requiere eventos.crear)
router.post('/', requirePermission('eventos.crear'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        const id = await EventoService.create(tenantId, req.body);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(201).json({ id, message: 'Evento creado' });
        }
        res.redirect('/eventos');
    } catch (error) {
        console.error('Error creando evento:', error);
        res.status(400).json({ error: error.message || 'Error al crear evento' });
    }
});

// PUT /eventos/:id - Actualizar (requiere eventos.editar)
router.put('/:id', requirePermission('eventos.editar'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        await EventoService.update(req.params.id, tenantId, req.body);
        res.status(200).json({ message: 'Evento actualizado' });
    } catch (error) {
        console.error('Error actualizando evento:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar' });
    }
});

// DELETE /eventos/:id - Eliminar (requiere eventos.eliminar)
router.delete('/:id', requirePermission('eventos.eliminar'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        await EventoService.delete(req.params.id, tenantId);
        res.status(200).json({ message: 'Evento eliminado' });
    } catch (error) {
        console.error('Error eliminando evento:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar' });
    }
});

module.exports = router;
