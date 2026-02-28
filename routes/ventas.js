/**
 * Sales Routes - Refactored to use Services
 * Handles HTTP requests/responses for sales reporting
 * Related to: services/VentaService.js, views/ventas.ejs
 */

const express = require('express');
const router = express.Router();
const VentaService = require('../services/VentaService');
const ConfiguracionService = require('../services/ConfiguracionService');
const EventoService = require('../services/EventoService');
const { requirePermission } = require('../middleware/auth');
const { toFechaISOUtc } = require('../utils/dateHelpers');
const { requirePlanFeature } = require('../middleware/planFeature');
let ExcelJS; // Lazy import for Excel export

// GET /ventas - Sales page with filters and tables ready to pay (scoped by tenant)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).render('error', { error: { message: 'Contexto de tenant no disponible' } });
        }
        const filters = {
            desde: req.query.desde,
            hasta: req.query.hasta,
            q: req.query.q,
            evento_id: req.query.evento_id || null
        };
        let eventoFiltro = null;
        if (filters.evento_id) {
            const ev = await EventoService.getById(filters.evento_id, tenantId);
            if (ev) eventoFiltro = { id: ev.id, nombre: ev.nombre };
        }
        const [ventas, mesasListas] = await Promise.all([
            VentaService.getWithFilters(tenantId, filters),
            VentaService.getTablesReadyToPay(tenantId)
        ]);
        let totalEfectivo = 0, totalTransferencia = 0, totalGeneral = 0;
        (ventas || []).forEach(function (v) {
            const t = Number(v.total) || 0;
            totalGeneral += t;
            const fp = String(v.forma_pago || '').toLowerCase().trim();
            if (fp === 'efectivo') totalEfectivo += t; else if (fp === 'transferencia') totalTransferencia += t;
            v.fechaISO = toFechaISOUtc(v.fecha);
        });
        res.render('ventas', {
            ventas,
            mesasListas: mesasListas || [],
            eventoFiltro,
            totalEfectivo,
            totalTransferencia,
            totalGeneral,
            user: req.user,
            tenant: req.tenant,
            allowedByPlan: res.locals.allowedByPlan || {}
        });
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).render('error', {
            error: error,
            user: req.user
        });
    }
});

// GET /ventas/export - Export sales to Excel (plan Pro: plantillas + permiso plantillas.ver)
router.get('/export', requirePermission('plantillas.ver'), requirePlanFeature('plantillas'), async (req, res) => {
    try {
        try {
            ExcelJS = ExcelJS || require('exceljs');
        } catch (e) {
            return res.status(500).send('Exportación a Excel no disponible. Instale la dependencia con: npm install exceljs');
        }

        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(403).send('Contexto de tenant no disponible');
        }
        const filters = {
            desde: req.query.desde,
            hasta: req.query.hasta,
            q: req.query.q,
            evento_id: req.query.evento_id || null
        };
        const rows = await VentaService.getForExport(tenantId, filters);

        // Create Excel with ExcelJS
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Ventas');

        // Get configuration for header (del tenant)
        let config = null;
        try {
            config = await ConfiguracionService.getForPreview(tenantId);
        } catch (_) {
            // Config not found, continue with defaults
        }

        // Header
        const titulo = (config?.nombre_negocio || 'Reporte de Ventas');
        const subInfo = [
            config?.direccion ? config.direccion : null,
            config?.telefono ? `Tel: ${config.telefono}` : null,
            config?.nit ? `NIT: ${config.nit}` : null
        ].filter(Boolean).join('  •  ');
        const rango = `Rango: ${req.query.desde || '-'} a ${req.query.hasta || '-'}${req.query.q ? '  •  Filtro: ' + req.query.q : ''}`;

        ws.mergeCells('B1:E1');
        ws.mergeCells('B2:E2');
        ws.mergeCells('B3:E3');
        ws.getRow(1).values = ['', titulo];
        ws.getRow(2).values = ['', subInfo];
        ws.getRow(3).values = ['', rango];
        ws.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
        ws.getRow(2).font = { size: 10, color: { argb: 'FF6C757D' } };
        ws.getRow(3).font = { size: 9, color: { argb: 'FF6C757D' } };
        ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 25;

        // Table header
        ws.addRow([]);
        const headerRow = ws.addRow(['Factura #', 'Fecha', 'Cliente', 'Forma de Pago', 'Total']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF495057' } };
        headerRow.alignment = { horizontal: 'center' };

        // Data rows (numero = secuencial por tenant)
        rows.forEach(row => {
            ws.addRow([
                row.numero != null ? row.numero : row.id,
                new Date(row.fecha),
                row.cliente,
                row.forma_pago,
                parseFloat(row.total || 0)
            ]);
        });

        // Format columns
        ws.columns = [
            { key: 'numero', width: 10 },
            { key: 'fecha', width: 18 },
            { key: 'cliente', width: 30 },
            { key: 'forma_pago', width: 15 },
            { key: 'total', width: 15 }
        ];

        // Format date column
        ws.getColumn(2).numFmt = 'dd/mm/yyyy hh:mm';
        ws.getColumn(5).numFmt = '#,##0.00';

        // Format total column
        const totalRow = ws.addRow([]);
        const sumRow = ws.addRow(['', '', '', 'TOTAL:', { formula: `SUM(E6:E${ws.rowCount - 1})`, result: rows.reduce((acc, r) => acc + parseFloat(r.total || 0), 0) }]);
        sumRow.getCell(4).font = { bold: true };
        sumRow.getCell(5).font = { bold: true };
        sumRow.getCell(5).numFmt = '#,##0.00';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="ventas_${req.query.desde || 'all'}_${req.query.hasta || 'all'}.xlsx"`);
        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al exportar ventas:', error);
        res.status(500).send('Error al exportar ventas');
    }
});

module.exports = router;

