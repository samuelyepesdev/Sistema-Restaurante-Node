/**
 * ParametroRepository - Data access for parametros (e.g. kg, lb, g, bebidas, comidas)
 * Related to: TemaRepository, tema_parametro, producto_parametro
 */

const db = require('../../config/database');

class ParametroRepository {
    static async findAll(tenantId, activeOnly = true) {
        let sql = 'SELECT * FROM parametros WHERE tenant_id = ?';
        const params = [tenantId];
        if (activeOnly) {
            sql += ' AND status = 1';
        }
        sql += ' ORDER BY name';
        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM parametros WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async findByName(name, tenantId, excludeId = null) {
        let sql = 'SELECT id FROM parametros WHERE tenant_id = ? AND name = ?';
        const params = [tenantId, name.trim()];
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const [result] = await db.query(
            'INSERT INTO parametros (tenant_id, name, status) VALUES (?, ?, ?)',
            [tenantId, data.name.trim(), data.status !== undefined ? data.status : 1]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const [result] = await db.query(
            'UPDATE parametros SET name = ?, status = COALESCE(?, status) WHERE id = ? AND tenant_id = ?',
            [data.name.trim(), data.status, id, tenantId]
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM parametros WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }

    static async getTemas(parametroId, tenantId) {
        const [rows] = await db.query(`
            SELECT t.* FROM temas t
            INNER JOIN tema_parametro tp ON tp.tema_id = t.id AND tp.status = 1
            WHERE tp.parametro_id = ? AND t.tenant_id = ?
            ORDER BY t.name
        `, [parametroId, tenantId]);
        return rows;
    }

    static async getParametrosByTemaId(temaId, tenantId) {
        const [rows] = await db.query(`
            SELECT p.* FROM parametros p
            INNER JOIN tema_parametro tp ON tp.parametro_id = p.id AND tp.status = 1
            WHERE tp.tema_id = ? AND p.tenant_id = ?
            ORDER BY p.name
        `, [temaId, tenantId]);
        return rows;
    }
}

module.exports = ParametroRepository;
