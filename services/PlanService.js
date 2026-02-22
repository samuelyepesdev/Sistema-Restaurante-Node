/**
 * PlanService - Lógica de planes de suscripción
 */

const PlanRepository = require('../repositories/PlanRepository');

class PlanService {
    /**
     * Listar todos los planes activos
     * @returns {Promise<Object[]>}
     */
    static async getAll() {
        return PlanRepository.findAll();
    }

    /**
     * Obtener plan por ID
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async getById(id) {
        return PlanRepository.findById(id);
    }

    /**
     * Obtener plan por slug
     * @param {string} slug
     * @returns {Promise<Object|null>}
     */
    static async getBySlug(slug) {
        return PlanRepository.findBySlug(slug);
    }
}

module.exports = PlanService;
