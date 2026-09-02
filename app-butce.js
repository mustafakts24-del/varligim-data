/* ==================================================================
 * app-butce.js
 * Bütçe sayfası: mevcut `budget_transactions` tablosu üzerinden tam
 * CRUD (ekle/düzenle/sil) + seçili aya göre gelir/gider/tasarruf
 * özeti + işlem listesi. Kategori listeleri mobildeki
 * `budget_transaction_form_screen.dart` ile birebir aynı.
 * Şema (mobil `portfolio_cloud_sync_service.dart`'tan doğrulandı):
 *   id, user_id, type('Gelir'/'Gider'), category, title, note,
 *   amount, transaction_date (ISO), is_recurring, deleted_at
 * ================================================================== */

const BUDGET_CATEGORIES = {
  Gelir: ['Maaş', 'Prim', 'Ek Gelir', 'Kira Geliri', 'Faiz Geliri', 'Yatırım Geliri', 'Satış', 'Diğer'],
  Gider: [
    'Konut / Kira', 'Market', 'Yeme İçme', 'Ulaşım', 'Faturalar', 'Sağlık', 'Eğitim',
    'Giyim', 'Eğlence', 'Seyahat', 'Sigorta', 'Vergi', 'Borç Ödemesi', 'Araç',
    'Aile', 'Kişisel Bakım', 'Abonelikler', 'Diğer'
  ]
};

let editingBudgetId = null;
let allBudgetRows = [];

function populateBudgetCategoryOptions(selectedCategory) {
  const typeSelect = document.getElementById('budgetType');
  const categorySelect = document.getElementById('budgetCategory');
  const categories = BUDGET_CATEGORIES[typeSelect.value] || BUDGET_CATEGORIES.Gider;
  categorySelect.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (selectedCategory && categories.includes(selectedCategory)) {
    categorySelect.value = selectedCategory;
  }
}

document.getElementById('budgetType').addEventListener('change', () => populateBudgetCategoryOptions());

function getMonthBounds(monthStr) {
  const [y, m] = (monthStr || '').split('-').map(Number);
  if (!y || !m) {
    const now = new Date();
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

function budgetRowAppliesToMonth(row, start, end) {
  const txDate = new Date(row.transaction_date);
  if (row.is_recurring) return txDate < end;
  return txDate >= start && txDate < end;
}

function resetBudgetForm() {
  editingBudgetId = null;
  document.getElementById('budgetFormTitle').textContent = 'İşlem ekle';
  document.getElementById('addBudgetBtn').textContent = 'Ekle';
  document.getElementById('cancelBudgetEditBtn').style.display = 'none';
  document.getElementById('budgetType').value = 'Gider';
  populateBudgetCategoryOptions();
  document.getElementById('budgetTitle').value = '';
  document.getElementById('budgetNote').value = '';
  setGroupedInputValue('budgetAmount', null);
  document.getElementById('budgetDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('budgetRecurring').checked = false;
}

function startEditBudget(row) {
  editingBudgetId = row.id;
  document.getElementById('budgetFormTitle').textContent = 'İşlemi düzenle';
  document.getElementById('addBudgetBtn').textContent = 'Güncelle';
  document.getElementById('cancelBudgetEditBtn').style.display = '';
  document.getElementById('budgetType').value = row.type === 'Gelir' ? 'Gelir' : 'Gider';
  populateBudgetCategoryOptions(row.category);
  document.getElementById('budgetTitle').value = row.title || '';
  document.getElementById('budgetNote').value = row.note || '';
  setGroupedInputValue('budgetAmount', row.amount);
  document.getElementById('budgetDate').value = new Date(row.transaction_date).toISOString().slice(0, 10);
  document.getElementById('budgetRecurring').checked = !!row.is_recurring;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancelBudgetEditBtn').addEventListener('click', resetBudgetForm);

async function deleteBudgetTransaction(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('budget_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('İşlem silinemedi: ' + error.message, 'error');
    return;
  }
  if (editingBudgetId === id) resetBudgetForm();
  await refreshBudgetView();
}

document.getElementById('addBudgetBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const type = document.getElementById('budgetType').value;
  const category = document.getElementById('budgetCategory').value;
  const title = document.getElementById('budgetTitle').value.trim();
  const note = document.getElementById('budgetNote').value.trim();
  const amount = parseGroupedAmount(document.getElementById('budgetAmount').value);
  const dateRaw = document.getElementById('budgetDate').value;
  const isRecurring = document.getElementById('budgetRecurring').checked;

  if (!title || isNaN(amount) || amount <= 0 || !dateRaw) {
    showMsg('Lütfen başlık, tutar ve tarihi eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }

  const id = editingBudgetId || `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const transactionDate = new Date(`${dateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('budget_transactions').upsert({
    id, user_id: user.id, type, category, title, note,
    amount, transaction_date: transactionDate, is_recurring: isRecurring, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('İşlem kaydedilemedi: ' + error.message, 'error');
    return;
  }

  resetBudgetForm();
  await refreshBudgetView();
});

function budgetStatCardHtml(label, icon, color, value) {
  return `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:${color};"><span class="msr">${icon}</span></div>
        <div class="stat-name">${label}</div>
      </div>
      <div class="stat-value">${fmtTL(value)}</div>
    </div>
  `;
}

async function refreshBudgetView() {
  const summaryGrid = document.getElementById('budgetSummaryGrid');
  const tbody = document.getElementById('budgetBody');
  const emptyState = document.getElementById('budgetEmptyState');
  if (!summaryGrid || !tbody) return;

  const monthInput = document.getElementById('budgetMonthInput');
  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const { start, end } = getMonthBounds(monthInput.value);

  const { data, error } = await supa
    .from('budget_transactions')
    .select('*')
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false });

  if (error) {
    showMsg('Bütçe verileri yüklenemedi: ' + error.message, 'error');
    return;
  }

  allBudgetRows = data || [];
  const applicable = allBudgetRows.filter(row => budgetRowAppliesToMonth(row, start, end));

  let income = 0, expense = 0;
  for (const row of applicable) {
    const amount = Number(row.amount) || 0;
    if (row.type === 'Gelir') income += amount;
    else if (row.type === 'Gider') expense += amount;
  }

  summaryGrid.innerHTML = [
    budgetStatCardHtml('Toplam Gelir', 'trending_up', 'var(--cat-budget)', income),
    budgetStatCardHtml('Toplam Gider', 'trending_down', 'var(--negative)', expense),
    budgetStatCardHtml('Tasarruf', 'savings', 'var(--secondary)', income - expense)
  ].join('');

  renderBudgetCalendar(start, applicable);

  tbody.innerHTML = '';
  if (applicable.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const row of applicable) {
    const tr = document.createElement('tr');
    const dateText = new Date(row.transaction_date).toLocaleDateString('tr-TR');
    const typeChip = row.type === 'Gelir'
      ? `<span class="chip pos">Gelir</span>`
      : `<span class="chip neg">Gider</span>`;
    const amountClass = row.type === 'Gelir' ? 'pl-pos' : 'pl-neg';
    const sign = row.type === 'Gelir' ? '+' : '-';
    tr.innerHTML = `
      <td>${escapeHtml(dateText)}${row.is_recurring ? ' <span class="msr" style="font-size:14px; vertical-align:middle;" title="Düzenli">autorenew</span>' : ''}</td>
      <td>${typeChip}</td>
      <td>${escapeHtml(row.category || '')}</td>
      <td>
        <div class="sym">${escapeHtml(row.title || '')}</div>
        ${row.note ? `<div class="name">${escapeHtml(row.note)}</div>` : ''}
      </td>
      <td class="num"><span class="${amountClass}">${sign}${fmtTL(row.amount)}</span></td>
      <td class="num">
        <button type="button" class="btn outline small budget-edit" title="Düzenle" style="margin-right:4px;"><span class="msr" style="font-size:16px;">edit</span></button>
        <button type="button" class="del budget-delete" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.budget-edit').addEventListener('click', () => startEditBudget(row));
    tr.querySelector('.budget-delete').addEventListener('click', () => deleteBudgetTransaction(row.id));
    tbody.appendChild(tr);
  }
}

/* ------------------------------------------------------------------
 * AYLIK TAKVİM (mobildeki budget_calendar_screen.dart karşılığı,
 * kullanıcı raporu ekstra kontrolü / #126 parite denetimi)
 * ------------------------------------------------------------------ */
function renderBudgetCalendar(monthStart, applicableRows) {
  const grid = document.getElementById('budgetCalendarGrid');
  if (!grid) return;

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Pazartesi=0 ... Pazar=6 (mobildeki gibi hafta Pazartesi başlar).
  const firstWeekday = (monthStart.getDay() + 6) % 7;

  const byDay = new Map();
  for (const row of applicableRows) {
    const day = new Date(row.transaction_date).getDate();
    if (!byDay.has(day)) byDay.set(day, { income: 0, expense: 0 });
    const bucket = byDay.get(day);
    const amount = Number(row.amount) || 0;
    if (row.type === 'Gelir') bucket.income += amount;
    else bucket.expense += amount;
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let cells = '';
  for (let i = 0; i < firstWeekday; i++) {
    cells += `<div class="budget-calendar-cell is-empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const bucket = byDay.get(day);
    const isToday = isCurrentMonth && today.getDate() === day;
    cells += `
      <div class="budget-calendar-cell${isToday ? ' is-today' : ''}">
        <div class="bc-day">${day}</div>
        ${bucket && bucket.income > 0 ? `<div class="bc-amt pos">+${fmtTL(bucket.income)}</div>` : ''}
        ${bucket && bucket.expense > 0 ? `<div class="bc-amt neg">-${fmtTL(bucket.expense)}</div>` : ''}
      </div>`;
  }
  grid.innerHTML = cells;
}

document.getElementById('budgetMonthInput').addEventListener('change', refreshBudgetView);

function loadBudgetPage() {
  resetBudgetForm();
  refreshBudgetView();
}

registerPageLoader('butce', loadBudgetPage);
