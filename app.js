const STORAGE_KEY = 'subtrack_data_v1';
const CATEGORIES = {
  video: { label: '视频', icon: '🎬', color: 'bg-rose-100 text-rose-700' },
  music: { label: '音乐', icon: '🎵', color: 'bg-violet-100 text-violet-700' },
  cloud: { label: '云存储', icon: '☁️', color: 'bg-sky-100 text-sky-700' },
  software: { label: '软件', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  gaming: { label: '游戏', icon: '🎮', color: 'bg-emerald-100 text-emerald-700' },
  news: { label: '资讯', icon: '📰', color: 'bg-amber-100 text-amber-700' },
  fitness: { label: '健身', icon: '🏋️', color: 'bg-orange-100 text-orange-700' },
  shopping: { label: '购物会员', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
  other: { label: '其他', icon: '📦', color: 'bg-slate-100 text-slate-700' }
};
const CYCLES = {
  weekly: { label: '每周', months: 12 / 52 },
  monthly: { label: '每月', months: 1 },
  quarterly: { label: '每季', months: 3 },
  yearly: { label: '每年', months: 12 }
};
const CURRENCY = {
  CNY: { symbol: '¥', locale: 'zh-CN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  JPY: { symbol: '¥', locale: 'ja-JP' }
};
const EXCHANGE = { CNY: 1, USD: 7.2, EUR: 7.85, GBP: 9.25, JPY: 0.047 };

let chart = null;

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function toMonthly(amount, currency, cycle) {
  const cnyAmount = amount * (EXCHANGE[currency] || 1);
  return cnyAmount / CYCLES[cycle].months;
}

function formatMoney(amount, currency) {
  const info = CURRENCY[currency] || CURRENCY.CNY;
  return new Intl.NumberFormat(info.locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function formatMoneyCny(amount) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount);
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function renderAll() {
  const data = loadData();
  const baseCurrency = 'CNY';
  let monthlyCny = 0, yearlyCny = 0, upcomingCny = 0;
  const categoryTotals = {};

  data.forEach(item => {
    if (item.cancelled) return;
    const monthly = toMonthly(item.amount, item.currency, item.cycle);
    monthlyCny += monthly;
    yearlyCny += monthly * 12;
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + monthly;
    const d = daysUntil(item.nextDate);
    if (d >= 0 && d <= 30) {
      upcomingCny += monthly;
    }
  });

  document.getElementById('monthlyTotal').textContent = formatMoneyCny(monthlyCny);
  document.getElementById('yearlyTotal').textContent = formatMoneyCny(yearlyCny);
  document.getElementById('activeCount').textContent = data.filter(i => !i.cancelled).length;
  document.getElementById('upcomingTotal').textContent = formatMoneyCny(upcomingCny);

  renderList(data);
  renderChart(categoryTotals);
  checkReminders(data);
}

function renderList(data) {
  const sortBy = document.getElementById('sortBy').value;
  const listEl = document.getElementById('subList');
  const emptyEl = document.getElementById('emptyState');

  let items = [...data];
  if (sortBy === 'dueSoon') {
    items.sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate));
  } else if (sortBy === 'amountDesc') {
    items.sort((a, b) => toMonthly(b.amount, b.currency, b.cycle) - toMonthly(a.amount, a.currency, a.cycle));
  } else if (sortBy === 'amountAsc') {
    items.sort((a, b) => toMonthly(a.amount, a.currency, a.cycle) - toMonthly(b.amount, b.currency, b.cycle));
  } else if (sortBy === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  listEl.innerHTML = '';
  if (items.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  items.forEach(item => {
    const cat = CATEGORIES[item.category] || CATEGORIES.other;
    const monthly = toMonthly(item.amount, item.currency, item.cycle);
    const d = daysUntil(item.nextDate);
    let dueText = '';
    let dueClass = 'text-slate-500';
    if (d < 0) { dueText = `已过期 ${-d} 天`; dueClass = 'text-red-500'; }
    else if (d === 0) { dueText = '今天扣款'; dueClass = 'text-orange-500 font-semibold'; }
    else if (d <= 3) { dueText = `${d} 天后扣款`; dueClass = 'text-orange-500'; }
    else { dueText = `${d} 天后`; }

    const el = document.createElement('div');
    el.className = `card-hover rounded-xl border border-slate-100 bg-white p-4 flex items-center gap-4 ${item.cancelled ? 'opacity-60' : ''}`;
    el.innerHTML = `
      <div class="w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center text-2xl shrink-0">${cat.icon}</div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start">
          <h4 class="font-bold text-slate-800 truncate ${item.cancelled ? 'line-through' : ''}">${escapeHtml(item.name)}</h4>
          <span class="text-sm font-semibold text-slate-700">${formatMoney(item.amount, item.currency)}<span class="text-xs font-normal text-slate-400">/${CYCLES[item.cycle].label.replace('每', '')}</span></span>
        </div>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs px-2 py-0.5 rounded-full ${cat.color}">${cat.label}</span>
          <span class="text-xs ${dueClass}">${dueText}</span>
        </div>
        <div class="text-xs text-slate-400 mt-1">约合 ${formatMoneyCny(monthly)}/月 · 下次 ${item.nextDate}</div>
      </div>
      <div class="flex flex-col gap-1 shrink-0">
        <button data-id="${item.id}" class="btnEdit text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition">编辑</button>
        <button data-id="${item.id}" class="btnDelete text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition">删除</button>
      </div>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll('.btnEdit').forEach(btn => btn.addEventListener('click', () => editItem(btn.dataset.id)));
  listEl.querySelectorAll('.btnDelete').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.id)));
}

function renderChart(categoryTotals) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const labels = Object.keys(categoryTotals).map(k => CATEGORIES[k]?.label || k);
  const values = Object.values(categoryTotals);
  const bgColors = Object.keys(categoryTotals).map(k => {
    const map = {
      video: '#fda4af', music: '#c4b5fd', cloud: '#7dd3fc', software: '#93c5fd',
      gaming: '#6ee7b7', news: '#fcd34d', fitness: '#fdba74', shopping: '#f9a8d4', other: '#cbd5e1'
    };
    return map[k] || '#cbd5e1';
  });

  if (values.length === 0) {
    if (chart) { chart.destroy(); chart = null; }
    ctx.font = '14px Inter';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: bgColors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (c) => `${c.label}: ${formatMoneyCny(c.raw)}/月`
          }
        }
      },
      cutout: '65%'
    }
  });
}

function checkReminders(data) {
  const reminded = JSON.parse(localStorage.getItem('subtrack_reminded') || '[]');
  const now = Date.now();
  const newReminded = reminded.filter(r => now - r.time < 1000 * 60 * 60 * 24);
  data.forEach(item => {
    if (!item.reminder || item.cancelled) return;
    const d = daysUntil(item.nextDate);
    if (d >= 0 && d <= 3 && !newReminded.find(r => r.id === item.id)) {
      showToast(`「${item.name}」将在 ${d === 0 ? '今天' : d + ' 天后'} 扣款`);
      newReminded.push({ id: item.id, time: now });
    }
  });
  localStorage.setItem('subtrack_reminded', JSON.stringify(newReminded));
}

function showToast(msg) {
  const div = document.createElement('div');
  div.className = 'fixed top-4 right-4 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl z-50 max-w-xs';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function editItem(id) {
  const data = loadData();
  const item = data.find(i => i.id === id);
  if (!item) return;
  document.getElementById('editId').value = item.id;
  document.getElementById('name').value = item.name;
  document.getElementById('amount').value = item.amount;
  document.getElementById('currency').value = item.currency;
  document.getElementById('cycle').value = item.cycle;
  document.getElementById('category').value = item.category;
  document.getElementById('nextDate').value = item.nextDate;
  document.getElementById('reminder').checked = item.reminder;
  document.getElementById('formTitle').textContent = '编辑订阅';
  document.getElementById('btnReset').classList.remove('hidden');
}

function deleteItem(id) {
  if (!confirm('确定删除这条订阅吗？')) return;
  const data = loadData().filter(i => i.id !== id);
  saveData(data);
  resetForm();
}

function resetForm() {
  document.getElementById('subForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('nextDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('formTitle').textContent = '新增订阅';
  document.getElementById('btnReset').classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addDemoData() {
  const demo = [
    { id: generateId(), name: 'Netflix', amount: 198, currency: 'CNY', cycle: 'monthly', category: 'video', nextDate: offsetDate(5), reminder: true },
    { id: generateId(), name: 'Spotify', amount: 10.99, currency: 'USD', cycle: 'monthly', category: 'music', nextDate: offsetDate(12), reminder: true },
    { id: generateId(), name: 'iCloud+', amount: 68, currency: 'CNY', cycle: 'monthly', category: 'cloud', nextDate: offsetDate(20), reminder: false },
    { id: generateId(), name: 'Notion AI', amount: 120, currency: 'USD', cycle: 'yearly', category: 'software', nextDate: offsetDate(90), reminder: true },
    { id: generateId(), name: 'PS Plus', amount: 415, currency: 'CNY', cycle: 'yearly', category: 'gaming', nextDate: offsetDate(180), reminder: false }
  ];
  saveData(demo);
  resetForm();
  showToast('已加载示例数据');
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subtrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('格式错误');
      saveData(data);
      resetForm();
      showToast('导入成功');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextDate').value = new Date().toISOString().split('T')[0];

  document.getElementById('subForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = loadData();
    const id = document.getElementById('editId').value;
    const payload = {
      id: id || generateId(),
      name: document.getElementById('name').value.trim(),
      amount: parseFloat(document.getElementById('amount').value),
      currency: document.getElementById('currency').value,
      cycle: document.getElementById('cycle').value,
      category: document.getElementById('category').value,
      nextDate: document.getElementById('nextDate').value,
      reminder: document.getElementById('reminder').checked,
      cancelled: false
    };
    if (id) {
      const idx = data.findIndex(i => i.id === id);
      if (idx >= 0) data[idx] = payload;
    } else {
      data.push(payload);
    }
    saveData(data);
    resetForm();
    showToast(id ? '已更新' : '已添加');
  });

  document.getElementById('btnReset').addEventListener('click', resetForm);
  document.getElementById('sortBy').addEventListener('change', renderAll);
  document.getElementById('btnDemo').addEventListener('click', addDemoData);
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  renderAll();
});
