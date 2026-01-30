/**
 * Costeo Routes - Insumos, recetas y configuración de costeo
 * Related to: InsumoService, RecetaService, CosteoService, views/costeo.ejs
 */

const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const InsumoService = require('../services/InsumoService');
const RecetaService = require('../services/RecetaService');
const CosteoService = require('../services/CosteoService');
const ProductService = require('../services/ProductService');
const TemaService = require('../services/TemaService');
const ParametroService = require('../services/ParametroService');
const ProductoParametroRepository = require('../repositories/ProductoParametroRepository');
const TenantService = require('../services/TenantService');

function getTenantId(req) {
    const id = req.tenant?.id;
    if (!id) throw new Error('Contexto de tenant no disponible');
    return id;
}

// GET /costeo - Página principal del módulo (superadmin debe elegir tenant si no hay ?tenant_id)
router.get('/', async (req, res) => {
    try {
        const isSuperadmin = req.user && String(req.user.rol || '').toLowerCase() === 'superadmin';
        if (isSuperadmin && !req.tenant) {
            const tenants = await TenantService.getAllTenants();
            return res.render('costeo', {
                productos: [],
                user: req.user,
                tenant: null,
                showTenantSelector: true,
                tenants: tenants || []
            });
        }
        const tenantId = getTenantId(req);
        const { productos } = await ProductService.getAllForView(tenantId);
        res.render('costeo', {
            productos: productos || [],
            user: req.user,
            tenant: req.tenant,
            showTenantSelector: false,
            tenants: []
        });
    } catch (error) {
        console.error('Error al cargar costeo:', error);
        if (error.message === 'Contexto de tenant no disponible') {
            return res.status(403).render('error', { error: { message: error.message } });
        }
        res.status(500).render('error', {
            error: { message: 'Error al cargar costeo', stack: error.stack }
        });
    }
});

// --- Insumos ---
router.get('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const filters = { q: req.query.q, unidad: req.query.unidad };
        const list = await InsumoService.list(tenantId, filters);
        res.json(list);
    } catch (error) {
        console.error('Error al listar insumos:', error);
        res.status(500).json({ error: error.message || 'Error al listar insumos' });
    }
});

router.post('/api/insumos', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const created = await InsumoService.create(tenantId, req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(400).json({ error: error.message || 'Error al crear insumo' });
    }
});

// GET /costeo/api/insumos/plantilla - Descargar plantilla Excel de insumos
router.get('/api/insumos/plantilla', async (req, res) => {
    try {
        const wb = new ExcelJS.Workbook();
        const inst = wb.addWorksheet('Instrucciones');
        inst.addRow(['PLANTILLA DE INSUMOS']).font = { bold: true, size: 16 };
        inst.addRow(['1) No cambie los encabezados de la hoja "Insumos".']).font = { color: { argb: 'FF495057' } };
        inst.addRow(['2) Columnas obligatorias: codigo, nombre. Unidad compra y costo unitario tienen valor por defecto.']).font = { color: { argb: 'FF495057' } };
        inst.addRow(['3) Unidad compra: UND, kg, g, L, ml, lb, etc.']).font = { color: { argb: 'FF495057' } };
        inst.addRow(['4) Use punto como decimal en costo (ej: 1500.50).']).font = { color: { argb: 'FF495057' } };
        inst.addRow(['5) Si el código ya existe, se actualizarán nombre, unidad y costo.']).font = { color: { argb: 'FF495057' } };
        inst.getColumn(1).width = 70;
        inst.addRow([]);

        const sheet = wb.addWorksheet('Insumos');
        sheet.columns = [
            { header: 'codigo', key: 'codigo', width: 18 },
            { header: 'nombre', key: 'nombre', width: 32 },
            { header: 'unidad_compra', key: 'unidad_compra', width: 16 },
            { header: 'costo_unitario', key: 'costo_unitario', width: 14 }
        ];
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.addRow({ codigo: 'INS001', nombre: 'Harina 1kg', unidad_compra: 'kg', costo_unitario: 2500 });
        sheet.addRow({ codigo: 'INS002', nombre: 'Azúcar 500g', unidad_compra: 'g', costo_unitario: 1200 });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="plantilla_insumos.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al generar plantilla insumos:', error);
        res.status(500).send('No se pudo generar la plantilla');
    }
});

// POST /costeo/api/insumos/cargar - Cargar insumos desde Excel
router.post('/api/insumos/cargar', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Seleccione un archivo Excel' });
        }
        const tenantId = getTenantId(req);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);
        const ws = wb.getWorksheet('Insumos') || wb.worksheets[0];
        if (!ws) {
            return res.status(400).json({ error: 'Hoja "Insumos" no encontrada en el archivo' });
        }
        const header = ['codigo', 'nombre', 'unidad_compra', 'costo_unitario'];
        const rows = [];
        ws.eachRow((row, idx) => {
            if (idx === 1) return;
            const r = header.reduce((acc, key, i) => {
                acc[key] = row.getCell(i + 1).value ?? '';
                return acc;
            }, {});
            if (!r.codigo && !r.nombre) return;
            rows.push({
                codigo: String(r.codigo ?? '').trim(),
                nombre: String(r.nombre ?? '').trim(),
                unidad_compra: String(r.unidad_compra ?? 'UND').trim() || 'UND',
                costo_unitario: Number(r.costo_unitario) || 0
            });
        });
        if (rows.length === 0) {
            return res.status(400).json({ error: 'No hay filas válidas para importar (código y nombre obligatorios)' });
        }
        const result = await InsumoService.importFromExcel(tenantId, rows);
        res.json(result);
    } catch (error) {
        console.error('Error al cargar insumos:', error);
        if (error.message === 'Contexto de tenant no disponible') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Error al cargar archivo' });
    }
});

router.get('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const insumo = await InsumoService.getById(id, tenantId);
        if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
        res.json(insumo);
    } catch (error) {
        console.error('Error al obtener insumo:', error);
        res.status(500).json({ error: error.message || 'Error al obtener insumo' });
    }
});

router.put('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await InsumoService.update(id, tenantId, req.body);
        res.json({ message: 'Insumo actualizado' });
    } catch (error) {
        console.error('Error al actualizar insumo:', error);
        if (error.message === 'Insumo no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || 'Error al actualizar insumo' });
    }
});

router.delete('/api/insumos/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await InsumoService.delete(id, tenantId);
        res.json({ message: 'Insumo eliminado' });
    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        if (error.message === 'Insumo no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Error al eliminar insumo' });
    }
});

// --- Recetas ---
router.get('/api/recetas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const filters = { q: req.query.q, tema_id: req.query.tema_id, parametro_id: req.query.parametro_id };
        const list = await RecetaService.list(tenantId, filters);
        res.json(list);
    } catch (error) {
        console.error('Error al listar recetas:', error);
        res.status(500).json({ error: error.message || 'Error al listar recetas' });
    }
});

router.get('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const receta = await RecetaService.getById(id, tenantId);
        if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(receta);
    } catch (error) {
        console.error('Error al obtener receta:', error);
        res.status(500).json({ error: error.message || 'Error al obtener receta' });
    }
});

router.post('/api/recetas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const recetaId = await RecetaService.create(tenantId, req.body);
        res.status(201).json({ id: recetaId, message: 'Receta creada' });
    } catch (error) {
        console.error('Error al crear receta:', error);
        res.status(400).json({ error: error.message || 'Error al crear receta' });
    }
});

router.put('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await RecetaService.update(id, tenantId, req.body);
        res.json({ message: 'Receta actualizada' });
    } catch (error) {
        console.error('Error al actualizar receta:', error);
        if (error.message === 'Receta no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || 'Error al actualizar receta' });
    }
});

router.delete('/api/recetas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await RecetaService.delete(id, tenantId);
        res.json({ message: 'Receta eliminada' });
    } catch (error) {
        console.error('Error al eliminar receta:', error);
        if (error.message === 'Receta no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Error al eliminar receta' });
    }
});

// --- Costeo por producto (para pantalla de productos) ---
router.get('/api/costeo/producto/:productoId', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const productoId = parseInt(req.params.productoId, 10);
        const costeo = await CosteoService.getCosteoByProductoId(productoId, tenantId);
        if (!costeo) return res.status(404).json({ error: 'Este producto no tiene receta asociada' });
        res.json(costeo);
    } catch (error) {
        console.error('Error al obtener costeo por producto:', error);
        res.status(500).json({ error: error.message || 'Error al obtener costeo' });
    }
});

// --- Costeo (cálculo por receta) ---
router.get('/api/costeo/receta/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const costeo = await CosteoService.getCosteoReceta(id, tenantId);
        if (!costeo) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(costeo);
    } catch (error) {
        console.error('Error al calcular costeo:', error);
        res.status(500).json({ error: error.message || 'Error al calcular costeo' });
    }
});

// --- Alertas de costeo ---
router.get('/api/costeo/alertas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const alertas = await CosteoService.getAlertas(tenantId);
        res.json(alertas);
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ error: error.message || 'Error al obtener alertas' });
    }
});

// --- Configuración costeo ---
router.get('/api/costeo/config', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const config = await CosteoService.getConfig(tenantId);
        res.json(config);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ error: error.message || 'Error al obtener configuración' });
    }
});

router.put('/api/costeo/config', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await CosteoService.saveConfig(tenantId, req.body);
        res.json({ message: 'Configuración guardada' });
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        res.status(400).json({ error: error.message || 'Error al guardar configuración' });
    }
});

function isSuperadmin(req) {
    return req.user && String(req.user.rol || '').toLowerCase() === 'superadmin';
}

// --- Temas ---
router.get('/api/temas', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await TemaService.list(tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar temas:', error);
        res.status(500).json({ error: error.message || 'Error al listar temas' });
    }
});

router.get('/api/temas/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const tema = await TemaService.getById(id, tenantId);
        if (!tema) return res.status(404).json({ error: 'Tema no encontrado' });
        res.json(tema);
    } catch (error) {
        console.error('Error al obtener tema:', error);
        res.status(500).json({ error: error.message || 'Error al obtener tema' });
    }
});

router.post('/api/temas', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede crear temas.' });
    try {
        const tenantId = getTenantId(req);
        const id = await TemaService.create(tenantId, req.body);
        res.status(201).json({ id, message: 'Tema creado' });
    } catch (error) {
        console.error('Error al crear tema:', error);
        res.status(400).json({ error: error.message || 'Error al crear tema' });
    }
});

router.put('/api/temas/:id', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede editar temas.' });
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await TemaService.update(id, tenantId, req.body);
        res.json({ message: 'Tema actualizado' });
    } catch (error) {
        console.error('Error al actualizar tema:', error);
        if (error.message === 'Tema no encontrado') return res.status(404).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error al actualizar tema' });
    }
});

router.delete('/api/temas/:id', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede eliminar temas.' });
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await TemaService.delete(id, tenantId);
        res.json({ message: 'Tema eliminado' });
    } catch (error) {
        console.error('Error al eliminar tema:', error);
        if (error.message === 'Tema no encontrado') return res.status(404).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error al eliminar tema' });
    }
});

router.get('/api/temas/:id/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const temaId = parseInt(req.params.id, 10);
        const list = await ParametroService.getByTemaId(temaId, tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar parámetros del tema:', error);
        res.status(500).json({ error: error.message || 'Error al listar parámetros' });
    }
});

router.put('/api/temas/:id/parametros', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede asignar parámetros a temas.' });
    try {
        const tenantId = getTenantId(req);
        const temaId = parseInt(req.params.id, 10);
        await TemaService.setParametros(temaId, tenantId, req.body.parametro_ids || []);
        res.json({ message: 'Parámetros del tema actualizados' });
    } catch (error) {
        console.error('Error al actualizar parámetros del tema:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar parámetros' });
    }
});

// --- Parámetros ---
router.get('/api/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const list = await ParametroService.list(tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar parámetros:', error);
        res.status(500).json({ error: error.message || 'Error al listar parámetros' });
    }
});

router.get('/api/parametros/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        const param = await ParametroService.getById(id, tenantId);
        if (!param) return res.status(404).json({ error: 'Parámetro no encontrado' });
        res.json(param);
    } catch (error) {
        console.error('Error al obtener parámetro:', error);
        res.status(500).json({ error: error.message || 'Error al obtener parámetro' });
    }
});

router.post('/api/parametros', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede crear parámetros.' });
    try {
        const tenantId = getTenantId(req);
        const id = await ParametroService.create(tenantId, req.body);
        res.status(201).json({ id, message: 'Parámetro creado' });
    } catch (error) {
        console.error('Error al crear parámetro:', error);
        res.status(400).json({ error: error.message || 'Error al crear parámetro' });
    }
});

router.put('/api/parametros/:id', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede editar parámetros.' });
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await ParametroService.update(id, tenantId, req.body);
        res.json({ message: 'Parámetro actualizado' });
    } catch (error) {
        console.error('Error al actualizar parámetro:', error);
        if (error.message === 'Parámetro no encontrado') return res.status(404).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Error al actualizar parámetro' });
    }
});

router.delete('/api/parametros/:id', async (req, res) => {
    if (!isSuperadmin(req)) return res.status(403).json({ error: 'Solo el superadmin puede eliminar parámetros.' });
    try {
        const tenantId = getTenantId(req);
        const id = parseInt(req.params.id, 10);
        await ParametroService.delete(id, tenantId);
        res.json({ message: 'Parámetro eliminado' });
    } catch (error) {
        console.error('Error al eliminar parámetro:', error);
        if (error.message === 'Parámetro no encontrado') return res.status(404).json({ error: error.message });
        res.status(500).json({ error: error.message || 'Error al eliminar parámetro' });
    }
});

// Asignar parámetros a producto (para filtrar recetas por tema/parámetro)
router.get('/api/productos/:id/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const productoId = parseInt(req.params.id, 10);
        const list = await ProductoParametroRepository.getParametrosByProductoId(productoId, tenantId);
        res.json(list);
    } catch (error) {
        console.error('Error al listar parámetros del producto:', error);
        res.status(500).json({ error: error.message || 'Error' });
    }
});

router.put('/api/productos/:id/parametros', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const productoId = parseInt(req.params.id, 10);
        const producto = await ProductService.getById(productoId, tenantId);
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        const parametroIds = Array.isArray(req.body.parametro_ids) ? req.body.parametro_ids : [];
        await ProductoParametroRepository.setParametrosForProducto(productoId, parametroIds);
        res.json({ message: 'Parámetros del producto actualizados' });
    } catch (error) {
        console.error('Error al actualizar parámetros del producto:', error);
        res.status(400).json({ error: error.message || 'Error' });
    }
});

module.exports = router;
