/**
 * ConfiguracionRepository - Data access layer for configuration
 * Handles all SQL queries related to print configuration
 * Related to: routes/configuracion.js, services/ConfiguracionService.js
 */

const db = require('../config/database');

class ConfiguracionRepository {
    /**
     * Get configuration (first record)
     * @returns {Promise<Object|null>} Configuration object or null
     */
    static async findOne() {
        const [config] = await db.query('SELECT * FROM configuracion_impresion LIMIT 1');
        return config[0] || null;
    }

    /**
     * Create initial configuration
     * @returns {Promise<Object>} Created configuration with insertId
     */
    static async createInitial() {
        const result = await db.query(`
            INSERT INTO configuracion_impresion 
            (nombre_negocio, direccion, telefono, pie_pagina) 
            VALUES 
            ('Mi Negocio', 'Dirección del Negocio', 'Teléfono', '¡Gracias por su compra!')
        `);
        return result;
    }

    /**
     * Create new configuration
     * @param {Object} configData - Configuration data
     * @returns {Promise<Object>} Created configuration with insertId
     */
    static async create(configData) {
        const {
            nombre_negocio, direccion, telefono, nit, pie_pagina,
            ancho_papel, font_size, logo_data, logo_tipo, qr_data, qr_tipo
        } = configData;

        let sql = `
            INSERT INTO configuracion_impresion 
            (nombre_negocio, direccion, telefono, nit, pie_pagina, ancho_papel, font_size
        `;
        const values = [nombre_negocio, direccion || null, telefono || null, nit || null, pie_pagina || null, ancho_papel || 80, font_size || 1];

        if (logo_data) {
            sql += ', logo_data, logo_tipo';
            values.push(logo_data, logo_tipo);
        }
        if (qr_data) {
            sql += ', qr_data, qr_tipo';
            values.push(qr_data, qr_tipo);
        }
        sql += ') VALUES (' + values.map(() => '?').join(',') + ')';

        const result = await db.query(sql, values);
        return result;
    }

    /**
     * Update configuration
     * @param {number} id - Configuration ID
     * @param {Object} configData - Configuration data to update
     * @returns {Promise<Object>} Update result
     */
    static async update(id, configData) {
        const {
            nombre_negocio, direccion, telefono, nit, pie_pagina,
            ancho_papel, font_size, logo_data, logo_tipo, qr_data, qr_tipo
        } = configData;

        let sql = `
            UPDATE configuracion_impresion 
            SET nombre_negocio = ?, direccion = ?, telefono = ?, nit = ?,
                pie_pagina = ?, ancho_papel = ?, font_size = ?
        `;
        const values = [nombre_negocio, direccion || null, telefono || null, nit || null, pie_pagina || null, ancho_papel || 80, font_size || 1];

        if (logo_data) {
            sql += ', logo_data = ?, logo_tipo = ?';
            values.push(logo_data, logo_tipo);
        }
        if (qr_data) {
            sql += ', qr_data = ?, qr_tipo = ?';
            values.push(qr_data, qr_tipo);
        }
        sql += ' WHERE id = ?';
        values.push(id);

        const result = await db.query(sql, values);
        return result;
    }
}

module.exports = ConfiguracionRepository;

