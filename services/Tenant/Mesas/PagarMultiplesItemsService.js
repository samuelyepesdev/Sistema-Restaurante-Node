const PagarItemIndividualService = require('./PagarItemIndividualService');

class PagarMultiplesItemsService {
    /**
     * @description Procesa el pago de múltiples ítems del pedido a la vez.
     * @param {Object} param0
     * @param {string} param0.tenantId
     * @param {Array<{itemId: number|string, cantidad: number}>} param0.items - Lista de ítems con su ID y cantidad a pagar.
     * @param {string} param0.forma_pago - Forma de pago ('efectivo' o 'transferencia').
     */
    static async execute({ tenantId, items, forma_pago }) {
        if (!forma_pago || !['efectivo', 'transferencia'].includes(forma_pago)) {
            throw new Error('Forma de pago requerida y debe ser efectivo o transferencia');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Debe seleccionar al menos un ítem para realizar el pago');
        }

        const resultados = [];
        
        for (const item of items) {
            const { itemId, cantidad } = item;
            if (!itemId) continue;
            
            const result = await PagarItemIndividualService.execute({
                tenantId,
                itemId,
                forma_pago,
                cantidad: Number(cantidad)
            });
            resultados.push({ itemId, result });
        }

        return {
            success: true,
            message: `${resultados.length} ítems procesados correctamente`,
            detalles: resultados
        };
    }
}

module.exports = PagarMultiplesItemsService;
