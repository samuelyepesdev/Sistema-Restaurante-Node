/**
 * CosteoService - Calculation of dish cost, indirect cost, suggested price
 * Related to: RecetaRepository, ConfiguracionCosteoRepository
 */

const RecetaRepository = require('../repositories/RecetaRepository');
const ConfiguracionCosteoRepository = require('../repositories/ConfiguracionCosteoRepository');

const UNIDADES_A_KG = { g: 0.001, kg: 1, lb: 0.453592, ml: 0.001, L: 1, l: 1, und: 1, UND: 1 };

function cantidadEnUnidadCompra(cantidad, unidadReceta, unidadCompra) {
    const uCompra = (unidadCompra || 'UND').toLowerCase();
    const uReceta = (unidadReceta || 'g').toLowerCase();
    if (uCompra === uReceta || (uCompra === 'und' && uReceta === 'und')) return cantidad;
    if (uCompra === 'kg' && (uReceta === 'g' || uReceta === 'gr')) return cantidad / 1000;
    if (uCompra === 'g' && (uReceta === 'kg')) return cantidad * 1000;
    if (uCompra === 'l' && (uReceta === 'ml')) return cantidad / 1000;
    if (uCompra === 'ml' && (uReceta === 'l')) return cantidad * 1000;
    if (uCompra === 'lb' && uReceta === 'g') return cantidad / 453.592;
    if (uCompra === 'g' && uReceta === 'lb') return cantidad * 453.592;
    return cantidad;
}

/**
 * Costo directo de una receta (por porción) = suma de (cantidad × costo unitario) de cada ingrediente
 * Las cantidades se convierten a la unidad de compra del insumo.
 */
function calcularCostoDirecto(ingredientes) {
    let total = 0;
    for (const it of ingredientes || []) {
        const cantidad = parseFloat(it.cantidad) || 0;
        const costoUnit = parseFloat(it.costo_unitario) || 0;
        const unidadReceta = (it.unidad || 'g').trim().toLowerCase();
        const unidadCompra = (it.unidad_compra || 'UND').trim().toLowerCase();
        const factor = cantidadEnUnidadCompra(1, unidadReceta, unidadCompra);
        const cantidadEnUnidad = cantidad * (cantidadEnUnidadCompra(cantidad, unidadReceta, unidadCompra) / (cantidad || 1));
        const cantidadConvertida = cantidadEnUnidadCompra(cantidad, unidadReceta, unidadCompra);
        total += cantidadConvertida * costoUnit;
    }
    return Math.round(total * 100) / 100;
}

/**
 * Costo indirecto según configuración: porcentaje, costo fijo por porción, o factor.
 * Para "factor" no se suma indirecto; el factor se aplica al costo directo para obtener precio.
 */
function calcularCostoIndirecto(costoDirecto, config) {
    if (!config) return 0;
    const metodo = config.metodo_indirectos || 'porcentaje';
    if (metodo === 'porcentaje') {
        const pct = parseFloat(config.porcentaje_indirectos) || 0;
        return Math.round((costoDirecto * pct / 100) * 100) / 100;
    }
    if (metodo === 'costo_fijo') {
        const fijo = parseFloat(config.costo_fijo_mensual) || 0;
        const platos = parseInt(config.platos_estimados_mes, 10) || 500;
        return platos > 0 ? Math.round((fijo / platos) * 100) / 100 : 0;
    }
    return 0;
}

/**
 * Precio sugerido: con margen objetivo = costo_total / (1 - margen/100)
 * O con factor: costo_directo * factor (si método factor).
 */
function calcularPrecioSugerido(costoTotal, config) {
    if (!config) return costoTotal * 2;
    const metodo = config.metodo_indirectos || 'porcentaje';
    const margen = parseFloat(config.margen_objetivo_default) || 60;
    if (metodo === 'factor') {
        const factor = parseFloat(config.factor_carga) || 2.5;
        return Math.round(costoTotal * factor * 100) / 100;
    }
    const precio = costoTotal / (1 - margen / 100);
    return Math.round(precio * 100) / 100;
}

class CosteoService {
    /**
     * Get costing data for a product (by its linked recipe).
     * @param {number} productoId - Product ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Costeo object or null if product has no recipe
     */
    static async getCosteoByProductoId(productoId, tenantId) {
        const receta = await RecetaRepository.findByProductoId(productoId, tenantId);
        if (!receta) return null;
        return this.getCosteoReceta(receta.id, tenantId);
    }

    static async getCosteoReceta(recetaId, tenantId) {
        const receta = await RecetaRepository.findById(recetaId, tenantId);
        if (!receta) return null;
        const ingredientes = await RecetaRepository.getIngredientes(recetaId);
        const config = await ConfiguracionCosteoRepository.findOne(tenantId);
        const costoDirecto = calcularCostoDirecto(ingredientes);
        const porciones = parseFloat(receta.porciones) || 1;
        const costoDirectoPorcion = porciones > 0 ? costoDirecto / porciones : costoDirecto;
        const costoIndirecto = calcularCostoIndirecto(costoDirectoPorcion, config);
        const costoTotal = costoDirectoPorcion + costoIndirecto;
        const precioSugerido = calcularPrecioSugerido(costoTotal, config);
        const precioActual = parseFloat(receta.precio_venta_actual) || 0;
        const margenActual = precioActual > 0 ? ((precioActual - costoTotal) / precioActual) * 100 : null;
        return {
            receta,
            ingredientes,
            config,
            costo_directo_total: costoDirecto,
            costo_directo_porcion: Math.round(costoDirectoPorcion * 100) / 100,
            costo_indirecto: Math.round(costoIndirecto * 100) / 100,
            costo_total_porcion: Math.round(costoTotal * 100) / 100,
            precio_sugerido: precioSugerido,
            precio_venta_actual: precioActual,
            margen_actual_pct: margenActual != null ? Math.round(margenActual * 100) / 100 : null
        };
    }

    static async getConfig(tenantId) {
        let config = await ConfiguracionCosteoRepository.findOne(tenantId);
        if (!config) {
            await ConfiguracionCosteoRepository.create(tenantId, {});
            config = await ConfiguracionCosteoRepository.findOne(tenantId);
        }
        return config;
    }

    static async saveConfig(tenantId, data) {
        await ConfiguracionCosteoRepository.upsert(tenantId, data);
        return { message: 'Configuración guardada' };
    }
}

module.exports = CosteoService;
module.exports.calcularCostoDirecto = calcularCostoDirecto;
module.exports.calcularPrecioSugerido = calcularPrecioSugerido;
