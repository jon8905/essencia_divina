const session = require('express-session');

const { Store } = session;

function segundosDeExpiracion(sesionDatos) {
  const cookie = sesionDatos.cookie || {};
  const fecha = cookie.expires || cookie._expires;
  if (fecha) return Math.round(new Date(fecha).getTime() / 1000);
  const maxAge = cookie.maxAge || cookie.originalMaxAge || 8 * 60 * 60 * 1000;
  return Math.floor(Date.now() / 1000) + Math.floor(maxAge / 1000);
}

class AlmacenSesiones extends Store {
  constructor(pool) {
    super();
    this.pool = pool;
    const temporizador = setInterval(() => {
      this.pool
        .execute('DELETE FROM sesiones WHERE expires < ?', [Math.floor(Date.now() / 1000)])
        .catch(() => {});
    }, 15 * 60 * 1000);
    temporizador.unref();
  }

  get(sid, callback) {
    this.pool.execute(
      'SELECT data, expires FROM sesiones WHERE session_id = ? LIMIT 1',
      [sid]
    ).then(([filas]) => {
      const fila = filas[0];
      if (!fila || Number(fila.expires) < Math.floor(Date.now() / 1000)) {
        callback(null, null);
        return;
      }
      try {
        callback(null, JSON.parse(fila.data));
      } catch {
        callback(null, null);
      }
    }).catch(callback);
  }

  set(sid, sesionDatos, callback) {
    this.pool.execute(
      'REPLACE INTO sesiones (session_id, expires, data) VALUES (?, ?, ?)',
      [sid, segundosDeExpiracion(sesionDatos), JSON.stringify(sesionDatos)]
    ).then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback) {
    this.pool.execute('DELETE FROM sesiones WHERE session_id = ?', [sid])
      .then(() => callback(null))
      .catch(callback);
  }

  touch(sid, sesionDatos, callback) {
    this.pool.execute(
      'UPDATE sesiones SET expires = ? WHERE session_id = ?',
      [segundosDeExpiracion(sesionDatos), sid]
    ).then(() => callback(null)).catch(callback);
  }
}

// Cookie de sesión guardada en MySQL. No incluye la contraseña.
function crearSesion(entorno, pool) {
  return session({
    name: 'jdtime.sid',
    secret: entorno.sesion.secreto,
    store: new AlmacenSesiones(pool),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: entorno.trustProxy,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: entorno.esProduccion,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    }
  });
}

module.exports = { crearSesion };
