/**
 * ConfiguracionCosteoRepository - Config for indirect costs and pricing
 * Related to: CosteoService, routes/costeo.js
 */

const db = require('../config/database');

class ConfiguracionCosteoRepository {
    static async findOne(tenantId) {
        const [rows] = await db.query(
            'SELECT * FROM configuracion_costeo WHERE tenant_id = ? LIMIT 1',
            [tenantId]
        );
        return rows[0] || null;
    }

    static async create(tenantId, data) {
        const {
            metodo_indirectos = 'porcentaje',
            porcentaje_indirectos = 35,
            costo_fijo_mensual = 0,
            platos_estimados_mes = 500,
            factor_carga = 2.5,
            margen_objetivo_default = 60
        } = data || {};
        const [result] = await db.query(
            `INSERT INTO configuracion_costeo 
             (tenant_id, metodo_indirectos, porcentaje_indirectos, costo_fijo_mensual, platos_estimados_mes, factor_carga, margen_objetivo_default) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, metodo_indirectos, porcentaje_indirectos, costo_fijo_mensual, platos_estimados_mes, factor_carga, margen_objetivo_default]
        );
        return result.insertId;
    }

    static async update(tenantId, data) {
        const {
            metodo_indirectos,
            porcentaje_indirectos,
            costo_fijo_mensual,
            platos_estimados_mes,
            factor_carga,
            margen_objetivo_default
        } = data;
        const [result] = await db.query(
            `UPDATE configuracion_costeo SET 
             metodo_indirectos = COALESCE(?, metodo_indirectos),
             porcentaje_indirectos = COALESCE(?, porcentaje_indirectos),
             costo_fijo_mensual = COALESCE(?, costo_fijo_mensual),
             platos_estimados_mes = COALESCE(?, platos_estimados_mes),
             factor_carga = COALESCE(?, factor_carga),
             margen_objetivo_default = COALESCE(?, margen_objetivo_default)
             WHERE tenant_id = ?`,
            [metodo_indirectos, porcentaje_indirectos, costo_fijo_mensual, platos_estimados_mes, factor_carga, margen_objetivo_default, tenantId]
        );
        return result;
    }

    static async upsert(tenantId, data) {
        const existing = await this.findOne(tenantId);
        if (existing) {
            await this.update(tenantId, data);
            return existing.id;
        }
        return await this.create(tenantId, data);
    }
}

module.exports = ConfiguracionCosteoRepository;
