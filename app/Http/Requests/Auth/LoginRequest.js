const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class LoginRequest extends BaseRequest {
    /**
     * Define validation rules for login
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('username')
                .notEmpty().withMessage('El nombre de usuario es requerido')
                .trim(),

            body('password')
                .notEmpty().withMessage('La contraseña es requerida')
        ];
    }
}

module.exports = LoginRequest;
