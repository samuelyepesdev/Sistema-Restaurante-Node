const express = require('express');
const router = express.Router();
const db = require('../config/database');
let ExcelJS; // import perezoso para template/import

// GET /productos - Mostrar página de productos
router.get('/', async (req, res) => {
    try {
        const [productos] = await db.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            ORDER BY p.nombre
        `);
        const [categorias] = await db.query('SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre');
        res.render('productos', { 
            productos: productos || [],
            categorias: categorias || [],
            user: req.user
        });
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

// GET /productos/categorias - Obtener todas las categorías
router.get('/categorias', async (req, res) => {
    try {
        const [categorias] = await db.query('SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre');
        res.json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
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
        const [productos] = await db.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.id = ?
        `, [req.params.id]);
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
        const { codigo, nombre, precio_unidad, categoria_id } = req.body;
        
        // Validar datos
        if (!codigo || !nombre) {
            return res.status(400).json({ error: 'El código y nombre son requeridos' });
        }

        const result = await db.query(
            'INSERT INTO productos (codigo, nombre, precio_unidad, categoria_id) VALUES (?, ?, ?, ?)',
            [codigo, nombre, precio_unidad || 0, categoria_id || 1]
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
        const { codigo, nombre, precio_unidad, categoria_id } = req.body;
        
        // Validar datos
        if (!codigo || !nombre) {
            return res.status(400).json({ error: 'El código y nombre son requeridos' });
        }

        const result = await db.query(
            'UPDATE productos SET codigo = ?, nombre = ?, precio_unidad = ?, categoria_id = ? WHERE id = ?',
            [codigo, nombre, precio_unidad || 0, categoria_id || 1, req.params.id]
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
        ws.addRow(['2) Columnas obligatorias: codigo, nombre, categoria. El precio puede ser 0.']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['3) Use punto como decimal (ej: 1234.56).']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['4) El código debe ser único. Si ya existe, se actualizarán datos.']).font = { color: { argb: 'FF495057' } };
        ws.addRow(['5) Categorías disponibles: Bebidas, Postres, Comidas, Acompañamientos, Extras']).font = { color: { argb: 'FF495057' } };
        ws.getColumn(1).width = 80;
        ws.addRow([]);

        // Get categorías for examples (not used but kept for future use)
        // const [categorias] = await db.query('SELECT nombre FROM categorias WHERE activa = 1 ORDER BY nombre');

        const table = wb.addWorksheet('Productos');
        table.columns = [
            { header: 'codigo', key: 'codigo', width: 18 },
            { header: 'nombre', key: 'nombre', width: 32 },
            { header: 'categoria', key: 'categoria', width: 20 },
            { header: 'precio_unidad', key: 'precio_unidad', width: 14 }
        ];
        const headerRow = table.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
        table.views = [{ state: 'frozen', ySplit: 1 }];

        // Ejemplos
        table.addRow({ codigo: 'P001', nombre: 'CocaCola 400ml', categoria: 'Bebidas', precio_unidad: 2500 });
        table.addRow({ codigo: 'P002', nombre: 'Tres Leches', categoria: 'Postres', precio_unidad: 8000 });
        table.addRow({ codigo: 'P003', nombre: 'Bandeja Paisa', categoria: 'Comidas', precio_unidad: 25000 });

        // Validaciones (toda la columna a partir de fila 2)
        table.dataValidations.add('A2:A1048576', { type: 'textLength', operator: 'greaterThan', formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: 'Código requerido', error: 'Ingrese un código' });
        table.dataValidations.add('B2:B1048576', { type: 'textLength', operator: 'greaterThan', formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: 'Nombre requerido', error: 'Ingrese el nombre' });
        table.dataValidations.add('C2:C1048576', { type: 'textLength', operator: 'greaterThan', formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: 'Categoría requerida', error: 'Ingrese una categoría' });
        table.dataValidations.add('D2:D1048576', { type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true, showErrorMessage: true, errorTitle: 'Precio inválido', error: 'Debe ser número ≥ 0 (use punto decimal)' });

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

        const header = ['codigo','nombre','categoria','precio_unidad'];
        const rows = [];
        ws.eachRow((row, idx) => {
            if (idx === 1) return; // encabezado
            const r = header.reduce((acc, key, i) => { acc[key] = row.getCell(i+1).value || ''; return acc; }, {});
            if (!r.codigo || !r.nombre || !r.categoria) return;
            rows.push({
                codigo: String(r.codigo).trim(),
                nombre: String(r.nombre).trim(),
                categoria: String(r.categoria).trim(),
                precio_unidad: Number(r.precio_unidad||0)
            });
        });

        if (rows.length === 0) return res.status(400).json({ error: 'No hay registros válidos' });

        // Get categorías map
        const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE activa = 1');
        const categoriaMap = {};
        categorias.forEach(c => { categoriaMap[c.nombre.toLowerCase()] = c.id; });

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const p of rows) {
                const categoriaId = categoriaMap[p.categoria.toLowerCase()] || 1; // Default to first category if not found
                await connection.query(
                    'INSERT INTO productos (codigo, nombre, categoria_id, precio_unidad) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), categoria_id=VALUES(categoria_id), precio_unidad=VALUES(precio_unidad)',
                    [p.codigo, p.nombre, categoriaId, p.precio_unidad]
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