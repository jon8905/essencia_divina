const crypto = require('crypto');
const { ErrorAplicacion } = require('../util/errores');

function tokensCoinciden(guardado, recibido) {
  if (typeof guardado !== 'string' || typeof recibido !== 'string') return false;
  const a = Buffer.from(guardado);
  const b = Buffer.from(recibido);
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function emitirCsrf(req) {
  if (!req.session.csrf) {
    req.session.csrf = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrf;
}

// Compara el token enviado por el panel con el que está guardado en la sesión.
function verificarCsrf(req, res, next) {
  const recibido = req.get('X-CSRF-Token');
  if (!tokensCoinciden(req.session && req.session.csrf, recibido)) {
    return next(new ErrorAplicacion(403, 'La solicitud no es válida. Actualiza la página e inténtalo de nuevo.'));
  }
  return next();
}

module.exports = { emitirCsrf, verificarCsrf };
