const categoriaModelo = require('../models/categoria');
const productoModelo = require('../models/producto');
const { ErrorAplicacion } = require('../util/errores');
const { textoPlano, leerPrecio, leerId, leerActivo } = require('../util/validacion');
const { validarImagenSubida, eliminarPorRutaPublica } = require('../services/imagenes');

function textoConsulta(valor) {
  if (Array.isArray(valor)) {
    throw new ErrorAplicacion(400, 'La solicitud no es válida.');
  }
  return typeof valor === 'string' ? valor.trim() : '';
}

function leerIds(valor) {
  const texto = textoConsulta(valor);
  if (!texto) return null;
  const partes = texto.split(',');
  if (partes.length > 50) {
    throw new ErrorAplicacion(400, 'La consulta incluye demasiados productos.');
  }
  return partes.map((parte) => {
    const id = leerId(parte);
    if (!id) throw new ErrorAplicacion(400, 'Hay un identificador de producto no válido.');
    return id;
  });
}

// Revisa nombre, descripción, precio, categoría y visibilidad antes de guardar.
async function leerDatos(body) {
  const campos = {};
  const nombre = textoPlano(body.nombre, { min: 2, max: 120, multilinea: false });
  const descripcion = textoPlano(body.descripcion, { min: 10, max: 2000, multilinea: true });
  const precio = leerPrecio(body.precio);
  const activo = leerActivo(body.activo);
  const slug = typeof body.categoria === 'string' ? body.categoria.trim().toLowerCase() : '';

  if (nombre.error) campos.nombre = nombre.error;
  if (descripcion.error) campos.descripcion = descripcion.error;
  if (!precio) campos.precio = 'Indica un precio mayor que cero. Ejemplo: 150000 o 150.000.';
  if (activo === null) campos.activo = 'Indica si el producto está visible.';
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) campos.categoria = 'Selecciona una categoría válida.';

  let categoria = null;
  if (!campos.categoria) {
    categoria = await categoriaModelo.buscarPorSlug(slug);
    if (!categoria || !categoria.activo) campos.categoria = 'Selecciona una categoría válida.';
  }

  if (Object.keys(campos).length) {
    throw new ErrorAplicacion(400, 'Revisa los datos del producto.', campos);
  }

  return {
    nombre: nombre.valor,
    descripcion: descripcion.valor,
    precio,
    activo,
    id_categoria: categoria.id_categoria
  };
}

// Lista productos activos. El administrador puede pedir también los ocultos.
async function listar(req, res) {
  const slug = textoConsulta(req.query.categoria).toLowerCase();
  const busqueda = textoConsulta(req.query.q).slice(0, 60);
  if (slug && !/^[a-z0-9-]{1,40}$/.test(slug)) {
    throw new ErrorAplicacion(400, 'La categoría no es válida.');
  }

  let incluirInactivos = false;
  if (req.query.todos === '1') {
    if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
      throw new ErrorAplicacion(403, 'No tienes permiso para esta acción.');
    }
    incluirInactivos = true;
  }

  const productos = await productoModelo.listar({
    incluirInactivos,
    slug,
    ids: leerIds(req.query.ids),
    busqueda
  });
  res.json({ productos });
}

async function detalle(req, res) {
  const id = leerId(req.params.id);
  if (!id) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  const esAdmin = Boolean(req.session.usuario && req.session.usuario.rol === 'admin');
  const producto = await productoModelo.obtenerPorId(id, esAdmin);
  if (!producto) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  res.json({ producto });
}

// Guarda un producto nuevo. La imagen es obligatoria.
async function crear(req, res) {
  let imagen = null;
  try {
    imagen = await validarImagenSubida(req.file);
    if (!imagen) {
      throw new ErrorAplicacion(400, 'La imagen del producto es obligatoria.', {
        imagen: 'Selecciona una imagen JPG, PNG o WEBP.'
      });
    }
    const datos = await leerDatos(req.body || {});
    datos.imagen = imagen;
    const producto = await productoModelo.crear(datos);
    imagen = null;
    res.status(201).json({ producto });
  } catch (error) {
    if (imagen) await eliminarPorRutaPublica(imagen);
    throw error;
  }
}

// Actualiza un producto. Si llega otra imagen, reemplaza la anterior.
async function actualizar(req, res) {
  const id = leerId(req.params.id);
  if (!id) throw new ErrorAplicacion(404, 'No se encontró el producto.');

  let imagenNueva = null;
  try {
    const actual = await productoModelo.obtenerPorId(id, true);
    if (!actual) throw new ErrorAplicacion(404, 'No se encontró el producto.');

    imagenNueva = await validarImagenSubida(req.file);
    const datos = await leerDatos(req.body || {});
    datos.imagen = imagenNueva || actual.imagen;
    const producto = await productoModelo.actualizar(id, datos);
    if (imagenNueva && actual.imagen !== imagenNueva) {
      await eliminarPorRutaPublica(actual.imagen);
    }
    imagenNueva = null;
    res.json({ producto });
  } catch (error) {
    if (imagenNueva) await eliminarPorRutaPublica(imagenNueva);
    throw error;
  }
}

// Muestra u oculta un producto sin borrarlo.
async function cambiarEstado(req, res) {
  const id = leerId(req.params.id);
  if (!id) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  const activo = leerActivo(req.body && req.body.activo);
  if (activo === null) {
    throw new ErrorAplicacion(400, 'El estado del producto no es válido.');
  }
  const producto = await productoModelo.cambiarActivo(id, activo);
  if (!producto) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  res.json({ producto });
}

// Borra el producto y su imagen subida.
async function eliminar(req, res) {
  const id = leerId(req.params.id);
  if (!id) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  const producto = await productoModelo.eliminar(id);
  if (!producto) throw new ErrorAplicacion(404, 'No se encontró el producto.');
  await eliminarPorRutaPublica(producto.imagen);
  res.json({ ok: true });
}

module.exports = { listar, detalle, crear, actualizar, cambiarEstado, eliminar };
