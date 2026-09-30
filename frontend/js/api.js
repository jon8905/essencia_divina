let tokenCsrf = '';
const PUERTO_API = '3000';

// Si la página se abre con Live Server (puerto 5501), la API sigue en el puerto 3000.
export function baseApi() {
  if (window.location.port === PUERTO_API) return '';
  const host = window.location.hostname === 'localhost' ? 'localhost' : '127.0.0.1';
  return `http://${host}:${PUERTO_API}`;
}

// Antepone el servidor de la API a rutas que empiezan por /.
export function urlDeApi(ruta) {
  if (typeof ruta !== 'string' || !ruta.startsWith('/')) return ruta;
  return `${baseApi()}${ruta}`;
}

// Llama a la API y devuelve el JSON. Si falla, lanza un error con el mensaje del servidor.
export async function solicitar(ruta, opciones = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (opciones.json) cabeceras['Content-Type'] = 'application/json';
  if (opciones.csrf) cabeceras['X-CSRF-Token'] = opciones.csrf;

  let respuesta;
  try {
    respuesta = await fetch(urlDeApi(ruta), {
      method: opciones.method || 'GET',
      credentials: 'include',
      headers: cabeceras,
      body: opciones.json ? JSON.stringify(opciones.json) : opciones.body
    });
  } catch {
    const error = new Error('No se pudo conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.');
    error.estado = 0;
    throw error;
  }

  let datos = {};
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    datos = await respuesta.json();
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || 'No se pudo completar la solicitud.');
    error.estado = respuesta.status;
    error.campos = datos.campos || null;
    error.no_disponibles = datos.no_disponibles || null;
    throw error;
  }

  return datos;
}

// Pide el token que el servidor exige en crear, editar, borrar y cerrar sesión.
export async function obtenerCsrf() {
  const datos = await solicitar('/api/auth/csrf');
  tokenCsrf = datos.csrf || '';
  return tokenCsrf;
}

export function guardarCsrf(token) {
  tokenCsrf = token || '';
}

export function leerCsrf() {
  return tokenCsrf;
}
