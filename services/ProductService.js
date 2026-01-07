/**
 * ProductService - Business logic layer for products
 * Handles product business logic and validation
 * Related to: routes/productos.js, repositories/ProductRepository.js
 */

const ProductRepository = require('../repositories/ProductRepository');
const CategoryRepository = require('../repositories/CategoryRepository');

class ProductService {
    /**
     * Get all products with categories for view rendering
     * @returns {Promise<Object>} Object with products and categories arrays
     */
    static async getAllForView() {
        const productos = await ProductRepository.findAll();
        const categorias = await CategoryRepository.findAllActive();
        return { productos, categorias };
    }

    /**
     * Get product by ID
     * @param {number} id - Product ID
     * @returns {Promise<Object>} Product object
     * @throws {Error} If product not found
     */
    static async getById(id) {
        const producto = await ProductRepository.findById(id);
        if (!producto) {
            throw new Error('Producto no encontrado');
        }
        return producto;
    }

    /**
     * Search products
     * @param {string} query - Search term
     * @returns {Promise<Array>} Array of products
     */
    static async search(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        return await ProductRepository.search(query.trim(), 10);
    }

    /**
     * Create a new product
     * @param {Object} productData - Product data
     * @returns {Promise<Object>} Created product result
     * @throws {Error} If validation fails or duplicate code
     */
    static async create(productData) {
        const { codigo, nombre, precio_unidad, categoria_id } = productData;

        // Validate required fields
        if (!codigo || !nombre) {
            throw new Error('El código y nombre son requeridos');
        }

        // Validate category exists
        if (categoria_id) {
            const category = await CategoryRepository.findById(categoria_id);
            if (!category) {
                throw new Error('Categoría no encontrada');
            }
        }

        try {
            const result = await ProductRepository.create({
                codigo: codigo.trim(),
                nombre: nombre.trim(),
                precio_unidad: parseFloat(precio_unidad) || 0,
                categoria_id: categoria_id || 1
            });

            return {
                id: result.insertId,
                message: 'Producto creado exitosamente'
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya existe un producto con ese código');
            }
            throw error;
        }
    }

    /**
     * Update product by ID
     * @param {number} id - Product ID
     * @param {Object} productData - Product data to update
     * @returns {Promise<Object>} Update result
     * @throws {Error} If product not found or validation fails
     */
    static async update(id, productData) {
        const { codigo, nombre, precio_unidad, categoria_id } = productData;

        // Validate required fields
        if (!codigo || !nombre) {
            throw new Error('El código y nombre son requeridos');
        }

        // Check if product exists
        const existingProduct = await ProductRepository.findById(id);
        if (!existingProduct) {
            throw new Error('Producto no encontrado');
        }

        // Validate category exists
        if (categoria_id) {
            const category = await CategoryRepository.findById(categoria_id);
            if (!category) {
                throw new Error('Categoría no encontrada');
            }
        }

        try {
            const result = await ProductRepository.update(id, {
                codigo: codigo.trim(),
                nombre: nombre.trim(),
                precio_unidad: parseFloat(precio_unidad) || 0,
                categoria_id: categoria_id || 1
            });

            if (result.affectedRows === 0) {
                throw new Error('No se pudo actualizar el producto');
            }

            return { message: 'Producto actualizado exitosamente' };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya existe un producto con ese código');
            }
            throw error;
        }
    }

    /**
     * Delete product by ID
     * @param {number} id - Product ID
     * @returns {Promise<Object>} Delete result
     * @throws {Error} If product not found
     */
    static async delete(id) {
        const producto = await ProductRepository.findById(id);
        if (!producto) {
            throw new Error('Producto no encontrado');
        }

        const result = await ProductRepository.delete(id);
        if (result.affectedRows === 0) {
            throw new Error('No se pudo eliminar el producto');
        }

        return { message: 'Producto eliminado exitosamente' };
    }

    /**
     * Import products from Excel data
     * @param {Array<Object>} rows - Array of product objects from Excel
     * @returns {Promise<Object>} Import result with count
     */
    static async importFromExcel(rows) {
        if (!rows || rows.length === 0) {
            throw new Error('No hay registros válidos para importar');
        }

        // Get category map for name to ID conversion
        const categoryMap = await CategoryRepository.getCategoryMap();

        // Transform rows to include category_id
        const products = rows.map(row => {
            const categoriaId = categoryMap.get(row.categoria.toLowerCase()) || 1; // Default to first category if not found
            return {
                codigo: row.codigo,
                nombre: row.nombre,
                categoria_id: categoriaId,
                precio_unidad: row.precio_unidad
            };
        });

        await ProductRepository.bulkUpsert(products);

        return { inserted: products.length };
    }
}

module.exports = ProductService;

