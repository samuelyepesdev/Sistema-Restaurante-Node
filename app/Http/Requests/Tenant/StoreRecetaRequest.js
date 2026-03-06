const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreRecetaRequest extends BaseRequest {
    /**
     * Define validation rules for creating/updating a recipe
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('producto_id')
                .notEmpty().withMessage('El producto es obligatorio')
                .isInt().withMessage('ID de producto inválido'),

            body('nombre_receta')
                .notEmpty().withMessage('El nombre de la receta es obligatorio')
                .trim()
                .isLength({ max: 100 }).withMessage('El nombre no puede exceder los 100 caracteres'),

            body('porciones')
                .optional()
                .isNumeric().withMessage('Las porciones deben ser numéricas')
                .custom(value => {
                    if (parseFloat(value) <= 0) {
                        throw new Error('Las porciones deben ser mayores a 0');
                    }
                    return true;
                }),

            body('ingredientes')
                .optional()
                .isArray().withMessage('Los ingredientes deben ser un arreglo'),

            body('ingredientes.*.insumo_id')
                .if(body('ingredientes').exists())
                .notEmpty().withMessage('ID de insumo requerido')
                .isInt().withMessage('ID de insumo inválido'),

            body('ingredientes.*.cantidad')
                .if(body('ingredientes').exists())
                .notEmpty().withMessage('Cantidad requerida')
                .isNumeric().withMessage('La cantidad debe ser numérica')
                .custom(value => {
                    if (parseFloat(value) <= 0) {
                        throw new Error('La cantidad debe ser mayor a 0');
                    }
                    return true;
                })
        ];
    }
}

module.exports = StoreRecetaRequest;
