const { obtenerPool } = require('../config/db');

function mapear(fila) {
  if (!fila) return null;
  return {
    id_categoria: fila.id_categoria,
    nombre: fila.nombre,
    slug: fila.slug,
    descripcion: fila.descripcion,
    activo: Boolean(fila.activo)
  };
}

async function listarActivas() {
  const [filas] = await obtenerPool().execute(
    `SELECT id_categoria, nombre, slug, descripcion, activo
     FROM categorias
     WHERE activo = 1
     ORDER BY id_categoria ASC`
  );
  return filas.map(mapear);
}

async function buscarPorSlug(slug) {
  const [filas] = await obtenerPool().execute(
    `SELECT id_categoria, nombre, slug, descripcion, activo
     FROM categorias
     WHERE slug = ?
     LIMIT 1`,
    [slug]
  );
  return mapear(filas[0]);
}

module.exports = { listarActivas, buscarPorSlug };
