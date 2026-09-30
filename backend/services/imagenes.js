const fs = require('fs/promises');
const path = require('path');
const { CARPETA } = require('../middleware/subida');
const { ErrorAplicacion } = require('../util/errores');

async function detectarTipo(rutaAbsoluta) {
  const archivo = await fs.open(rutaAbsoluta, 'r');
  try {
    const buffer = Buffer.alloc(16);
    await archivo.read(buffer, 0, 16, 0);
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.subarray(0, 8).equals(png)) return '.png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return '.webp';
    }
    return null;
  } finally {
    await archivo.close();
  }
}

async function eliminarSilencioso(rutaAbsoluta) {
  try {
    await fs.unlink(rutaAbsoluta);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('No se pudo eliminar un archivo de imagen.');
    }
  }
}

// Comprueba que el archivo sea de verdad JPG, PNG o WEBP.
async function validarImagenSubida(archivo) {
  if (!archivo) return null;
  const tipo = await detectarTipo(archivo.path);
  const esperada = path.extname(archivo.filename).toLowerCase();
  if (!tipo || tipo !== esperada) {
    await eliminarSilencioso(archivo.path);
    throw new ErrorAplicacion(400, 'El archivo no es una imagen válida.');
  }
  return `/uploads/productos/${path.basename(archivo.filename)}`;
}

async function eliminarPorRutaPublica(rutaPublica) {
  if (typeof rutaPublica !== 'string' || !rutaPublica.startsWith('/uploads/productos/')) return;
  const nombre = path.basename(rutaPublica);
  if (!/^[\w.-]+$/.test(nombre)) return;

  const raiz = path.resolve(CARPETA);
  const absoluta = path.resolve(raiz, nombre);
  const relativa = path.relative(raiz, absoluta);
  if (!relativa || relativa.startsWith('..') || path.isAbsolute(relativa)) return;
  await eliminarSilencioso(absoluta);
}

module.exports = { validarImagenSubida, eliminarPorRutaPublica };
