// =============================================
// ESTADO DOS LANÇAMENTOS
// =============================================


const TX_PAGE_SIZE = 20;
let txCurrentPage = 1;

// =============================================
// RENDERIZAÇÃO PRINCIPAL
// =============================================
function renderTransactions() {
  const container = document.getElementById('transactions-container');
  if (!container) return;

  // Se nenhuma conta selecionada, seleciona a primeira
  if (selectedAccountId === null && S.accounts.length > 0) {
    selectedAccountId = S.accounts[0].id;
  }

  buildAccountTabs();
  renderAccountTransactions();
}

// =============================================
// ABAS DE CONTAS
// =============================================
function buildAccountTabs() {
  const tabBar = document.getElementById('account-tabs');
  if (!tabBar) return;

  tabBar.innerHTML = S.accounts.map(a => {
    const icon = ACC_ICONS[a.type] || 'ti-building-bank';
    const isCreditCard = a.type === 'Cartão de crédito';
    const subtitle = isCreditCard
      ? `Fatura: ${fmt(a.invoice || 0)}`
      : `Saldo: ${fmt(a.balance)}`;
    const isActive = a.id === selectedAccountId;

    return `<div class="acc-tab ${isActive ? 'acc-tab-active' : ''}"
                 onclick="selectAccount(${a.id})">
      <i class="ti ${icon}" style="font-size:16px"></i>
      <div>
        <div style="font-size:13px;font-weight:500">${a.name}</div>
        <div style="font-size:13px;color:${isCreditCard ? '#A32D2D' : '#0F6E56'}">${subtitle}</div>
      </div>
    </div>`;
  }).join('');
}

function selectAccount(accId) {
  selectedAccountId = accId;
  txCurrentPage = 1;

  // Reseta datas do filtro
  const startEl = document.getElementById('tx-date-start');
  const endEl = document.getElementById('tx-date-end');
  if (startEl) startEl.value = '';
  if (endEl) endEl.value = '';

  buildAccountTabs();
  renderAccountTransactions();
}

// =============================================
// LANÇAMENTOS DA CONTA SELECIONADA
// =============================================
function renderAccountTransactions() {
  const acc = S.accounts.find(a => a.id === selectedAccountId);
  if (!acc) return;

  const startVal = document.getElementById('tx-date-start')?.value;
  const endVal = document.getElementById('tx-date-end')?.value;

  // Filtra por conta (origem ou destino)
  let txs = S.transactions.filter(t =>
    t.accountId === selectedAccountId ||
    t.destinationAccountId === selectedAccountId
  );

  // Filtra por período se preenchido
  if (startVal && endVal) {
    const start = new Date(startVal + 'T00:00:00');
    const end = new Date(endVal + 'T23:59:59');
    txs = txs.filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d >= start && d <= end;
    });
  }

  // Ordena por data decrescente
  txs.sort((a, b) => b.date.localeCompare(a.date));

  // Paginação
  const total = txs.length;
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  if (txCurrentPage > totalPages) txCurrentPage = totalPages;

  const start = (txCurrentPage - 1) * TX_PAGE_SIZE;
  const paged = txs.slice(start, start + TX_PAGE_SIZE);

  // Métricas do período filtrado
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const content = document.getElementById('account-tx-content');
  if (!content) return;

  content.innerHTML = `
    

    <!-- Filtro de período -->
    <div class="card" style="margin-bottom:1rem;padding:0.875rem 1.25rem">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:13px;color:#666;font-weight:500">
          <i class="ti ti-calendar" style="margin-right:4px"></i>Período
        </span>
        <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#666;flex-wrap:wrap">
          <label>De</label>
          <input type="date" id="tx-date-start"
                 value="${startVal || ''}"
                 style="width:145px"
                 onchange="applyTxDateFilter()">
          <label>até</label>
          <input type="date" id="tx-date-end"
                 value="${endVal || ''}"
                 style="width:145px"
                 onchange="applyTxDateFilter()">
          <button class="btn btn-primary btn-sm" onclick="applyTxDateFilter()">
            <i class="ti ti-search"></i>Filtrar
          </button>
          ${startVal && endVal
      ? `<button class="btn btn-sm" onclick="clearTxDateFilter()">
                 <i class="ti ti-x"></i>Limpar
               </button>`
      : ''
    }
        </div>
      </div>
    </div>

    <!-- Paginação -->
    ${totalPages > 1 ? buildPagination(txCurrentPage, totalPages) : ''}
    
    <!-- Lista de lançamentos -->
    <div class="card">
      <div class="tx-list" id="tx-list-content">
        ${paged.length
      ? paged.map(t => txRow(t, true)).join('')
      : '<div class="empty-state"><i class="ti ti-receipt-off"></i>Nenhum lançamento encontrado</div>'
    }
      </div>
    </div>

    <!-- Paginação -->
    ${totalPages > 1 ? buildPagination(txCurrentPage, totalPages) : ''}
  `;
}

function applyTxDateFilter() {
  txCurrentPage = 1;
  renderAccountTransactions();
}

function clearTxDateFilter() {
  txCurrentPage = 1;
  renderAccountTransactions();
}

// =============================================
// PAGINAÇÃO
// =============================================
function buildPagination(current, total) {
  const pages = [];

  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);

  const buttons = pages.map(p => {
    if (p === '...') {
      return `<span style="padding:0 4px;color:#aaa;font-size:13px">…</span>`;
    }
    return `<button class="filter-btn ${p === current ? 'active' : ''}"
                    onclick="goToPage(${p})"
                    style="min-width:32px;padding:5px 8px">
              ${p}
            </button>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:center;
                gap:6px;margin-bottom:1rem;margin-top:1rem;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="goToPage(${current - 1})"
              ${current <= 1 ? 'disabled' : ''}>
        <i class="ti ti-chevron-left"></i>
      </button>
      ${buttons}
      <button class="btn btn-sm" onclick="goToPage(${current + 1})"
              ${current >= total ? 'disabled' : ''}>
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>`;
}

function goToPage(page) {
  const acc = S.accounts.find(a => a.id === selectedAccountId);
  if (!acc) return;

  const txs = S.transactions.filter(t =>
    t.accountId === selectedAccountId ||
    t.destinationAccountId === selectedAccountId
  );
  const totalPages = Math.max(1, Math.ceil(txs.length / TX_PAGE_SIZE));

  if (page < 1 || page > totalPages) return;
  txCurrentPage = page;
  renderAccountTransactions();
  document.getElementById('page-transactions').scrollIntoView({ behavior: 'smooth' });
}

// =============================================
// EXCLUSÃO
// =============================================
async function deleteTx(id) {
  if (!confirm('Excluir este lançamento?')) return;
  try {
    await api('DELETE', '/transactions/' + id);
    await loadAll();
    renderDashboard();
    renderAccountTransactions();
    buildAccountTabs();
  } catch (e) { alert(e.message); }
}

// =============================================
// MODAL: NOVO / EDITAR LANÇAMENTO
// =============================================
function openTxModal(txId = null) {
  editingTxId = txId;
  document.getElementById('modal-tx').querySelector('.modal-title').textContent =
    txId ? 'Editar lançamento' : 'Novo lançamento';

  if (txId) {
    const t = S.transactions.find(tx => tx.id === txId);
    if (!t) return;

    document.getElementById('f-desc').value = t.desc;
    document.getElementById('f-amount').value = t.amount;
    document.getElementById('f-date').value = t.date;

    document.getElementById('f-account').innerHTML = S.accounts.map(a =>
      `<option value="${a.id}" ${a.id === t.accountId ? 'selected' : ''}>
         ${a.name}${a.type === 'Cartão de crédito' ? ' 💳' : ''}
       </option>`
    ).join('');

    document.getElementById('f-account').onchange = () => {
      if (S.txType === 'transfer' && transferType === 'own') setTransferType('own');
    };

    selectTxType(t.type);
    if (t.catId) document.getElementById('f-cat').value = t.catId;

    if (t.type === 'transfer') {
      if (t.destinationAccountId) {
        setTransferType('own');
        document.getElementById('f-dest-account').value = t.destinationAccountId;
      } else {
        setTransferType('third');
      }
    }

  } else {
    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('f-desc').value = '';
    document.getElementById('f-amount').value = '';

    document.getElementById('f-account').innerHTML = S.accounts.map(a =>
      `<option value="${a.id}" ${a.id === selectedAccountId ? 'selected' : ''}>
         ${a.name}${a.type === 'Cartão de crédito' ? ' 💳' : ''}
       </option>`
    ).join('');

    document.getElementById('f-account').onchange = () => {
      if (S.txType === 'transfer' && transferType === 'own') setTransferType('own');
    };

    selectTxType('expense');
  }

  document.getElementById('modal-tx').classList.add('open');
}

function closeTxModal() {
  editingTxId = null;
  document.getElementById('modal-tx').classList.remove('open');
}

function selectTxType(type) {
  S.txType = type;
  ['income', 'expense', 'transfer'].forEach(t => {
    document.getElementById('rb-' + t).className =
      'radio-btn' + (t === type ? ' sel-' + t : '');
  });

  const cats = S.categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type));
  document.getElementById('f-cat').innerHTML = cats.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  document.getElementById('cat-group').style.display = type === 'transfer' ? 'none' : 'block';
  document.getElementById('transfer-type-group').style.display = type === 'transfer' ? 'block' : 'none';

  if (type === 'transfer') {
    setTransferType('own');
  } else {
    document.getElementById('dest-account-group').style.display = 'none';
  }
}

function setTransferType(type) {
  transferType = type;
  ['own', 'third'].forEach(t => {
    document.getElementById('rtb-' + t).className =
      'radio-btn' + (t === type ? ' sel-transfer' : '');
  });

  if (type === 'own') {
    const originId = parseInt(document.getElementById('f-account').value);
    const destAccounts = S.accounts.filter(a =>
      a.id !== originId && a.type !== 'Cartão de crédito'
    );
    document.getElementById('f-dest-account').innerHTML = destAccounts.map(a =>
      `<option value="${a.id}">${a.name} — ${fmt(a.balance)}</option>`
    ).join('');
    document.getElementById('dest-account-group').style.display = 'block';
  } else {
    document.getElementById('dest-account-group').style.display = 'none';
  }
}

async function addTransaction() {
  const desc = document.getElementById('f-desc').value.trim();
  const amount = parseFloat(document.getElementById('f-amount').value);
  const date = document.getElementById('f-date').value;
  const accountId = parseInt(document.getElementById('f-account').value);
  const catEl = document.getElementById('f-cat');
  const categoryId = S.txType !== 'transfer' && catEl.value ? parseInt(catEl.value) : null;

  if (!desc || !amount || amount <= 0 || !date) {
    alert('Preencha todos os campos.');
    return;
  }

  let destinationAccountId = null;
  if (S.txType === 'transfer' && transferType === 'own') {
    destinationAccountId = parseInt(document.getElementById('f-dest-account').value);
    if (!destinationAccountId || destinationAccountId === accountId) {
      alert('Selecione uma conta destino diferente da origem.');
      return;
    }
  }

  const body = {
    description: desc,
    amount,
    type: S.txType.toUpperCase(),
    date,
    accountId,
    categoryId,
    destinationAccountId
  };

  try {
    if (editingTxId) {
      await api('PUT', '/transactions/' + editingTxId, body);
    } else {
      await api('POST', '/transactions', body);
    }
    await loadAll();
    closeTxModal();
    renderDashboard();
    buildAccountTabs();
    renderAccountTransactions();
  } catch (e) { alert(e.message); }
}