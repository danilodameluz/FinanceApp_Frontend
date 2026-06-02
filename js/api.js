// =============================================
// HELPER DE REQUISIÇÕES
// =============================================
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

// =============================================
// CARREGAMENTO GERAL DE DADOS
// =============================================
async function loadAll() {
  const [txs, cats, accs] = await Promise.all([
    api('GET', '/transactions'),
    api('GET', '/categories'),
    api('GET', '/accounts')
  ]);

  const typeOrder = {
    'Conta corrente': 1,
    'Poupança': 2,
    'Carteira': 3,
    'Investimento': 4,
    'Cartão de crédito': 5
  };

  S.transactions = (txs || []).map(t => ({
    ...t,
    type: t.type.toLowerCase(),
    desc: t.description,
    catId: t.categoryId || null
  }));

  S.categories = (cats || []).map(c => ({
    ...c,
    type: c.type.toLowerCase()
  }));

  S.accounts = (accs || []).map(a => ({
    ...a,
    type: ACC_TYPE_MAP[a.type] || a.type
  })).sort((a, b) => {
    const diff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, 'pt-BR');
  });
}

// =============================================
// NAVEGAÇÃO ENTRE PÁGINAS
// =============================================
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  el.classList.add('active');

  const renders = {
    dashboard: renderDashboard,
    transactions: renderTransactions,
    accounts: renderAccounts,
    categories: renderCategories,
    budget: renderBudget,
    reports: renderReports
  };

  if (renders[id]) renders[id]();
}

// =============================================
// LINHA DE TRANSAÇÃO (compartilhada)
// =============================================
function txRow(t, showDelete = true) {
  const type = (t.type || '').toLowerCase();
  const acc = S.accounts.find(a => a.id === t.accountId);
  const cat = t.catId ? getCat(t.catId) : null;
  const defBg = { income: '#E1F5EE', expense: '#FCEBEB', transfer: '#E6F1FB' };
  const defClr = { income: '#0F6E56', expense: '#A32D2D', transfer: '#185FA5' };
  const defIcon = { income: 'ti-arrow-down-circle', expense: 'ti-arrow-up-circle', transfer: 'ti-arrows-exchange' };
  const bg = cat ? (COLOR_BG[cat.color] || defBg[type]) : defBg[type];
  const clr = cat ? cat.color : defClr[type];
  const iconI = cat ? cat.icon : defIcon[type];
  const sign = { income: '+', expense: '-', transfer: '' };
  const amtCls = { income: 'pos', expense: 'neg', transfer: '' };
  const bLabel = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' };
  const badgeCls = { income: 'badge-income', expense: 'badge-expense', transfer: 'badge-transfer' };

  let accountInfo = acc ? acc.name : '—';
  if (type === 'transfer') {
    accountInfo += t.destinationAccountName
      ? ` → ${t.destinationAccountName}`
      : ' → terceiros';
  }

  return `<div class="tx-item">
    <div class="tx-left">
      <div class="tx-icon" style="background:${bg}">
        <i class="ti ${iconI}" style="color:${clr}"></i>
      </div>
      <div>
        <div class="tx-name">${t.desc}</div>
        <div class="tx-cat">
          <span class="badge ${badgeCls[type]}">${bLabel[type]}</span>
          ${cat ? ' · ' + cat.name : ''}
        </div>
      </div>
    </div>
    <div>
      <div class="tx-amount ${amtCls[type]}">${sign[type]}${fmt(t.amount)}</div>
      <div class="tx-account">${accountInfo} · ${t.date.split('-').reverse().join('/')}</div>
    </div>
    ${showDelete
      ? `<div style="display:flex;gap:4px">
          <button class="icon-btn" onclick="openTxModal(${t.id})" title="Editar">
            <i class="ti ti-edit"></i>
          </button>
          <button class="icon-btn danger" onclick="deleteTx(${t.id})" title="Excluir">
            <i class="ti ti-trash"></i>
          </button>
        </div>`
      : ''
    }
  </div>`;
}

// =============================================
// CÁLCULO DE MÉTRICAS
// =============================================
function calcMetrics(txs) {
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}
