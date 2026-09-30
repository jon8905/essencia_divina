const categoriaModelo = require('../models/categoria');

async function listar(req, res) {
  const categorias = await categoriaModelo.listarActivas();
  res.json({ categorias });
}

module.exports = { listar };
