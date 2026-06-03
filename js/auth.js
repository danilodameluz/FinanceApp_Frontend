// =============================================
// AUTH — Login, Registro e Logout
// =============================================

function setAuthTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.style.borderBottomColor = 'transparent';
    t.style.color = '#666';
    t.style.fontWeight = 'normal';
  });
  el.style.borderBottomColor = '#1D9E75';
  el.style.color = '#0F6E56';
  el.style.fontWeight = '500';
  document.getElementById('form-login').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('Preencha todos os campos.'); return; }
  try {
    const data = await api('POST', '/auth/login', { email, password });
    token = data.token;
    userName = data.name;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', userName);
    initApp();
  } catch (e) { showAuthError(e.message); }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) { showAuthError('Preencha todos os campos.'); return; }
  try {
    const data = await api('POST', '/auth/register', { name, email, password });
    token = data.token;
    userName = data.name;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', userName);
    initApp();
  } catch (e) { showAuthError(e.message); }
}

function doLogout() {
  token = '';
  userName = '';
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-wrap').style.display = 'flex';
}

function sessionExpired() {
  doLogout();
  // Mostra mensagem na tela de login
  const el = document.getElementById('auth-error');
  el.textContent = 'Sua sessão expirou. Por favor, faça login novamente.';
  el.style.display = 'block';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// =============================================
// INICIALIZAÇÃO DO APP
// =============================================
async function initApp() {
  document.getElementById('auth-wrap').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  document.getElementById('user-name').textContent = userName;
  await loadAll();
  renderDashboard();
}
