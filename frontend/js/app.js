import { contarUnidades, iniciarPaginaCarrito } from './carrito.js';
import { iniciarDestacados, iniciarCatalogo } from './productos.js';

// Actualiza el número de productos que se ve junto a "Carrito".
function pintarContador() {
  const total = contarUnidades();
  document.querySelectorAll('[data-contador]').forEach((nodo) => {
    nodo.textContent = String(total);
  });
  document.querySelectorAll('[data-contador-texto]').forEach((nodo) => {
    const palabra = total === 1 ? 'producto' : 'productos';
    nodo.textContent = `${total} ${palabra} en el carrito`;
  });
}

// Abre y cierra el menú en pantallas pequeñas.
function iniciarMenu() {
  const boton = document.querySelector('.menu');
  const nav = document.getElementById('navegacion');
  if (!boton || !nav) return;

  function cerrar() {
    nav.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.textContent = 'Menú';
  }

  boton.addEventListener('click', () => {
    const abierto = nav.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
    boton.textContent = abierto ? 'Cerrar' : 'Menú';
  });

  nav.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) cerrar();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrar();
  });
}

// Marca el enlace del menú que corresponde a la página actual.
function marcarNavegacion() {
  const path = window.location.pathname.replace(/\/index\.html$/, '/') || '/';
  const categoria = new URLSearchParams(window.location.search).get('categoria');
  document.querySelectorAll('[data-nav]').forEach((enlace) => {
    const destino = enlace.dataset.nav;
    let activo = false;
    if (destino === 'inicio') activo = path === '/' || path.endsWith('/index.html');
    if (destino === 'catalogo') activo = path.endsWith('/catalogo.html') && !categoria;
    if (destino === 'labiales') activo = path.endsWith('/catalogo.html') && categoria === 'labiales';
    if (destino === 'bases') activo = path.endsWith('/catalogo.html') && categoria === 'bases';
    if (destino === 'rubores') activo = path.endsWith('/catalogo.html') && categoria === 'rubores';
    if (destino === 'carrito') activo = path.endsWith('/carrito.html');
    if (activo) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  });
}

// Arranca solo la lógica de la página abierta (inicio, catálogo, carrito o administración).
async function iniciarPagina() {
  const pagina = document.body.dataset.pagina;
  if (pagina === 'inicio') await iniciarDestacados();
  if (pagina === 'catalogo') await iniciarCatalogo();
  if (pagina === 'carrito') await iniciarPaginaCarrito();
  if (pagina === 'login' || pagina === 'panel') {
    const admin = await import('./admin.js');
    if (pagina === 'login') await admin.iniciarLogin();
    if (pagina === 'panel') await admin.iniciarPanel();
  }
}

document.querySelectorAll('[data-anio]').forEach((nodo) => {
  nodo.textContent = String(new Date().getFullYear());
});

iniciarMenu();
marcarNavegacion();
pintarContador();
window.addEventListener('carrito:cambio', pintarContador);
window.addEventListener('storage', pintarContador);
iniciarPagina().catch(() => {
  const estado = document.querySelector('.estado');
  if (estado) estado.textContent = 'No se pudo cargar la página.';
});
