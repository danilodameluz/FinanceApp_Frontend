// =============================================
// CONTAS — Listagem
// =============================================
function renderAccounts() {
  const totalBal = S.accounts
    .filter(a => a.type !== 'Cartão de crédito')
    .reduce((s, a) => s + a.balance, 0);

  const totalInvoice = S.accounts
    .filter(a => a.type === 'Cartão de crédito')
    .reduce((s, a) => s + (a.invoice || 0), 0);

  document.getElementById('acc-summary').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Saldo Total Disponível</div>
      <div class="metric-value">${fmt(totalBal)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Fatura total (cartões)</div>
      <div class="metric-value expense">${fmt(totalInvoice)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Contas cadastradas</div>
      <div class="metric-value">${S.accounts.length}</div>
    </div>
    <div class="metric-card" style="display:flex;align-items:center;justify-content:center">
      <button class="btn btn-primary" onclick="openAccountModal()">
        <i class="ti ti-plus"></i>Nova conta
      </button>
    </div>
  `;

  document.getElementById('accounts-grid').innerHTML = S.accounts.map((a, i) => {
    const ci = i % ACC_BG.length;
    const icon = ACC_ICONS[a.type] || 'ti-building-bank';
    const isCreditCard = a.type === 'Cartão de crédito';
    const invoice = a.invoice || 0;

    return `<div class="account-card">
      <div style="display:flex;align-items:center">
        <div style="width:36px;height:36px;border-radius:50%;background:${ACC_BG[ci]};color:${ACC_CLR[ci]};
                    display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:10px">
          <i class="ti ${icon}"></i>
        </div>
        <div>
          <div style="font-size:13px;font-weight:500">${a.name}</div>
          <div style="font-size:12px;color:#666">${a.type}</div>
        </div>
      </div>
      <div style="text-align:right">
        ${isCreditCard
        ? `<div style="font-size:12px;color:#666;margin-bottom:2px">Fatura</div>
             <div style="font-size:16px;font-weight:500;color:${invoice > 0 ? '#A32D2D' : '#0F6E56'}">
               ${fmt(invoice)}
             </div>`
        : `<div style="font-size:12px;color:#666;margin-bottom:2px">Saldo</div>
             <div style="font-size:16px;font-weight:500;color:${a.balance >= 0 ? '#0F6E56' : '#A32D2D'}">
               ${fmt(a.balance)}
             </div>`
      }
        <div style="display:flex;gap:5px;justify-content:flex-end;margin-top:6px">
          ${isCreditCard && invoice > 0
        ? `<button class="btn btn-primary" style="font-size:11px;padding:4px 8px"
                       onclick="openPayInvoiceModal(${a.id}, '${a.name}', ${invoice})">
                 Pagar fatura
               </button>`
        : ''
      }
          <button class="icon-btn danger" onclick="deleteAccount(${a.id})">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><i class="ti ti-building-bank"></i>Nenhuma conta cadastrada</div>';
}

async function deleteAccount(id) {
  if (S.accounts.length <= 1) { alert('Mantenha ao menos uma conta.'); return; }
  if (!confirm('Excluir esta conta?')) return;
  try {
    await api('DELETE', '/accounts/' + id);
    await loadAll();
    renderAccounts();
  } catch (e) { alert(e.message); }
}

// =============================================
// MODAL: NOVA CONTA
// =============================================
function openAccountModal() {
  document.getElementById('acc-name').value = '';
  document.getElementById('acc-balance').value = '';
  document.getElementById('modal-acc').classList.add('open');
}

function closeAccountModal() {
  document.getElementById('modal-acc').classList.remove('open');
}

async function addAccount() {
  const name = document.getElementById('acc-name').value.trim();
  const type = document.getElementById('acc-type').value;
  const balance = parseFloat(document.getElementById('acc-balance').value) || 0;
  if (!name) { alert('Informe o nome da conta.'); return; }

  try {
    await api('POST', '/accounts', {
      name,
      type: ACC_TYPE_MAP_REVERSE[type] || type,
      balance
    });
    closeAccountModal();
    await loadAll();
    renderAccounts();
  } catch (e) { alert(e.message); }
}

// =============================================
// MODAL: PAGAR FATURA
// =============================================
let payingCardId = null;

function openPayInvoiceModal(cardId, cardName, invoice) {
  payingCardId = cardId;
  document.getElementById('invoice-modal-title').textContent = `Pagar fatura — ${cardName}`;
  document.getElementById('invoice-amount').textContent = fmt(invoice);
  document.getElementById('invoice-amount-input').value = '';

  const debitAccounts = S.accounts.filter(a => a.type !== 'Cartão de crédito');
  document.getElementById('invoice-debit-account').innerHTML = debitAccounts.map(a =>
    `<option value="${a.id}">${a.name} — ${fmt(a.balance)}</option>`
  ).join('');

  document.getElementById('modal-invoice').classList.add('open');
}

function closePayInvoiceModal() {
  document.getElementById('modal-invoice').classList.remove('open');
  payingCardId = null;
}

async function confirmPayInvoice() {
  const debitAccountId = parseInt(document.getElementById('invoice-debit-account').value);
  const amountInput = document.getElementById('invoice-amount-input').value;
  const amount = amountInput ? parseFloat(amountInput) : null;

  try {
    await api('POST', `/accounts/${payingCardId}/pay-invoice`, {
      debitAccountId,
      ...(amount ? { amount } : {})
    });
    closePayInvoiceModal();
    await loadAll();
    renderAccounts();
    renderDashboard();
    alert('Fatura paga com sucesso!');
  } catch (e) { alert(e.message); }
}
