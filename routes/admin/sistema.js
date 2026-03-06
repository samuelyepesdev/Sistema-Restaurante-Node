const express = require('express');
const router = express.Router();
const SistemaController = require('../../app/Http/Controllers/Admin/SistemaController');
const authService = require('../../services/AuthService');
const { ROLES } = require('../../utils/constants');

// Guard: solo superadmin
router.use((req, res, next) => {
    if (!req.user) return res.redirect('/auth/login');
    if (!authService.hasRole(req.user.rol, [ROLES.SUPERADMIN])) {
        return res.redirect('/');
    }
    next();
});

// GET / - Vista principal
router.get('/', SistemaController.index);

// API Temas
router.get('/api/temas', SistemaController.listTemas);
router.get('/api/temas/:id', SistemaController.showTema);
router.post('/api/temas', SistemaController.storeTema);
router.put('/api/temas/:id', SistemaController.updateTema);
router.delete('/api/temas/:id', SistemaController.destroyTema);
router.get('/api/temas/:id/parametros', SistemaController.listParametrosTema);
router.put('/api/temas/:id/parametros', SistemaController.setParametrosTema);

// API Parámetros
router.get('/api/parametros', SistemaController.listParametros);
router.get('/api/parametros/:id', SistemaController.showParametro);
router.post('/api/parametros', SistemaController.storeParametro);
router.put('/api/parametros/:id', SistemaController.updateParametro);
router.delete('/api/parametros/:id', SistemaController.destroyParametro);

module.exports = router;
