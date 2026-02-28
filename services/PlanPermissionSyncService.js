/**
 * Sincroniza permisos del plan con los administradores del tenant.
 * Solo se aplica a usuarios con rol "admin" (administrador del tenant/restaurante).
 * - Al subir de plan (ej. a Pro/Premium): se les asignan los permisos que incluye el plan (si no los tienen).
 * - Al bajar de plan (ej. a Básico): se les quitan los permisos que el plan ya no incluye.
 */

const { getPermissionNamesForModule } = require('../utils/planPermissions');
const PermisoRepository = require('../repositories/PermisoRepository');
const PlanService = require('../services/PlanService');
const { ROLES } = require('../utils/constants');

/**
 * Obtiene los nombres de permisos que implica un plan (según sus módulos).
 * @param {Object|null} plan - Plan con .caracteristicas (array de slugs)
 * @returns {string[]}
 */
function getPermissionNamesForPlan(plan) {
    if (!plan || !Array.isArray(plan.caracteristicas)) return [];
    const names = new Set();
    for (const moduleSlug of plan.caracteristicas) {
        const perms = getPermissionNamesForModule(moduleSlug);
        perms.forEach(p => names.add(p));
    }
    return [...names];
}

/**
 * Indica si el usuario es administrador del tenant (rol admin).
 * @param {string} rolNombre - nombre del rol del usuario
 * @returns {boolean}
 */
function isAdminDelTenant(rolNombre) {
    return String(rolNombre || '').toLowerCase() === ROLES.ADMIN.toLowerCase();
}

/**
 * Sincroniza permisos del plan solo con los administradores del tenant.
 * - Si el plan incluye un permiso que el admin no tiene → se le asigna.
 * - Si el plan no incluye un permiso que el admin tiene → se le quita (bajada de plan).
 * Solo se tocan usuarios con rol "admin".
 * @param {number} tenantId
 * @param {number} planId - ID del plan nuevo (para cargar caracteristicas)
 */
async function syncPlanPermissionsToTenantUsers(tenantId, planId) {
    const plan = await PlanService.getById(planId);
    if (!plan) return;

    const permissionNames = getPermissionNamesForPlan(plan);
    const planPermisoIds = await PermisoRepository.getPermisoIdsByNames(permissionNames);

    const users = await PermisoRepository.getUsuariosByTenantId(tenantId);
    const admins = (users || []).filter(u => isAdminDelTenant(u.rol_nombre));
    if (admins.length === 0) return;

    for (const u of admins) {
        await PermisoRepository.setPermisosForUser(u.id, [...planPermisoIds]);
    }
}

module.exports = {
    getPermissionNamesForPlan,
    syncPlanPermissionsToTenantUsers
};
