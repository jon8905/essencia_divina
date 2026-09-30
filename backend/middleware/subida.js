const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ErrorAplicacion } = require('../util/errores');

const CARPETA = path.join(__dirname, '..', '..', 'uploads', 'productos');

const TIPOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

fs.mkdirSync(CARPETA, { recursive: true });

const almacenamiento = multer.diskStorage({
  destination(req, archivo, callback) {
    callback(null, CARPETA);
  },
  filename(req, archivo, callback) {
    const extension = TIPOS[archivo.mimetype] || '';
    const nombre = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    callback(null, nombre);
  }
});

function filtro(req, archivo, callback) {
  if (!TIPOS[archivo.mimetype]) {
    const error = new Error('Tipo de imagen no permitido');
    error.codigoImagen = 'tipo';
    callback(error);
    return;
  }
  callback(null, true);
}

const subir = multer({
  storage: almacenamiento,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: filtro
}).single('imagen');

function subirImagen(req, res, next) {
  subir(req, res, (error) => {
    if (!error) return next();
    if (error.codigoImagen === 'tipo') {
      return next(new ErrorAplicacion(400, 'La imagen debe ser JPG, PNG o WEBP.'));
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new ErrorAplicacion(400, 'La imagen supera el tamaño permitido (2 MB).'));
    }
    return next(new ErrorAplicacion(400, 'No se pudo procesar la imagen.'));
  });
}

module.exports = { subirImagen, CARPETA };
