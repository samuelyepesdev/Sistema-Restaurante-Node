const { validationResult } = require('express-validator');

/**
 * Base Request Handler for Express Validator
 */
class BaseRequest {
    /**
     * Define the validation rules.
     * To be overridden in child classes.
     * @returns {Array} List of express-validator middlewares.
     */
    rules() {
        return [];
    }

    /**
     * Handle the validation errors and pass to the next middleware.
     * @returns {Function} Middleware function.
     */
    static validate(RequestClass) {
        // If RequestClass has static rules method, use it.
        // Otherwise try instance method for backward compatibility.
        let rules = [];
        if (typeof RequestClass.rules === 'function') {
            rules = RequestClass.rules();
        } else {
            const instance = new RequestClass();
            rules = instance.rules();
        }

        return [
            ...rules,
            (req, res, next) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                        return res.status(422).json({
                            success: false,
                            message: 'Validación fallida',
                            errors: errors.array()
                        });
                    }

                    return res.status(400).render('errors/generic', {
                        error: { message: 'Por favor corregí los siguientes errores: ' + errors.array().map(e => e.msg).join(', ') },
                        tenant: req.tenant || null,
                        user: req.user || null
                    });
                }
                next();
            }
        ];
    }
}

module.exports = BaseRequest;
