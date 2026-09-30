const express = require('express');
const { envolver } = require('../util/errores');
const { exigirAdmin } = require('../middleware/autenticacion');
const { verificarCsrf } = require('../middleware/csrf');
const { subirImagen } = require('../middleware/subida');
const controlador = require('../controllers/productos');

const router = express.Router();

router.get('/', envolver(controlador.listar));
router.get('/:id', envolver(controlador.detalle));
router.post('/', exigirAdmin, verificarCsrf, subirImagen, envolver(controlador.crear));
router.put('/:id', exigirAdmin, verificarCsrf, subirImagen, envolver(controlador.actualizar));
router.patch('/:id/estado', exigirAdmin, verificarCsrf, envolver(controlador.cambiarEstado));
router.delete('/:id', exigirAdmin, verificarCsrf, envolver(controlador.eliminar));

module.exports = router;
