// Muestra un precio en pesos colombianos, por ejemplo $150.000.
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  const tieneCentavos = Math.round(numero * 100) % 100 !== 0;
  const texto = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: tieneCentavos ? 2 : 0
  }).format(numero);
  return `$${texto}`;
}

export function formatoFecha(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(fecha);
}

// Solo acepta imágenes propias de la tienda, para no insertar direcciones externas.
export function rutaImagenSegura(ruta) {
  return typeof ruta === 'string'
    && /^\/(uploads\/productos|assets\/img\/productos)\/[a-zA-Z0-9._-]+$/.test(ruta);
}

// Crea un elemento HTML con texto seguro, sin interpretar HTML del usuario.
export function el(tag, opciones = {}, hijos = []) {
  const nodo = document.createElement(tag);
  if (opciones.clase) nodo.className = opciones.clase;
  if (opciones.texto != null) nodo.textContent = opciones.texto;
  if (opciones.attrs) {
    Object.entries(opciones.attrs).forEach(([clave, valor]) => nodo.setAttribute(clave, valor));
  }
  hijos.forEach((hijo) => nodo.append(hijo));
  return nodo;
}
