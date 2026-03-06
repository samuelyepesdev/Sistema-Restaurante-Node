const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreClienteRequest extends BaseRequest {
    rules() {
        return [
            body('nombre')
                .trim()
                .notEmpty().withMessage('El nombre es requerido')
                .isLength({ max: 255 }).withMessage('El nombre no puede exceder los 255 caracteres'),

            body('telefono')
                .optional({ checkFalsy: true })
                .trim()
                .isNumeric().withMessage('El teléfono solo puede contener números'),

            body('email')
                .optional({ checkFalsy: true })
                .trim()
                .isEmail().withMessage('El formato del correo electrónico es inválido'),

            body('tipo_documento')
                .optional({ checkFalsy: true })
                .trim()
                .isIn(['CC', 'NIT', 'CE', 'PA', 'TI', 'PEP']).withMessage('Tipo de documento inválido'),

            body('numero_documento')
                .optional({ checkFalsy: true })
                .trim()
                .isAlphanumeric().withMessage('El número de documento debe ser alfanumérico')
        ];
    }
}

module.exports = StoreClienteRequest;
