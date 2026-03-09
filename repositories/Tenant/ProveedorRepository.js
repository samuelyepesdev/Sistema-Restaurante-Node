const db = require('../../config/database');

class ProveedorRepository {
    static async findAll(tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM proveedores WHERE tenant_id = ? ORDER BY nombre ASC',
            [tenantId]
        );
        return rows;
    }

    static async findById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM proveedores WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const { nombre, nit, contacto, telefono, email, direccion } = data;
        const [result] = await db.query(
            `INSERT INTO proveedores (tenant_id, nombre, nit, contacto, telefono, email, direccion) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, nombre, nit, contacto, telefono, email, direccion]
        );
        return result.insertId;
    }

    static async update(id, tenantId, data) {
        const { nombre, nit, contacto, telefono, email, direccion, activo } = data;
        const [result] = await db.query(
            `UPDATE proveedores SET 
                nombre = ?, nit = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, activo = ?
             WHERE id = ? AND tenant_id = ?`,
            [nombre, nit, contacto, telefono, email, direccion, activo !== undefined ? activo : 1, id, tenantId]
        );
        return result.affectedRows;
    }

    static async delete(id, tenantId) {
        const [result] = await db.query('DELETE FROM proveedores WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        return result.affectedRows;
    }

    static async hasInsumos(id, tenantId) {
        const [rows] = await db.query('SELECT id FROM insumos WHERE proveedor_id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
        return rows.length > 0;
    }

    static async hasMovimientos(id, tenantId) {
        const [rows] = await db.query('SELECT id FROM movimientos_inventario WHERE proveedor_id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
        return rows.length > 0;
    }
}

module.exports = ProveedorRepository;
