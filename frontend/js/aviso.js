// Muestra un aviso breve, por ejemplo cuando un producto entra al carrito.
export function mostrarAviso(texto) {
  const caja = document.querySelector('[data-aviso]');
  if (!caja) return;
  caja.textContent = texto;
  caja.hidden = false;
  window.clearTimeout(mostrarAviso.temporizador);
  mostrarAviso.temporizador = window.setTimeout(() => {
    caja.hidden = true;
  }, 2800);
}
