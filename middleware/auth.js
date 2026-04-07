// Middleware que verifica se o usuário está autenticado
function exigirAutenticacao(req, res, next) {
  if (req.session && req.session.autenticado === true) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = { exigirAutenticacao };
