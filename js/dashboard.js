// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  // const now = new Date();
  // const month = now.getMonth() + 1;
  // const year = now.getFullYear();
  // const monthKey = year + '-' + String(month).padStart(2, '0');
  // const txs = monthlyTx(monthKey);
  // const m = calcMetrics(txs);
  // const totalBal = S.accounts
  //   .filter(a => a.type !== 'Cartão de crédito')
  //   .reduce((s, a) => s + a.balance, 0);


  const dashboard = document.getElementById('metrics-dashboard');

  let html = '';

  for (const account of S.accounts) {
    const isCreditCard = account.type === 'Cartão de crédito';

    html += `
        <div class="metric-card">
          <div class="metric-label">${account.name}</div>
          ${isCreditCard
        ? `<div class="metric-sub">Fatura atual</div>
           <div class="metric-value expense">${fmt(account.invoice || 0)}</div>`
        : `<div class="metric-sub">Saldo</div>
           <div class="metric-value">${fmt(account.balance)}</div>`
      }
        </div>
      `;
  }

  dashboard.innerHTML = html;



  //   <div class="metric-card">
  //     <div class="metric-label">Receitas (mês)</div>
  //     <div class="metric-value income">${fmt(m.income)}</div>
  //   </div>
  //   <div class="metric-card">
  //     <div class="metric-label">Despesas (mês)</div>
  //     <div class="metric-value expense">${fmt(m.expense)}</div>
  //   </div>
  //   <div class="metric-card">
  //     <div class="metric-label">Resultado (mês)</div>
  //     <div class="metric-value ${m.balance >= 0 ? 'income' : 'expense'}">${fmt(m.balance)}</div>
  //   </div>


  const recent = [...S.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  document.getElementById('dash-tx-list').innerHTML = recent.length
    ? recent.map(t => txRow(t, false)).join('')
    : '<div class="empty-state"><i class="ti ti-receipt-off"></i>Sem lançamentos</div>';

  renderCatChart(getFilteredTxsForChart());
  renderMonthChart();
}

// =============================================
// FILTRO DO GRÁFICO DE CATEGORIAS
// =============================================
function setChartFilter(filter, el) {
  chartFilter = filter;
  document.querySelectorAll('[id^="chart-filter-"]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  const dateRange = document.getElementById('chart-date-range');
  if (filter === 'custom') {
    dateRange.classList.add('show');
    const now = new Date();
    const start = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    const end = now.toISOString().split('T')[0];
    if (!document.getElementById('chart-date-start').value)
      document.getElementById('chart-date-start').value = start;
    if (!document.getElementById('chart-date-end').value)
      document.getElementById('chart-date-end').value = end;
  } else {
    dateRange.classList.remove('show');
  }

  renderCatChart(getFilteredTxsForChart());
}

function applyChartDateFilter() {
  renderCatChart(getFilteredTxsForChart());
}

function getFilteredTxsForChart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return S.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');

    if (chartFilter === 'month') return d.getFullYear() === year && d.getMonth() === month;
    if (chartFilter === '3months') return d >= new Date(year, month - 2, 1);
    if (chartFilter === '6months') return d >= new Date(year, month - 5, 1);
    if (chartFilter === 'year') return d.getFullYear() === year;

    if (chartFilter === 'custom') {
      const startVal = document.getElementById('chart-date-start').value;
      const endVal = document.getElementById('chart-date-end').value;
      if (!startVal || !endVal) return true;
      return d >= new Date(startVal + 'T00:00:00') && d <= new Date(endVal + 'T23:59:59');
    }

    return true; // 'all'
  });
}

// =============================================
// GRÁFICO DE CATEGORIAS (ROSCA)
// =============================================
function renderCatChart(txs) {
  const expenses = txs.filter(t => t.type === 'expense');
  const bycat = {};

  expenses.forEach(t => {
    const c = t.catId ? getCat(t.catId) : null;
    const k = c ? c.name : 'Outros';
    const cl = c ? c.color : '#888780';
    bycat[k] = { v: (bycat[k]?.v || 0) + t.amount, color: cl };
  });

  const labels = Object.keys(bycat);
  const data = labels.map(l => bycat[l].v);
  const colors = labels.map(l => bycat[l].color);
  const ctx = document.getElementById('catChart');

  if (S.catChart) S.catChart.destroy();

  if (!data.length) {
    document.getElementById('cat-legend').innerHTML =
      '<span style="color:#aaa;font-size:13px">Sem despesas no período</span>';
    return;
  }

  S.catChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.label + ': ' + fmt(c.raw) } }
      }
    }
  });

  const total = data.reduce((s, v) => s + v, 0);
  document.getElementById('cat-legend').innerHTML = labels.map((l, i) =>
    `<span class="legend-item">
       <span class="legend-dot" style="background:${colors[i]}"></span>
       ${l} ${Math.round(data[i] / total * 100)}%
     </span>`
  ).join('');
}

// =============================================
// GRÁFICO DE EVOLUÇÃO MENSAL (BARRAS)
// =============================================
function getMonthlyData() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    const m = calcMetrics(monthlyTx(key));
    months.push({ label, income: m.income, expense: m.expense });
  }
  return months;
}

function renderMonthChart() {
  const data = getMonthlyData();
  const ctx = document.getElementById('monthChart');
  if (S.monthChart) S.monthChart.destroy();
  S.monthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Receitas', data: data.map(d => d.income), backgroundColor: '#1D9E75', borderRadius: 4 },
        { label: 'Despesas', data: data.map(d => d.expense), backgroundColor: '#E24B4A', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => 'R$' + v.toLocaleString('pt-BR'), font: { size: 11 } } }
      }
    }
  });
}
