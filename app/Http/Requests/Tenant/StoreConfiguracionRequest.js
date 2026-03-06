const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreConfiguracionRequest extends BaseRequest {
    /**
     * Define validation rules for tenant configuration
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('nombre_restaurante')
                .notEmpty().withMessage('El nombre del restaurante es obligatorio')
                .trim()
                .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),

            body('direccion')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 200 }).withMessage('La dirección no puede exceder 200 caracteres'),

            body('telefono')
                .optional({ checkFalsy: true })
                .trim(),

            body('prefijo_factura')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 10 }).withMessage('El prefijo de factura no puede exceder 10 caracteres'),

            body('resolucion_dian')
                .optional({ checkFalsy: true })
                .trim(),

            body('propina_sugerida')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('La propina sugerida debe ser un número')
                .custom(value => {
                    const p = parseFloat(value);
                    if (p < 0 || p > 100) {
                        throw new Error('La propina debe estar entre 0% y 100%');
                    }
                    return true;
                })
        ];
    }
}

module.exports = StoreConfiguracionRequest;
