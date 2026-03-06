const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreTenantRequest extends BaseRequest {
    /**
     * Define validation rules for creating/updating a tenant (restaurant)
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('nombre')
                .notEmpty().withMessage('El nombre del restaurante es obligatorio')
                .trim()
                .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),

            body('email')
                .notEmpty().withMessage('El correo electrónico es obligatorio')
                .isEmail().withMessage('Correo electrónico inválido'),

            body('slug')
                .if(body().custom((_, { req }) => req.method === 'POST'))
                .notEmpty().withMessage('El slug es obligatorio')
                .matches(/^[a-z0-9-]+$/).withMessage('El slug solo puede contener letras minúsculas, números y guiones')
                .isLength({ max: 50 }).withMessage('El slug no puede exceder 50 caracteres'),

            body('plan_id')
                .optional({ checkFalsy: true })
                .isInt().withMessage('ID de plan inválido'),

            body('nit')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 30 }).withMessage('El NIT no puede exceder 30 caracteres')
        ];
    }
}

module.exports = StoreTenantRequest;
