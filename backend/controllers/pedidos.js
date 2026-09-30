const productoModelo = require('../models/producto');
const { ErrorAplicacion } = require('../util/errores');
const { construirPedido, enlaceWhatsapp } = require('../services/whatsapp');

// Deja solo ids y cantidades válidas. El precio no se acepta del navegador.
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new ErrorAplicacion(400, 'El carrito está vacío o no es válido.');
  }

  const mapa = new Map();
  for (const item of items) {
    const id = Number(item && item.id_producto);
    const cantidad = Number(item && item.cantidad);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
      throw new ErrorAplicacion(400, 'Hay un producto o una cantidad no válida en el carrito.');
    }
    mapa.set(id, Math.min(20, (mapa.get(id) || 0) + cantidad));
  }

  return [...mapa.entries()].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
}

// Arma el mensaje de WhatsApp con los precios que están en la base de datos.
function crearControlador(entorno) {
  return async function whatsapp(req, res) {
    const items = normalizarItems(req.body && req.body.items);
    const productos = await productoModelo.listar({
      ids: items.map((item) => item.id_producto),
      incluirInactivos: false
    });
    const mapa = new Map(productos.map((producto) => [producto.id_producto, producto]));
    const faltantes = items
      .map((item) => item.id_producto)
      .filter((id) => !mapa.has(id));

    if (faltantes.length) {
      throw new ErrorAplicacion(
        409,
        'Algunos productos ya no están disponibles. Revisa el carrito.',
        null,
        faltantes
      );
    }

    const lineas = items.map((item) => {
      const producto = mapa.get(item.id_producto);
      return {
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: producto.precio
      };
    });

    const pedido = construirPedido(lineas);
    if (pedido.mensaje.length > 3000) {
      throw new ErrorAplicacion(400, 'El pedido es demasiado largo. Reduce la cantidad de productos.');
    }

    res.json({
      url: enlaceWhatsapp(entorno.whatsapp, pedido.mensaje),
      mensaje: pedido.mensaje,
      total: pedido.total
    });
  };
}

module.exports = { crearControlador };
