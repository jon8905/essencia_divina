const express = require('express');
const { envolver } = require('../util/errores');
const { limiteLogin } = require('../middleware/seguridad');
const { exigirSesion } = require('../middleware/autenticacion');
const { verificarCsrf } = require('../middleware/csrf');
const controlador = require('../controllers/autenticacion');

const router = express.Router();

router.get('/csrf', envolver(controlador.csrf));
router.get('/sesion', envolver(controlador.sesion));
router.post('/login', limiteLogin, verificarCsrf, envolver(controlador.login));
router.post('/logout', exigirSesion, verificarCsrf, envolver(controlador.salir));

module.exports = router;
