const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { cargarEntorno } = require('../config/entorno');
const { pistaDeConexion } = require('../config/db');

const SEMILLA = [
  {
    slug: 'labiales',
    nombre: 'Labial Rose',
    descripcion: 'Labial en tono rosa intenso, con estuche rosa dorado. Color definido para el día y la noche.',
    precio: '45000.00',
    imagen: '/assets/img/productos/labial-rose.jpg'
  },
  {
    slug: 'labiales',
    nombre: 'Labial Rosa',
    descripcion: 'Labial en tono rosa suave, con acabado luminoso. Un color delicado para el rostro.',
    precio: '42000.00',
    imagen: '/assets/img/productos/labial-rosa.jpg'
  },
  {
    slug: 'bases',
    nombre: 'Base de Maquillaje Origen Natural',
    descripcion: 'Base de maquillaje de origen natural, 30 ml. Cobertura uniforme y acabado natural, apta para todo tipo de piel.',
    precio: '68000.00',
    imagen: '/assets/img/productos/base-natural.jpg'
  },
  {
    slug: 'rubores',
    nombre: 'Rubor Coral',
    descripcion: 'Rubor en tono coral para dar color al rostro, con un acabado suave.',
    precio: '39000.00',
    imagen: '/assets/img/productos/rubor.jpg'
  }
];

function dividirSentencias(sql) {
  const sinComentarios = sql
    .split(/\r?\n/)
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n');
  return sinComentarios
    .split(';')
    .map((parte) => parte.trim())
    .filter(Boolean);
}

// Crea la base, las tablas y el catálogo inicial si todavía no hay productos.
async function main() {
  const entorno = cargarEntorno();
  let conexion;
  try {
    conexion = await mysql.createConnection({
      host: entorno.db.host,
      port: entorno.db.port,
      user: entorno.db.user,
      password: entorno.db.password,
      multipleStatements: false,
      charset: 'utf8mb4',
      timezone: 'Z'
    });

    await conexion.query(
      `CREATE DATABASE IF NOT EXISTS \`${entorno.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conexion.query(`USE \`${entorno.db.database}\``);

    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
    for (const sentencia of dividirSentencias(sql)) {
      await conexion.query(sentencia);
    }

    await conexion.query(
      `INSERT IGNORE INTO categorias (nombre, slug, descripcion) VALUES
       (?, ?, ?),
       (?, ?, ?),
       (?, ?, ?)`,
      [
        'Labiales', 'labiales', 'Labiales en tonos suaves e intensos.',
        'Bases', 'bases', 'Bases de maquillaje de origen natural.',
        'Rubores', 'rubores', 'Color para el rostro, con acabado suave.'
      ]
    );

    const [conteo] = await conexion.query('SELECT COUNT(*) AS total FROM productos');
    if (Number(conteo[0].total) === 0) {
      for (const producto of SEMILLA) {
        const [categorias] = await conexion.query(
          'SELECT id_categoria FROM categorias WHERE slug = ? LIMIT 1',
          [producto.slug]
        );
        await conexion.query(
          `INSERT INTO productos (nombre, id_categoria, descripcion, precio, imagen, activo)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            producto.nombre,
            categorias[0].id_categoria,
            producto.descripcion,
            producto.precio,
            producto.imagen
          ]
        );
      }
      console.log('Catálogo inicial creado.');
    } else {
      console.log('La base ya tenía productos. No se volvió a sembrar el catálogo.');
    }

    console.log('Base de datos lista. Si aún no hay administrador, ejecuta npm run crear-admin.');
  } catch (error) {
    console.error(`No se pudo preparar MySQL (${error.code || 'error'}). ${pistaDeConexion(error)}`);
    process.exitCode = 1;
  } finally {
    if (conexion) await conexion.end();
  }
}

main();
