const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// GET /login - Exibe o formulário de login
router.get('/login', (req, res) => {
  if (req.session && req.session.autenticado) {
    return res.redirect('/agenda');
  }
  res.render('login', {
    csrfToken: req.csrfToken(),
    erro: req.session.erroLogin || null,
  });
  delete req.session.erroLogin;
});

// POST /login - Processa o formulário de login
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  const loginCorreto = usuario === process.env.APP_LOGIN;
  let senhaCorreta = false;

  if (loginCorreto) {
    try {
      senhaCorreta = await bcrypt.compare(senha, process.env.APP_PASSWORD_HASH);
    } catch {
      senhaCorreta = false;
    }
  }

  if (loginCorreto && senhaCorreta) {
    req.session.regenerate((err) => {
      if (err) {
        req.session.erroLogin = 'Erro interno. Tente novamente.';
        return res.redirect('/login');
      }
      req.session.autenticado = true;
      req.session.usuarioLogado = usuario;
      return res.redirect('/agenda');
    });
  } else {
    req.session.erroLogin = 'Usuário ou senha inválidos.';
    return res.redirect('/login');
  }
});

// POST /logout - Encerra a sessão
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
    }
    res.clearCookie('iagenda.sid');
    return res.redirect('/login');
  });
});

module.exports = router;
