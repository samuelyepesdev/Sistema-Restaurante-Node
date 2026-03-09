const db = require('../../config/database');

class CajaRepository {
    /**
     * Obtiene la sesión abierta actual para un tenant
     */
    static async getSesionAbierta(tenantId) {
        const sql = `SELECT * FROM caja_sesiones WHERE tenant_id = ? AND estado = 'abierta' LIMIT 1`;
        const [rows] = await db.query(sql, [tenantId]);
        return rows[0];
    }

    /**
     * Abre un nuevo turno/sesión de caja
     */
    static async abrirSesion(tenantId, usuarioId, montoInicial, notas) {
        const sql = `
            INSERT INTO caja_sesiones (tenant_id, usuario_id, monto_inicial, notas, estado, fecha_apertura)
            VALUES (?, ?, ?, ?, 'abierta', CURRENT_TIMESTAMP)
        `;
        const [result] = await db.query(sql, [tenantId, usuarioId, montoInicial, notas]);
        return result.insertId;
    }

    /**
     * Cierra una sesión de caja calculando totales
     */
    static async cerrarSesion(sesionId, tenantId, montoFinalReal, notas) {
        // Calcular el teórico justo antes de cerrar
        const [ventas] = await db.query(`SELECT SUM(total) as total FROM facturas WHERE caja_sesion_id = ?`, [sesionId]);
        const [entradas] = await db.query(`SELECT SUM(monto) as total FROM caja_movimientos WHERE sesion_id = ? AND tipo = 'entrada'`, [sesionId]);
        const [salidas] = await db.query(`SELECT SUM(monto) as total FROM caja_movimientos WHERE sesion_id = ? AND tipo = 'salida'`, [sesionId]);
        const [sesion] = await db.query(`SELECT monto_inicial FROM caja_sesiones WHERE id = ?`, [sesionId]);

        const base = parseFloat(sesion[0]?.monto_inicial || 0);
        const v = parseFloat(ventas[0]?.total || 0);
        const e = parseFloat(entradas[0]?.total || 0);
        const s = parseFloat(salidas[0]?.total || 0);
        const teorico = base + v + e - s;
        const diferencia = montoFinalReal - teorico;

        const sql = `
            UPDATE caja_sesiones 
            SET monto_final_teorico = ?,
                monto_final_real = ?,
                diferencia = ?,
                notas = CONCAT(IFNULL(notas, ''), '\n', ?),
                estado = 'cerrada',
                fecha_cierre = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        `;
        await db.query(sql, [teorico, montoFinalReal, diferencia, notas, sesionId, tenantId]);
    }

    /**
     * Obtiene el historial de sesiones cerradas
     */
    static async getHistorial(tenantId, limit = 50) {
        const sql = `
            SELECT s.*, u.nombre_completo as usuario_nombre
            FROM caja_sesiones s
            JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.tenant_id = ? AND s.estado = 'cerrada'
            ORDER BY s.fecha_cierre DESC
            LIMIT ?
        `;
        const [rows] = await db.query(sql, [tenantId, limit]);
        return rows;
    }

    /**
     * Registra un movimiento manual (Entrada/Salida)
     */
    static async registrarMovimiento(tenantId, sesionId, usuarioId, tipo, monto, motivo) {
        const sql = `
            INSERT INTO caja_movimientos (tenant_id, sesion_id, usuario_id, tipo, monto, motivo)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [tenantId, sesionId, usuarioId, tipo, monto, motivo]);
        return result.insertId;
    }

    /**
     * Obtiene estadísticas rápidas de la sesión actual
     */
    static async getEstadisticasSesion(sesionId) {
        // Sumar ventas
        const [ventas] = await db.query(`SELECT SUM(total) as total FROM facturas WHERE caja_sesion_id = ?`, [sesionId]);
        // Sumar movimientos manuales
        const [entradas] = await db.query(`SELECT SUM(monto) as total FROM caja_movimientos WHERE sesion_id = ? AND tipo = 'entrada'`, [sesionId]);
        const [salidas] = await db.query(`SELECT SUM(monto) as total FROM caja_movimientos WHERE sesion_id = ? AND tipo = 'salida'`, [sesionId]);

        return {
            ventas: ventas[0].total || 0,
            entradas: entradas[0].total || 0,
            salidas: salidas[0].total || 0
        };
    }
}

module.exports = CajaRepository;
