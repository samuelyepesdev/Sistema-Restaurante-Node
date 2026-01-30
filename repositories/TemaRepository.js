/**
 * TemaRepository - Data access for temas (e.g. Unidades de masa, Alimentos)
 * Related to: ParametroRepository, tema_parametro
 */

const db = require('../config/database');

class TemaRepository {
    static async findAll(tenantId, activeOnly = true) {
        let sql = 'SELECT * FROM temas WHERE tenant_id = ?';
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
            'SELECT * FROM temas WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async findByName(name, tenantId, excludeId = null) {
        let sql = 'SELECT id FROM temas WHERE tenant_id = ? AND name = ?';
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
            'INSERT INTO temas (tenant_id, name, status) VALUES (?, ?, ?)',
            [tenantId, data.name.trim(), data.status !== undefined ? data.status : 1]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const [result] = await db.query(
            'UPDATE temas SET name = ?, status = COALESCE(?, status) WHERE id = ? AND tenant_id = ?',
            [data.name.trim(), data.status, id, tenantId]
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM temas WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }

    static async getParametros(temaId, tenantId) {
        const [rows] = await db.query(`
            SELECT p.* FROM parametros p
            INNER JOIN tema_parametro tp ON tp.parametro_id = p.id AND tp.status = 1
            WHERE tp.tema_id = ? AND p.tenant_id = ?
            ORDER BY p.name
        `, [temaId, tenantId]);
        return rows;
    }

    static async setParametros(temaId, parametroIds) {
        const conn = await db.getConnection();
        try {
            await conn.query('DELETE FROM tema_parametro WHERE tema_id = ?', [temaId]);
            if (parametroIds && parametroIds.length > 0) {
                for (const pid of parametroIds) {
                    await conn.query(
                        'INSERT INTO tema_parametro (tema_id, parametro_id, status) VALUES (?, ?, 1)',
                        [temaId, pid]
                    );
                }
            }
        } finally {
            conn.release();
        }
    }

    static async addParametroToTema(temaId, parametroId) {
        const [result] = await db.query(
            'INSERT IGNORE INTO tema_parametro (tema_id, parametro_id, status) VALUES (?, ?, 1)',
            [temaId, parametroId]
        );
        return result;
    }

    static async removeParametroFromTema(temaId, parametroId) {
        const [result] = await db.query(
            'DELETE FROM tema_parametro WHERE tema_id = ? AND parametro_id = ?',
            [temaId, parametroId]
        );
        return result;
    }
}

module.exports = TemaRepository;
