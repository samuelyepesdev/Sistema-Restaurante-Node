/**
 * RecetaRepository - Data access for recipes and recipe ingredients
 * Related to: CosteoService, routes/costeo.js
 */

const db = require('../config/database');

class RecetaRepository {
    static async findAll(tenantId) {
        const [rows] = await db.query(`
            SELECT r.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.precio_unidad AS precio_venta_actual
            FROM recetas r
            INNER JOIN productos p ON p.id = r.producto_id AND p.tenant_id = r.tenant_id
            WHERE r.tenant_id = ?
            ORDER BY r.nombre_receta
        `, [tenantId]);
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(`
            SELECT r.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.precio_unidad AS precio_venta_actual
            FROM recetas r
            INNER JOIN productos p ON p.id = r.producto_id
            WHERE r.id = ? AND r.tenant_id = ?
        `, [id, tenantId]);
        return rows[0] || null;
    }

    static async findByProductoId(productoId, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM recetas WHERE producto_id = ? AND tenant_id = ?',
            [productoId, tenantId]
        );
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const { producto_id, nombre_receta, porciones } = data;
        const [result] = await db.query(
            'INSERT INTO recetas (tenant_id, producto_id, nombre_receta, porciones) VALUES (?, ?, ?, ?)',
            [tenantId, producto_id, nombre_receta, parseFloat(porciones) || 1]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const { nombre_receta, porciones } = data;
        const [result] = await db.query(
            'UPDATE recetas SET nombre_receta = ?, porciones = ? WHERE id = ? AND tenant_id = ?',
            [nombre_receta, parseFloat(porciones) || 1, id, tenantId]
        );
        return result;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM recetas WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result;
    }

    static async getIngredientes(recetaId) {
        const [rows] = await db.query(`
            SELECT ri.*, i.nombre AS insumo_nombre, i.codigo AS insumo_codigo, i.unidad_compra, i.costo_unitario
            FROM receta_ingredientes ri
            INNER JOIN insumos i ON i.id = ri.insumo_id
            WHERE ri.receta_id = ?
            ORDER BY ri.id
        `, [recetaId]);
        return rows;
    }

    static async setIngredientes(recetaId, items) {
        const conn = await db.getConnection();
        try {
            await conn.query('DELETE FROM receta_ingredientes WHERE receta_id = ?', [recetaId]);
            if (items && items.length > 0) {
                for (const it of items) {
                    await conn.query(
                        'INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad, unidad) VALUES (?, ?, ?, ?)',
                        [recetaId, it.insumo_id, parseFloat(it.cantidad) || 0, it.unidad || 'g']
                    );
                }
            }
        } finally {
            conn.release();
        }
    }
}

module.exports = RecetaRepository;
