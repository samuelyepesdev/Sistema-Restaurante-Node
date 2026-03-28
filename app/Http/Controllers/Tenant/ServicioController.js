/**
 * ServicioController - CRUD Operations for services
 * Management of external and internal services
 * Related to: repositories/Tenant/ServicioRepository.js
 */

const ServicioRepository = require('../../../../repositories/Tenant/ServicioRepository');

class ServicioController {
    /**
     * Display a listing of services
     */
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const filters = { q: req.query.q };
            const servicios = await ServicioRepository.findAll(tenantId, filters);
            const stats = await ServicioRepository.getEstadisticas(tenantId);
            
            res.render('servicios/index', {
                servicios,
                stats,
                q: req.query.q || '',
                user: req.user,
                tenant: req.tenant,
                allowedByPlan: res.locals.allowedByPlan || {}
            });
        } catch (error) {
            console.error('Error listing services:', error);
            res.status(500).render('errors/internal', { error, user: req.user });
        }
    }

    /**
     * Store a newly created service in storage
     */
    static async store(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const data = {
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: parseFloat(req.body.precio) || 0,
                es_externo: req.body.es_externo === 'on' || req.body.es_externo === true,
                activo: req.body.activo === 'on' || req.body.activo === true
            };

            if (!data.nombre) {
                return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
            }

            await ServicioRepository.create(tenantId, data);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Servicio creado correctamente' });
            }
            
            res.redirect('/servicios');
        } catch (error) {
            console.error('Error storing service:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ success: false, message: 'Error al crear el servicio' });
            }
            res.status(500).render('errors/internal', { error, user: req.user });
        }
    }

    /**
     * Update the specified service in storage
     */
    static async update(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const id = req.params.id;
            const data = {
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: parseFloat(req.body.precio) || 0,
                es_externo: req.body.es_externo === 'on' || req.body.es_externo === true,
                activo: req.body.activo === 'on' || req.body.activo === true
            };

            const result = await ServicioRepository.update(id, tenantId, data);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Servicio actualizado correctamente' });
            }
            
            res.redirect('/servicios');
        } catch (error) {
            console.error('Error updating service:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ success: false, message: 'Error al actualizar el servicio' });
            }
            res.status(500).render('errors/internal', { error, user: req.user });
        }
    }

    /**
     * Remove the specified service from storage
     */
    static async destroy(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const id = req.params.id;
            
            await ServicioRepository.delete(id, tenantId);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Servicio eliminado correctamente' });
            }
            
            res.redirect('/servicios');
        } catch (error) {
            console.error('Error deleting service:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ success: false, message: 'Error al eliminar el servicio' });
            }
            res.status(500).render('errors/internal', { error, user: req.user });
        }
    }

    /**
     * API: List active services for modals
     */
    static async listActive(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const servicios = await ServicioRepository.findAll(tenantId, { activo: 1 });
            res.json(servicios);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener servicios activos' });
        }
    }
}

module.exports = ServicioController;
