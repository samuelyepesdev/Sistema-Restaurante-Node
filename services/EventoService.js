/**
 * EventoService - Business logic for events
 */

const EventoRepository = require('../repositories/EventoRepository');

class EventoService {
    static async list(tenantId, filters = {}) {
        return await EventoRepository.findAllByTenant(tenantId, filters);
    }

    static async getById(id, tenantId) {
        return await EventoRepository.findById(id, tenantId);
    }

    static async getActiveForDate(tenantId, date) {
        return await EventoRepository.findActiveByDate(tenantId, date);
    }

    static async create(tenantId, data) {
        if (!data.nombre || !data.fecha_inicio || !data.fecha_fin) {
            throw new Error('Nombre, fecha inicio y fecha fin son obligatorios.');
        }
        if (new Date(data.fecha_fin) < new Date(data.fecha_inicio)) {
            throw new Error('La fecha fin debe ser mayor o igual a la fecha inicio.');
        }
        return await EventoRepository.create(tenantId, data);
    }

    static async update(id, tenantId, data) {
        const event = await EventoRepository.findById(id, tenantId);
        if (!event) throw new Error('Evento no encontrado.');
        if (data.fecha_fin && data.fecha_inicio && new Date(data.fecha_fin) < new Date(data.fecha_inicio)) {
            throw new Error('La fecha fin debe ser mayor o igual a la fecha inicio.');
        }
        await EventoRepository.update(id, tenantId, data);
    }

    static async delete(id, tenantId) {
        const ok = await EventoRepository.delete(id, tenantId);
        if (!ok) throw new Error('Evento no encontrado.');
    }
}

module.exports = EventoService;
