const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class ChangePasswordRequest extends BaseRequest {
    /**
     * Define validation rules for changing password
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('currentPassword')
                .notEmpty().withMessage('La contraseña actual es requerida'),

            body('newPassword')
                .notEmpty().withMessage('La nueva contraseña es requerida')
                .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),

            body('newPasswordConfirm')
                .notEmpty().withMessage('Debe confirmar la nueva contraseña')
                .custom((value, { req }) => {
                    if (value !== req.body.newPassword) {
                        throw new Error('La confirmación no coincide con la nueva contraseña');
                    }
                    return true;
                })
        ];
    }
}

module.exports = ChangePasswordRequest;
