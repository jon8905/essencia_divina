const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Cabeceras que limitan qué puede cargar el navegador.
function crearCabeceras(entorno) {
  const directivas = {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    styleSrc: ["'self'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: null
  };

  if (entorno.esProduccion) {
    delete directivas.upgradeInsecureRequests;
  }

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: directivas
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: entorno.esProduccion ? 'same-origin' : 'cross-origin' },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
}

function origenLocal(origen) {
  if (!origen) return false;
  try {
    const url = new URL(origen);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

// En desarrollo permite que Live Server, en otro puerto, llame a esta API.
function permitirOrigenLocal(entorno) {
  return function corsLocal(req, res, next) {
    const origen = req.get('Origin');
    if (!entorno.esProduccion && origenLocal(origen)) {
      res.set('Access-Control-Allow-Origin', origen);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Accept, Content-Type, X-CSRF-Token');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
    }
    next();
  };
}

function respuestaLimite(mensaje) {
  return function limite(req, res) {
    res.status(429).json({ error: mensaje });
  };
}

const limiteApi = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respuestaLimite('Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.')
});

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respuestaLimite('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
});

const limitePedido = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respuestaLimite('Demasiados pedidos en poco tiempo. Espera un momento e inténtalo de nuevo.')
});

module.exports = { crearCabeceras, permitirOrigenLocal, limiteApi, limiteLogin, limitePedido };
