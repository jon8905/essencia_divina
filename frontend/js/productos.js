import { solicitar, urlDeApi } from './api.js';
import { agregarAlCarrito } from './carrito.js';
import { mostrarAviso } from './aviso.js';
import { formatoPrecio, rutaImagenSegura, el } from './util.js';

function prepararImagen(producto, indice) {
  const imagen = el('img', {
    attrs: {
      alt: producto.nombre,
      width: '400',
      height: '500',
      decoding: 'async'
    }
  });
  imagen.loading = indice < 2 ? 'eager' : 'lazy';
  if (rutaImagenSegura(producto.imagen)) imagen.src = urlDeApi(producto.imagen);
  else imagen.classList.add('imagen-falla');
  imagen.addEventListener('error', () => imagen.classList.add('imagen-falla'));
  return imagen;
}

let detalle;

function asegurarDetalle() {
  if (detalle) return detalle;
  const img = el('img', { attrs: { alt: '', width: '400', height: '500' } });
  const etiqueta = el('p', { clase: 'etiqueta' });
  const titulo = el('h2');
  const descripcion = el('p');
  const precio = el('p', { clase: 'precio' });
  const agregar = el('button', { clase: 'boton', attrs: { type: 'button' }, texto: 'Agregar al carrito' });
  const cerrar = el('button', { clase: 'boton boton--borde', attrs: { type: 'button' }, texto: 'Cerrar' });
  const nodo = el('dialog', { clase: 'detalle' }, [
    el('div', { clase: 'detalle__media' }, [img]),
    el('div', { clase: 'detalle__cuerpo' }, [
      etiqueta,
      titulo,
      descripcion,
      precio,
      el('div', { clase: 'hero__acciones' }, [agregar, cerrar])
    ])
  ]);

  cerrar.addEventListener('click', () => nodo.close());
  agregar.addEventListener('click', () => {
    const resultado = agregarAlCarrito(agregar.dataset.id);
    if (!resultado.ok) {
      mostrarAviso('La cantidad máxima por producto es 20.');
      return;
    }
    mostrarAviso(resultado.actualizado
      ? 'Cantidad actualizada en el carrito.'
      : 'Producto agregado al carrito.');
  });

  document.body.append(nodo);
  detalle = { nodo, img, etiqueta, titulo, descripcion, precio, agregar };
  return detalle;
}

// Abre la ficha con la descripción completa del producto.
function abrirDetalle(producto) {
  const vista = asegurarDetalle();
  vista.etiqueta.textContent = producto.categoria;
  vista.titulo.textContent = producto.nombre;
  vista.descripcion.textContent = producto.descripcion;
  vista.precio.textContent = formatoPrecio(producto.precio);
  vista.agregar.dataset.id = String(producto.id_producto);
  if (rutaImagenSegura(producto.imagen)) {
    vista.img.src = urlDeApi(producto.imagen);
    vista.img.alt = producto.nombre;
  } else {
    vista.img.removeAttribute('src');
    vista.img.alt = '';
  }
  if (!vista.nodo.open) vista.nodo.showModal();
}

// Arma la tarjeta de un producto: imagen, nombre, precio y botón de carrito.
function tarjetaProducto(producto, indice) {
  const ver = el('button', { clase: 'enlace-boton', attrs: { type: 'button' }, texto: 'Ver detalle' });
  const agregar = el('button', { clase: 'boton', attrs: { type: 'button' }, texto: 'Agregar al carrito' });
  ver.addEventListener('click', () => abrirDetalle(producto));
  agregar.addEventListener('click', () => {
    const resultado = agregarAlCarrito(producto.id_producto);
    if (!resultado.ok) {
      mostrarAviso('La cantidad máxima por producto es 20.');
      return;
    }
    mostrarAviso(resultado.actualizado
      ? 'Cantidad actualizada en el carrito.'
      : 'Producto agregado al carrito.');
  });

  return el('article', { clase: 'tarjeta' }, [
    el('div', { clase: 'tarjeta__media' }, [prepararImagen(producto, indice)]),
    el('div', { clase: 'tarjeta__cuerpo' }, [
      el('p', { clase: 'etiqueta', texto: producto.categoria }),
      el('h3', { texto: producto.nombre }),
      el('p', { clase: 'tarjeta__descripcion', texto: producto.descripcion }),
      el('p', { clase: 'precio', texto: formatoPrecio(producto.precio) }),
      el('div', { clase: 'tarjeta__acciones' }, [ver, agregar])
    ])
  ]);
}

function pintarRejilla(contenedor, productos) {
  contenedor.replaceChildren(...productos.map((producto, indice) => tarjetaProducto(producto, indice)));
}

// Carga una selección corta para la página de inicio.
export async function iniciarDestacados() {
  const estado = document.getElementById('estado-inicio');
  const rejilla = document.getElementById('destacados');
  if (!rejilla) return;

  try {
    const { productos } = await solicitar('/api/productos');
    const labiales = productos.filter((producto) => producto.slug_categoria === 'labiales').slice(0, 2);
    const bases = productos.filter((producto) => producto.slug_categoria === 'bases').slice(0, 1);
    const rubores = productos.filter((producto) => producto.slug_categoria === 'rubores').slice(0, 1);
    const seleccion = labiales.concat(bases, rubores);
    if (seleccion.length === 0) {
      if (estado) estado.textContent = 'Aún no hay productos publicados.';
      return;
    }
    if (estado) estado.hidden = true;
    pintarRejilla(rejilla, seleccion);
  } catch (error) {
    if (estado) estado.textContent = error.message;
  }
}

// Carga el catálogo según la categoría y el texto de búsqueda de la dirección.
export async function iniciarCatalogo() {
  const estado = document.getElementById('estado-catalogo');
  const rejilla = document.getElementById('catalogo');
  if (!rejilla) return;

  const params = new URLSearchParams(location.search);
  const categoria = (params.get('categoria') || '').toLowerCase();
  const q = params.get('q') || '';
  const campo = document.getElementById('q');
  const oculto = document.getElementById('categoria-actual');
  if (campo) campo.value = q;
  if (oculto) oculto.value = categoria;

  let categorias = [];
  try {
    const datos = await solicitar('/api/categorias');
    categorias = datos.categorias || [];
  } catch {
    categorias = [];
  }

  const filtros = document.getElementById('filtros');
  if (filtros) {
    categorias.forEach((item) => {
      if (!/^[a-z0-9-]+$/.test(item.slug)) return;
      if (filtros.querySelector(`[data-filtro="${item.slug}"]`)) return;
      filtros.append(el('a', {
        clase: 'filtro',
        attrs: {
          href: `catalogo.html?categoria=${encodeURIComponent(item.slug)}`,
          'data-filtro': item.slug
        },
        texto: item.nombre
      }));
    });
    filtros.querySelectorAll('[data-filtro]').forEach((enlace) => {
      if (enlace.dataset.filtro === (categoria || 'todos')) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    });
  }

  const encontrada = categorias.find((item) => item.slug === categoria);
  const titulo = document.getElementById('titulo-catalogo');
  const nombreVisible = encontrada ? encontrada.nombre : 'Catálogo';
  if (titulo) titulo.textContent = categoria ? nombreVisible : 'Catálogo';
  if (categoria && encontrada) document.title = `${encontrada.nombre} | Essencia Divina`;

  const consulta = new URLSearchParams();
  if (categoria) consulta.set('categoria', categoria);
  if (q) consulta.set('q', q);

  try {
    const { productos } = await solicitar(`/api/productos?${consulta.toString()}`);
    if (!productos.length) {
      if (estado) {
        estado.hidden = false;
        estado.textContent = q || categoria
          ? 'No hay productos para esta búsqueda.'
          : 'Aún no hay productos publicados.';
      }
      rejilla.replaceChildren();
      return;
    }
    if (estado) estado.hidden = true;
    pintarRejilla(rejilla, productos);
  } catch (error) {
    if (estado) {
      estado.hidden = false;
      estado.textContent = error.message;
    }
  }
}
