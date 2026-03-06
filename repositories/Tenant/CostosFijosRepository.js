/**
 * CostosFijosRepository - Estructura de costos operativos fijos por tenant
 * (arriendo, personal, internet, etc.). No vinculado a recetas ni productos.
 */

const db = require('../../config/database');

class CostosFijosRepository {
    static async findAll(tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM costos_fijos WHERE tenant_id = ? ORDER BY nombre',
            [tenantId]
        );
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM costos_fijos WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async getTotalActivo(tenantId) {
        const [rows] = await db.query(
            'SELECT COALESCE(SUM(monto_mensual), 0) AS total FROM costos_fijos WHERE tenant_id = ? AND activo = 1',
            [tenantId]
        );
        return parseFloat(rows[0]?.total) || 0;
    }

    static async create(tenantId, data) {
        const { nombre, monto_mensual, activo } = data;
        const [result] = await db.query(
            'INSERT INTO costos_fijos (tenant_id, nombre, monto_mensual, activo) VALUES (?, ?, ?, ?)',
            [tenantId, nombre || '', parseFloat(monto_mensual) || 0, activo !== false ? 1 : 0]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const item = await this.findById(id, tenantId);
        if (!item) return { affectedRows: 0 };
        const nombre = data.nombre != null ? data.nombre : item.nombre;
        const monto_mensual = data.monto_mensual != null ? parseFloat(data.monto_mensual) : item.monto_mensual;
        const activo = data.activo !== undefined ? (data.activo ? 1 : 0) : item.activo;
        const [result] = await db.query(
            'UPDATE costos_fijos SET nombre = ?, monto_mensual = ?, activo = ? WHERE id = ? AND tenant_id = ?',
            [nombre, monto_mensual, activo, id, tenantId]
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM costos_fijos WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }
}

module.exports = CostosFijosRepository;
