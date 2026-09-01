/* ==================================================================
 * app-varligim.js
 * "Varlığım" sayfası: Gayrimenkul, Araç, Mevduat, Diğer Varlıklar ve
 * Döviz için tek merkezde CRUD. Hisse/Fon/Kripto/Emtia/VİOP zaten
 * "Varlıklar" menüsünde yönetildiği için burada TEKRARLANMADI.
 * Tüm sorgular/upsert şemaları mobil Dart sync servislerinden
 * (real_estate/vehicle/other_asset_holdings_sync_service.dart) ve
 * eski portfoy.html'in Döviz mantığından birebir alındı.
 * ================================================================== */

/* ------------------------------------------------------------------
 * ALT SEKME (subtab) GEÇİŞİ
 * ------------------------------------------------------------------ */
document.querySelectorAll('#page-varligim .subtab-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#page-varligim .subtab-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    document.querySelectorAll('#page-varligim .varligim-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`varligimSection-${chip.dataset.subtab}`);
    if (target) target.style.display = '';
  });
});

/* ==================================================================
 * GAYRİMENKUL
 * ================================================================== */
async function loadRealEstateHoldings() {
  const { data, error } = await supa
    .from('real_estate_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('realEstateBody');
  const emptyState = document.getElementById('realEstateEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Gayrimenkul verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const locationText = [row.city, row.district].filter(Boolean).join(' / ');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.title || row.type || 'Gayrimenkul')}</div>
        <div class="name">${escapeHtml(row.type || '')}</div>
      </td>
      <td>${escapeHtml(locationText)}</td>
      <td class="num">${fmtTL(row.purchase_price)}</td>
      <td class="num">${fmtTL(row.current_value)}</td>
      <td class="num">${row.monthly_rent ? fmtTL(row.monthly_rent) : '—'}</td>
      <td class="num">
        <button type="button" class="del real-estate-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.real-estate-delete').addEventListener('click', () => deleteRealEstateHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteRealEstateHolding(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('real_estate_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Gayrimenkul silinemedi: ' + error.message, 'error');
    return;
  }
  await loadRealEstateHoldings();
}

document.getElementById('addRealEstateBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const type = document.getElementById('newRealEstateType').value;
  const title = document.getElementById('newRealEstateTitle').value.trim();
  const city = document.getElementById('newRealEstateCity').value.trim();
  const district = document.getElementById('newRealEstateDistrict').value.trim();
  const purchasePrice = parseFloat(document.getElementById('newRealEstatePurchasePrice').value);
  const currentValue = parseFloat(document.getElementById('newRealEstateCurrentValue').value);
  const monthlyRentRaw = document.getElementById('newRealEstateMonthlyRent').value.trim();
  const monthlyRent = monthlyRentRaw === '' ? null : parseFloat(monthlyRentRaw);
  const purchaseDateRaw = document.getElementById('newRealEstatePurchaseDate').value;

  if (!title || isNaN(purchasePrice) || purchasePrice < 0 || isNaN(currentValue) || currentValue < 0 ||
      (monthlyRent != null && isNaN(monthlyRent)) || !purchaseDateRaw) {
    showMsg('Lütfen gayrimenkul bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }

  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const purchaseDate = new Date(`${purchaseDateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('real_estate_holdings').upsert({
    id, user_id: user.id, type, title, city: city || null, district: district || null,
    purchase_price: purchasePrice, current_value: currentValue, monthly_rent: monthlyRent,
    purchase_date: purchaseDate, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('Gayrimenkul eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newRealEstateTitle', 'newRealEstateCity', 'newRealEstateDistrict', 'newRealEstatePurchasePrice',
    'newRealEstateCurrentValue', 'newRealEstateMonthlyRent', 'newRealEstatePurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newRealEstateType').value = 'Konut';
  await loadRealEstateHoldings();
});

/* ==================================================================
 * ARAÇ
 * ================================================================== */
async function loadVehicleHoldings() {
  const { data, error } = await supa
    .from('vehicle_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('vehicleBody');
  const emptyState = document.getElementById('vehicleEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Araç verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml([row.brand, row.model].filter(Boolean).join(' '))}</div>
        <div class="name">${escapeHtml(row.type || '')}</div>
      </td>
      <td>${escapeHtml(row.plate || '—')}</td>
      <td class="num">${row.model_year || '—'}</td>
      <td class="num">${fmtTL(row.purchase_price)}</td>
      <td class="num">${fmtTL(row.current_value)}</td>
      <td class="num">
        <button type="button" class="del vehicle-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.vehicle-delete').addEventListener('click', () => deleteVehicleHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteVehicleHolding(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('vehicle_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Araç silinemedi: ' + error.message, 'error');
    return;
  }
  await loadVehicleHoldings();
}

document.getElementById('addVehicleBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const type = document.getElementById('newVehicleType').value;
  const brand = document.getElementById('newVehicleBrand').value.trim();
  const model = document.getElementById('newVehicleModel').value.trim();
  const modelYearRaw = document.getElementById('newVehicleModelYear').value.trim();
  const modelYear = modelYearRaw === '' ? null : parseInt(modelYearRaw, 10);
  const plate = document.getElementById('newVehiclePlate').value.trim();
  const purchasePrice = parseFloat(document.getElementById('newVehiclePurchasePrice').value);
  const currentValue = parseFloat(document.getElementById('newVehicleCurrentValue').value);
  const purchaseDateRaw = document.getElementById('newVehiclePurchaseDate').value;

  if (!brand || !model || isNaN(purchasePrice) || purchasePrice < 0 || isNaN(currentValue) || currentValue < 0 ||
      (modelYear != null && isNaN(modelYear)) || !purchaseDateRaw) {
    showMsg('Lütfen araç bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }

  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const purchaseDate = new Date(`${purchaseDateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('vehicle_holdings').upsert({
    id, user_id: user.id, type, brand, model, model_year: modelYear, plate: plate || null,
    purchase_price: purchasePrice, current_value: currentValue, purchase_date: purchaseDate, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('Araç eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newVehicleBrand', 'newVehicleModel', 'newVehicleModelYear', 'newVehiclePlate',
    'newVehiclePurchasePrice', 'newVehicleCurrentValue', 'newVehiclePurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newVehicleType').value = 'Otomobil';
  await loadVehicleHoldings();
});

/* ==================================================================
 * MEVDUAT (Varlığım'daki ayrı görünüm — aynı `deposit_holdings`
 * tablosu, Faiz sayfasındaki liste ile aynı veriyi farklı bir
 * sayfadan da yönetilebilir kılar)
 * ================================================================== */
async function loadVarligimDeposits() {
  const { data, error } = await supa
    .from('deposit_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('varligimDepositBody');
  const emptyState = document.getElementById('varligimDepositEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Mevduat verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const maturityText = row.maturity_date ? new Date(row.maturity_date).toLocaleDateString('tr-TR') : '—';
    const rateText = row.annual_rate == null ? '—' : `%${fmtNumber(row.annual_rate)}`;
    tr.innerHTML = `
      <td><div class="sym">${escapeHtml(row.bank_name || 'Mevduat')}</div></td>
      <td class="num">${fmtTL(row.principal)}</td>
      <td class="num">${rateText}</td>
      <td class="num">${escapeHtml(maturityText)}</td>
      <td class="num">${fmtTL(depositCurrentValue(row))}</td>
      <td class="num">
        <button type="button" class="del varligim-deposit-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>`;
    tr.querySelector('.varligim-deposit-delete').addEventListener('click', () => deleteVarligimDeposit(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteVarligimDeposit(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('deposit_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Mevduat silinemedi: ' + error.message, 'error');
    return;
  }
  await loadVarligimDeposits();
}

document.getElementById('addVarligimDepositBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const bankName = document.getElementById('newVarligimDepositBankName').value.trim();
  const principal = parseFloat(document.getElementById('newVarligimDepositPrincipal').value);
  const annualRate = parseFloat(document.getElementById('newVarligimDepositAnnualRate').value);
  const withholdingRateRaw = document.getElementById('newVarligimDepositWithholdingRate').value.trim();
  const withholdingRate = withholdingRateRaw === '' ? 0 : parseFloat(withholdingRateRaw);
  const startDateRaw = document.getElementById('newVarligimDepositStartDate').value;
  const maturityDateRaw = document.getElementById('newVarligimDepositMaturityDate').value;
  if (!bankName || isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 ||
      isNaN(withholdingRate) || withholdingRate < 0 || !startDateRaw || !maturityDateRaw) {
    showMsg('Lütfen mevduat bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }
  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const startDate = new Date(`${startDateRaw}T12:00:00`).toISOString();
  const maturityDate = new Date(`${maturityDateRaw}T12:00:00`).toISOString();
  const { error } = await supa.from('deposit_holdings').upsert({
    id, user_id: user.id, bank_name: bankName, principal, annual_rate: annualRate,
    withholding_rate: withholdingRate, start_date: startDate, maturity_date: maturityDate, deleted_at: null
  }, { onConflict: 'user_id,id' });
  if (error) {
    showMsg('Mevduat eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newVarligimDepositBankName', 'newVarligimDepositPrincipal', 'newVarligimDepositAnnualRate',
    'newVarligimDepositWithholdingRate', 'newVarligimDepositStartDate', 'newVarligimDepositMaturityDate']
    .forEach(id => document.getElementById(id).value = '');
  await loadVarligimDeposits();
});

/* ==================================================================
 * DİĞER VARLIKLAR
 * ================================================================== */
async function loadOtherAssetHoldings() {
  const { data, error } = await supa
    .from('other_asset_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('otherAssetsBody');
  const emptyState = document.getElementById('otherAssetsEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Diğer varlık verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.title || row.type || 'Diğer')}</div>
        <div class="name">${escapeHtml(row.type || '')}</div>
      </td>
      <td>${escapeHtml(row.description || '—')}</td>
      <td class="num">${fmtTL(row.purchase_price)}</td>
      <td class="num">${fmtTL(row.current_value)}</td>
      <td class="num">
        <button type="button" class="del other-asset-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.other-asset-delete').addEventListener('click', () => deleteOtherAssetHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteOtherAssetHolding(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('other_asset_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Diğer varlık silinemedi: ' + error.message, 'error');
    return;
  }
  await loadOtherAssetHoldings();
}

document.getElementById('addOtherAssetBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const type = document.getElementById('newOtherAssetType').value;
  const title = document.getElementById('newOtherAssetTitle').value.trim();
  const description = document.getElementById('newOtherAssetDescription').value.trim();
  const purchasePrice = parseFloat(document.getElementById('newOtherAssetPurchasePrice').value);
  const currentValue = parseFloat(document.getElementById('newOtherAssetCurrentValue').value);
  const purchaseDateRaw = document.getElementById('newOtherAssetPurchaseDate').value;

  if (!title || isNaN(purchasePrice) || purchasePrice < 0 || isNaN(currentValue) || currentValue < 0 || !purchaseDateRaw) {
    showMsg('Lütfen diğer varlık bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }

  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const purchaseDate = new Date(`${purchaseDateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('other_asset_holdings').upsert({
    id, user_id: user.id, type, title, description: description || null,
    purchase_price: purchasePrice, current_value: currentValue, purchase_date: purchaseDate, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('Diğer varlık eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newOtherAssetTitle', 'newOtherAssetDescription', 'newOtherAssetPurchasePrice',
    'newOtherAssetCurrentValue', 'newOtherAssetPurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newOtherAssetType').value = 'Diğer';
  await loadOtherAssetHoldings();
});

/* ==================================================================
 * DÖVİZ (Varlığım'daki görünüm — eski portfoy.html'deki çalışan
 * Döviz mantığı, yeni id'lerle birebir taşındı)
 * ================================================================== */
const varligimCurrencyMarketList = [
  { code: 'TRY', name: 'Türk Lirası' },
  { code: 'USD', name: 'Amerikan Doları' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'İngiliz Sterlini' },
  { code: 'JPY', name: 'Japon Yeni' },
  { code: 'CHF', name: 'İsviçre Frangı' },
  { code: 'AUD', name: 'Avustralya Doları' },
  { code: 'CAD', name: 'Kanada Doları' },
  { code: 'CNY', name: 'Çin Yuanı' },
  { code: 'RUB', name: 'Rus Rublesi' },
  { code: 'UAH', name: 'Ukrayna Grivnası' }
];

function loadVarligimCurrencyOptions() {
  const list = document.getElementById('varligimCurrencyOptions');
  if (!list) return;
  list.innerHTML = '';
  for (const currency of varligimCurrencyMarketList) {
    const option = document.createElement('option');
    option.value = `${currency.code} — ${currency.name}`;
    list.appendChild(option);
  }
}

function resolveVarligimCurrency(rawValue) {
  const value = String(rawValue || '').trim().toLocaleUpperCase('tr-TR');
  if (!value) return null;
  return varligimCurrencyMarketList.find(currency => {
    const code = currency.code.toLocaleUpperCase('tr-TR');
    const name = currency.name.toLocaleUpperCase('tr-TR');
    return value === code || value.startsWith(`${code} —`) || value === name ||
      value.includes(code) || value.includes(name);
  }) || null;
}

async function loadVarligimCurrencyHoldings() {
  const { data, error } = await supa
    .from('currency_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('currency_code', { ascending: true });
  const tbody = document.getElementById('varligimCurrencyBody');
  const emptyState = document.getElementById('varligimCurrencyEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Döviz verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const costText = row.cost == null ? '—' : fmtTL(row.cost);
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.currency_code)}</div>
        <div class="name">${escapeHtml(row.currency_name || '')}</div>
      </td>
      <td class="num">${fmtNumber(row.amount)}</td>
      <td class="num">${costText}</td>
      <td class="num" id="varligim-currency-price-${escapeHtml(row.currency_code)}">…</td>
      <td class="num" id="varligim-currency-value-${escapeHtml(row.currency_code)}">…</td>
      <td class="num" id="varligim-currency-pl-${escapeHtml(row.currency_code)}">…</td>
      <td class="num">
        <button type="button" class="del" title="Sil" data-currency-code="${escapeHtml(row.currency_code)}">✕</button>
      </td>
    `;
    tr.querySelector('[data-currency-code]').addEventListener('click', () => deleteVarligimCurrencyHolding(row.currency_code));
    tbody.appendChild(tr);
  }
  loadVarligimCurrencyLivePrices(data);
}

async function loadVarligimCurrencyLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const priceEl = document.getElementById(`varligim-currency-price-${row.currency_code}`);
    const valueEl = document.getElementById(`varligim-currency-value-${row.currency_code}`);
    const plEl = document.getElementById(`varligim-currency-pl-${row.currency_code}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=currency&code=${encodeURIComponent(row.currency_code)}`);
      const amount = Number(row.amount) || 0;
      const currentValue = amount * quote.price;
      priceEl.textContent = fmtTL(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      if (row.cost != null) {
        const invested = amount * Number(row.cost);
        plEl.innerHTML = profitLossHtml(invested, currentValue);
      } else {
        plEl.textContent = '—';
      }
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteVarligimCurrencyHolding(currencyCode) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('currency_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('currency_code', currencyCode);
  if (error) {
    showMsg('Döviz silinemedi: ' + error.message, 'error');
    return;
  }
  await loadVarligimCurrencyHoldings();
}

document.getElementById('addVarligimCurrencyBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const searchInput = document.getElementById('newVarligimCurrencySearch');
  const currency = resolveVarligimCurrency(searchInput.value);
  const amount = parseFloat(document.getElementById('newVarligimCurrencyAmount').value);
  const costRaw = document.getElementById('newVarligimCurrencyCost').value.trim();
  const cost = costRaw === '' ? null : parseFloat(costRaw);
  if (!currency || isNaN(amount) || amount <= 0 || (cost !== null && (isNaN(cost) || cost < 0))) {
    showMsg('Lütfen dövizi seçip geçerli bir miktar gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('currency_holdings')
    .upsert({
      user_id: user.id, currency_code: currency.code, currency_name: currency.name,
      amount, cost, deleted_at: null
    }, { onConflict: 'user_id,currency_code' });
  if (error) {
    showMsg('Döviz eklenemedi: ' + error.message, 'error');
    return;
  }
  searchInput.value = '';
  document.getElementById('newVarligimCurrencyAmount').value = '';
  document.getElementById('newVarligimCurrencyCost').value = '';
  await loadVarligimCurrencyHoldings();
});

/* ==================================================================
 * SAYFA YÜKLEYİCİ
 * ================================================================== */
function loadVarligimPage() {
  loadVarligimCurrencyOptions();
  loadRealEstateHoldings();
  loadVehicleHoldings();
  loadVarligimDeposits();
  loadOtherAssetHoldings();
  loadVarligimCurrencyHoldings();
}

registerPageLoader('varligim', loadVarligimPage);
