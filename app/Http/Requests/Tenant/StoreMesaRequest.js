const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreMesaRequest extends BaseRequest {
    /**
     * Define validation rules for creating/updating a table
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('numero')
                .notEmpty().withMessage('El número de mesa es obligatorio')
                .trim()
                .isLength({ max: 10 }).withMessage('El número de mesa no puede exceder 10 caracteres'),

            body('descripcion')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('La descripción no puede exceder 100 caracteres'),

            body('capacidad')
                .optional()
                .isNumeric().withMessage('La capacidad debe ser numérica')
                .custom(value => {
                    if (parseInt(value) <= 0) {
                        throw new Error('La capacidad debe ser mayor a 0');
                    }
                    return true;
                })
        ];
    }
}

module.exports = StoreMesaRequest;
