# JD Time

Tienda web para la venta de relojes y lociones. El cliente recorre el catálogo, arma un carrito y confirma el pedido por WhatsApp. El administrador gestiona los productos desde un panel protegido en el servidor.

## Tecnologías

- HTML5, CSS3 y JavaScript en el navegador
- Node.js y Express
- MySQL, con consultas preparadas
- Sesiones en cookie `HttpOnly` y contraseñas con bcrypt

## Requisitos

- Node.js 18 o superior
- MySQL 8 o MariaDB 10.6 o superior
- npm

## Instalación

En la carpeta del proyecto:

```bash
npm install
```

Copia la configuración y ajústala:

```bash
copy .env.example .env
```

En Windows, si el archivo `.env` ya existe, revísalo antes de reemplazarlo.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto de la tienda. Por defecto `3000`. |
| `NODE_ENV` | `development` o `production`. En producción la cookie de sesión solo viaja por HTTPS. |
| `TRUST_PROXY` | `1` solo si hay un proxy de confianza delante del servidor. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL. |
| `SESSION_SECRET` | Cadena propia de al menos 32 caracteres. |
| `WHATSAPP_NUMERO` | Destino del pedido, solo dígitos, con indicativo. Para este negocio: `573127198624`. |
| `ADMIN_NOMBRE`, `ADMIN_APELLIDO`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Datos para crear el administrador. La contraseña no se guarda en el código. |

`DB_NAME` solo admite letras, números y guion bajo. `WHATSAPP_NUMERO` no lleva `+` ni espacios.

## Base de datos

La base queda normalizada en cuatro tablas:

- `usuarios`: cuentas. El panel solo acepta el rol `admin`. La columna `password` guarda el hash bcrypt.
- `categorias`: Relojes y Lociones. Permite sumar categorías sin repetir el nombre en cada producto.
- `productos`: catálogo, relacionado con `categorias`.
- `sesiones`: sesión del administrador. No guarda la contraseña.

No hay tabla de pedidos: la confirmación ocurre en WhatsApp. El esquema está en `database/schema.sql`.

Con MySQL en marcha y el `.env` apuntando a ese servidor:

```bash
npm run db:init
```

Ese comando crea la base `essencia_divina`, las tablas, las categorías y un catálogo inicial si todavía no hay productos. Las imágenes iniciales son ilustraciones; desde el panel se reemplazan por fotos reales.

Si al iniciar ves `ER_ACCESS_DENIED_ERROR`, el usuario o la contraseña de `.env` no coinciden con MySQL. En Windows el servicio suele llamarse `MySQL80` y la clave es la que se definió durante la instalación. El cliente, si no está en el PATH, está en `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`.

## Ejecución local

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000).

Para reiniciar el servidor al guardar cambios:

```bash
npm run dev
```

## Usuario administrador

Define `ADMIN_PASSWORD` en `.env` (mínimo 10 caracteres, con letras y números) y ejecuta:

```bash
npm run crear-admin
```

Luego entra en [http://localhost:3000/admin/login.html](http://localhost:3000/admin/login.html).

Si el correo ya existe, el comando actualiza la contraseña y deja la cuenta como administrador activo. La contraseña no se imprime en la consola.

## Estructura

```text
JD TIME/
├── frontend/
│   ├── index.html
│   ├── catalogo.html
│   ├── carrito.html
│   ├── admin/
│   │   ├── login.html
│   │   └── panel.html
│   ├── css/estilos.css
│   ├── js/
│   └── assets/
├── backend/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── scripts/
│   └── util/
├── database/schema.sql
├── uploads/productos/
├── .env.example
└── package.json
```

El navegador solo habla con la API. Crear, editar, ocultar o borrar productos exige sesión de administrador y un token CSRF, también en el servidor.

## Carrito y WhatsApp

El carrito guarda en `localStorage` solo el id del producto y la cantidad. Al ver el carrito y al pulsar **Realizar pedido**, los precios salen de MySQL. El servidor arma el mensaje y devuelve un enlace `https://wa.me/573127198624?text=...`.

## Consideraciones de seguridad

- Las rutas del panel están protegidas en Express. Ocultar el enlace no es la medida de seguridad.
- Las consultas usan parámetros preparados.
- Las contraseñas se guardan con bcrypt y no viajan de vuelta en la API.
- La cookie de sesión es `HttpOnly`, `SameSite=Lax` y, en producción, `Secure`.
- El ingreso del administrador tiene límite de intentos.
- Las imágenes de producto solo aceptan JPG, PNG y WEBP, hasta 2 MB, y se comprueba su firma real. SVG de usuario no está permitido.
- Los errores hacia el navegador no incluyen SQL, rutas internas ni contraseñas.
- En producción usa HTTPS, un usuario de MySQL distinto de `root`, una `SESSION_SECRET` propia y una contraseña de administrador larga.
- Activa `TRUST_PROXY=1` solo detrás de un proxy que controle la cabecera `X-Forwarded-For`.
- WhatsApp confirma el pedido, pero no es un pago. Cualquier persona puede escribir al número; conviene contrastar el mensaje antes de despachar.
