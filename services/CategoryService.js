/**
 * CategoryService - Business logic layer for categories
 * Handles category business logic
 * Related to: routes/productos.js, repositories/CategoryRepository.js
 */

const CategoryRepository = require('../repositories/CategoryRepository');

class CategoryService {
    /**
     * Get all active categories
     * @returns {Promise<Array>} Array of categories
     */
    static async getAllActive() {
        return await CategoryRepository.findAllActive();
    }
}

module.exports = CategoryService;

