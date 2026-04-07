const express = require('express');
const { exigirAutenticacao } = require('../middleware/auth');
const router = express.Router();

// GET /agenda - Exibe o calendário de abril de 2026
router.get('/agenda', exigirAutenticacao, (req, res) => {
  res.render('agenda', {
    csrfToken: req.csrfToken(),
    usuario: req.session.usuarioLogado,
  });
});

module.exports = router;
