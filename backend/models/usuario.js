const { obtenerPool } = require('../config/db');

async function buscarPorEmail(email) {
  const [filas] = await obtenerPool().execute(
    `SELECT id_usuario, nombre, apellido, email, password, rol, activo
     FROM usuarios
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return filas[0] || null;
}

// Crea el administrador o le cambia la contraseña si el correo ya existe.
async function guardarAdmin({ nombre, apellido, email, hash }) {
  const existente = await buscarPorEmail(email);
  if (existente) {
    await obtenerPool().execute(
      `UPDATE usuarios
       SET nombre = ?, apellido = ?, password = ?, rol = 'admin', activo = 1
       WHERE id_usuario = ?`,
      [nombre, apellido, hash, existente.id_usuario]
    );
    return;
  }

  await obtenerPool().execute(
    `INSERT INTO usuarios (nombre, apellido, email, password, rol, activo)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    [nombre, apellido, email, hash]
  );
}

module.exports = { buscarPorEmail, guardarAdmin };
