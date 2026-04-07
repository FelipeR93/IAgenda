require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const { pool, inicializarBancoDeDados } = require('./db');

const rotasAuth = require('./routes/auth');
const rotasAgenda = require('./routes/agenda');
const rotasLista = require('./routes/lista');

const app = express();
const PORTA = process.env.PORT || 3000;

// ─── Configurações de segurança com Helmet ────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ─── Proxy confiável no Render ────────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── View engine EJS ─────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Arquivos estáticos ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Sessão com PostgreSQL ────────────────────────────────────────────────────
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    name: 'iagenda.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    },
  })
);

// ─── Proteção CSRF (padrão synchronizer token) ────────────────────────────────
app.use((req, res, next) => {
  // Gera token CSRF na sessão se não existir
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Expõe o método csrfToken() para as rotas e views
  req.csrfToken = () => req.session.csrfToken;

  // Valida o token em requisições POST/PUT/DELETE/PATCH
  const metodosProtegidos = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (metodosProtegidos.includes(req.method)) {
    const tokenEnviado = req.body._csrf || req.headers['x-csrf-token'];
    if (!tokenEnviado || tokenEnviado !== req.session.csrfToken) {
      return res.status(403).render('erro', {
        mensagem: 'Token de segurança inválido. Recarregue a página e tente novamente.',
      });
    }
  }

  next();
});

// ─── Rate limiting no login (anti brute-force) ────────────────────────────────
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.session.erroLogin = 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.';
    return res.redirect('/login');
  },
});
app.use('/login', limitadorLogin);

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/', rotasAuth);
app.use('/', rotasAgenda);
app.use('/', rotasLista);

// Redireciona raiz para /agenda (ou /login se não autenticado)
app.get('/', (req, res) => {
  if (req.session && req.session.autenticado) {
    return res.redirect('/agenda');
  }
  return res.redirect('/login');
});

// ─── Tratamento de erros 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('erro', { mensagem: 'Página não encontrada.' });
});

// ─── Tratamento de erros gerais ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro interno:', err.message);
  res.status(500).render('erro', { mensagem: 'Erro interno do servidor.' });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
(async () => {
  try {
    await inicializarBancoDeDados();
    app.listen(PORTA, () => {
      console.log(`Servidor rodando na porta ${PORTA}`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
})();
