const express = require('express');
const router = express.Router();
const db = require('../db');

// Ruta principal de ventas con filtros opcionales por fecha
router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT f.*, c.nombre as cliente_nombre
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Aplicar filtros de fecha si existen
        if (req.query.desde && req.query.hasta) {
            query += ` AND DATE(f.fecha) BETWEEN ? AND ?`;
            params.push(req.query.desde, req.query.hasta);
        }

        // Ordenar por fecha descendente
        if (req.query.q) {
            query += ` AND (c.nombre LIKE ? OR f.id LIKE ?)`;
            const term = `%${req.query.q}%`;
            params.push(term, term);
        }

        query += ` ORDER BY f.fecha DESC`;

        const [ventas] = await db.query(query, params);
        res.render('ventas', { ventas });
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).send('Error al cargar el historial de ventas');
    }
});

// GET /ventas/export - Exportar CSV por rango y búsqueda
router.get('/export', async (req, res) => {
    try {
        // Lazy import para no romper el arranque si falta la dependencia
        let ExcelJS;
        try {
            ExcelJS = require('exceljs');
        } catch (e) {
            return res.status(500).send('Exportación a Excel no disponible. Instale la dependencia con: npm install exceljs');
        }
        let query = `
            SELECT f.id, f.fecha, c.nombre as cliente, f.forma_pago, f.total
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (req.query.desde && req.query.hasta) {
            query += ` AND DATE(f.fecha) BETWEEN ? AND ?`;
            params.push(req.query.desde, req.query.hasta);
        }
        if (req.query.q) {
            query += ` AND (c.nombre LIKE ? OR f.id LIKE ?)`;
            const term = `%${req.query.q}%`;
            params.push(term, term);
        }
        query += ` ORDER BY f.fecha DESC`;

        const [rows] = await db.query(query, params);

        // Crear Excel con ExcelJS
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Ventas');

        // Traer configuración para encabezado (nombre, logo, etc.)
        let config = null;
        try {
            const [cfg] = await db.query('SELECT * FROM configuracion_impresion LIMIT 1');
            config = (cfg && cfg[0]) ? cfg[0] : null;
        } catch (_) {}

        // Encabezado superior elegante
        const titulo = (config?.nombre_negocio || 'Reporte de Ventas');
        const subInfo = [
            config?.direccion ? config.direccion : null,
            config?.telefono ? `Tel: ${config.telefono}` : null,
            config?.nit ? `NIT: ${config.nit}` : null
        ].filter(Boolean).join('  •  ');
        const rango = `Rango: ${req.query.desde || '-'} a ${req.query.hasta || '-'}${req.query.q ? '  •  Filtro: ' + req.query.q : ''}`;

        // Mover título a partir de la columna B para dejar el logo en A
        ws.mergeCells('B1:E1');
        ws.mergeCells('B2:E2');
        ws.mergeCells('B3:E3');
        ws.getRow(1).values = ['', titulo];
        ws.getRow(2).values = ['', subInfo];
        ws.getRow(3).values = ['', rango];
        ws.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } }; // azul bootstrap
        ws.getRow(2).font = { color: { argb: 'FF0D6EFD' } };
        ws.getRow(2).alignment = { horizontal: 'center' };
        ws.getRow(3).font = { italic: true, color: { argb: 'FF495057' } };
        ws.getRow(3).alignment = { horizontal: 'center' };
        ws.getRow(1).height = 24; ws.getRow(2).height = 18; ws.getRow(3).height = 18;
        ws.addRow([]); // fila 4 separadora

        // Logo si existe
        if (config?.logo_data) {
            try {
                const ext = (config.logo_tipo || '').includes('png') ? 'png' : 'jpeg';
                const imgId = wb.addImage({ buffer: Buffer.from(config.logo_data), extension: ext });
                ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 60 } });
            } catch (_) {}
        }

        // Crear encabezado de columnas manual (fila siguiente disponible)
        const headerRow = ws.addRow(['Factura #','Fecha','Cliente','Forma de Pago','Total']);
        headerRow.font = { bold: true, color: { argb: 'FF212529' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
        headerRow.border = { bottom: { style: 'thin', color: { argb: 'FFADB5BD' } } };
        // Anchos de columnas
        ws.getColumn(1).width = 12;
        ws.getColumn(2).width = 22;
        ws.getColumn(3).width = 32;
        ws.getColumn(4).width = 18;
        ws.getColumn(5).width = 14;

        // Datos y totales
        let totalEfectivo = 0, totalTransferencia = 0, totalGeneral = 0;
        rows.forEach(r => {
            const fecha = new Date(r.fecha);
            const total = Number(r.total || 0);
            totalGeneral += total;
            if ((r.forma_pago || '') === 'efectivo') totalEfectivo += total; else if ((r.forma_pago || '') === 'transferencia') totalTransferencia += total;
            ws.addRow([
                r.id,
                fecha.toLocaleString(),
                r.cliente || '',
                (r.forma_pago || '').charAt(0).toUpperCase() + (r.forma_pago || '').slice(1),
                total
            ]);
        });

        // Zebra striping para legibilidad
        const firstDataRow = headerRow.number + 1;
        for (let r = firstDataRow; r <= ws.rowCount; r++) {
            if ((r - firstDataRow) % 2 === 0) {
                ws.getRow(r).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
        }
        ws.getColumn(2).alignment = { horizontal: 'left' };
        ws.getColumn(5).alignment = { horizontal: 'right' };
        ws.getColumn(5).numFmt = '[$$-409]#,##0.00';

        // Totales
        const start = ws.rowCount + 2;
        ws.addRow([]);
        ws.addRow(['', '', 'Total Efectivo:', '', totalEfectivo]).font = { bold: true };
        ws.addRow(['', '', 'Total Transferencia:', '', totalTransferencia]).font = { bold: true };
        ws.addRow(['', '', 'Total General:', '', totalGeneral]).font = { bold: true };
        for (let i = start; i <= ws.rowCount; i++) {
            ws.getRow(i).getCell(5).numFmt = '[$$-409]#,##0.00';
            ws.getRow(i).getCell(3).alignment = { horizontal: 'right' };
        }

        // Congelar hasta la fila del encabezado
        ws.views = [{ state: 'frozen', ySplit: headerRow.number }];

        // Auto-ajustar ancho de columnas (mín 10, máx 40)
        const minW = 10, maxW = 40;
        ws.columns.forEach((col, idx) => {
            let max = 0;
            col.eachCell({ includeEmpty: false }, cell => {
                const v = cell.value;
                const len = (v && v.toString) ? v.toString().length : 0;
                if (len > max) max = len;
            });
            col.width = Math.max(minW, Math.min(maxW, max + 2));
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="ventas.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al exportar ventas:', error);
        res.status(500).send('Error al exportar');
    }
});

module.exports = router; 