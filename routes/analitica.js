/**
 * Rutas de Analítica y Predicción (plan Premium)
 * Requiere plan con módulo 'analitica'; la pestaña Predicción requiere 'prediccion_ml'.
 */

const express = require('express');
const router = express.Router();
const AnaliticaService = require('../services/AnaliticaService');
const { requireRole } = require('../middleware/auth');

// Path puede ser '' o '/' según cómo Express pasa la ruta montada
router.get(['/', ''], requireRole('admin'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });
        }
        const data = await AnaliticaService.getAnaliticaCompleta(tenantId);
        const allowedByPlan = res.locals.allowedByPlan || {};
        const tienePermisoPrediccion = req.user.permisos && req.user.permisos.includes('prediccion.ver');
        const canShowPrediccion = allowedByPlan.prediccion_ml === true || tienePermisoPrediccion;
        res.render('analitica', {
            user: req.user,
            tenant: req.tenant,
            allowedByPlan,
            canShowPrediccion: !!canShowPrediccion,
            resumen: data.resumen,
            prediccion: data.prediccion
        });
    } catch (error) {
        console.error('Error al cargar analítica:', error);
        res.status(500).render('error', { error: { message: 'Error al cargar analítica', stack: error.stack } });
    }
});

router.get('/datos', requireRole('admin'), async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Contexto de tenant no disponible' });
        }
        const data = await AnaliticaService.getAnaliticaCompleta(tenantId);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener datos de analítica:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

module.exports = router;
