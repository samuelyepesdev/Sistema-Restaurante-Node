const EventoService = require('../../../../services/EventoService');

class EventosController {
    // GET /eventos
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
            const eventos = await EventoService.listWithVentasResumen(tenantId);
            res.render('eventos/index', {
                eventos,
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error listando eventos:', error);
            res.status(500).render('errors/internal', { error, user: req.user });
        }
    }

    // GET /eventos/activos
    static async listActivos(req, res) {
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
    }

    // POST /eventos
    static async store(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            const id = await EventoService.create(tenantId, req.body);
            return res.status(201).json({ id, message: 'Evento creado' });
        } catch (error) {
            console.error('Error creando evento:', error);
            res.status(400).json({ error: error.message || 'Error al crear evento' });
        }
    }

    // PUT /eventos/:id
    static async update(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            await EventoService.update(req.params.id, tenantId, req.body);
            res.status(200).json({ message: 'Evento actualizado' });
        } catch (error) {
            console.error('Error actualizando evento:', error);
            res.status(400).json({ error: error.message || 'Error al actualizar' });
        }
    }

    // DELETE /eventos/:id
    static async destroy(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            await EventoService.delete(req.params.id, tenantId);
            res.status(200).json({ message: 'Evento eliminado' });
        } catch (error) {
            console.error('Error eliminando evento:', error);
            res.status(400).json({ error: error.message || 'Error al eliminar' });
        }
    }
}

module.exports = EventosController;
