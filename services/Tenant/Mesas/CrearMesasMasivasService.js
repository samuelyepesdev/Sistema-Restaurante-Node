const db = require('../../../config/database');

class CrearMesasMasivasService {
    /**
     * @description Crea mesas en bloque autoincrementando sus números o prefijos de manera transaccional.
     */
    static async execute({ tenantId, cantidad, prefijo }) {
        if (!cantidad || cantidad < 1 || cantidad > 100) {
            throw new Error('La cantidad debe estar entre 1 y 100');
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.query('SELECT numero FROM mesas WHERE tenant_id = ?', [tenantId]);
            const existingNumbers = new Set(existing.map(m => m.numero));

            const created = [];
            const errors = [];

            let startNumber = 1;

            if (!prefijo) {
                const numericMesas = existing
                    .map(m => {
                        const num = parseInt(m.numero);
                        return isNaN(num) ? 0 : num;
                    })
                    .filter(n => n > 0);

                if (numericMesas.length > 0) {
                    startNumber = Math.max(...numericMesas) + 1;
                }
            } else {
                const prefixPattern = new RegExp(`^${prefijo}(\\d+)$`);
                const prefixedMesas = existing
                    .map(m => {
                        const match = m.numero.match(prefixPattern);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .filter(n => n > 0);

                if (prefixedMesas.length > 0) {
                    startNumber = Math.max(...prefixedMesas) + 1;
                }
            }

            for (let i = 0; i < cantidad; i++) {
                const numeroMesa = prefijo ? `${prefijo}${startNumber + i}` : String(startNumber + i);

                if (existingNumbers.has(numeroMesa)) {
                    errors.push(`Mesa ${numeroMesa} ya existe`);
                    continue;
                }

                try {
                    const [result] = await connection.query(
                        'INSERT INTO mesas (tenant_id, numero, descripcion, estado) VALUES (?, ?, ?, ?)',
                        [tenantId, numeroMesa, null, 'libre']
                    );
                    created.push({ id: result.insertId, numero: numeroMesa });
                    existingNumbers.add(numeroMesa);
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        errors.push(`Mesa ${numeroMesa} ya existe`);
                    } else {
                        throw error;
                    }
                }
            }

            await connection.commit();
            return {
                success: true,
                creadas: created.length,
                errores: errors.length,
                mesas: created,
                mensajes: errors,
                desde: prefijo ? `${prefijo}${startNumber}` : startNumber
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = CrearMesasMasivasService;
