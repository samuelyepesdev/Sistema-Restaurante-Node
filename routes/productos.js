const express = require('express');
const router = express.Router();
const db = require('../db');
let ExcelJS; // import perezoso para template/import

// GET /productos - Mostrar página de productos
router.get('/', async (req, res) => {
    try {
        const [productos] = await db.query('SELECT * FROM productos ORDER BY nombre');
        res.render('productos', { productos: productos || [] });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).render('error', { 
            error: {
                message: 'Error al obtener productos',
                stack: error.stack
            }
        });
    }
});

// GET /productos/buscar - Buscar productos
router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q || '';
        const sql = `
            SELECT * FROM productos 
            WHERE nombre LIKE ? OR codigo LIKE ?
            ORDER BY nombre
            LIMIT 10
        `;
        const searchTerm = `%${query}%`;
        const [productos] = await db.query(sql, [searchTerm, searchTerm]);
        res.json(productos);
    } catch (error) {
        console.error('Error al buscar productos:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
});

// GET /productos/:id - Obtener un producto específico
router.get('/:id(\\d+)', async (req, res) => {
    try {
        const [productos] = await db.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
        const producto = productos[0];
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// POST /productos - Crear nuevo producto
router.post('/', async (req, res) => {
    try {
        const { codigo, nombre, precio_kg, precio_unidad, precio_libra } = req.body;
        
        // Validar datos
        if (!codigo || !nombre) {
            return res.status(400).json({ error: 'El código y nombre son requeridos' });
        }

        const result = await db.query(
            'INSERT INTO productos (codigo, nombre, precio_kg, precio_unidad, precio_libra) VALUES (?, ?, ?, ?, ?)',
            [codigo, nombre, precio_kg || 0, precio_unidad || 0, precio_libra || 0]
        );

        res.status(201).json({ 
            id: result.insertId,
            message: 'Producto creado exitosamente' 
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un producto con ese código' });
        }
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT /productos/:id - Actualizar producto
router.put('/:id', async (req, res) => {
    try {
        const { codigo, nombre, precio_kg, precio_unidad, precio_libra } = req.body;
        
        // Validar datos
        if (!codigo || !nombre) {
            return res.status(400).json({ error: 'El código y nombre son requeridos' });
        }

        const result = await db.query(
            'UPDATE productos SET codigo = ?, nombre = ?, precio_kg = ?, precio_unidad = ?, precio_libra = ? WHERE id = ?',
            [codigo, nombre, precio_kg || 0, precio_unidad || 0, precio_libra || 0, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un producto con ese código' });
        }
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /productos/:id - Eliminar producto
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router; 

// Rutas adicionales para import/export masivo - se montan en el mismo archivo
router.get('/plantilla', async (req, res) => {
    try {
        try { ExcelJS = ExcelJS || require('exceljs'); } catch (e) { return res.status(500).send('Instale exceljs para generar la plantilla'); }

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Instrucciones');
        ws.addRow(['PLANTILLA DE PRODUCTOS']).font = { bold: true, size: 16 };
        ws.addRow(['1) No cambie los encabezados de la hoja "Productos".']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['2) Columnas obligatorias: codigo, nombre. Los precios pueden ser 0.']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['3) Use punto como decimal (ej: 1234.56).']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['4) El código debe ser único. Si ya existe, se actualizarán precios/nombre.']).font = { color: { argb: 'FF495057' } };
        ws.getColumn(1).width = 80;
        ws.addRow([]);

        const table = wb.addWorksheet('Productos');
        table.columns = [
            { header: 'codigo', key: 'codigo', width: 18 },
            { header: 'nombre', key: 'nombre', width: 32 },
            { header: 'precio_kg', key: 'precio_kg', width: 14 },
            { header: 'precio_unidad', key: 'precio_unidad', width: 14 },
            { header: 'precio_libra', key: 'precio_libra', width: 14 }
        ];
        const headerRow = table.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
        table.views = [{ state: 'frozen', ySplit: 1 }];

        // Ejemplos
        table.addRow({ codigo: 'P001', nombre: 'Manzana Roja', precio_kg: 8500, precio_unidad: 1500, precio_libra: 4200 });
        table.addRow({ codigo: 'P002', nombre: 'CocaCola 400ml', precio_kg: 0, precio_unidad: 2500, precio_libra: 0 });
        table.addRow({ codigo: 'P003', nombre: 'Queso Campesino', precio_kg: 18000, precio_unidad: 0, precio_libra: 9000 });

        // Validaciones (toda la columna a partir de fila 2)
        table.dataValidations.add('A2:A1048576', { type: 'textLength', operator: 'greaterThan', formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: 'Código requerido', error: 'Ingrese un código' });
        table.dataValidations.add('B2:B1048576', { type: 'textLength', operator: 'greaterThan', formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: 'Nombre requerido', error: 'Ingrese el nombre' });
        ['C','D','E'].forEach(col => {
            table.dataValidations.add(`${col}2:${col}1048576`, { type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true, showErrorMessage: true, errorTitle: 'Precio inválido', error: 'Debe ser número ≥ 0 (use punto decimal)' });
        });

        res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition','attachment; filename="plantilla_productos.xlsx"');
        await wb.xlsx.write(res); res.end();
    } catch (e) { console.error(e); res.status(500).send('No se pudo generar la plantilla'); }
});

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

router.post('/importar', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
        try { ExcelJS = ExcelJS || require('exceljs'); } catch (e) { return res.status(500).json({ error: 'Instale exceljs para importar' }); }

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);
        const ws = wb.getWorksheet('Productos') || wb.worksheets[0];
        if (!ws) return res.status(400).json({ error: 'Hoja Productos no encontrada' });

        const header = ['codigo','nombre','precio_kg','precio_unidad','precio_libra'];
        const colIdx = header.map((h,i)=> i+1);
        const rows = [];
        ws.eachRow((row, idx) => {
            if (idx === 1) return; // encabezado
            const r = header.reduce((acc, key, i) => { acc[key] = row.getCell(i+1).value || ''; return acc; }, {});
            if (!r.codigo || !r.nombre) return;
            rows.push({
                codigo: String(r.codigo).trim(),
                nombre: String(r.nombre).trim(),
                precio_kg: Number(r.precio_kg||0),
                precio_unidad: Number(r.precio_unidad||0),
                precio_libra: Number(r.precio_libra||0)
            });
        });

        if (rows.length === 0) return res.status(400).json({ error: 'No hay registros válidos' });

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const p of rows) {
                await connection.query(
                    'INSERT INTO productos (codigo, nombre, precio_kg, precio_unidad, precio_libra) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), precio_kg=VALUES(precio_kg), precio_unidad=VALUES(precio_unidad), precio_libra=VALUES(precio_libra)',
                    [p.codigo, p.nombre, p.precio_kg, p.precio_unidad, p.precio_libra]
                );
            }
            await connection.commit();
        } catch (e) { await connection.rollback(); throw e; }
        finally { connection.release(); }

        res.json({ inserted: rows.length });
    } catch (e) {
        console.error('Error al importar:', e);
        res.status(500).json({ error: 'Error al importar productos' });
    }
});