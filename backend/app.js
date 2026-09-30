// Arranca la tienda: seguridad, sesión, API y páginas HTML.
const path = require('path');
const express = require('express');
const { cargarEntorno } = require('./config/entorno');
const { iniciarPool, obtenerPool, pistaDeConexion } = require('./config/db');
const { crearSesion } = require('./config/sesion');
const { crearCabeceras, permitirOrigenLocal, limiteApi } = require('./middleware/seguridad');
const { manejadorErrores } = require('./util/errores');
const autenticacion = require('./controllers/autenticacion');
const { crearRutas: rutasPedidos } = require('./routes/pedidos');

const entorno = cargarEntorno();
iniciarPool(entorno);

const app = express();
const raiz = path.join(__dirname, '..');
const frontend = path.join(raiz, 'frontend');

app.disable('x-powered-by');
if (entorno.trustProxy) app.set('trust proxy', 1);

app.use(crearCabeceras(entorno));
app.use(permitirOrigenLocal(entorno));
app.use(express.json({ limit: '100kb' }));
app.use(crearSesion(entorno, obtenerPool()));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', limiteApi);
app.use('/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/estado', (req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', require('./routes/autenticacion'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos', rutasPedidos(entorno));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'No encontrado.' });
});

app.use('/uploads', (req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'");
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'public, max-age=604800');
  next();
}, express.static(path.join(raiz, 'uploads'), {
  dotfiles: 'deny',
  index: false
}));

app.use('/uploads', (req, res) => {
  res.status(404).json({ error: 'No encontrado.' });
});

app.use(express.static(frontend, {
  dotfiles: 'deny',
  index: 'index.html',
  maxAge: entorno.esProduccion ? '1h' : 0
}));

app.use((req, res) => {
  res.status(404).sendFile(path.join(frontend, '404.html'));
});

app.use(manejadorErrores);

obtenerPool().query('SELECT 1')
  .then(() => obtenerPool().execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'productos'`,
    [entorno.db.database]
  ))
  .then(([filas]) => {
    if (Number(filas[0].total) === 0) {
      console.error('Faltan las tablas de Essencia Divina. Ejecuta npm run db:init.');
      process.exit(1);
    }
    return autenticacion.preparar();
  })
  .then(() => {
    app.listen(entorno.port, () => {
      console.log(`Essencia Divina está disponible en http://localhost:${entorno.port}`);
    });
  })
  .catch((error) => {
    console.error(`No se pudo conectar a MySQL (${error.code || 'error'}). ${pistaDeConexion(error)}`);
    process.exit(1);
  });
