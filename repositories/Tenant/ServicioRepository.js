/**
 * ServicioRepository - Data access for additional services (e.g. delivery)
 * Related to: app/Http/Controllers/Tenant/ServicioController.js
 */

const db = require('../../config/database');

class ServicioRepository {
    static async findAll(tenantId, filters = {}) {
        let sql = `SELECT * FROM servicios WHERE tenant_id = ?`;
        const params = [tenantId];
        
        if (filters.q && filters.q.trim()) {
            sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
            const term = '%' + filters.q.trim() + '%';
            params.push(term, term);
        }

        if (filters.activo !== undefined) {
            sql += ' AND activo = ?';
            params.push(filters.activo);
        }

        sql += ' ORDER BY nombre';
        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM servicios WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const { nombre, descripcion, precio, es_externo, activo } = data;
        const [result] = await db.query(
            `INSERT INTO servicios (tenant_id, nombre, descripcion, precio, es_externo, activo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                tenantId, nombre, descripcion || null, parseFloat(precio) || 0,
                es_externo !== undefined ? es_externo : true,
                activo !== undefined ? activo : true
            ]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const fields = [];
        const params = [];
        const allowed = ['nombre', 'descripcion', 'precio', 'es_externo', 'activo'];
        
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                params.push(data[key]);
            }
        }
        
        if (fields.length === 0) return null;
        
        params.push(id, tenantId);
        const [result] = await db.query(
            `UPDATE servicios SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
            params
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM servicios WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }

    static async getEstadisticas(tenantId) {
        const stats = {
            cantidad_usos: 0,
            dinero_generado: 0,
            mas_usados: []
        };

        try {
            // Global usage stats
            const sqlGlobal = `
                SELECT 
                    SUM(df.cantidad) as cantidad_usos,
                    SUM(df.precio_unitario * df.cantidad) as dinero_generado
                FROM detalle_factura df
                JOIN facturas f ON df.factura_id = f.id
                WHERE f.tenant_id = ? AND df.es_servicio = 1 AND f.estado != 'anulada'
            `;
            const [globalResult] = await db.query(sqlGlobal, [tenantId]);
            if (globalResult[0]) {
                stats.cantidad_usos = parseFloat(globalResult[0].cantidad_usos) || 0;
                stats.dinero_generado = parseFloat(globalResult[0].dinero_generado) || 0;
            }

            // Most used services
            const sqlPopulares = `
                SELECT 
                    s.nombre,
                    SUM(df.cantidad) as veces_usado,
                    SUM(df.precio_unitario * df.cantidad) as dinero_generado
                FROM detalle_factura df
                JOIN facturas f ON df.factura_id = f.id
                JOIN servicios s ON df.servicio_id = s.id
                WHERE f.tenant_id = ? AND df.es_servicio = 1 AND f.estado != 'anulada'
                GROUP BY s.id, s.nombre
                ORDER BY veces_usado DESC
                LIMIT 5
            `;
            const [popularesResult] = await db.query(sqlPopulares, [tenantId]);
            stats.mas_usados = popularesResult;
        } catch (e) {
            console.error('Error calculando estadisticas de servicios:', e);
        }

        return stats;
    }
}

module.exports = ServicioRepository;
