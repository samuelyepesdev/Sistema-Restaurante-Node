/**
 * InsumoRepository - Data access for ingredients (materia prima)
 * Related to: CosteoService, routes/costeo.js
 */

const db = require('../config/database');

class InsumoRepository {
    static async findAll(tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM insumos WHERE tenant_id = ? ORDER BY nombre',
            [tenantId]
        );
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM insumos WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async findByCodigo(codigo, tenantId, excludeId = null) {
        let sql = 'SELECT id FROM insumos WHERE tenant_id = ? AND codigo = ?';
        const params = [tenantId, codigo];
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const { codigo, nombre, unidad_compra, costo_unitario } = data;
        const [result] = await db.query(
            'INSERT INTO insumos (tenant_id, codigo, nombre, unidad_compra, costo_unitario) VALUES (?, ?, ?, ?, ?)',
            [tenantId, codigo, nombre || 'UND', unidad_compra, parseFloat(costo_unitario) || 0]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const { codigo, nombre, unidad_compra, costo_unitario } = data;
        const [result] = await db.query(
            'UPDATE insumos SET codigo = ?, nombre = ?, unidad_compra = ?, costo_unitario = ? WHERE id = ? AND tenant_id = ?',
            [codigo, nombre, unidad_compra || 'UND', parseFloat(costo_unitario) || 0, id, tenantId]
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM insumos WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }
}

module.exports = InsumoRepository;
