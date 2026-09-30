const express = require('express');
const { envolver } = require('../util/errores');
const { limitePedido } = require('../middleware/seguridad');
const { crearControlador } = require('../controllers/pedidos');

function crearRutas(entorno) {
  const router = express.Router();
  router.post('/whatsapp', limitePedido, envolver(crearControlador(entorno)));
  return router;
}

module.exports = { crearRutas };
