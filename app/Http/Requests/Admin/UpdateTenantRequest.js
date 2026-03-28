const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class UpdateTenantRequest extends BaseRequest {
    static rules() {
        return [
            body('nombre')
                .optional({ checkFalsy: true })
                .notEmpty().withMessage('El nombre no puede estar vacío')
                .trim()
                .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),

            body('email')
                .optional({ checkFalsy: true })
                .isEmail().withMessage('Correo electrónico inválido'),

            body('slug')
                .optional({ checkFalsy: true })
                .custom((value) => {
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

module.exports = UpdateTenantRequest;
