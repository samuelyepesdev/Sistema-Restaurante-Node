/**
 * Middleware que exige que el plan del tenant incluya un módulo/característica.
 * Debe usarse después de requireAuth y del middleware que asigna req.tenant (attachTenantContext o costeoTenantContext).
 * Superadmin siempre pasa. Si el tenant no tiene plan, se permite (compatibilidad).
 */

const { planHasModule } = require('../utils/planPermissions');

/**
 * @param {string} featureSlug - Slug del módulo en el plan (ej: 'costeo', 'productos', 'analitica')
 * @returns {function} middleware
 */
function requirePlanFeature(featureSlug) {
    return (req, res, next) => {
        const rol = req.user && String(req.user.rol || '').toLowerCase();
        if (rol === 'superadmin') {
            return next();
        }
        const tenant = req.tenant;
        if (!tenant) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(403).json({ error: 'Tu plan no incluye esta función. Contacta al administrador para actualizar.' });
            }
            return res.status(403).render('error', { error: { message: 'Tu plan no incluye esta función. Contacta al administrador para actualizar.' } });
        }
        const plan = tenant.plan || null;
        if (!planHasModule(plan, featureSlug)) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(403).json({ error: 'Tu plan no incluye esta función. Contacta al administrador para actualizar.' });
            }
            return res.status(403).render('error', { error: { message: 'Tu plan no incluye esta función. Contacta al administrador para actualizar.' } });
        }
        next();
    };
}

module.exports = { requirePlanFeature };
