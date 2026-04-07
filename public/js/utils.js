// ===== UTILITÁRIOS GLOBAIS =====

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2800);
  setTimeout(() => toast.remove(), 3100);
}

// Fetch helper com tratamento de erros
async function api(method, url, data) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) { window.location.href = '/login'; return; }
    throw new Error(json.error || 'Erro na requisição');
  }
  return json;
}

// Formatar data para exibição
function formatDate(dateStr) {
  if (!dateStr) return '–';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Formatar hora
function formatTime(time) {
  return time || '–';
}

// Formatar data completa
function formatDateTime(dateStr, time) {
  return `${formatDate(dateStr)} às ${formatTime(time)}`;
}

// Obter nome do dia da semana
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function getDiaSemana(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return DIAS_SEMANA[d.getDay()];
}

// Chips de dias da semana
function initDayChips(containerId, selectedDays = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayValues = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  container.innerHTML = '';
  days.forEach((day, i) => {
    const isChecked = selectedDays.includes(dayValues[i]);
    const chip = document.createElement('label');
    chip.className = `day-chip ${isChecked ? 'checked' : ''}`;
    chip.innerHTML = `<input type="checkbox" name="dias[]" value="${dayValues[i]}" ${isChecked ? 'checked' : ''}><span>${day}</span>`;
    chip.querySelector('input').addEventListener('change', (e) => {
      chip.classList.toggle('checked', e.target.checked);
    });
    container.appendChild(chip);
  });
}

// Obter dias selecionados
function getSelectedDays(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
}

// Chips de necessidades
const NECESSIDADES = [
  'TEA (Autismo)', 'TDAH', 'Dislexia', 'Discalculia', 'Déficit Cognitivo',
  'Deficiência Visual', 'Deficiência Auditiva', 'Deficiência Motora',
  'Transtorno de Aprendizagem', 'Altas Habilidades', 'Outro'
];

const AREAS = [
  'Psicopedagogia', 'Fonoaudiologia', 'Psicologia', 'Terapia Ocupacional',
  'Fisioterapia', 'Neurologia', 'Neuropediatria', 'Outros'
];

function initNeedChips(containerId, selectedNeeds = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  NECESSIDADES.forEach(need => {
    const isChecked = selectedNeeds.includes(need);
    const chip = document.createElement('label');
    chip.className = `need-chip ${isChecked ? 'checked' : ''}`;
    chip.innerHTML = `<input type="checkbox" name="necessidades[]" value="${need}" ${isChecked ? 'checked' : ''}><span>${need}</span>`;
    chip.querySelector('input').addEventListener('change', (e) => {
      chip.classList.toggle('checked', e.target.checked);
    });
    container.appendChild(chip);
  });
}

// Obter necessidades selecionadas
function getSelectedNeeds(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
}

// Logout
async function logout() {
  await api('POST', '/api/logout');
  window.location.href = '/login';
}

// Marcar nav ativo
function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// Carregar informações do usuário
async function loadUserInfo() {
  try {
    const user = await api('GET', '/api/me');
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.name;
  } catch {}
}

// Confirmar exclusão
function confirmDelete(message, onConfirm) {
  if (confirm(message || 'Confirma a exclusão?')) onConfirm();
}

// Preencher select com opções
function populateSelect(selectEl, items, valueKey, labelFn, placeholder = 'Selecione...') {
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item[valueKey];
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
  });
}
