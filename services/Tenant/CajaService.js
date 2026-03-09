const CajaRepository = require('../../repositories/Tenant/CajaRepository');

class CajaService {
    static async getEstadoCaja(tenantId) {
        const sesion = await CajaRepository.getSesionAbierta(tenantId);
        if (!sesion) return { abierta: false };

        const stats = await CajaRepository.getEstadisticasSesion(sesion.id);
        const montoTeorico = parseFloat(sesion.monto_inicial) + parseFloat(stats.ventas) + parseFloat(stats.entradas) - parseFloat(stats.salidas);

        return {
            abierta: true,
            sesion: {
                ...sesion,
                ...stats,
                monto_final_teorico: montoTeorico
            }
        };
    }

    static async abrirCaja(tenantId, usuarioId, data) {
        const abierta = await CajaRepository.getSesionAbierta(tenantId);
        if (abierta) throw new Error('Ya existe un turno abierto');

        const monto = parseFloat(data.monto_inicial) || 0;
        return await CajaRepository.abrirSesion(tenantId, usuarioId, monto, data.notas);
    }

    static async cerrarCaja(tenantId, sesionId, data) {
        const montoReal = parseFloat(data.monto_final_real) || 0;
        return await CajaRepository.cerrarSesion(sesionId, tenantId, montoReal, data.notas);
    }

    static async registrarMovimiento(tenantId, sesionId, usuarioId, data) {
        return await CajaRepository.registrarMovimiento(
            tenantId,
            sesionId,
            usuarioId,
            data.tipo,
            parseFloat(data.monto),
            data.motivo
        );
    }

    static async getHistorial(tenantId) {
        return await CajaRepository.getHistorial(tenantId);
    }
}

module.exports = CajaService;
