// =============================================
// CONFIGURAÇÃO DA API
// =============================================
const API = 'http://localhost:8080/api';

// =============================================
// CONSTANTES VISUAIS
// =============================================
const ICONS = [
  'ti-shopping-cart', 'ti-home', 'ti-car', 'ti-heart', 'ti-book', 'ti-music',
  'ti-shirt', 'ti-device-tv', 'ti-burger', 'ti-coffee', 'ti-plane', 'ti-pill',
  'ti-barbell', 'ti-device-gamepad-2', 'ti-tool', 'ti-dog', 'ti-baby-carriage',
  'ti-school', 'ti-briefcase', 'ti-building', 'ti-cash', 'ti-credit-card',
  'ti-gift', 'ti-star', 'ti-sun', 'ti-moon', 'ti-leaf', 'ti-bike', 'ti-bus',
  'ti-train', 'ti-boat', 'ti-currency-dollar', 'ti-wallet', 'ti-chart-line',
  'ti-piggy-bank', 'ti-package', 'ti-scissors', 'ti-paint', 'ti-camera', 'ti-headphones'
];

const COLORS = [
  '#1D9E75', '#378ADD', '#E24B4A', '#EF9F27', '#7F77DD', '#D4537E',
  '#639922', '#D85A30', '#185FA5', '#BA7517', '#993556', '#3B6D11',
  '#A32D2D', '#534AB7', '#0F6E56'
];

const COLOR_BG = {
  '#1D9E75': '#E1F5EE', '#378ADD': '#E6F1FB', '#E24B4A': '#FCEBEB',
  '#EF9F27': '#FAEEDA', '#7F77DD': '#EEEDFE', '#D4537E': '#FBEAF0',
  '#639922': '#EAF3DE', '#D85A30': '#FAECE7', '#185FA5': '#E6F1FB',
  '#BA7517': '#FAEEDA', '#993556': '#FBEAF0', '#3B6D11': '#EAF3DE',
  '#A32D2D': '#FCEBEB', '#534AB7': '#EEEDFE', '#0F6E56': '#E1F5EE'
};

const ACC_ICONS = {
  'Conta corrente': 'ti-building-bank',
  'Poupança': 'ti-piggy-bank',
  'Carteira': 'ti-wallet',
  'Investimento': 'ti-trending-up',
  'Cartão de crédito': 'ti-credit-card'
};

const ACC_TYPE_MAP = {
  'CHECKING': 'Conta corrente',
  'SAVINGS': 'Poupança',
  'WALLET': 'Carteira',
  'INVESTMENT': 'Investimento',
  'CREDIT_CARD': 'Cartão de crédito'
};

const ACC_TYPE_MAP_REVERSE = {
  'Conta corrente': 'CHECKING',
  'Poupança': 'SAVINGS',
  'Carteira': 'WALLET',
  'Investimento': 'INVESTMENT',
  'Cartão de crédito': 'CREDIT_CARD'
};

const ACC_BG = ['#E1F5EE', '#E6F1FB', '#FAEEDA', '#EEEDFE', '#FCEBEB', '#FBEAF0'];
const ACC_CLR = ['#085041', '#0C447C', '#633806', '#3C3489', '#791F1F', '#72243E'];

// =============================================
// ESTADO GLOBAL
// =============================================
const S = {
  accounts: [],
  categories: [],
  transactions: [],
  filter: 'all',
  txType: 'expense',
  catTabType: 'expense',
  editingCatId: null,
  selectedIcon: 'ti-shopping-cart',
  selectedColor: '#1D9E75',
  catModalType: 'expense',
  catChart: null,
  monthChart: null,
  reportChart: null,
};

// Tokens de autenticação
let token = localStorage.getItem('token') || '';
let userName = localStorage.getItem('userName') || '';

// Filtros de gráfico e transferência
let selectedAccountId = null; // null = nenhuma conta selecionada ainda
let editingTxId = null;
let chartFilter = 'month';
let transferType = 'own';


// =============================================
// UTILITÁRIOS GLOBAIS
// =============================================
const fmt = v =>
  'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const thisMonth = () => {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
};

const monthlyTx = m => S.transactions.filter(t => t.date.startsWith(m));

const getCat = id => S.categories.find(c => c.id === id);
