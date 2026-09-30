const bcrypt = require('bcrypt');
const { ErrorAplicacion } = require('../util/errores');
const { emailValido } = require('../util/validacion');
const usuarioModelo = require('../models/usuario');
const { emitirCsrf } = require('../middleware/csrf');

const RONDAS = 12;
let hashFicticio = '';

// Hash falso para que un correo inexistente tarde lo mismo que uno real.
async function preparar() {
  hashFicticio = await bcrypt.hash('jd-time-usuario-inexistente', RONDAS);
}

function regenerarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function destruirSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

function datosPublicos(usuario) {
  return {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol
  };
}

// Entrega el token que acompaña las acciones del panel.
async function csrf(req, res) {
  res.json({ csrf: emitirCsrf(req) });
}

// Indica si hay un administrador con la sesión abierta.
async function sesion(req, res) {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
    throw new ErrorAplicacion(401, 'No has iniciado sesión.');
  }
  res.json({ usuario: datosPublicos(req.session.usuario) });
}

// Comprueba correo y contraseña. Solo entra quien tenga rol admin.
async function login(req, res) {
  const email = emailValido(req.body && req.body.email);
  const password = req.body && req.body.password;
  const mensaje = 'Correo o contraseña incorrectos.';

  if (!email || typeof password !== 'string' || password.length === 0 || password.length > 72) {
    throw new ErrorAplicacion(401, mensaje);
  }

  const usuario = await usuarioModelo.buscarPorEmail(email);
  const hash = usuario ? usuario.password : hashFicticio;
  let coincide = false;
  try {
    coincide = await bcrypt.compare(password, hash);
  } catch {
    coincide = false;
  }

  const autorizado = Boolean(usuario)
    && Number(usuario.activo) === 1
    && usuario.rol === 'admin'
    && coincide;

  if (!autorizado) {
    throw new ErrorAplicacion(401, mensaje);
  }

  await regenerarSesion(req);
  req.session.usuario = {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol
  };
  const token = emitirCsrf(req);
  res.json({ ok: true, csrf: token, usuario: datosPublicos(req.session.usuario) });
}

// Cierra la sesión y borra la cookie.
async function salir(req, res) {
  await destruirSesion(req);
  res.clearCookie('jdtime.sid', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ ok: true });
}

module.exports = { preparar, csrf, sesion, login, salir };
