// =============================================
// LANÇAMENTOS — Listagem e Filtros
// =============================================
function renderTransactions() {
  let txs;

  if (S.filter === 'all') {
    txs = [...S.transactions];

  } else if (S.filter === 'credit_card') {
    const creditCardIds = S.accounts
      .filter(a => a.type === 'Cartão de crédito')
      .map(a => a.id);
    txs = S.transactions.filter(t => creditCardIds.includes(t.accountId));

  } else if (S.filter === 'custom') {
    const startVal = document.getElementById('tx-date-start').value;
    const endVal = document.getElementById('tx-date-end').value;

    if (!startVal || !endVal) {
      txs = [...S.transactions];
    } else {
      const start = new Date(startVal + 'T00:00:00');
      const end = new Date(endVal + 'T23:59:59');
      txs = S.transactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d >= start && d <= end;
      });

      // Resumo do período
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const counter = document.getElementById('tx-period-count');
      if (counter) {
        counter.innerHTML = `
          ${txs.length} lançamento(s) ·
          <span style="color:#0F6E56">+${fmt(income)}</span> ·
          <span style="color:#A32D2D">-${fmt(expense)}</span> ·
          <strong style="color:${income - expense >= 0 ? '#0F6E56' : '#A32D2D'}">
            resultado: ${fmt(income - expense)}
          </strong>`;
      }
    }

  } else {
    txs = S.transactions.filter(t => t.type === S.filter);
  }

  txs.sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById('all-tx-list').innerHTML = txs.length
    ? txs.map(t => txRow(t, true)).join('')
    : '<div class="empty-state"><i class="ti ti-receipt-off"></i>Nenhum lançamento encontrado</div>';
}

function setFilter(f, el) {
  S.filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  const dateRange = document.getElementById('tx-date-range');
  if (f === 'custom') {
    dateRange.classList.add('show');
    const now = new Date();
    const start = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    const end = now.toISOString().split('T')[0];
    if (!document.getElementById('tx-date-start').value)
      document.getElementById('tx-date-start').value = start;
    if (!document.getElementById('tx-date-end').value)
      document.getElementById('tx-date-end').value = end;
  } else {
    dateRange.classList.remove('show');
    const counter = document.getElementById('tx-period-count');
    if (counter) counter.innerHTML = '';
  }

  renderTransactions();
}

async function deleteTx(id) {
  if (!confirm('Excluir este lançamento?')) return;
  try {
    await api('DELETE', '/transactions/' + id);
    await loadAll();
    renderTransactions();
    renderDashboard();
  } catch (e) { alert(e.message); }
}

// =============================================
// MODAL: NOVO LANÇAMENTO E UPDATE DE LANÇAMENTO
// =============================================
let editingTxId = null;

function openTxModal(txId = null) {
  editingTxId = txId;
  document.getElementById('modal-tx').querySelector('.modal-title').textContent =
    txId ? 'Editar lançamento' : 'Novo lançamento';

  if (txId) {
    // Preenche com os dados do lançamento existente
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

    // Seleciona a categoria correta
    if (t.catId) {
      document.getElementById('f-cat').value = t.catId;
    }

    // Configura transferência
    if (t.type === 'transfer') {
      if (t.destinationAccountId) {
        setTransferType('own');
        document.getElementById('f-dest-account').value = t.destinationAccountId;
      } else {
        setTransferType('third');
      }
    }

  } else {
    // Novo lançamento — limpa os campos
    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('f-desc').value = '';
    document.getElementById('f-amount').value = '';

    document.getElementById('f-account').innerHTML = S.accounts.map(a =>
      `<option value="${a.id}">${a.name}${a.type === 'Cartão de crédito' ? ' 💳' : ''}</option>`
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
    if (document.getElementById('page-transactions').classList.contains('active'))
      renderTransactions();
    renderAccounts();
  } catch (e) { alert(e.message); }
}
