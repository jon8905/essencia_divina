const fs = require('fs');
const path = require('path');

function fallar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

// Lee .env y detiene el servidor si falta un dato sensible o está incompleto.
function cargarEntorno() {
  const ruta = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(ruta)) {
    fallar('No se encontró el archivo .env. Copia .env.example a .env y completa los valores.');
  }

  require('dotenv').config({ path: ruta, quiet: true });

  const secreto = process.env.SESSION_SECRET || '';
  if (secreto.length < 32 || secreto.includes('cambia-esta-clave')) {
    fallar('SESSION_SECRET debe ser una cadena propia de al menos 32 caracteres.');
  }

  const baseDatos = process.env.DB_NAME || '';
  if (!/^[A-Za-z0-9_]+$/.test(baseDatos)) {
    fallar('DB_NAME solo puede contener letras, números y guion bajo.');
  }

  if (!process.env.DB_HOST || !process.env.DB_USER) {
    fallar('Completa DB_HOST y DB_USER en el archivo .env.');
  }

  const puertoDb = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(puertoDb) || puertoDb < 1 || puertoDb > 65535) {
    fallar('DB_PORT no es un puerto válido.');
  }

  const puerto = Number(process.env.PORT || 3000);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    fallar('PORT no es un puerto válido.');
  }

  const whatsapp = process.env.WHATSAPP_NUMERO || '';
  if (!/^\d{10,15}$/.test(whatsapp)) {
    fallar('WHATSAPP_NUMERO debe contener solo dígitos, con indicativo de país.');
  }

  return {
    esProduccion: process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === '1',
    port: puerto,
    whatsapp,
    db: {
      host: process.env.DB_HOST,
      port: puertoDb,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: baseDatos
    },
    sesion: {
      secreto
    }
  };
}

module.exports = { cargarEntorno };
