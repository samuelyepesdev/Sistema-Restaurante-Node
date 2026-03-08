const db = require('../../config/database');

class ProveedorService {
    static async getAll(tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM proveedores WHERE tenant_id = ? ORDER BY nombre ASC',
            [tenantId]
        );
        return rows;
    }

    static async getById(id, tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM proveedores WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        if (rows.length === 0) throw new Error('Proveedor no encontrado');
        return rows[0];
    }

    static async create(tenantId, data) {
        const { nombre, nit, contacto, telefono, email, direccion } = data;
        if (!nombre) throw new Error('El nombre es requerido');

        const [result] = await db.query(
            `INSERT INTO proveedores (tenant_id, nombre, nit, contacto, telefono, email, direccion) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, nombre, nit, contacto, telefono, email, direccion]
        );
        return { id: result.insertId, message: 'Proveedor creado correctamente' };
    }

    static async update(id, tenantId, data) {
        const { nombre, nit, contacto, telefono, email, direccion, activo } = data;
        if (!nombre) throw new Error('El nombre es requerido');

        const [result] = await db.query(
            `UPDATE proveedores SET 
                nombre = ?, nit = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, activo = ?
             WHERE id = ? AND tenant_id = ?`,
            [nombre, nit, contacto, telefono, email, direccion, activo !== undefined ? activo : 1, id, tenantId]
        );

        if (result.affectedRows === 0) throw new Error('Proveedor no encontrado');
        return { message: 'Proveedor actualizado correctamente' };
    }

    static async delete(id, tenantId) {
        // Verificar si tiene insumos asociados
        const [insumos] = await db.query('SELECT id FROM insumos WHERE proveedor_id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
        if (insumos.length > 0) throw new Error('No se puede eliminar el proveedor porque tiene insumos asociados');

        // Verificar si tiene movimientos asociados
        const [movs] = await db.query('SELECT id FROM movimientos_inventario WHERE proveedor_id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
        if (movs.length > 0) throw new Error('No se puede eliminar el proveedor porque tiene movimientos de inventario asociados');

        const [result] = await db.query('DELETE FROM proveedores WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if (result.affectedRows === 0) throw new Error('Proveedor no encontrado');
        return { message: 'Proveedor eliminado correctamente' };
    }
}

module.exports = ProveedorService;
