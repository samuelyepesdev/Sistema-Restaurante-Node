/**
 * CosteoService - Calculation of dish cost, indirect cost, suggested price
 * Related to: RecetaRepository, ConfiguracionCosteoRepository
 */

const RecetaRepository = require('../repositories/RecetaRepository');
const ConfiguracionCosteoRepository = require('../repositories/ConfiguracionCosteoRepository');
const ProductRepository = require('../repositories/ProductRepository');

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
 * Costo indirecto según configuración: porcentaje (merma/variación), costo fijo por porción, o factor.
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
 * Precio sugerido: Precio = Costo total ÷ (1 - Margen de ganancia esperado)
 * Ej: costo $15, margen 65% → precio = 15 / (1 - 0.65) = $42.85
 */
function calcularPrecioSugerido(costoTotal, config) {
    if (!config) return costoTotal * 2;
    const metodo = config.metodo_indirectos || 'porcentaje';
    const margen = parseFloat(config.margen_objetivo_default) || 65;
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
        const costoMateriaPrimaPorcion = porciones > 0 ? costoDirecto / porciones : costoDirecto;
        const costoIndirecto = calcularCostoIndirecto(costoMateriaPrimaPorcion, config);
        const costoTotal = costoMateriaPrimaPorcion + costoIndirecto;
        const precioSugerido = calcularPrecioSugerido(costoTotal, config);
        const precioActual = parseFloat(receta.precio_venta_actual) || 0;
        const margenActual = precioActual > 0 ? ((precioActual - costoTotal) / precioActual) * 100 : null;
        const mermaPct = config && (config.metodo_indirectos || 'porcentaje') === 'porcentaje'
            ? (parseFloat(config.porcentaje_indirectos) || 0) : 0;
        const margenObjetivoPct = parseFloat(config?.margen_objetivo_default) || 65;
        return {
            receta,
            ingredientes,
            config,
            costo_directo_total: costoDirecto,
            costo_materia_prima_porcion: Math.round(costoMateriaPrimaPorcion * 100) / 100,
            costo_directo_porcion: Math.round(costoMateriaPrimaPorcion * 100) / 100,
            merma_pct: mermaPct,
            merma_monto: Math.round(costoIndirecto * 100) / 100,
            costo_indirecto: Math.round(costoIndirecto * 100) / 100,
            costo_total_porcion: Math.round(costoTotal * 100) / 100,
            margen_objetivo_pct: margenObjetivoPct,
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

    /**
     * Get costing alerts: low margin, price below cost, products without recipe.
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Object>} { margenBajo, precioBajoCosto, sinReceta, margen_minimo_alerta }
     */
    static async getAlertas(tenantId) {
        const config = await this.getConfig(tenantId);
        const margenMinimo = config.margen_minimo_alerta != null ? parseFloat(config.margen_minimo_alerta) : 30;
        const recetas = await RecetaRepository.findAll(tenantId);
        const productos = await ProductRepository.findAll(tenantId);
        const productoIdsConReceta = new Set((recetas || []).map(r => r.producto_id));
        const sinReceta = (productos || [])
            .filter(p => !productoIdsConReceta.has(p.id))
            .map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }));

        const items = [];
        for (const receta of recetas || []) {
            const costeo = await this.getCosteoReceta(receta.id, tenantId);
            if (!costeo) continue;
            items.push({
                producto_id: receta.producto_id,
                producto_nombre: receta.producto_nombre || receta.nombre_receta,
                producto_codigo: receta.producto_codigo,
                precio_venta_actual: costeo.precio_venta_actual,
                costo_total_porcion: costeo.costo_total_porcion,
                margen_actual_pct: costeo.margen_actual_pct,
                receta_id: receta.id
            });
        }

        const margenBajo = items.filter(it => it.margen_actual_pct != null && it.margen_actual_pct < margenMinimo);
        const precioBajoCosto = items.filter(it =>
            (parseFloat(it.precio_venta_actual) || 0) < (parseFloat(it.costo_total_porcion) || 0)
        );

        return {
            margenBajo,
            precioBajoCosto,
            sinReceta,
            margen_minimo_alerta: margenMinimo
        };
    }
}

module.exports = CosteoService;
module.exports.calcularCostoDirecto = calcularCostoDirecto;
module.exports.calcularPrecioSugerido = calcularPrecioSugerido;
