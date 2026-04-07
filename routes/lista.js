const express = require('express');
const { exigirAutenticacao } = require('../middleware/auth');
const router = express.Router();

const profissionais = [
  { nome: 'Dr. Carlos Mendes', especialidade: 'Engenheiro de Software Sênior' },
  { nome: 'Eng. Juliana Ferreira', especialidade: 'Arquiteta de Soluções' },
  { nome: 'Ana Paula Rocha', especialidade: 'Gerente de Projetos' },
];

const aprendizes = [
  { nome: 'Lucas Oliveira', area: 'Desenvolvimento Web' },
  { nome: 'Beatriz Santos', area: 'Design de Interface' },
  { nome: 'Rafael Costa', area: 'Banco de Dados' },
];

// GET /lista - Exibe a lista de profissionais e aprendizes
router.get('/lista', exigirAutenticacao, (req, res) => {
  res.render('lista', {
    csrfToken: req.csrfToken(),
    usuario: req.session.usuarioLogado,
    profissionais,
    aprendizes,
  });
});

module.exports = router;
