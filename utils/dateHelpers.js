/**
 * Convierte una fecha que viene de la BD (Date o string MySQL "YYYY-MM-DD HH:mm:ss")
 * a ISO en UTC, para que el cliente la muestre en su zona horaria.
 * Las fechas guardadas en MySQL TIMESTAMP están en UTC; si llegan como string sin Z,
 * Node las interpreta como hora local del servidor y se muestran mal. Tratarlas como UTC.
 * @param {Date|string|null} fecha
 * @returns {string} ISO string (ej. "2026-02-28T01:33:36.000Z") o ''
 */
function toFechaISOUtc(fecha) {
    if (fecha == null) return '';
    if (typeof fecha === 'string') {
        const mysqlMatch = fecha.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
        if (mysqlMatch) return mysqlMatch[1] + 'T' + mysqlMatch[2] + '.000Z';
        if (fecha.endsWith('Z') || fecha.includes('T')) return new Date(fecha).toISOString();
    }
    if (fecha instanceof Date) return fecha.toISOString();
    try {
        return new Date(fecha).toISOString();
    } catch (e) {
        return '';
    }
}

module.exports = { toFechaISOUtc };
