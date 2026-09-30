const { formatoPrecio } = require('./moneda');

// Escribe el texto que se envía por WhatsApp, con cantidad, precio, subtotal y total.
function construirPedido(lineas) {
  let centavos = 0;
  const bloques = lineas.map((linea) => {
    const nombre = String(linea.nombre).replace(/\s+/g, ' ').trim();
    const subtotal = Number(linea.precioUnitario) * linea.cantidad;
    centavos += Math.round(Number(linea.precioUnitario) * 100) * linea.cantidad;
    return [
      nombre,
      `Cantidad: ${linea.cantidad}`,
      `Precio: ${formatoPrecio(linea.precioUnitario)}`,
      `Subtotal: ${formatoPrecio(subtotal)}`
    ].join('\n');
  });

  const total = centavos / 100;
  const mensaje = [
    'Hola, Essencia Divina. Quiero realizar el siguiente pedido:',
    '',
    bloques.join('\n\n'),
    '',
    `Total: ${formatoPrecio(total)}`,
    '',
    'Quedo pendiente para confirmar el pedido.'
  ].join('\n');

  return { mensaje, total };
}

// Enlace oficial de WhatsApp con el mensaje ya escrito.
function enlaceWhatsapp(numero, mensaje) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

module.exports = { construirPedido, enlaceWhatsapp };
