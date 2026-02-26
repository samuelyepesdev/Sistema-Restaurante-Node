/**
 * CosteoService - Calculation of dish cost, indirect cost, suggested price
 * Related to: RecetaRepository, ConfiguracionCosteoRepository
 */

const RecetaRepository = require('../repositories/RecetaRepository');
const ConfiguracionCosteoRepository = require('../repositories/ConfiguracionCosteoRepository');
const CostosFijosRepository = require('../repositories/CostosFijosRepository');
const ProductRepository = require('../repositories/ProductRepository');

/**
 * Convierte cantidad de compra + unidad a cantidad en unidad base (como en Excel).
 * kg → gramos (×1000), g → gramos (×1), L → ml (×1000), ml → ml (×1), UND → UND (×1), lb → gramos (×453.592).
 * @returns {{ cantidadBase: number, tipoBase: 'g'|'ml'|'UND' }}
 */
function compraABase(cantidadCompra, unidadCompra) {
    const q = parseFloat(cantidadCompra) || 0;
    const u = String(unidadCompra || 'UND').trim().toLowerCase();
    if (u === 'kg') return { cantidadBase: q * 1000, tipoBase: 'g' };
    if (u === 'g' || u === 'gr') return { cantidadBase: q, tipoBase: 'g' };
    if (u === 'lb') return { cantidadBase: q * 453.592, tipoBase: 'g' };
    if (u === 'l') return { cantidadBase: q * 1000, tipoBase: 'ml' };
    if (u === 'ml') return { cantidadBase: q, tipoBase: 'ml' };
    return { cantidadBase: q || 1, tipoBase: 'UND' };
}

/**
 * Convierte cantidad usada en receta a la misma unidad base que el insumo.
 */
function recetaCantidadABase(cantidad, unidadReceta, tipoBase) {
    const q = parseFloat(cantidad) || 0;
    const u = String(unidadReceta || 'g').trim().toLowerCase();
    if (tipoBase === 'g') {
        if (u === 'kg') return q * 1000;
        if (u === 'g' || u === 'gr') return q;
        if (u === 'lb') return q * 453.592;
        return q;
    }
    if (tipoBase === 'ml') {
        if (u === 'l') return q * 1000;
        if (u === 'ml') return q;
        return q;
    }
    return q;
}

/**
 * Costo directo de una receta = suma de (costo_unitario_real × cantidad_usada_en_base) por ingrediente.
 * costo_unitario_real = precio_compra / cantidad_compra_en_base (como en Excel).
 */
function calcularCostoDirecto(ingredientes) {
    let total = 0;
    for (const it of ingredientes || []) {
        const precioCompra = parseFloat(it.precio_compra) || 0;
        const cantidadCompra = parseFloat(it.cantidad_compra) || 1;
        const unidadCompra = (it.unidad_compra || 'UND').trim();
        const cantidadUsada = parseFloat(it.cantidad) || 0;
        const unidadReceta = (it.unidad || 'g').trim();

        const { cantidadBase: cantidadBaseCompra, tipoBase } = compraABase(cantidadCompra, unidadCompra);
        if (cantidadBaseCompra <= 0) continue;
        const costoUnitarioReal = precioCompra / cantidadBaseCompra;
        const cantidadRecetaBase = recetaCantidadABase(cantidadUsada, unidadReceta, tipoBase);
        total += costoUnitarioReal * cantidadRecetaBase;
    }
    return Math.round(total * 100) / 100;
}

/**
 * Costo unitario calculado (por unidad base): precio_compra / cantidad_compra_en_base.
 * Para mostrar en listados o cuando el cliente necesita "costo por unidad" sin recalcular.
 * @param {{ precio_compra?: number, cantidad_compra?: number, unidad_compra?: string }} insumo
 * @returns {number}
 */
function getCostoUnitarioCalculado(insumo) {
    if (!insumo) return 0;
    const precio = parseFloat(insumo.precio_compra) || 0;
    const { cantidadBase } = compraABase(parseFloat(insumo.cantidad_compra) || 1, insumo.unidad_compra);
    if (cantidadBase <= 0) return 0;
    return Math.round((precio / cantidadBase) * 100000) / 100000;
}

/**
 * Costo indirecto según configuración: porcentaje (merma), costo fijo por plato, o factor.
 * totalCostosFijos: suma de costos_fijos activos del tenant (cuando metodo === 'costo_fijo').
 */
function calcularCostoIndirecto(costoDirecto, config, totalCostosFijos = 0) {
    if (!config) return 0;
    const metodo = config.metodo_indirectos || 'porcentaje';
    if (metodo === 'porcentaje') {
        const pct = parseFloat(config.porcentaje_indirectos) || 0;
        return Math.round((costoDirecto * pct / 100) * 100) / 100;
    }
    if (metodo === 'costo_fijo') {
        const totalFijo = typeof totalCostosFijos === 'number' ? totalCostosFijos : (parseFloat(config.costo_fijo_mensual) || 0);
        const unidadesEstimadasMes = parseInt(config.platos_estimados_mes, 10) || 500; // Total porciones/platos estimados al mes (mix productos)
        return unidadesEstimadasMes > 0 ? Math.round((totalFijo / unidadesEstimadasMes) * 100) / 100 : 0;
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
        const totalCostosFijos = await CostosFijosRepository.getTotalActivo(tenantId);
        const costoDirecto = calcularCostoDirecto(ingredientes);
        const porciones = parseFloat(receta.porciones) || 1;
        const costoMateriaPrimaPorcion = porciones > 0 ? costoDirecto / porciones : costoDirecto;
        const costoIndirecto = calcularCostoIndirecto(costoMateriaPrimaPorcion, config, totalCostosFijos);
        const costoTotalPorcion = costoMateriaPrimaPorcion + costoIndirecto;
        const cvuPorcion = Math.round(costoTotalPorcion * 100) / 100;
        const precioSugerido = calcularPrecioSugerido(costoTotalPorcion, config);
        const precioActual = parseFloat(receta.precio_venta_actual) || 0;
        const mermaPct = config && (config.metodo_indirectos || 'porcentaje') === 'porcentaje'
            ? (parseFloat(config.porcentaje_indirectos) || 0) : 0;
        const margenObjetivoPct = parseFloat(config?.margen_objetivo_default) || 65;

        // Precio y rentabilidad (siempre recalculados, no guardados)
        const utilidadBrutaPorcion = precioActual > 0 ? precioActual - cvuPorcion : 0;
        const margenRealPct = precioActual > 0 ? ((precioActual - cvuPorcion) / precioActual) * 100 : null;
        const markupRealPct = cvuPorcion > 0 && precioActual > 0 ? (utilidadBrutaPorcion / cvuPorcion) * 100 : null;
        const margenContribucionPorcion = precioActual > 0 ? precioActual - cvuPorcion : 0;

        // Punto de equilibrio: cuántas porciones vender para cubrir costos fijos
        // PE = TotalCostosFijos / MargenContribucionPorcion
        const puntoEquilibrioPorciones = margenContribucionPorcion > 0 && totalCostosFijos >= 0
            ? totalCostosFijos / margenContribucionPorcion
            : null;

        return {
            receta,
            ingredientes,
            config,
            total_costos_fijos: Math.round(totalCostosFijos * 100) / 100,
            costo_directo_total: costoDirecto,
            costo_materia_prima_porcion: Math.round(costoMateriaPrimaPorcion * 100) / 100,
            costo_directo_porcion: Math.round(costoMateriaPrimaPorcion * 100) / 100,
            merma_pct: mermaPct,
            merma_monto: Math.round(costoIndirecto * 100) / 100,
            costo_indirecto: Math.round(costoIndirecto * 100) / 100,
            costo_total_porcion: cvuPorcion,
            cvu_porcion: cvuPorcion,
            margen_objetivo_pct: margenObjetivoPct,
            precio_sugerido: precioSugerido,
            precio_venta_actual: precioActual,
            utilidad_bruta_porcion: Math.round(utilidadBrutaPorcion * 100) / 100,
            margen_actual_pct: margenRealPct != null ? Math.round(margenRealPct * 100) / 100 : null,
            markup_real_pct: markupRealPct != null ? Math.round(markupRealPct * 100) / 100 : null,
            margen_contribucion_porcion: Math.round(margenContribucionPorcion * 100) / 100,
            punto_equilibrio_porciones: puntoEquilibrioPorciones != null ? Math.round(puntoEquilibrioPorciones * 100) / 100 : null
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

    /**
     * Resumen financiero del negocio: punto de equilibrio y ventas necesarias
     * considerando TODOS los productos con receta (mix del portafolio).
     * MC% = suma(margen contribución por producto) / suma(precio por producto), asumiendo mix igual.
     * Ventas equilibrio = Costos fijos / (MC% / 100).
     * Ventas para meta = (Costos fijos + Ganancia deseada) / (MC% / 100).
     * @param {number} tenantId
     * @returns {Promise<Object>}
     */
    static async getResumenFinanciero(tenantId) {
        const totalCostosFijos = await CostosFijosRepository.getTotalActivo(tenantId);
        const config = await this.getConfig(tenantId);
        const gananciaDeseada = parseFloat(config.ganancia_neta_deseada_mensual) || 0;
        const recetas = await RecetaRepository.findAll(tenantId);
        const productos = [];

        let sumaPrecios = 0;
        let sumaMargenContribucion = 0;

        for (const receta of recetas || []) {
            const costeo = await this.getCosteoReceta(receta.id, tenantId);
            if (!costeo) continue;
            const precio = parseFloat(costeo.precio_venta_actual) || 0;
            const cvu = parseFloat(costeo.cvu_porcion) || costeo.costo_total_porcion || 0;
            const mcPorcion = precio - cvu;
            const mcPct = precio > 0 ? (mcPorcion / precio) * 100 : 0;

            productos.push({
                producto_id: receta.producto_id,
                producto_nombre: costeo.receta?.producto_nombre || receta.nombre_receta,
                producto_codigo: costeo.receta?.producto_codigo,
                precio_venta: Math.round(precio * 100) / 100,
                cvu_porcion: Math.round(cvu * 100) / 100,
                margen_contribucion_porcion: Math.round(mcPorcion * 100) / 100,
                margen_contribucion_pct: Math.round(mcPct * 100) / 100
            });

            sumaPrecios += precio;
            sumaMargenContribucion += mcPorcion;
        }

        const mcPctNegocio = sumaPrecios > 0 ? (sumaMargenContribucion / sumaPrecios) * 100 : 0;
        const ventasEquilibrio = mcPctNegocio > 0 ? totalCostosFijos / (mcPctNegocio / 100) : null;
        const ventasParaMeta = mcPctNegocio > 0 && (totalCostosFijos + gananciaDeseada) > 0
            ? (totalCostosFijos + gananciaDeseada) / (mcPctNegocio / 100)
            : ventasEquilibrio;

        return {
            total_costos_fijos: Math.round(totalCostosFijos * 100) / 100,
            ganancia_neta_deseada_mensual: Math.round(gananciaDeseada * 100) / 100,
            numero_productos_con_receta: productos.length,
            productos,
            margen_contribucion_pct_negocio: Math.round(mcPctNegocio * 100) / 100,
            ventas_equilibrio: ventasEquilibrio != null ? Math.round(ventasEquilibrio * 100) / 100 : null,
            ventas_para_meta: ventasParaMeta != null ? Math.round(ventasParaMeta * 100) / 100 : null,
            nota_mix: 'El margen % del negocio asume un mix ponderado por precio (una unidad de cada producto). Con ventas reales el mix puede variar.'
        };
    }
}

module.exports = CosteoService;
module.exports.calcularCostoDirecto = calcularCostoDirecto;
module.exports.calcularPrecioSugerido = calcularPrecioSugerido;
module.exports.getCostoUnitarioCalculado = getCostoUnitarioCalculado;
