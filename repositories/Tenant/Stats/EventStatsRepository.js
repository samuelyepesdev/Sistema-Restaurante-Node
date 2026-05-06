const db = require('../../../config/database');

/**
 * Convierte un rango de fechas en hora local colombiana (Bogotá GMT-5)
 * a su rango correspondiente en fechas UTC reales ('YYYY-MM-DD HH:mm:ss').
 */
function getUtcRangeForColombia(desde, hasta) {
    const utcDesde = `${desde} 05:00:00`;
    const utcHastaDate = new Date(`${hasta}T23:59:59`);
    utcHastaDate.setHours(utcHastaDate.getHours() + 5);
    
    const y = utcHastaDate.getFullYear();
    const m = String(utcHastaDate.getMonth() + 1).padStart(2, '0');
    const d = String(utcHastaDate.getDate()).padStart(2, '0');
    const hh = String(utcHastaDate.getHours()).padStart(2, '0');
    const mm = String(utcHastaDate.getMinutes()).padStart(2, '0');
    const ss = String(utcHastaDate.getSeconds()).padStart(2, '0');
    
    const utcHasta = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    return { utcDesde, utcHasta };
}

class EventStatsRepository {
    static async getEventStatsForDashboard(tenantId, desde, hasta) {
        const [eventosCount] = await db.query(
            `SELECT COUNT(*) AS total FROM eventos 
             WHERE tenant_id = ? AND activo = TRUE 
             AND (fecha_inicio <= ? AND fecha_fin >= ?)`,
            [tenantId, hasta, desde]
        );

        const { utcDesde, utcHasta } = getUtcRangeForColombia(desde, hasta);
        const [ventasEventos] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
             FROM facturas 
             WHERE tenant_id = ? AND evento_id IS NOT NULL 
             AND fecha BETWEEN ? AND ?`,
            [tenantId, utcDesde, utcHasta]
        );
        return {
            eventos_count: parseInt(eventosCount[0]?.total || 0),
            ventas_eventos_total: parseFloat(ventasEventos[0]?.total || 0),
            ventas_eventos_cantidad: parseInt(ventasEventos[0]?.cantidad || 0)
        };
    }

    static async getVentasPorEventoEnRango(tenantId, desde, hasta) {
        const { utcDesde, utcHasta } = getUtcRangeForColombia(desde, hasta);
        const [rows] = await db.query(
            `SELECT e.id, e.nombre AS evento_nombre,
                    COUNT(f.id) AS cantidad_ventas,
                    COALESCE(SUM(f.total), 0) AS total_ventas
             FROM eventos e
             INNER JOIN facturas f ON f.evento_id = e.id AND f.tenant_id = e.tenant_id
             WHERE e.tenant_id = ? AND f.fecha BETWEEN ? AND ?
             GROUP BY e.id, e.nombre
             ORDER BY total_ventas DESC`,
            [tenantId, utcDesde, utcHasta]
        );
        return (rows || []).map(r => ({
            evento_nombre: r.evento_nombre,
            total_ventas: parseFloat(r.total_ventas || 0),
            cantidad_ventas: parseInt(r.cantidad_ventas || 0)
        }));
    }

    static async getEventosEnRango(tenantId, desde, hasta) {
        const [rows] = await db.query(
            `SELECT id, nombre, fecha_inicio, fecha_fin
             FROM eventos
             WHERE tenant_id = ? AND fecha_inicio <= ? AND fecha_fin >= ?
             ORDER BY fecha_inicio`,
            [tenantId, hasta, desde]
        );
        return rows || [];
    }
}

module.exports = EventStatsRepository;
