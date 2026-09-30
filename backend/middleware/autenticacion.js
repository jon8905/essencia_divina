function exigirSesion(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No has iniciado sesión.' });
  }
  return next();
}

// Deja pasar solo si hay un administrador en la sesión.
function exigirAdmin(req, res, next) {
  const usuario = req.session && req.session.usuario;
  if (!usuario) {
    return res.status(401).json({ error: 'No has iniciado sesión.' });
  }
  if (usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  }
  return next();
}

module.exports = { exigirSesion, exigirAdmin };
