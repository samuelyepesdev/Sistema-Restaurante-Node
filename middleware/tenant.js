/**
 * Tenant middleware - Attaches tenant context after authentication.
 * Must run after requireAuth. Validates tenant exists and is active.
 * Sets req.tenant and req.user.tenant_id for use in services/repos.
 */

const TenantRepository = require('../repositories/TenantRepository');

/**
 * Resolve tenant for the current user and attach to request.
 * - Uses req.user.tenant_id from JWT; if missing, falls back to default tenant (principal).
 * - Validates tenant exists and is active.
 * - Sets req.tenant (full tenant object with config) for views and services.
 */
async function attachTenantContext(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        let tenantId = req.user.tenant_id;

        // If user has no tenant_id (old token or legacy user), use default tenant
        if (tenantId == null || tenantId === undefined) {
            const defaultTenant = await TenantRepository.getDefault();
            if (!defaultTenant) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({ error: 'No hay tenant configurado' });
                }
                return res.status(403).render('error', { error: { message: 'No hay tenant configurado' } });
            }
            tenantId = defaultTenant.id;
            req.user.tenant_id = tenantId;
        }

        const tenant = await TenantRepository.findById(tenantId);
        if (!tenant) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ error: 'Tenant no encontrado' });
            }
            res.clearCookie('auth_token');
            return res.redirect('/auth/login?mensaje=' + encodeURIComponent('Restaurante no encontrado. Contacta al administrador.'));
        }

        if (!tenant.activo) {
            const msg = 'Tu restaurante "' + (tenant.nombre || '') + '" está desactivado. Contacta al administrador.';
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                res.clearCookie('auth_token');
                return res.status(403).json({ error: msg, redirect: '/auth/login' });
            }
            res.clearCookie('auth_token');
            return res.redirect('/auth/login?mensaje=' + encodeURIComponent(msg));
        }

        req.tenant = tenant;
        res.locals.tenant = tenant;
        next();
    } catch (error) {
        console.error('Error en attachTenantContext:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error al cargar contexto del tenant' });
        }
        res.status(500).render('error', { error: { message: 'Error al cargar contexto del tenant' } });
    }
}

module.exports = {
    attachTenantContext
};
