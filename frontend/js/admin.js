import { solicitar, obtenerCsrf, guardarCsrf, leerCsrf, urlDeApi } from './api.js';
import { formatoPrecio, formatoFecha, rutaImagenSegura, el } from './util.js';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

function mensaje(nodo, texto, tipo) {
  if (!nodo) return;
  nodo.textContent = texto || '';
  nodo.classList.toggle('mensaje--error', tipo === 'error');
  nodo.classList.toggle('mensaje--ok', tipo === 'ok');
}

function limpiarErrores(form) {
  form.querySelectorAll('[data-error]').forEach((nodo) => {
    nodo.textContent = '';
  });
  form.querySelectorAll('[aria-invalid]').forEach((campo) => campo.removeAttribute('aria-invalid'));
}

function mostrarCampos(form, campos) {
  if (!campos) return;
  Object.entries(campos).forEach(([campo, texto]) => {
    const aviso = form.querySelector(`[data-error="${campo}"]`);
    const entrada = form.querySelector(`[name="${campo}"]`);
    if (aviso) aviso.textContent = texto;
    if (entrada) entrada.setAttribute('aria-invalid', 'true');
  });
}

// Reintenta una vez si el token de seguridad venció.
async function enviarProtegido(ruta, opciones) {
  try {
    return await solicitar(ruta, { ...opciones, csrf: leerCsrf() });
  } catch (error) {
    if (error.estado !== 403) throw error;
    await obtenerCsrf();
    return solicitar(ruta, { ...opciones, csrf: leerCsrf() });
  }
}

// Formulario de ingreso del administrador.
export async function iniciarLogin() {
  const form = document.getElementById('form-ingreso');
  if (!form) return;
  const aviso = document.getElementById('mensaje-ingreso');

  try {
    await solicitar('/api/auth/sesion');
    window.location.href = 'panel.html';
    return;
  } catch {
    // La persona todavía no tiene una sesión de administrador.
  }

  try {
    await obtenerCsrf();
  } catch (error) {
    mensaje(aviso, error.message, 'error');
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensaje(aviso, '');
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const datos = await solicitar('/api/auth/login', {
        method: 'POST',
        csrf: leerCsrf(),
        json: {
          email: form.email.value.trim(),
          password: form.password.value
        }
      });
      guardarCsrf(datos.csrf);
      window.location.href = 'panel.html';
    } catch (error) {
      if (error.estado === 403) await obtenerCsrf().catch(() => {});
      mensaje(aviso, error.message, 'error');
      boton.disabled = false;
    }
  });
}

// Pantalla para crear, editar, ocultar y eliminar productos.
export async function iniciarPanel() {
  const form = document.getElementById('form-producto');
  const lista = document.getElementById('lista-productos');
  if (!form || !lista) return;

  const aviso = document.getElementById('mensaje-form');
  const titulo = document.getElementById('titulo-form');
  const cancelar = document.getElementById('cancelar-edicion');
  const vista = document.getElementById('vista-imagen');
  const salida = document.getElementById('cerrar-sesion');
  let editando = null;

  try {
    await solicitar('/api/auth/sesion');
    await obtenerCsrf();
  } catch {
    window.location.href = 'login.html';
    return;
  }

  function precioInput(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '';
    return Number.isInteger(numero) ? String(numero) : numero.toFixed(2);
  }

  function reiniciarFormulario() {
    editando = null;
    form.reset();
    form.activo.checked = true;
    titulo.textContent = 'Nuevo producto';
    cancelar.hidden = true;
    vista.hidden = true;
    vista.removeAttribute('src');
    limpiarErrores(form);
  }

  function llenarCategorias(categorias, seleccion) {
    form.categoria.replaceChildren();
    categorias.forEach((categoria) => {
      const opcion = el('option', { texto: categoria.nombre, attrs: { value: categoria.slug } });
      form.categoria.append(opcion);
    });
    if (seleccion) form.categoria.value = seleccion;
  }

  async function cargarLista() {
    const [{ categorias }, { productos }] = await Promise.all([
      solicitar('/api/categorias'),
      solicitar('/api/productos?todos=1')
    ]);
    const slugActual = editando ? editando.slug_categoria : form.categoria.value;
    llenarCategorias(categorias, slugActual);
    lista.replaceChildren();
    if (!productos.length) {
      lista.append(el('p', { clase: 'estado', texto: 'Todavía no hay productos.' }));
      return;
    }
    productos.forEach((producto) => lista.append(filaProducto(producto)));
  }

  function filaProducto(producto) {
    const imagen = el('img', { attrs: { alt: '', width: '72', height: '90' } });
    if (rutaImagenSegura(producto.imagen)) {
      imagen.src = urlDeApi(producto.imagen);
      imagen.alt = producto.nombre;
    }

    const editar = el('button', { clase: 'boton boton--borde boton--pequeno', attrs: { type: 'button' }, texto: 'Editar' });
    const estado = el('button', {
      clase: 'boton boton--borde boton--pequeno',
      attrs: { type: 'button' },
      texto: producto.activo ? 'Desactivar' : 'Activar'
    });
    const eliminar = el('button', {
      clase: 'boton boton--peligro boton--pequeno',
      attrs: { type: 'button' },
      texto: 'Eliminar'
    });

    editar.addEventListener('click', () => {
      editando = producto;
      form.nombre.value = producto.nombre;
      form.categoria.value = producto.slug_categoria;
      form.descripcion.value = producto.descripcion;
      form.precio.value = precioInput(producto.precio);
      form.activo.checked = producto.activo;
      form.imagen.value = '';
      titulo.textContent = 'Editar producto';
      cancelar.hidden = false;
      if (rutaImagenSegura(producto.imagen)) {
        vista.src = urlDeApi(producto.imagen);
        vista.alt = producto.nombre;
        vista.hidden = false;
      }
      limpiarErrores(form);
      mensaje(aviso, '');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    estado.addEventListener('click', async () => {
      const activar = !producto.activo;
      const pregunta = activar
        ? null
        : `¿Desactivar "${producto.nombre}"? Dejará de mostrarse en la tienda.`;
      if (pregunta && !window.confirm(pregunta)) return;
      try {
        await enviarProtegido(`/api/productos/${producto.id_producto}/estado`, {
          method: 'PATCH',
          json: { activo: activar }
        });
        if (editando && editando.id_producto === producto.id_producto) form.activo.checked = activar;
        await cargarLista();
        mensaje(aviso, activar ? 'Producto visible en la tienda.' : 'Producto oculto del catálogo.', 'ok');
      } catch (error) {
        if (error.estado === 401) window.location.href = 'login.html';
        else mensaje(aviso, error.message, 'error');
      }
    });

    eliminar.addEventListener('click', async () => {
      if (!window.confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
      try {
        await enviarProtegido(`/api/productos/${producto.id_producto}`, { method: 'DELETE' });
        if (editando && editando.id_producto === producto.id_producto) reiniciarFormulario();
        await cargarLista();
        mensaje(aviso, 'Producto eliminado.', 'ok');
      } catch (error) {
        if (error.estado === 401) window.location.href = 'login.html';
        else mensaje(aviso, error.message, 'error');
      }
    });

    return el('article', { clase: 'item-admin' }, [
      el('div', { clase: 'item-admin__media' }, [imagen]),
      el('div', {}, [
        el('h3', { texto: producto.nombre }),
        el('p', { clase: 'etiqueta', texto: producto.categoria }),
        el('p', { texto: formatoPrecio(producto.precio) }),
        el('p', {
          clase: producto.activo ? 'pill' : 'pill pill--apagado',
          texto: producto.activo ? 'Visible' : 'Oculto'
        }),
        el('p', { clase: 'ayuda', texto: `Actualizado: ${formatoFecha(producto.updated_at)}` })
      ]),
      el('div', { clase: 'item-admin__acciones' }, [editar, estado, eliminar])
    ]);
  }

  let vistaLocal = '';
  form.imagen.addEventListener('change', () => {
    const archivo = form.imagen.files && form.imagen.files[0];
    if (!archivo) return;
    if (vistaLocal) URL.revokeObjectURL(vistaLocal);
    vistaLocal = URL.createObjectURL(archivo);
    vista.src = vistaLocal;
    vista.alt = 'Vista previa de la imagen seleccionada';
    vista.hidden = false;
  });

  cancelar.addEventListener('click', () => {
    reiniciarFormulario();
    mensaje(aviso, '');
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores(form);
    mensaje(aviso, '');

    const archivo = form.imagen.files && form.imagen.files[0];
    if (!editando && !archivo) {
      mostrarCampos(form, { imagen: 'Selecciona una imagen JPG, PNG o WEBP.' });
      return;
    }
    if (archivo && !TIPOS.includes(archivo.type)) {
      mostrarCampos(form, { imagen: 'La imagen debe ser JPG, PNG o WEBP.' });
      return;
    }
    if (archivo && archivo.size > 2 * 1024 * 1024) {
      mostrarCampos(form, { imagen: 'La imagen supera el tamaño permitido (2 MB).' });
      return;
    }

    const datos = new FormData();
    datos.set('nombre', form.nombre.value.trim());
    datos.set('categoria', form.categoria.value);
    datos.set('descripcion', form.descripcion.value.trim());
    datos.set('precio', form.precio.value.trim());
    datos.set('activo', form.activo.checked ? '1' : '0');
    if (archivo) datos.set('imagen', archivo);

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const ruta = editando ? `/api/productos/${editando.id_producto}` : '/api/productos';
      await enviarProtegido(ruta, { method: editando ? 'PUT' : 'POST', body: datos });
      reiniciarFormulario();
      await cargarLista();
      mensaje(aviso, 'Producto guardado.', 'ok');
    } catch (error) {
      if (error.estado === 401) {
        window.location.href = 'login.html';
        return;
      }
      mostrarCampos(form, error.campos);
      mensaje(aviso, error.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });

  if (salida) {
    salida.addEventListener('click', async () => {
      try {
        await enviarProtegido('/api/auth/logout', { method: 'POST' });
      } catch {
        // Si la sesión ya no existe, de todos modos volvemos al acceso.
      }
      window.location.href = 'login.html';
    });
  }

  try {
    await cargarLista();
  } catch (error) {
    if (error.estado === 401 || error.estado === 403) {
      window.location.href = 'login.html';
      return;
    }
    mensaje(aviso, error.message, 'error');
  }
}
