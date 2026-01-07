/**
 * MesaRepository - Data access layer for tables
 * Handles all SQL queries related to tables
 * Related to: routes/mesas.js, services/MesaService.js
 */

const db = require('../config/database');

class MesaRepository {
    /**
     * Get all tables with open orders count
     * @returns {Promise<Array>} Array of tables
     */
    static async findAllWithOrdersCount() {
        const [mesas] = await db.query(`
            SELECT m.*, (
                SELECT COUNT(*) FROM pedidos p 
                WHERE p.mesa_id = m.id AND p.estado NOT IN ('cerrado','cancelado')
            ) AS pedidos_abiertos
            FROM mesas m
            ORDER BY CAST(m.numero AS UNSIGNED), m.numero
        `);
        return mesas;
    }

    /**
     * Find table by ID
     * @param {number} id - Table ID
     * @returns {Promise<Object|null>} Table object or null
     */
    static async findById(id) {
        const [mesas] = await db.query('SELECT * FROM mesas WHERE id = ?', [id]);
        return mesas[0] || null;
    }

    /**
     * Find table by number
     * @param {string} numero - Table number
     * @returns {Promise<Object|null>} Table object or null
     */
    static async findByNumber(numero) {
        const [mesas] = await db.query('SELECT * FROM mesas WHERE numero = ?', [numero]);
        return mesas[0] || null;
    }

    /**
     * Get all table numbers
     * @returns {Promise<Array>} Array of table numbers
     */
    static async getAllNumbers() {
        const [mesas] = await db.query('SELECT numero FROM mesas');
        return mesas;
    }

    /**
     * Create a new table
     * @param {Object} mesaData - Table data
     * @param {string} mesaData.numero - Table number
     * @param {string} mesaData.descripcion - Table description (optional)
     * @returns {Promise<Object>} Created table with insertId
     */
    static async create(mesaData) {
        const { numero, descripcion } = mesaData;
        const [result] = await db.query(
            'INSERT INTO mesas (numero, descripcion, estado) VALUES (?, ?, ?)',
            [String(numero), descripcion || null, 'libre']
        );
        return result;
    }

    /**
     * Bulk create tables
     * @param {Array<Object>} mesas - Array of table objects
     * @returns {Promise<Object>} Result with created and errors arrays
     */
    static async bulkCreate(mesas) {
        const connection = await db.getConnection();
        const created = [];
        const errors = [];

        try {
            await connection.beginTransaction();

            for (const mesa of mesas) {
                try {
                    const [result] = await connection.query(
                        'INSERT INTO mesas (numero, descripcion, estado) VALUES (?, ?, ?)',
                        [mesa.numero, mesa.descripcion || null, 'libre']
                    );
                    created.push({ id: result.insertId, numero: mesa.numero });
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        errors.push(`Mesa ${mesa.numero} ya existe`);
                    } else {
                        errors.push(`Error al crear mesa ${mesa.numero}: ${error.message}`);
                    }
                }
            }

            await connection.commit();
            connection.release();

            return { created, errors };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Update table state
     * @param {number} id - Table ID
     * @param {string} estado - New state
     * @returns {Promise<Object>} Update result
     */
    static async updateEstado(id, estado) {
        const result = await db.query('UPDATE mesas SET estado = ? WHERE id = ?', [estado, id]);
        return result;
    }
}

module.exports = MesaRepository;

