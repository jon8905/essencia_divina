function formatoPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  const tieneCentavos = Math.round(numero * 100) % 100 !== 0;
  const texto = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: tieneCentavos ? 2 : 0
  }).format(numero);
  return `$${texto}`;
}

module.exports = { formatoPrecio };
