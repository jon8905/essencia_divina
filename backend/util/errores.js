class ErrorAplicacion extends Error {
  constructor(estado, mensaje, campos = null, noDisponibles = null) {
    super(mensaje);
    this.name = 'ErrorAplicacion';
    this.estado = estado;
    this.mensajePublico = mensaje;
    this.campos = campos;
    this.noDisponibles = noDisponibles;
  }
}

function envolver(fn) {
  return function controlador(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function manejadorErrores(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ErrorAplicacion) {
    const cuerpo = { error: err.mensajePublico };
    if (err.campos) cuerpo.campos = err.campos;
    if (err.noDisponibles) cuerpo.no_disponibles = err.noDisponibles;
    return res.status(err.estado).json(cuerpo);
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El formato de la solicitud no es válido.' });
  }

  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Ocurrió un error interno.' });
}

module.exports = { ErrorAplicacion, envolver, manejadorErrores };
