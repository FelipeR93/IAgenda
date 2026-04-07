const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Helpers para leitura/escrita de dados
const dataPath = (file) => path.join(__dirname, 'data', file);

function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(file), 'utf-8'));
  } catch {
    return [];
  }
}

function writeData(file, data) {
  fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2), 'utf-8');
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'iagenda-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict'
  }
}));

// Rate limiter geral para páginas
const pageLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

// Rate limiter restrito para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Rate limiter para APIs de escrita
const apiWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// Verificação de CSRF via header customizado para requisições de mutação
function csrfCheck(req, res, next) {
  const origin = req.get('origin') || req.get('referer') || '';
  const host = req.get('host') || '';
  const contentType = req.get('content-type') || '';
  // DELETE sem body não envia Content-Type; para outros métodos, aceitar apenas JSON
  if (req.method !== 'DELETE' && !contentType.includes('application/json')) {
    return res.status(403).json({ error: 'Tipo de conteúdo inválido' });
  }
  // Verificar que a origem bate com o host (same-origin check)
  if (IS_PROD && origin && !origin.includes(host)) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }
  next();
}

// Middleware de autenticação
function auth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Não autorizado' });
  res.redirect('/login');
}

// ==================== PÁGINAS ====================

app.get('/', pageLimiter, (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', pageLimiter, (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', pageLimiter, auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/agendamento', pageLimiter, auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'agendamento.html'));
});

app.get('/cadastro', pageLimiter, auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cadastro.html'));
});

// ==================== AUTH API ====================

app.post('/api/login', loginLimiter, csrfCheck, (req, res) => {
  const { username, password } = req.body;
  const users = readData('users.json');
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
  req.session.user = { id: user.id, username: user.username, name: user.name, role: user.role };
  res.json({ success: true, user: req.session.user });
});

app.post('/api/logout', apiWriteLimiter, csrfCheck, (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json(req.session.user);
});

// ==================== DASHBOARD API ====================

app.get('/api/dashboard', auth, (req, res) => {
  const agendamentos = readData('agendamentos.json');
  const profissionais = readData('profissionais.json');
  const aprendizes = readData('aprendizes.json');
  const salas = readData('salas.json');

  const hoje = new Date().toISOString().split('T')[0];
  const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
  const agendamentosProximos = agendamentos
    .filter(a => a.data >= hoje && a.status !== 'cancelado')
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 10)
    .map(a => ({
      ...a,
      profissional: profissionais.find(p => p.id === a.profissional_id) || {},
      aprendiz: aprendizes.find(ap => ap.id === a.aprendiz_id) || {},
      sala: salas.find(s => s.id === a.sala_id) || {}
    }));

  const statusCount = { agendado: 0, confirmado: 0, cancelado: 0, realizado: 0 };
  agendamentos.forEach(a => { if (statusCount[a.status] !== undefined) statusCount[a.status]++; });

  res.json({
    totais: {
      agendamentos: agendamentos.length,
      agendamentosHoje: agendamentosHoje.length,
      profissionais: profissionais.length,
      aprendizes: aprendizes.length,
      salas: salas.length
    },
    statusCount,
    agendamentosProximos
  });
});

// ==================== PROFISSIONAIS API ====================

app.get('/api/profissionais', auth, (req, res) => {
  res.json(readData('profissionais.json'));
});

app.post('/api/profissionais', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const profissionais = readData('profissionais.json');
  const novo = { id: uuidv4(), ...req.body, criadoEm: new Date().toISOString() };
  profissionais.push(novo);
  writeData('profissionais.json', profissionais);
  res.status(201).json(novo);
});

app.put('/api/profissionais/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const profissionais = readData('profissionais.json');
  const idx = profissionais.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
  profissionais[idx] = { ...profissionais[idx], ...req.body };
  writeData('profissionais.json', profissionais);
  res.json(profissionais[idx]);
});

app.delete('/api/profissionais/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  let profissionais = readData('profissionais.json');
  profissionais = profissionais.filter(p => p.id !== req.params.id);
  writeData('profissionais.json', profissionais);
  res.json({ success: true });
});

// ==================== APRENDIZES API ====================

app.get('/api/aprendizes', auth, (req, res) => {
  res.json(readData('aprendizes.json'));
});

app.post('/api/aprendizes', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const aprendizes = readData('aprendizes.json');
  const novo = { id: uuidv4(), ...req.body, criadoEm: new Date().toISOString() };
  aprendizes.push(novo);
  writeData('aprendizes.json', aprendizes);
  res.status(201).json(novo);
});

app.put('/api/aprendizes/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const aprendizes = readData('aprendizes.json');
  const idx = aprendizes.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
  aprendizes[idx] = { ...aprendizes[idx], ...req.body };
  writeData('aprendizes.json', aprendizes);
  res.json(aprendizes[idx]);
});

app.delete('/api/aprendizes/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  let aprendizes = readData('aprendizes.json');
  aprendizes = aprendizes.filter(a => a.id !== req.params.id);
  writeData('aprendizes.json', aprendizes);
  res.json({ success: true });
});

// ==================== SALAS API ====================

app.get('/api/salas', auth, (req, res) => {
  res.json(readData('salas.json'));
});

app.post('/api/salas', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const salas = readData('salas.json');
  const novo = { id: uuidv4(), ...req.body, criadoEm: new Date().toISOString() };
  salas.push(novo);
  writeData('salas.json', salas);
  res.status(201).json(novo);
});

app.put('/api/salas/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const salas = readData('salas.json');
  const idx = salas.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
  salas[idx] = { ...salas[idx], ...req.body };
  writeData('salas.json', salas);
  res.json(salas[idx]);
});

app.delete('/api/salas/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  let salas = readData('salas.json');
  salas = salas.filter(s => s.id !== req.params.id);
  writeData('salas.json', salas);
  res.json({ success: true });
});

// ==================== AGENDAMENTOS API ====================

app.get('/api/agendamentos', auth, (req, res) => {
  const agendamentos = readData('agendamentos.json');
  const profissionais = readData('profissionais.json');
  const aprendizes = readData('aprendizes.json');
  const salas = readData('salas.json');
  const result = agendamentos.map(a => ({
    ...a,
    profissional: profissionais.find(p => p.id === a.profissional_id) || {},
    aprendiz: aprendizes.find(ap => ap.id === a.aprendiz_id) || {},
    sala: salas.find(s => s.id === a.sala_id) || {}
  }));
  res.json(result);
});

app.post('/api/agendamentos', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const agendamentos = readData('agendamentos.json');
  const novo = {
    id: uuidv4(),
    ...req.body,
    status: req.body.status || 'agendado',
    criadoEm: new Date().toISOString()
  };
  agendamentos.push(novo);
  writeData('agendamentos.json', agendamentos);
  res.status(201).json(novo);
});

app.put('/api/agendamentos/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  const agendamentos = readData('agendamentos.json');
  const idx = agendamentos.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
  agendamentos[idx] = { ...agendamentos[idx], ...req.body };
  writeData('agendamentos.json', agendamentos);
  res.json(agendamentos[idx]);
});

app.delete('/api/agendamentos/:id', auth, apiWriteLimiter, csrfCheck, (req, res) => {
  let agendamentos = readData('agendamentos.json');
  agendamentos = agendamentos.filter(a => a.id !== req.params.id);
  writeData('agendamentos.json', agendamentos);
  res.json({ success: true });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
  console.log(`\n🏥 IAgenda rodando em http://localhost:${PORT}`);
  console.log(`📋 Login padrão: admin / admin123\n`);
});
