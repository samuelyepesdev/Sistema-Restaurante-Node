const db = require('../config/database');

class TenantService {
    static async getAllTenants() {
        const [rows] = await db.query(`
            SELECT t.id, t.nombre, t.slug, t.activo, t.config, t.plan_id, t.created_at, 
                   t.nit, t.direccion, t.telefono, t.ciudad, t.regimen_fiscal,
                   p.nombre AS plan_nombre, p.slug AS plan_slug
            FROM tenants t
            LEFT JOIN planes p ON t.plan_id = p.id
            ORDER BY t.created_at DESC
        `);
        return (rows || []).map(row => {
            let config = row.config;
            if (config && typeof config === 'string') {
                try { config = JSON.parse(config); } catch (_) { config = {}; }
            }
            return {
                id: row.id,
                nombre: row.nombre,
                slug: row.slug,
                activo: row.activo,
                config: config || {},
                plan_id: row.plan_id,
                plan_nombre: row.plan_nombre,
                plan_slug: row.plan_slug,
                nit: row.nit,
                direccion: row.direccion,
                telefono: row.telefono,
                ciudad: row.ciudad,
                regimen_fiscal: row.regimen_fiscal,
                created_at: row.created_at
            };
        });
    }

    static async createTenant(data) {
        const { nombre, slug, config = {}, activo = true, plan_id = 1 } = data;
        const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            throw new Error('El slug ya existe');
        }
        const planId = plan_id != null && plan_id !== '' ? parseInt(plan_id, 10) : 1;
        const [result] = await db.query(
            'INSERT INTO tenants (nombre, slug, config, activo, plan_id, nit, direccion, telefono, ciudad, regimen_fiscal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                nombre,
                slug,
                JSON.stringify(config),
                activo ? 1 : 0,
                planId,
                data.nit || null,
                data.direccion || null,
                data.telefono || null,
                data.ciudad || null,
                data.regimen_fiscal || 'No responsable de IVA'
            ]
        );
        const tenantId = result.insertId;

        // Seed datos iniciales (Ej: Tipos de Documento)
        try {
            await this.seedInitialData(tenantId);
        } catch (e) {
            console.error(`Error al seedear datos iniciales para tenant ${tenantId}:`, e.message);
        }

        return { id: tenantId };
    }

    static async seedInitialData(tenantId) {
        const TemaRepository = require('../repositories/TemaRepository');
        const ParametroRepository = require('../repositories/ParametroRepository');

        // 1. TIPO_DOCUMENTO
        const temaId = await TemaRepository.create(tenantId, { name: 'TIPO_DOCUMENTO', status: 1 });
        const docs = ['CC', 'NIT', 'CE', 'PA', 'TI', 'PEP'];
        for (const name of docs) {
            const pid = await ParametroRepository.create(tenantId, { name, status: 1 });
            await TemaRepository.addParametroToTema(temaId, pid);
        }
    }


    static async updateTenant(id, data) {
        const payload = [];
        const parts = [];

        const fields = ['nombre', 'activo', 'plan_id', 'nit', 'direccion', 'telefono', 'ciudad', 'regimen_fiscal'];
        fields.forEach(f => {
            if (data[f] !== undefined) {
                parts.push(`${f} = ?`);
                payload.push(f === 'activo' ? (data[f] ? 1 : 0) : data[f]);
            }
        });

        if (data.config !== undefined && data.config !== null) {
            parts.push('config = ?');
            const configStr = typeof data.config === 'string' ? data.config : JSON.stringify(data.config);
            payload.push(configStr);
        }

        if (parts.length === 0) {
            return { affectedRows: 0 };
        }

        const query = `UPDATE tenants SET ${parts.join(', ')} WHERE id = ?`;
        payload.push(id);
        const [result] = await db.query(query, payload);
        return result;
    }

    static async setTenantConfig(id, config) {
        const configStr = typeof config === 'string' ? config : JSON.stringify(config || {});
        const [result] = await db.query(
            'UPDATE tenants SET config = ? WHERE id = ?',
            [configStr, id]
        );
        return result;
    }

    static async changeTenantStatus(id, activo) {
        const [result] = await db.query(
            'UPDATE tenants SET activo = ? WHERE id = ?',
            [activo ? 1 : 0, id]
        );
        return result;
    }

    /**
     * Estadísticas para el dashboard del superadministrador.
     * @returns {Promise<{ totalRestaurantes, restaurantesActivos, restaurantesInactivos, porPlan: Array<{ plan_nombre, plan_slug, cantidad }>, totalUsuarios }>}
     */
    static async getDashboardStats() {
        const [resumen] = await db.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN t.activo = 1 THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN t.activo = 0 OR t.activo IS NULL THEN 1 ELSE 0 END) AS inactivos
            FROM tenants t
        `);
        const [porPlan] = await db.query(`
            SELECT p.nombre AS plan_nombre, p.slug AS plan_slug, p.orden, COUNT(t.id) AS cantidad
            FROM planes p
            LEFT JOIN tenants t ON t.plan_id = p.id
            WHERE p.activo = 1
            GROUP BY p.id, p.nombre, p.slug, p.orden
            ORDER BY p.orden ASC, p.nombre ASC
        `);
        const [sinPlanRow] = await db.query(`SELECT COUNT(*) AS cantidad FROM tenants WHERE plan_id IS NULL`);
        const sinPlanCount = parseInt(sinPlanRow[0]?.cantidad || 0, 10);
        const porPlanList = (porPlan || []).map(row => ({
            plan_nombre: row.plan_nombre || 'Sin plan',
            plan_slug: row.plan_slug || '',
            cantidad: parseInt(row.cantidad || 0, 10)
        }));
        if (sinPlanCount > 0) porPlanList.push({ plan_nombre: 'Sin plan', plan_slug: '', cantidad: sinPlanCount });
        const [usuariosRow] = await db.query(`
            SELECT COUNT(*) AS total FROM usuarios WHERE tenant_id IS NOT NULL
        `);
        const [facturasRows] = await db.query(`SELECT COUNT(*) AS cnt FROM facturas`);
        const [ventasMontoRows] = await db.query(`SELECT COALESCE(SUM(total), 0) AS total FROM facturas`);
        const [productosRows] = await db.query(`SELECT COUNT(*) AS cnt FROM productos WHERE tenant_id IS NOT NULL`);
        const [clientesRows] = await db.query(`SELECT COUNT(*) AS cnt FROM clientes WHERE tenant_id IS NOT NULL`);
        const [mesasRows] = await db.query(`SELECT COUNT(*) AS cnt FROM mesas WHERE tenant_id IS NOT NULL`);
        const [recientesRow] = await db.query(`
            SELECT COUNT(*) AS cantidad FROM tenants
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        const r = resumen[0] || {};
        const toNum = (val) => (val === undefined || val === null) ? 0 : (typeof val === 'bigint' ? Number(val) : parseFloat(val) || 0);
        const rowVal = (row) => (row && typeof row === 'object') ? toNum(Object.values(row)[0]) : 0;
        return {
            totalRestaurantes: parseInt(toNum(r.total ?? r.TOTAL) || 0, 10),
            restaurantesActivos: parseInt(toNum(r.activos ?? r.ACTIVOS) || 0, 10),
            restaurantesInactivos: parseInt(toNum(r.inactivos ?? r.INACTIVOS) || 0, 10),
            porPlan: porPlanList,
            totalUsuarios: parseInt(rowVal(usuariosRow?.[0]) || 0, 10),
            totalFacturas: parseInt(rowVal(facturasRows?.[0]) || 0, 10),
            totalVentasMonto: parseFloat(rowVal(ventasMontoRows?.[0]) || 0),
            totalProductos: parseInt(rowVal(productosRows?.[0]) || 0, 10),
            totalClientes: parseInt(rowVal(clientesRows?.[0]) || 0, 10),
            totalMesas: parseInt(rowVal(mesasRows?.[0]) || 0, 10),
            restaurantesUltimos30Dias: parseInt(rowVal(recientesRow?.[0]) || 0, 10)
        };
    }

    static async getTenantById(id) {
        const [rows] = await db.query(
            'SELECT t.*, p.nombre AS plan_nombre, p.slug AS plan_slug FROM tenants t LEFT JOIN planes p ON t.plan_id = p.id WHERE t.id = ?',
            [id]
        );
        const row = rows[0] || null;
        if (!row) return null;
        let config = row.config;
        if (config && typeof config === 'string') {
            try { config = JSON.parse(config); } catch (_) { config = {}; }
        }
        return {
            ...row,
            config: config || {},
            plan_nombre: row.plan_nombre,
            plan_slug: row.plan_slug
        };
    }
}

module.exports = TenantService;
