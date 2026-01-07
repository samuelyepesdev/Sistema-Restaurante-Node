const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /clientes - Mostrar página de clientes
router.get('/', async (req, res) => {
    try {
        const [clientes] = await db.query('SELECT * FROM clientes ORDER BY nombre');
        res.render('clientes', { clientes: clientes || [] });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).render('error', { 
            error: {
                message: 'Error al obtener clientes',
                stack: error.stack
            }
        });
    }
});

// GET /clientes/buscar - Buscar clientes
router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q || '';
        const sql = `
            SELECT * FROM clientes 
            WHERE nombre LIKE ? OR telefono LIKE ?
            ORDER BY nombre
            LIMIT 10
        `;
        const searchTerm = `%${query}%`;
        const [clientes] = await db.query(sql, [searchTerm, searchTerm]);
        res.json(clientes);
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        res.status(500).json({ error: 'Error al buscar clientes' });
    }
});

// GET /clientes/:id - Obtener un cliente específico
router.get('/:id', async (req, res) => {
    try {
        const [clientes] = await db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
        const cliente = clientes[0];
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

// POST /clientes - Crear nuevo cliente
router.post('/', async (req, res) => {
    try {
        console.log('Datos recibidos:', req.body);
        const { nombre, direccion, telefono } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const [result] = await db.query(
            'INSERT INTO clientes (nombre, direccion, telefono) VALUES (?, ?, ?)',
            [nombre, direccion || null, telefono || null]
        );

        console.log('Cliente creado:', result);

        res.status(201).json({ 
            id: result.insertId,
            message: 'Cliente creado exitosamente' 
        });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// PUT /clientes/:id - Actualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const { nombre, direccion, telefono } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const result = await db.query(
            'UPDATE clientes SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
            [nombre, direccion || null, telefono || null, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

// DELETE /clientes/:id - Eliminar cliente
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene facturas asociadas' });
        }
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

module.exports = router; 