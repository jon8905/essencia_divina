// Limpia un texto y rechaza símbolos que no deben guardarse en el catálogo.
function textoPlano(valor, { min, max, multilinea }) {
  if (typeof valor !== 'string') {
    return { error: 'El valor no es válido.' };
  }

  const limpio = valor.replace(/\r\n/g, '\n').trim();
  if (!multilinea && /[\n\r]/.test(limpio)) {
    return { error: 'No puede incluir saltos de línea.' };
  }
  if (/[<>]/.test(limpio)) {
    return { error: 'No puede incluir los caracteres < o >.' };
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(limpio)) {
    return { error: 'Incluye caracteres no permitidos.' };
  }
  if (limpio.length < min || limpio.length > max) {
    return { error: `Debe tener entre ${min} y ${max} caracteres.` };
  }
  return { valor: limpio };
}

// Acepta 150000 y también 150.000, que en Colombia significa ciento cincuenta mil.
function leerPrecio(valor) {
  let texto = String(valor ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/^\$/, '')
    .replace(/cop$/i, '');

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(texto)) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d{1,2})$/.test(texto)) {
    texto = texto.replace(',', '.');
  }

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(texto)) return null;
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero <= 0 || numero > 99999999.99) return null;
  return numero.toFixed(2);
}

function leerId(valor) {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0) return null;
  return numero;
}

function leerActivo(valor) {
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false;
  return null;
}

function emailValido(valor) {
  if (typeof valor !== 'string') return '';
  const email = valor.trim().toLowerCase();
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

module.exports = { textoPlano, leerPrecio, leerId, leerActivo, emailValido };
