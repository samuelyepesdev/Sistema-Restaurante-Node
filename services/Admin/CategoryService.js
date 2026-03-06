/**
 * CategoryService - Business logic layer for categories
 * Handles category business logic
 * Related to: routes/productos.js, repositories/CategoryRepository.js
 */

const CategoryRepository = require('../../repositories/Admin/CategoryRepository');

/** Categorías por defecto para pastelería/panadería */
const CATEGORIAS_REPOSTERIA = [
    { nombre: 'Pasteles', descripcion: 'Tortas y pasteles' },
    { nombre: 'Bollería', descripcion: 'Bollos, croissants, panecillos dulces' },
    { nombre: 'Repostería seca', descripcion: 'Galletas, bizcochos, mantecadas' },
    { nombre: 'Pastelería fría', descripcion: 'Postres fríos, mousses, cheesecake' },
    { nombre: 'Productos de temporada', descripcion: 'Productos especiales por temporada' }
];

/** Categorías por defecto para restaurante / comidas rápidas */
const CATEGORIAS_RESTAURANTE = [
    { nombre: 'Bebidas', descripcion: 'Bebidas frías y calientes' },
    { nombre: 'Postres', descripcion: 'Dulces y postres' },
    { nombre: 'Comidas', descripcion: 'Platos principales y comidas' },
    { nombre: 'Acompañamientos', descripcion: 'Acompañamientos y guarniciones' },
    { nombre: 'Extras', descripcion: 'Extras y adicionales' }
];

class CategoryService {
    /**
     * Get all active categories
     * @returns {Promise<Array>} Array of categories
     */
    static async getAllActive(tenantId) {
        return await CategoryRepository.findAllActive(tenantId);
    }

    /**
     * Seed default categories for a tenant according to business type.
     * Only inserts categories that do not already exist (by name) for that tenant.
     * @param {number} tenantId - Tenant ID
     * @param {string} tipoNegocio - 'panaderia' | 'pasteleria' | 'restaurante' | 'comidas_rapidas' | other
     * @returns {Promise<{ inserted: number }>}
     */
    static async seedDefaultCategories(tenantId, tipoNegocio) {
        const isReposteria = tipoNegocio === 'panaderia' || tipoNegocio === 'pasteleria';
        const list = isReposteria ? CATEGORIAS_REPOSTERIA : CATEGORIAS_RESTAURANTE;
        let inserted = 0;
        for (const cat of list) {
            const existing = await CategoryRepository.findByName(cat.nombre, tenantId);
            if (!existing) {
                await CategoryRepository.create(tenantId, { nombre: cat.nombre, descripcion: cat.descripcion });
                inserted++;
            }
        }
        return { inserted };
    }
}

module.exports = CategoryService;
module.exports.CATEGORIAS_REPOSTERIA = CATEGORIAS_REPOSTERIA;
module.exports.CATEGORIAS_RESTAURANTE = CATEGORIAS_RESTAURANTE;

