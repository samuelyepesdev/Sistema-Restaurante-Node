/**
 * ProductoParametroRepository - Links products to parametros (e.g. product "Coca" -> parametro "bebidas")
 * Related to: ParametroRepository, productos
 */

const db = require('../../config/database');

class ProductoParametroRepository {
    static async getParametrosByProductoId(productoId, tenantId) {
        const [rows] = await db.query(`
            SELECT p.* FROM parametros p
            INNER JOIN producto_parametro pp ON pp.parametro_id = p.id
            INNER JOIN productos prod ON prod.id = pp.producto_id AND prod.tenant_id = ?
            WHERE pp.producto_id = ?
            ORDER BY p.name
        `, [tenantId, productoId]);
        return rows;
    }

    static async setParametrosForProducto(productoId, parametroIds) {
        const conn = await db.getConnection();
        try {
            await conn.query('DELETE FROM producto_parametro WHERE producto_id = ?', [productoId]);
            if (parametroIds && parametroIds.length > 0) {
                for (const pid of parametroIds) {
                    await conn.query(
                        'INSERT INTO producto_parametro (producto_id, parametro_id) VALUES (?, ?)',
                        [productoId, pid]
                    );
                }
            }
        } finally {
            conn.release();
        }
    }

    static async getProductoIdsByParametroId(parametroId, tenantId) {
        const [rows] = await db.query(`
            SELECT pp.producto_id FROM producto_parametro pp
            INNER JOIN productos p ON p.id = pp.producto_id AND p.tenant_id = ?
            WHERE pp.parametro_id = ?
        `, [tenantId, parametroId]);
        return rows.map(r => r.producto_id);
    }
}

module.exports = ProductoParametroRepository;
