const { obtenerPool } = require('../config/db');

function mapear(fila) {
  if (!fila) return null;
  return {
    id_producto: fila.id_producto,
    nombre: fila.nombre,
    categoria: fila.categoria,
    slug_categoria: fila.slug_categoria,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    imagen: fila.imagen,
    activo: Number(fila.activo) === 1,
    created_at: new Date(fila.created_at).toISOString(),
    updated_at: new Date(fila.updated_at).toISOString()
  };
}

function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Consulta productos. Los valores del usuario van como parámetros, no dentro del SQL.
async function listar({ incluirInactivos = false, slug = '', ids = null, busqueda = '' } = {}) {
  const condiciones = [];
  const parametros = [];

  if (!incluirInactivos) condiciones.push('p.activo = 1');

  if (slug) {
    condiciones.push('c.slug = ?');
    parametros.push(slug);
  }

  if (Array.isArray(ids)) {
    if (ids.length === 0) return [];
    condiciones.push(`p.id_producto IN (${ids.map(() => '?').join(', ')})`);
    parametros.push(...ids);
  }

  if (busqueda) {
    condiciones.push("p.nombre LIKE ? ESCAPE '\\\\'");
    parametros.push(`%${escaparLike(busqueda)}%`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await obtenerPool().execute(
    `SELECT p.id_producto, p.nombre, c.nombre AS categoria, c.slug AS slug_categoria,
            p.descripcion, p.precio, p.imagen, p.activo, p.created_at, p.updated_at
     FROM productos p
     INNER JOIN categorias c ON c.id_categoria = p.id_categoria
     ${where}
     ORDER BY p.created_at DESC
     LIMIT 200`,
    parametros
  );
  return filas.map(mapear);
}

async function obtenerPorId(id, incluirInactivo = false) {
  const [filas] = await obtenerPool().execute(
    `SELECT p.id_producto, p.nombre, c.nombre AS categoria, c.slug AS slug_categoria,
            p.descripcion, p.precio, p.imagen, p.activo, p.created_at, p.updated_at
     FROM productos p
     INNER JOIN categorias c ON c.id_categoria = p.id_categoria
     WHERE p.id_producto = ? AND (? = 1 OR p.activo = 1)
     LIMIT 1`,
    [id, incluirInactivo ? 1 : 0]
  );
  return mapear(filas[0]);
}

async function crear(datos) {
  const [resultado] = await obtenerPool().execute(
    `INSERT INTO productos (nombre, id_categoria, descripcion, precio, imagen, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.nombre, datos.id_categoria, datos.descripcion, datos.precio, datos.imagen, datos.activo ? 1 : 0]
  );
  return obtenerPorId(resultado.insertId, true);
}

async function actualizar(id, datos) {
  const [resultado] = await obtenerPool().execute(
    `UPDATE productos
     SET nombre = ?, id_categoria = ?, descripcion = ?, precio = ?, imagen = ?, activo = ?
     WHERE id_producto = ?`,
    [datos.nombre, datos.id_categoria, datos.descripcion, datos.precio, datos.imagen, datos.activo ? 1 : 0, id]
  );
  if (resultado.affectedRows === 0) return null;
  return obtenerPorId(id, true);
}

async function cambiarActivo(id, activo) {
  const [resultado] = await obtenerPool().execute(
    'UPDATE productos SET activo = ? WHERE id_producto = ?',
    [activo ? 1 : 0, id]
  );
  if (resultado.affectedRows === 0) return null;
  return obtenerPorId(id, true);
}

async function eliminar(id) {
  const actual = await obtenerPorId(id, true);
  if (!actual) return null;
  await obtenerPool().execute('DELETE FROM productos WHERE id_producto = ?', [id]);
  return actual;
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarActivo, eliminar };
