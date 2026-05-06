const db = require('../../../config/database');

/**
 * Retorna la fecha actual en timezone América/Bogotá (Colombia) como string 'YYYY-MM-DD'.
 */
function getFechaColombia() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

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

/**
 * Retorna el rango UTC exacto que cubre un único día en hora colombiana.
 */
function getUtcDayRangeForColombia(dateStr) {
    const utcDesde = `${dateStr} 05:00:00`;
    const nextDay = new Date(`${dateStr}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const d = String(nextDay.getDate()).padStart(2, '0');
    const utcHasta = `${y}-${m}-${d} 04:59:59`;
    return { utcDesde, utcHasta };
}

class SalesStatsRepository {
    static async getTotalSales(tenantId, filters = {}) {
        let query = 'SELECT COALESCE(SUM(total), 0) AS total FROM facturas WHERE tenant_id = ? AND evento_id IS NULL';
        const params = [tenantId];

        if (filters.desde && filters.hasta) {
            const { utcDesde, utcHasta } = getUtcRangeForColombia(filters.desde, filters.hasta);
            query += " AND fecha BETWEEN ? AND ?";
            params.push(utcDesde, utcHasta);
        }

        const [result] = await db.query(query, params);
        return parseFloat(result[0]?.total || 0);
    }

    static async getTotalSalesAllTime(tenantId) {
        const query = 'SELECT COALESCE(SUM(total), 0) AS total FROM facturas WHERE tenant_id = ? AND evento_id IS NULL';
        const [result] = await db.query(query, [tenantId]);
        return parseFloat(result[0]?.total || 0);
    }

    static async getVentasHoy(tenantId) {
        const hoy = getFechaColombia();
        const { utcDesde, utcHasta } = getUtcDayRangeForColombia(hoy);
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
             FROM facturas WHERE tenant_id = ? AND evento_id IS NULL AND fecha BETWEEN ? AND ?`,
            [tenantId, utcDesde, utcHasta]
        );
        const r = rows[0] || {};
        return {
            total: parseFloat(r.total || 0),
            cantidad: parseInt(r.cantidad || 0)
        };
    }

    static async getVentasMes(tenantId) {
        const hoy = getFechaColombia();
        const parts = hoy.split('-');
        const mesInicioStr = `${parts[0]}-${parts[1]}-01`;
        const { utcDesde } = getUtcDayRangeForColombia(mesInicioStr);
        const { utcHasta } = getUtcDayRangeForColombia(hoy);

        const [rows] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
             FROM facturas WHERE tenant_id = ? AND evento_id IS NULL AND fecha BETWEEN ? AND ?`,
            [tenantId, utcDesde, utcHasta]
        );
        const r = rows[0] || {};
        return {
            total: parseFloat(r.total || 0),
            cantidad: parseInt(r.cantidad || 0)
        };
    }

    static async getTotalInvoices(tenantId, filters = {}) {
        let query = 'SELECT COUNT(*) AS total FROM facturas WHERE tenant_id = ? AND evento_id IS NULL';
        const params = [tenantId];

        if (filters.desde && filters.hasta) {
            const { utcDesde, utcHasta } = getUtcRangeForColombia(filters.desde, filters.hasta);
            query += " AND fecha BETWEEN ? AND ?";
            params.push(utcDesde, utcHasta);
        }

        const [result] = await db.query(query, params);
        return parseInt(result[0]?.total || 0);
    }

    static async getTotalInvoicesAllTime(tenantId) {
        const query = 'SELECT COUNT(*) AS total FROM facturas WHERE tenant_id = ? AND evento_id IS NULL';
        const [result] = await db.query(query, [tenantId]);
        return parseInt(result[0]?.total || 0);
    }

    static async getSalesByPaymentMethod(tenantId, filters = {}) {
        let query = `
            SELECT forma_pago, COUNT(*) AS cantidad, SUM(total) AS total
            FROM facturas
            WHERE tenant_id = ? AND evento_id IS NULL
        `;
        const params = [tenantId];

        if (filters.desde && filters.hasta) {
            const { utcDesde, utcHasta } = getUtcRangeForColombia(filters.desde, filters.hasta);
            query += " AND fecha BETWEEN ? AND ?";
            params.push(utcDesde, utcHasta);
        }

        query += ' GROUP BY forma_pago';

        const [result] = await db.query(query, params);
        return result.map(row => ({
            forma_pago: row.forma_pago,
            cantidad: parseInt(row.cantidad),
            total: parseFloat(row.total || 0)
        }));
    }

    static async getTotalsByPaymentMethod(tenantId, filters = {}) {
        let query = `
            SELECT f.forma_pago, 
                   COALESCE(SUM(f.total), 0) AS total,
                   COALESCE(SUM(t_ext.ext_sum), 0) AS total_externos
            FROM facturas f
            LEFT JOIN (
                SELECT df.factura_id, SUM(df.subtotal) AS ext_sum
                FROM detalle_factura df
                JOIN servicios s ON s.id = df.servicio_id
                WHERE df.es_servicio = 1 AND s.es_externo = 1
                GROUP BY df.factura_id
            ) t_ext ON t_ext.factura_id = f.id
            WHERE f.tenant_id = ? AND f.evento_id IS NULL
        `;
        const params = [tenantId];

        if (filters.desde && filters.hasta) {
            const { utcDesde, utcHasta } = getUtcRangeForColombia(filters.desde, filters.hasta);
            query += " AND f.fecha BETWEEN ? AND ?";
            params.push(utcDesde, utcHasta);
        }

        query += ' GROUP BY f.forma_pago';

        const [result] = await db.query(query, params);
        
        const totals = {
            efectivo: 0,
            transferencia: 0,
            serviciosExternos: 0
        };

        result.forEach(row => {
            const fp = String(row.forma_pago || '').toLowerCase().trim();
            const totalFactura = parseFloat(row.total || 0);
            const totalExternos = parseFloat(row.total_externos || 0);
            const netSale = totalFactura - totalExternos;

            if (fp === 'efectivo') totals.efectivo += netSale;
            else if (fp === 'transferencia') totals.transferencia += netSale;
            
            totals.serviciosExternos += totalExternos;
        });

        return totals;
    }

    static async getDailySales(tenantId, days = 30) {
        const daysAgoDate = new Date();
        daysAgoDate.setDate(daysAgoDate.getDate() - days);
        const daysAgoUtc = daysAgoDate.toISOString().replace('T', ' ').substring(0, 19);

        const query = `
            SELECT 
                DATE(CONVERT_TZ(fecha, '+00:00', '-05:00')) AS fecha,
                COUNT(*) AS cantidad_facturas,
                SUM(total) AS total_ventas
            FROM facturas
            WHERE tenant_id = ? AND evento_id IS NULL
              AND fecha >= ?
            GROUP BY DATE(CONVERT_TZ(fecha, '+00:00', '-05:00'))
            ORDER BY fecha ASC
        `;
        const [result] = await db.query(query, [tenantId, daysAgoUtc]);
        return result.map(row => {
            const f = row.fecha;
            const fechaStr = (f instanceof Date) ? f.toISOString().split('T')[0] : String(f || '').substring(0, 10);
            return {
                fecha: fechaStr,
                cantidad_facturas: parseInt(row.cantidad_facturas || 0),
                total_ventas: parseFloat(row.total_ventas || 0)
            };
        });
    }

    static async getMonthlySales(tenantId, months = 3, options = {}) {
        let query = `
            SELECT 
                YEAR(f.fecha) AS year,
                MONTH(f.fecha) AS month,
                COUNT(*) AS cantidad_facturas,
                COALESCE(SUM(f.total), 0) AS total_ventas
            FROM facturas f
            WHERE f.tenant_id = ?
              AND f.fecha >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ? MONTH), '%Y-%m-01')
        `;
        if (options.excludeEventos) {
            query += ` AND f.evento_id IS NULL`;
        }
        query += `
            GROUP BY YEAR(f.fecha), MONTH(f.fecha)
            ORDER BY year ASC, month ASC
        `;
        const [result] = await db.query(query, [tenantId, months]);
        return result.map(row => ({
            year: row.year,
            month: row.month,
            cantidad_facturas: parseInt(row.cantidad_facturas || 0),
            total_ventas: parseFloat(row.total_ventas || 0)
        }));
    }
}

module.exports = SalesStatsRepository;
