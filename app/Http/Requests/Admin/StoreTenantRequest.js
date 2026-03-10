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

            body('slug').custom((value, { req }) => {
                if (req.method === 'POST' && (!value || value.trim() === '')) {
                    throw new Error('El slug es obligatorio');
                }
                if (value && !/^[a-z0-9-]+$/.test(value)) {
                    throw new Error('El slug solo puede contener letras minúsculas, números y guiones');
                }
                return true;
            }),

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
