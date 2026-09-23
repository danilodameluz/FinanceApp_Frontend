// =============================================
// BANCOS CONECTADOS — Pluggy Integration
// =============================================

let pluggyConnectWidget = null;

// =============================================
// RENDERIZAÇÃO DA PÁGINA
// =============================================
async function renderBanks() {
    try {
        const connections = await api('GET', '/pluggy/connections');
        renderConnectionCards(connections || []);
    } catch (e) {
        showSyncStatus('error', 'Erro ao carregar conexões: ' + e.message);
    }
}

function renderConnectionCards(connections) {
    const grid = document.getElementById('banks-connections-grid');
    const empty = document.getElementById('banks-empty');

    if (!connections.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    // Agrupa contas do sistema por pluggyItemId
    const accountsByItem = {};
    S.accounts.forEach(a => {
        if (a.pluggyItemId) {
            if (!accountsByItem[a.pluggyItemId]) accountsByItem[a.pluggyItemId] = [];
            accountsByItem[a.pluggyItemId].push(a);
        }
    });

    grid.innerHTML = connections.map(conn => {
        const statusLabel = {
            'UPDATED': 'Atualizado',
            'UPDATING': 'Atualizando...',
            'ERROR': 'Erro',
            'WAITING_USER_INPUT': 'Aguardando'
        }[conn.status] || conn.status;

        const statusClass = {
            'UPDATED': 'bank-status-ok',
            'UPDATING': 'bank-status-loading',
            'ERROR': 'bank-status-error'
        }[conn.status] || 'bank-status-loading';

        const linkedAccounts = accountsByItem[conn.itemId] || [];

        const accountRows = linkedAccounts.length
            ? linkedAccounts.map(a => {
                const isCreditCard = a.type === 'Cartão de crédito';
                return `<div class="bank-account-row">
            <span>
              <i class="ti ${ACC_ICONS[a.type] || 'ti-building-bank'}"
                 style="margin-right:6px;font-size:12px"></i>
              ${a.name}
            </span>
            <span style="font-weight:500;color:${isCreditCard ? '#A32D2D' : '#0F6E56'}">
              ${isCreditCard ? 'Fatura: ' + fmt(a.invoice || 0) : fmt(a.balance)}
            </span>
          </div>`;
            }).join('')
            : `<div style="font-size:12px;color:#aaa;text-align:center;padding:8px">
           Nenhuma conta sincronizada ainda
         </div>`;

        const updatedAt = conn.updatedAt
            ? new Date(conn.updatedAt).toLocaleString('pt-BR')
            : '—';

        return `<div class="bank-card">
      <div class="bank-card-header">
        <div class="bank-card-name">
          <i class="ti ti-building-bank" style="color:#1D9E75;font-size:20px"></i>
          ${conn.connectorName || 'Banco'}
        </div>
        <span class="bank-status ${statusClass}">${statusLabel}</span>
      </div>

      <div class="bank-card-accounts">
        ${accountRows}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="sync-badge">
          <i class="ti ti-clock"></i>
          Atualizado em ${updatedAt}
        </span>
      </div>

      <div class="bank-card-actions">
        <button class="btn btn-sm" onclick="syncConnection('${conn.itemId}')">
          <i class="ti ti-refresh"></i>Sincronizar
        </button>
        <button class="btn btn-sm" style="color:#A32D2D;border-color:#E24B4A"
                onclick="removeConnection('${conn.itemId}', '${conn.connectorName}')">
          <i class="ti ti-unlink"></i>Desconectar
        </button>
      </div>
    </div>`;
    }).join('');
}

// =============================================
// PLUGGY CONNECT WIDGET
// =============================================
async function openPluggyWidget() {
    try {
        showSyncStatus('loading', 'Preparando conexão...');
        const data = await api('GET', '/pluggy/connect-token');
        const connectToken = data.accessToken;

        // Carrega o script do widget Pluggy dinamicamente
        if (!document.getElementById('pluggy-widget-script')) {
            await loadPluggyScript();
        }

        hideSyncStatus();

        // Abre o widget
        pluggyConnectWidget = new PluggyConnect({
            connectToken,
            onSuccess: async (itemData) => {
                showSyncStatus('loading', `Sincronizando ${itemData.item?.connector?.name || 'banco'}...`);
                try {
                    await api('POST', '/pluggy/sync/' + itemData.item.id);
                    await loadAll();
                    await renderBanks();
                    buildAccountTabs();
                    showSyncStatus('success', 'Banco conectado e sincronizado com sucesso!');
                    setTimeout(hideSyncStatus, 4000);
                } catch (e) {
                    showSyncStatus('error', 'Erro ao sincronizar: ' + e.message);
                }
            },
            onError: (err) => {
                showSyncStatus('error', 'Erro ao conectar banco: ' + err.message);
            },
            onClose: () => {
                hideSyncStatus();
            }
        });

        pluggyConnectWidget.init();

    } catch (e) {
        showSyncStatus('error', 'Erro ao abrir conexão: ' + e.message);
    }
}

function loadPluggyScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'pluggy-widget-script';
        script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.1.0/pluggy-connect.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Falha ao carregar o widget Pluggy'));
        document.head.appendChild(script);
    });
}

// =============================================
// SINCRONIZAÇÃO MANUAL
// =============================================
async function syncConnection(itemId) {
    showSyncStatus('loading', 'Sincronizando dados...');
    try {
        await api('POST', '/pluggy/sync/' + itemId);
        await loadAll();
        await renderBanks();
        buildAccountTabs();
        showSyncStatus('success', 'Dados sincronizados com sucesso!');
        setTimeout(hideSyncStatus, 4000);
    } catch (e) {
        showSyncStatus('error', 'Erro ao sincronizar: ' + e.message);
    }
}

// =============================================
// REMOVER CONEXÃO
// =============================================
async function removeConnection(itemId, bankName) {
    if (!confirm(`Desconectar ${bankName}? As contas e transações importadas serão mantidas no sistema.`)) return;
    try {
        await api('DELETE', '/pluggy/connections/' + itemId);
        await loadAll();
        await renderBanks();
        buildAccountTabs();
        showSyncStatus('success', `${bankName} desconectado com sucesso.`);
        setTimeout(hideSyncStatus, 4000);
    } catch (e) {
        showSyncStatus('error', 'Erro ao desconectar: ' + e.message);
    }
}

// =============================================
// STATUS DE SINCRONIZAÇÃO
// =============================================
function showSyncStatus(type, message) {
    const el = document.getElementById('banks-sync-status');
    if (!el) return;

    const styles = {
        loading: { bg: '#FAEEDA', color: '#633806', icon: 'ti-loader-2' },
        success: { bg: '#E1F5EE', color: '#085041', icon: 'ti-check' },
        error: { bg: '#FCEBEB', color: '#791F1F', icon: 'ti-alert-circle' }
    };

    const s = styles[type] || styles.loading;

    el.style.display = 'block';
    el.innerHTML = `
    <div style="background:${s.bg};color:${s.color};padding:10px 14px;
                border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px">
      <i class="ti ${s.icon}" style="font-size:16px"></i>
      ${message}
    </div>`;
}

function hideSyncStatus() {
    const el = document.getElementById('banks-sync-status');
    if (el) el.style.display = 'none';
}