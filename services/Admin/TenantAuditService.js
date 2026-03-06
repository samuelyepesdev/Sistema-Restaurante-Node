const db = require('../../config/database');

class TenantAuditService {
    static async log({ tenantId = null, userId = null, accion, detalles = null }) {
        await db.query(
            'INSERT INTO tenant_audit (tenant_id, user_id, accion, detalles) VALUES (?, ?, ?, ?)',
            [tenantId, userId, accion, detalles]
        );
    }

    static async getLogsForTenant(tenantId, limit = 50) {
        const [rows] = await db.query(
            'SELECT * FROM tenant_audit WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?',
            [tenantId, limit]
        );
        return rows;
    }
}

module.exports = TenantAuditService;
