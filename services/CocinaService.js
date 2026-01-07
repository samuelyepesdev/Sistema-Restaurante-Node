/**
 * CocinaService - Business logic layer for kitchen
 * Handles kitchen queue business logic
 * Related to: routes/cocina.js, repositories/CocinaRepository.js
 */

const CocinaRepository = require('../repositories/CocinaRepository');

class CocinaService {
    /**
     * Get kitchen queue
     * @returns {Promise<Array>} Array of kitchen items
     */
    static async getQueue() {
        return await CocinaRepository.getQueue();
    }

    /**
     * Update item state in kitchen
     * @param {number} id - Item ID
     * @param {string} estado - New state ('preparando' or 'listo')
     * @returns {Promise<Object>} Update result
     * @throws {Error} If invalid state or item not found
     */
    static async updateItemEstado(id, estado) {
        const permitidos = ['preparando', 'listo'];
        if (!permitidos.includes(estado)) {
            throw new Error('Estado inválido');
        }

        const result = await CocinaRepository.updateItemEstado(id, estado);
        if (result.affectedRows === 0) {
            throw new Error('Item no encontrado o en estado no válido');
        }

        return { message: 'Estado actualizado' };
    }
}

module.exports = CocinaService;

