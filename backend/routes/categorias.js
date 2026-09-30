const express = require('express');
const { envolver } = require('../util/errores');
const controlador = require('../controllers/categorias');

const router = express.Router();
router.get('/', envolver(controlador.listar));

module.exports = router;
