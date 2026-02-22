/**
 * Relación entre planes (características/módulos) y permisos.
 * Cada permiso se asocia a un módulo del plan; el tenant solo tiene acceso si su plan incluye ese módulo.
 */

// Módulo del plan requerido para cada permiso (slug de característica en tabla planes)
const PERMISSION_TO_MODULE = {
    'productos.ver': 'productos',
    'productos.crear': 'productos',
    'productos.editar': 'productos',
    'productos.eliminar': 'productos',
    'productos.importar': 'importar_exportar',
    'clientes.ver': 'clientes',
    'clientes.crear': 'clientes',
    'clientes.editar': 'clientes',
    'clientes.eliminar': 'clientes',
    'mesas.ver': 'mesas',
    'mesas.gestionar': 'mesas',
    'cocina.ver': 'mesas',
    'cocina.gestionar': 'mesas',
    'ventas.ver': 'ventas',
    'ventas.exportar': 'importar_exportar',
    'facturas.ver': 'ventas',
    'facturas.crear': 'ventas',
    'configuracion.ver': 'configuracion',
    'configuracion.editar': 'configuracion',
    'costeo.ver': 'costeo',
    'costeo.editar': 'costeo',
    'usuarios.ver': 'configuracion',
    'usuarios.gestionar': 'configuracion',
    'plantillas.ver': 'plantillas',
    'analitica.ver': 'analitica',
    'prediccion.ver': 'prediccion_ml'
};

// Módulos que se usan en navbar / rutas (para allowedByPlan)
const PLAN_MODULES = [
    'productos', 'clientes', 'mesas', 'ventas', 'dashboard', 'configuracion',
    'plantillas', 'importar_exportar', 'costeo', 'analitica', 'prediccion_ml'
];

/**
 * Indica si el plan permite un permiso concreto.
 * @param {Object|null} plan - Objeto plan con .caracteristicas (array de strings)
 * @param {string} permission - Ej: 'costeo.ver'
 * @returns {boolean} true si no hay plan (acceso por defecto) o si el plan incluye el módulo del permiso
 */
function planAllowsPermission(plan, permission) {
    if (!plan || !plan.caracteristicas) return true;
    const moduleSlug = PERMISSION_TO_MODULE[permission];
    if (!moduleSlug) return true;
    return Array.isArray(plan.caracteristicas) && plan.caracteristicas.includes(moduleSlug);
}

/**
 * Indica si el plan incluye un módulo (por slug).
 * @param {Object|null} plan
 * @param {string} moduleSlug - Ej: 'costeo', 'productos'
 * @returns {boolean}
 */
function planHasModule(plan, moduleSlug) {
    if (!plan || !plan.caracteristicas) return true;
    return Array.isArray(plan.caracteristicas) && plan.caracteristicas.includes(moduleSlug);
}

/**
 * Objeto { productos: true, clientes: true, costeo: false, ... } según el plan.
 * Se usa en vistas (navbar) para mostrar u ocultar por plan.
 * @param {Object|null} plan
 * @returns {Object}
 */
function getAllowedByPlan(plan) {
    const out = {};
    PLAN_MODULES.forEach(m => {
        out[m] = planHasModule(plan, m);
    });
    return out;
}

module.exports = {
    PERMISSION_TO_MODULE,
    PLAN_MODULES,
    planAllowsPermission,
    planHasModule,
    getAllowedByPlan
};
