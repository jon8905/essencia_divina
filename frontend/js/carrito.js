import { solicitar, urlDeApi } from './api.js';
import { mostrarAviso } from './aviso.js';
import { formatoPrecio, rutaImagenSegura, el } from './util.js';
import { solicitarPedido } from './whatsapp.js';

const CLAVE = 'essencia.carrito';
const MAXIMO = 20;

// Lee el carrito guardado en el navegador y descarta datos dañados.
function leer() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(datos)) return [];
    const vistos = new Set();
    const limpio = [];
    datos.forEach((item) => {
      const id = Number(item && item.id_producto);
      const cantidad = Number(item && item.cantidad);
      if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad)) return;
      if (cantidad < 1 || cantidad > MAXIMO || vistos.has(id)) return;
      vistos.add(id);
      limpio.push({ id_producto: id, cantidad });
    });
    return limpio.slice(0, 30);
  } catch {
    return [];
  }
}

// Devuelve los productos del carrito: solo id y cantidad, nunca el precio.
export function obtenerCarrito() {
  const limpio = leer();
  const serializado = JSON.stringify(limpio);
  if (localStorage.getItem(CLAVE) !== serializado) {
    localStorage.setItem(CLAVE, serializado);
  }
  return limpio;
}

function guardar(carrito) {
  localStorage.setItem(CLAVE, JSON.stringify(carrito));
  window.dispatchEvent(new CustomEvent('carrito:cambio'));
}

export function contarUnidades() {
  return obtenerCarrito().reduce((total, item) => total + item.cantidad, 0);
}

// Suma uno a la cantidad. El máximo por producto es 20.
export function agregarAlCarrito(idProducto) {
  const id = Number(idProducto);
  const carrito = obtenerCarrito();
  const actual = carrito.find((item) => item.id_producto === id);
  if (actual && actual.cantidad >= MAXIMO) {
    return { ok: false, motivo: 'maximo' };
  }
  if (actual) actual.cantidad += 1;
  else carrito.push({ id_producto: id, cantidad: 1 });
  guardar(carrito);
  return { ok: true, actualizado: Boolean(actual) };
}

// Cambia la cantidad de un producto que ya está en el carrito.
export function fijarCantidad(idProducto, cantidad) {
  const carrito = obtenerCarrito();
  const actual = carrito.find((item) => item.id_producto === Number(idProducto));
  if (!actual) return;
  actual.cantidad = Math.min(MAXIMO, Math.max(1, cantidad));
  guardar(carrito);
}

// Quita un producto del carrito.
export function quitarDelCarrito(idProducto) {
  guardar(obtenerCarrito().filter((item) => item.id_producto !== Number(idProducto)));
}

// Deja el carrito vacío.
export function vaciarCarrito() {
  guardar([]);
}

// Dibuja la página del carrito y arma el pedido de WhatsApp al confirmar.
export function iniciarPaginaCarrito() {
  const raiz = document.getElementById('contenido-carrito');
  if (!raiz) return;

  let solicitud = 0;

  async function pintar() {
    const marca = ++solicitud;
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
      if (marca !== solicitud) return;
      raiz.replaceChildren(el('div', { clase: 'vacio' }, [
        el('h2', { texto: 'Tu carrito está vacío' }),
        el('p', { texto: 'Cuando agregues un cosmético, aparecerá aquí.' }),
        el('a', {
          clase: 'boton',
          attrs: { href: 'catalogo.html' },
          texto: 'Ver catálogo'
        })
      ]));
      return;
    }

    let productos = [];
    try {
      const ids = carrito.map((item) => item.id_producto).join(',');
      const datos = await solicitar(`/api/productos?ids=${ids}`);
      productos = datos.productos || [];
    } catch (error) {
      if (marca !== solicitud) return;
      raiz.replaceChildren(el('p', { clase: 'estado', texto: error.message }));
      return;
    }

    if (marca !== solicitud) return;
    raiz.replaceChildren();

    const mapa = new Map(productos.map((producto) => [producto.id_producto, producto]));
    const lista = el('div', { clase: 'lineas' });
    let total = 0;
    let disponibles = 0;

    carrito.forEach((item) => {
      const producto = mapa.get(item.id_producto);
      if (!producto) {
        lista.append(lineaNoDisponible(item.id_producto));
        return;
      }
      const subtotal = Number(producto.precio) * item.cantidad;
      total += subtotal;
      disponibles += 1;
      lista.append(lineaProducto(producto, item.cantidad, subtotal));
    });

    const resumen = el('aside', { clase: 'resumen' }, [
      el('h2', { texto: 'Resumen' }),
      el('p', { clase: 'resumen__total' }, [
        el('span', { texto: 'Total' }),
        el('strong', { texto: formatoPrecio(total) })
      ]),
      el('p', {
        clase: 'ayuda',
        texto: 'El pedido se confirma por WhatsApp. En esta página no se realiza ningún cobro.'
      }),
      el('button', {
        clase: 'boton',
        attrs: { type: 'button', id: 'realizar-pedido' },
        texto: 'Realizar pedido'
      }),
      el('button', {
        clase: 'boton boton--borde',
        attrs: { type: 'button', id: 'vaciar-carrito' },
        texto: 'Vaciar carrito'
      })
    ]);

    const disposicion = el('div', { clase: 'carrito-disposicion' }, [lista, resumen]);
    raiz.append(disposicion);

    const pedido = resumen.querySelector('#realizar-pedido');
    const vaciar = resumen.querySelector('#vaciar-carrito');
    pedido.disabled = disponibles === 0;

    pedido.addEventListener('click', async () => {
      pedido.disabled = true;
      try {
        const datos = await solicitarPedido(obtenerCarrito());
        window.location.assign(datos.url);
      } catch (error) {
        if (Array.isArray(error.no_disponibles)) {
          error.no_disponibles.forEach((id) => quitarDelCarrito(id));
        }
        mostrarAviso(error.message);
        await pintar();
      }
    });

    vaciar.addEventListener('click', () => {
      if (!window.confirm('¿Vaciar el carrito?')) return;
      vaciarCarrito();
      pintar();
    });
  }

  function lineaNoDisponible(id) {
    const boton = el('button', {
      clase: 'boton boton--borde boton--pequeno',
      attrs: { type: 'button' },
      texto: 'Quitar'
    });
    boton.addEventListener('click', () => {
      quitarDelCarrito(id);
      pintar();
    });
    return el('article', { clase: 'linea' }, [
      el('div', {}, [
        el('h3', { texto: 'Producto no disponible' }),
        el('p', { texto: 'Ya no está en el catálogo. Quítalo para continuar.' })
      ]),
      boton
    ]);
  }

  function lineaProducto(producto, cantidad, subtotal) {
    const imagen = el('img', {
      attrs: {
        alt: '',
        width: '96',
        height: '120'
      }
    });
    if (rutaImagenSegura(producto.imagen)) {
      imagen.src = urlDeApi(producto.imagen);
      imagen.alt = producto.nombre;
    }

    const disminuir = el('button', {
      clase: 'cantidad',
      attrs: { type: 'button', 'aria-label': `Disminuir cantidad de ${producto.nombre}` },
      texto: '−'
    });
    const aumentar = el('button', {
      clase: 'cantidad',
      attrs: { type: 'button', 'aria-label': `Aumentar cantidad de ${producto.nombre}` },
      texto: '+'
    });
    disminuir.disabled = cantidad <= 1;
    aumentar.disabled = cantidad >= MAXIMO;
    disminuir.addEventListener('click', () => {
      fijarCantidad(producto.id_producto, cantidad - 1);
      pintar();
    });
    aumentar.addEventListener('click', () => {
      fijarCantidad(producto.id_producto, cantidad + 1);
      pintar();
    });

    const quitar = el('button', {
      clase: 'enlace-boton',
      attrs: { type: 'button' },
      texto: 'Eliminar'
    });
    quitar.addEventListener('click', () => {
      quitarDelCarrito(producto.id_producto);
      pintar();
    });

    return el('article', { clase: 'linea' }, [
      el('div', { clase: 'linea__media' }, [imagen]),
      el('div', { clase: 'linea__cuerpo' }, [
        el('p', { clase: 'etiqueta', texto: producto.categoria }),
        el('h3', { texto: producto.nombre }),
        el('p', { texto: formatoPrecio(producto.precio) }),
        el('div', { clase: 'cantidades' }, [
          disminuir,
          el('span', { attrs: { 'aria-live': 'polite' }, texto: String(cantidad) }),
          aumentar
        ]),
        quitar
      ]),
      el('p', { clase: 'linea__subtotal' }, [
        el('span', { clase: 'sr', texto: 'Subtotal' }),
        el('strong', { texto: formatoPrecio(subtotal) })
      ])
    ]);
  }

  pintar();
  window.addEventListener('storage', (evento) => {
    if (evento.key === CLAVE) pintar();
  });
}
