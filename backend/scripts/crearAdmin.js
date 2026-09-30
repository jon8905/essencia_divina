const bcrypt = require('bcrypt');
const { cargarEntorno } = require('../config/entorno');
const { iniciarPool, pistaDeConexion } = require('../config/db');
const { emailValido, textoPlano } = require('../util/validacion');
const usuarioModelo = require('../models/usuario');

function fallar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

// Crea o actualiza el administrador usando la contraseña de .env. No la imprime.
async function main() {
  const entorno = cargarEntorno();
  iniciarPool(entorno);

  const nombre = textoPlano(process.env.ADMIN_NOMBRE || '', { min: 2, max: 80, multilinea: false });
  const apellido = textoPlano(process.env.ADMIN_APELLIDO || '', { min: 2, max: 80, multilinea: false });
  const email = emailValido(process.env.ADMIN_EMAIL || '');
  const password = process.env.ADMIN_PASSWORD || '';

  if (nombre.error) fallar('ADMIN_NOMBRE debe tener entre 2 y 80 caracteres, sin los símbolos < o >.');
  if (apellido.error) fallar('ADMIN_APELLIDO debe tener entre 2 y 80 caracteres, sin los símbolos < o >.');
  if (!email) fallar('ADMIN_EMAIL no es un correo válido.');
  if (password.length < 10 || password.length > 72) {
    fallar('ADMIN_PASSWORD debe tener entre 10 y 72 caracteres.');
  }
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
    fallar('ADMIN_PASSWORD debe incluir letras y números.');
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await usuarioModelo.guardarAdmin({
      nombre: nombre.valor,
      apellido: apellido.valor,
      email,
      hash
    });
    console.log(`Administrador listo: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error(`No se pudo crear el administrador (${error.code || 'error'}). ${pistaDeConexion(error)}`);
    process.exit(1);
  }
}

main();
