/**
 * Costeo Repostería - Conversión tazas/cucharadas a gramos y fracciones.
 * Se carga solo cuando el tenant es panadería o pastelería (costeoPlantillaReposteria).
 * Añade ingredientes a la receta convirtiendo a gramos para que el backend no cambie.
 */
(function () {
    if (!window.COSTEO_PLANTILLA_REPOSTERIA) return;

    const CONVERSIONS = {
        flour: { cup: 125, tbsp: 7.8, tsp: 2.6, density: 0.593 },
        sugar: { cup: 200, tbsp: 12.5, tsp: 4.2, density: 0.845 },
        'brown-sugar': { cup: 220, tbsp: 13.75, tsp: 4.6, density: 0.93 },
        'powdered-sugar': { cup: 120, tbsp: 7.5, tsp: 2.5, density: 0.56 },
        butter: { cup: 227, tbsp: 14.2, tsp: 4.7, density: 0.911 },
        milk: { cup: 240, tbsp: 15, tsp: 5, density: 1.03 },
        water: { cup: 240, tbsp: 15, tsp: 5, density: 1 },
        oil: { cup: 220, tbsp: 13.75, tsp: 4.6, density: 0.92 },
        cocoa: { cup: 85, tbsp: 5.3, tsp: 1.8, density: 0.35 },
        salt: { cup: 288, tbsp: 18, tsp: 6, density: 1.2 },
        eggs: { cup: 243, tbsp: 15.2, tsp: 5.1, density: 1.03 },
        cream: { cup: 240, tbsp: 15, tsp: 5, density: 1.01 },
        honey: { cup: 340, tbsp: 21.25, tsp: 7.1, density: 1.42 },
        'custom-solid': { cup: 200, tbsp: 12.5, tsp: 4.2, density: 0.85 },
        'custom-liquid': { cup: 240, tbsp: 15, tsp: 5, density: 1 }
    };

    function parseFraction(text) {
        if (!text || !String(text).trim()) return NaN;
        const amountText = String(text).trim();
        if (amountText.includes('/')) {
            const parts = amountText.split(/\s+/);
            let whole = 0;
            let fraction = amountText;
            if (parts.length > 1) {
                whole = parseFloat(parts[0]) || 0;
                fraction = parts[1];
            }
            const fractionParts = fraction.split('/');
            if (fractionParts.length === 2) {
                const num = parseFloat(fractionParts[0]);
                const den = parseFloat(fractionParts[1]);
                if (den && !isNaN(num)) return whole + (num / den);
            }
            return whole;
        }
        return parseFloat(amountText.replace(',', '.')) || NaN;
    }

    function convertToGrams(amount, fromUnit, ingredientType) {
        const conv = CONVERSIONS[ingredientType] || CONVERSIONS['custom-solid'];
        let grams = 0;
        switch (fromUnit) {
            case 'cup':
                grams = amount * conv.cup;
                break;
            case 'tbsp':
                grams = amount * conv.tbsp;
                break;
            case 'tsp':
                grams = amount * conv.tsp;
                break;
            case 'oz':
                grams = amount * 28.35;
                break;
            case 'lb':
                grams = amount * 453.592;
                break;
            case 'g':
                grams = amount;
                break;
            case 'kg':
                grams = amount * 1000;
                break;
            case 'ml':
                grams = amount * (conv.density || 1);
                break;
            case 'L':
                grams = amount * 1000 * (conv.density || 1);
                break;
            case 'UND':
                grams = amount;
                break;
            default:
                grams = amount;
        }
        return Math.round(grams * 1000) / 1000;
    }

    function updateConvertidoSpan() {
        const amountText = document.getElementById('ingredienteCantidadRep')?.value?.trim() || '';
        const from = document.getElementById('ingredienteUnidadEntrada')?.value || 'g';
        const tipo = document.getElementById('ingredienteTipoRep')?.value || 'custom-solid';
        const span = document.getElementById('ingredienteConvertidoRep');
        if (!span) return;
        if (!amountText) {
            span.textContent = '';
            return;
        }
        const amount = parseFraction(amountText);
        if (isNaN(amount)) {
            span.textContent = 'Cantidad no válida';
            return;
        }
        const grams = convertToGrams(amount, from, tipo);
        span.textContent = '≈ ' + grams + ' g';
    }

    function refreshReposteriaSelect() {
        const selRep = document.getElementById('ingredienteInsumoRep');
        if (!selRep) return;
        selRep.innerHTML = '<option value="">Agregar insumo</option>';
        (window.COSTEO_insumosList || []).forEach(function (i) {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = (i.codigo || '') + ' - ' + (i.nombre || '') + ' (' + (i.unidad_compra || '') + ')';
            selRep.appendChild(opt);
        });
    }

    window.COSTEO_refreshReposteriaSelect = refreshReposteriaSelect;

    function initReposteria() {
        const blockRep = document.getElementById('ingredienteAgregarReposteria');
        const blockEst = document.getElementById('ingredienteAgregarEstandar');
        if (blockRep) blockRep.classList.remove('d-none');
        if (blockEst) blockEst.classList.add('d-none');

        refreshReposteriaSelect();

        document.getElementById('ingredienteCantidadRep')?.addEventListener('input', updateConvertidoSpan);
        document.getElementById('ingredienteUnidadEntrada')?.addEventListener('change', updateConvertidoSpan);
        document.getElementById('ingredienteTipoRep')?.addEventListener('change', updateConvertidoSpan);

        document.getElementById('btnAgregarIngredienteRep')?.addEventListener('click', function () {
            const insumoId = parseInt(document.getElementById('ingredienteInsumoRep')?.value, 10);
            const amountText = document.getElementById('ingredienteCantidadRep')?.value?.trim() || '';
            const from = document.getElementById('ingredienteUnidadEntrada')?.value || 'g';
            const tipo = document.getElementById('ingredienteTipoRep')?.value || 'custom-solid';
            if (!insumoId) return;
            const amount = parseFraction(amountText);
            if (isNaN(amount) || amount <= 0) return;
            const grams = convertToGrams(amount, from, tipo);
            const insumosList = window.COSTEO_insumosList || [];
            const ins = insumosList.find(function (i) { return i.id === insumoId; });
            if (!ins) return;
            const agregar = window.COSTEO_agregarIngrediente;
            if (typeof agregar !== 'function') return;
            agregar({
                insumo_id: insumoId,
                cantidad: grams,
                unidad: 'g',
                insumo_nombre: ins.nombre || '',
                insumo_codigo: ins.codigo || ''
            });
            document.getElementById('ingredienteCantidadRep').value = '';
            document.getElementById('ingredienteConvertidoRep').textContent = '';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReposteria);
    } else {
        initReposteria();
    }
})();
