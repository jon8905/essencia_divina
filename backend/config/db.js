const mysql = require('mysql2/promise');

let pool;

// Abre el grupo de conexiones a MySQL.
function iniciarPool(entorno) {
  pool = mysql.createPool({
    host: entorno.db.host,
    port: entorno.db.port,
    user: entorno.db.user,
    password: entorno.db.password,
    database: entorno.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    multipleStatements: false,
    decimalNumbers: false
  });
  return pool;
}

function obtenerPool() {
  if (!pool) {
    throw new Error('La conexión a MySQL no está lista.');
  }
  return pool;
}

function pistaDeConexion(error) {
  const pistas = {
    ECONNREFUSED: 'MySQL no está aceptando conexiones. Comprueba que el servicio esté iniciado.',
    ENOTFOUND: 'No se encontró el servidor indicado en DB_HOST.',
    ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña de la base de datos rechazados.',
    ER_BAD_DB_ERROR: 'La base de datos no existe. Ejecuta npm run db:init.'
  };
  return pistas[error.code] || 'Revisa la configuración de MySQL en el archivo .env.';
}

module.exports = { iniciarPool, obtenerPool, pistaDeConexion };
