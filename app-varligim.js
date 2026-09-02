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
  const purchasePrice = parseGroupedAmount(document.getElementById('newRealEstatePurchasePrice').value);
  const currentValue = parseGroupedAmount(document.getElementById('newRealEstateCurrentValue').value);
  const monthlyRentRaw = document.getElementById('newRealEstateMonthlyRent').value.trim();
  const monthlyRent = monthlyRentRaw === '' ? null : parseGroupedAmount(monthlyRentRaw);
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
  const purchasePrice = parseGroupedAmount(document.getElementById('newVehiclePurchasePrice').value);
  const currentValue = parseGroupedAmount(document.getElementById('newVehicleCurrentValue').value);
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
  const principal = parseGroupedAmount(document.getElementById('newVarligimDepositPrincipal').value);
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
  const purchasePrice = parseGroupedAmount(document.getElementById('newOtherAssetPurchasePrice').value);
  const currentValue = parseGroupedAmount(document.getElementById('newOtherAssetCurrentValue').value);
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
/* ==================================================================
 * HİSSE SEÇİM LİSTESİ + PORTFÖYÜM
 * FAZ 8 (2026-09): eskiden "Varlıklar" menüsünde (piyasa ile karışık)
 * duran bu bölüm, mobildeki VARLIKLAR≠VARLIĞIM ayrımına uymak için
 * buraya (kullanıcının KENDİ portföyü) taşındı. Seçim listesi olarak
 * mobildeki tam 475 hisselik katalog kullanılıyor (bkz. bist-stocks-data.js).
 * ================================================================== */
function loadStockOptions() {
  const select = document.getElementById('newStockSelect');
  if (!select) return;
  const source = (typeof BIST_STOCKS_475 !== 'undefined' && BIST_STOCKS_475.length > 0)
    ? BIST_STOCKS_475
    : [];
  select.innerHTML = '<option value="">Hisse seç...</option>';
  const sorted = [...source].sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'));
  for (const stock of sorted) {
    const option = document.createElement('option');
    option.value = stock.symbol;
    option.textContent = `${stock.symbol} — ${stock.name}`;
    option.dataset.name = stock.name;
    select.appendChild(option);
  }
}

async function loadHoldings() {
  const { data, error } = await supa
    .from('stock_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('symbol', { ascending: true });
  const tbody = document.getElementById('holdingsBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Hisse verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const invested = (Number(row.lot) || 0) * (Number(row.cost) || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol)}</div>
        ${row.name ? `<div class="name">${escapeHtml(row.name)}</div>` : ''}
      </td>
      <td class="num">${fmtNumber(row.lot)}</td>
      <td class="num">${fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="stock-price-${escapeHtml(row.symbol)}">…</td>
      <td class="num" id="stock-value-${escapeHtml(row.symbol)}">…</td>
      <td class="num" id="stock-pl-${escapeHtml(row.symbol)}">…</td>
      <td class="num">
        <button type="button" class="del stock-delete" data-symbol="${escapeHtml(row.symbol)}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.stock-delete').addEventListener('click', () => deleteHolding(row.symbol));
    tbody.appendChild(tr);
  }
  loadStockLivePrices(data);
}

async function loadStockLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const priceEl = document.getElementById(`stock-price-${row.symbol}`);
    const valueEl = document.getElementById(`stock-value-${row.symbol}`);
    const plEl = document.getElementById(`stock-pl-${row.symbol}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(row.symbol)}`);
      const lot = Number(row.lot) || 0;
      const invested = lot * (Number(row.cost) || 0);
      const currentValue = lot * quote.price;
      priceEl.textContent = fmtTL(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      plEl.innerHTML = profitLossHtml(invested, currentValue);
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteHolding(symbol) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('stock_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('symbol', symbol);
  if (error) {
    showMsg('Hisse silinemedi: ' + error.message, 'error');
    return;
  }
  loadHoldings();
}

document.getElementById('addBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const select = document.getElementById('newStockSelect');
  const selectedOption = select.options[select.selectedIndex];
  const symbol = select.value;
  const name = selectedOption?.dataset?.name || '';
  const lot = parseFloat(document.getElementById('newLot').value);
  const cost = parseFloat(document.getElementById('newCost').value);
  if (!symbol || !name || isNaN(lot) || lot <= 0 || isNaN(cost) || cost <= 0) {
    showMsg('Lütfen hisseyi seçip lot ve maliyeti eksiksiz gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('stock_holdings')
    .upsert({ user_id: user.id, symbol, name, lot, cost }, { onConflict: 'user_id,symbol' });
  if (error) {
    showMsg('Hisse eklenemedi: ' + error.message, 'error');
    return;
  }
  select.value = '';
  document.getElementById('newLot').value = '';
  document.getElementById('newCost').value = '';
  loadHoldings();
});

/* ==================================================================
 * EMTİA PORTFÖYÜM
 * ================================================================== */
const commodityMarketList = [
  { key:'GOLD', symbol:'Au', name:'Altın', unit:'Gram' },
  { key:'SILVER', symbol:'Ag', name:'Gümüş', unit:'Gram' },
  { key:'COPPER', symbol:'Cu', name:'Bakır', unit:'Gram' },
  { key:'PLATINUM', symbol:'Pt', name:'Platin', unit:'Gram' },
  { key:'PALLADIUM', symbol:'Pd', name:'Paladyum', unit:'Gram' },
  { key:'BRENT', symbol:'BRENT', name:'Brent Petrol', unit: 'Varil' },
  { key:'BRENT_USD', symbol:'BRENT_USD', name:'Brent Petrol (USD)', unit: 'Varil' }
];

function loadCommodityOptions() {
  const list = document.getElementById('commodityOptions');
  if (!list) return;
  list.innerHTML = '';
  for (const commodity of commodityMarketList) {
    const option = document.createElement('option');
    option.value = `${commodity.name} — ${commodity.key}`;
    list.appendChild(option);
  }
}

function resolveCommodity(rawValue) {
  const value = String(rawValue || '').trim().toLocaleUpperCase('tr-TR');
  if (!value) return null;
  return commodityMarketList.find(commodity => {
    const key = commodity.key.toLocaleUpperCase('tr-TR');
    const symbol = commodity.symbol.toLocaleUpperCase('tr-TR');
    const name = commodity.name.toLocaleUpperCase('tr-TR');
    return value === key || value === symbol || value === name ||
      value.startsWith(`${name} —`) || value.includes(key) || value.includes(name);
  }) || null;
}

async function loadCommodityHoldings() {
  const { data, error } = await supa
    .from('commodity_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('commodity_key', { ascending: true });
  const tbody = document.getElementById('commodityBody');
  const emptyState = document.getElementById('commodityEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Emtia verileri yüklenemedi: ' + error.message, 'error');
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
        <div class="sym">${escapeHtml(row.name || row.commodity_key)}</div>
        <div class="name">${escapeHtml(row.symbol || '')}${row.unit ? ' · ' + escapeHtml(row.unit) : ''}</div>
      </td>
      <td class="num">${fmtNumber(row.amount)}</td>
      <td class="num">${costText}</td>
      <td class="num" id="commodity-price-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num" id="commodity-value-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num" id="commodity-pl-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num">
        <button type="button" class="del" title="Sil" data-commodity-key="${escapeHtml(row.commodity_key)}">✕</button>
      </td>
    `;
    tr.querySelector('[data-commodity-key]').addEventListener('click', () => deleteCommodityHolding(row.commodity_key));
    tbody.appendChild(tr);
  }
  loadCommodityLivePrices(data);
}

async function loadCommodityLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const priceEl = document.getElementById(`commodity-price-${row.commodity_key}`);
    const valueEl = document.getElementById(`commodity-value-${row.commodity_key}`);
    const plEl = document.getElementById(`commodity-pl-${row.commodity_key}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=commodity&key=${encodeURIComponent(row.commodity_key)}`);
      const isUsd = row.commodity_key === 'BRENT_USD';
      const fmt = isUsd ? fmtUSD : fmtTL;
      const amount = Number(row.amount) || 0;
      const currentValue = amount * quote.price;
      priceEl.textContent = fmt(quote.price);
      valueEl.textContent = fmt(currentValue);
      if (row.cost != null) {
        const invested = amount * Number(row.cost);
        plEl.innerHTML = profitLossHtml(invested, currentValue, fmt);
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

async function deleteCommodityHolding(commodityKey) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('commodity_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('commodity_key', commodityKey);
  if (error) {
    showMsg('Emtia silinemedi: ' + error.message, 'error');
    return;
  }
  await loadCommodityHoldings();
}

document.getElementById('addCommodityBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const searchInput = document.getElementById('newCommoditySearch');
  const commodity = resolveCommodity(searchInput.value);
  const amount = parseFloat(document.getElementById('newCommodityAmount').value);
  const costRaw = document.getElementById('newCommodityCost').value.trim();
  const cost = costRaw === '' ? null : parseFloat(costRaw);
  if (!commodity || isNaN(amount) || amount <= 0 || (cost !== null && (isNaN(cost) || cost < 0))) {
    showMsg('Lütfen emtiayı seçip geçerli bir miktar gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('commodity_holdings')
    .upsert({
      user_id: user.id, commodity_key: commodity.key, symbol: commodity.symbol,
      name: commodity.name, unit: commodity.unit, amount, cost, deleted_at: null
    }, { onConflict: 'user_id,commodity_key' });
  if (error) {
    showMsg('Emtia eklenemedi: ' + error.message, 'error');
    return;
  }
  searchInput.value = '';
  document.getElementById('newCommodityAmount').value = '';
  document.getElementById('newCommodityCost').value = '';
  await loadCommodityHoldings();
});

/* ==================================================================
 * KRİPTO SEÇİM LİSTESİ + PORTFÖYÜM
 * ================================================================== */
function loadCryptoOptions() {
  const select = document.getElementById('newCryptoSelect');
  if (!select) return;
  const cryptos = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'tether', symbol: 'USDT', name: 'Tether' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
    { id: 'tron', symbol: 'TRX', name: 'TRON' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
    { id: 'matic-network', symbol: 'POL', name: 'Polygon' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
    { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol' },
    { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer' },
    { id: 'aptos', symbol: 'APT', name: 'Aptos' },
    { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
    { id: 'optimism', symbol: 'OP', name: 'Optimism' },
    { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
    { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
    { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera' },
    { id: 'vechain', symbol: 'VET', name: 'VeChain' },
    { id: 'the-open-network', symbol: 'TON', name: 'Toncoin' },
    { id: 'sui', symbol: 'SUI', name: 'Sui' },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe' }
  ];
  select.innerHTML = '<option value="">Kripto seç...</option>';
  cryptos.forEach((crypto) => {
    const option = document.createElement('option');
    option.value = crypto.id;
    option.textContent = `${crypto.symbol} — ${crypto.name}`;
    option.dataset.symbol = crypto.symbol;
    option.dataset.name = crypto.name;
    option.dataset.image = '';
    select.appendChild(option);
  });
}

async function loadCryptoLivePrices(rows) {
  let prices = {};
  try {
    prices = await fetchCryptoPricesTry(rows.map(row => row.crypto_id));
  } catch (e) {
    // Toplu istek başarısız olduysa her satır aşağıda '—' gösterecek.
  }
  for (const row of rows) {
    const priceEl = document.getElementById(`crypto-price-${row.crypto_id}`);
    const valueEl = document.getElementById(`crypto-value-${row.crypto_id}`);
    const plEl = document.getElementById(`crypto-pl-${row.crypto_id}`);
    if (!priceEl || !valueEl || !plEl) continue;
    const price = prices[row.crypto_id];
    if (!price) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
      continue;
    }
    const amount = Number(row.amount) || 0;
    const invested = amount * (Number(row.cost) || 0);
    const currentValue = amount * price;
    priceEl.textContent = fmtTL(price);
    valueEl.textContent = fmtTL(currentValue);
    plEl.innerHTML = profitLossHtml(invested, currentValue);
  }
}

async function loadCryptoHoldings() {
  const { data, error } = await supa
    .from('crypto_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('symbol', { ascending: true });
  const tbody = document.getElementById('cryptoBody');
  const emptyState = document.getElementById('cryptoEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Kripto verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const invested = (Number(row.amount) || 0) * (Number(row.cost) || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol)}</div>
        ${row.name ? `<div class="name">${escapeHtml(row.name)}</div>` : ''}
      </td>
      <td class="num">${fmtNumber(row.amount)}</td>
      <td class="num">${fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="crypto-price-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num" id="crypto-value-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num" id="crypto-pl-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num">
        <button class="del crypto-delete" data-id="${escapeHtml(row.crypto_id)}" title="Sil">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  loadCryptoLivePrices(data);
  tbody.querySelectorAll('.crypto-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCryptoHolding(btn.dataset.id));
  });
}

async function deleteCryptoHolding(cryptoId) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('crypto_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('crypto_id', cryptoId);
  if (error) {
    showMsg('Kripto silinemedi: ' + error.message, 'error');
    return;
  }
  await loadCryptoHoldings();
}

document.getElementById('addCryptoBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const select = document.getElementById('newCryptoSelect');
  const selectedOption = select.options[select.selectedIndex];
  const cryptoId = select.value;
  const symbol = selectedOption?.dataset?.symbol || '';
  const name = selectedOption?.dataset?.name || '';
  const imageUrl = selectedOption?.dataset?.image || null;
  const amount = parseFloat(document.getElementById('newCryptoAmount').value);
  const cost = parseFloat(document.getElementById('newCryptoCost').value);
  if (!cryptoId || !symbol || !name || isNaN(amount) || amount <= 0 || isNaN(cost) || cost <= 0) {
    showMsg('Lütfen kriptoyu seçip miktar ve maliyeti eksiksiz gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('crypto_holdings')
    .upsert({
      user_id: user.id, deleted_at: null, crypto_id: cryptoId,
      symbol, name, amount, cost, image_url: imageUrl
    }, { onConflict: 'user_id,crypto_id' });
  if (error) {
    showMsg('Kripto eklenemedi: ' + error.message, 'error');
    return;
  }
  select.value = '';
  document.getElementById('newCryptoAmount').value = '';
  document.getElementById('newCryptoCost').value = '';
  loadCryptoHoldings();
});

/* ==================================================================
 * YATIRIM FONLARIM
 * ================================================================== */
async function loadFundHoldings() {
  const { data, error } = await supa
    .from('fund_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('code', { ascending: true });
  const tbody = document.getElementById('fundBody');
  const emptyState = document.getElementById('fundEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Fon verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const units = Number(row.units) || 0;
    const cost = Number(row.cost) || 0;
    const invested = units * cost;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.code || '')}</div>
        <div class="name">${escapeHtml(row.name || '')}</div>
      </td>
      <td class="num">${fmtNumber(row.units)}</td>
      <td class="num">${row.cost == null ? '—' : fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="fund-price-${escapeHtml(row.code || '')}">…</td>
      <td class="num" id="fund-value-${escapeHtml(row.code || '')}">…</td>
      <td class="num" id="fund-pl-${escapeHtml(row.code || '')}">…</td>
      <td class="num">
        <button type="button" class="del fund-delete" data-fund-code="${escapeHtml(row.code || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('[data-fund-code]').addEventListener('click', () => deleteFundHolding(row.code));
    tbody.appendChild(tr);
  }
  loadFundLivePrices(data);
}

async function loadFundLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const code = row.code || '';
    const priceEl = document.getElementById(`fund-price-${code}`);
    const valueEl = document.getElementById(`fund-value-${code}`);
    const plEl = document.getElementById(`fund-pl-${code}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=fund&code=${encodeURIComponent(code)}`);
      const units = Number(row.units) || 0;
      const currentValue = units * quote.price;
      priceEl.textContent = fmtTLPrecise(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      if (row.cost != null) {
        const invested = units * Number(row.cost);
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

async function deleteFundHolding(code) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('fund_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('code', code);
  if (error) {
    showMsg('Fon silinemedi: ' + error.message, 'error');
    return;
  }
  await loadFundHoldings();
}

let selectedFundForWeb = null;
let fundLookupTimer = null;
let fundLookupRequestId = 0;

async function findFundByExactCode(rawCode) {
  const code = String(rawCode || '').trim().toLocaleUpperCase('tr-TR');
  if (!code) return null;
  const { data, error } = await supa
    .from('fund_catalog')
    .select('code,name')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const foundCode = String(data.code || '').trim().toLocaleUpperCase('tr-TR');
  const foundName = String(data.name || '').trim();
  if (foundCode !== code || !foundName) return null;
  return { code: foundCode, name: foundName };
}

async function resolveFundCodeInput() {
  const codeInput = document.getElementById('newFundCode');
  const nameInput = document.getElementById('newFundName');
  const code = String(codeInput.value || '').trim().toLocaleUpperCase('tr-TR');
  codeInput.value = code;
  nameInput.value = '';
  selectedFundForWeb = null;
  if (!code) return;
  const requestId = ++fundLookupRequestId;
  nameInput.value = 'Fon aranıyor...';
  try {
    const fund = await findFundByExactCode(code);
    if (requestId !== fundLookupRequestId) return;
    if (!fund) {
      nameInput.value = '';
      showMsg(code + ' koduyla eşleşen fon bulunamadı. Fon kodunu kontrol et.', 'error');
      return;
    }
    selectedFundForWeb = fund;
    nameInput.value = fund.name;
    hideMsg();
  } catch (err) {
    if (requestId !== fundLookupRequestId) return;
    nameInput.value = '';
    showMsg('Fon kataloğu okunamadı: ' + (err?.message || 'Bilinmeyen hata'), 'error');
  }
}

document.getElementById('newFundCode').addEventListener('input', () => {
  clearTimeout(fundLookupTimer);
  const codeInput = document.getElementById('newFundCode');
  codeInput.value = String(codeInput.value || '').toLocaleUpperCase('tr-TR');
  selectedFundForWeb = null;
  document.getElementById('newFundName').value = '';
  fundLookupTimer = setTimeout(() => { resolveFundCodeInput(); }, 450);
});

document.getElementById('newFundCode').addEventListener('blur', () => {
  clearTimeout(fundLookupTimer);
  resolveFundCodeInput();
});

document.getElementById('addFundBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const codeInput = document.getElementById('newFundCode');
  const nameInput = document.getElementById('newFundName');
  const code = String(codeInput.value || '').trim().toLocaleUpperCase('tr-TR');
  if (!selectedFundForWeb || selectedFundForWeb.code !== code) {
    await resolveFundCodeInput();
  }
  if (!selectedFundForWeb || selectedFundForWeb.code !== code) {
    showMsg('Önce geçerli bir fon kodu yaz ve fonun bulunmasını bekle.', 'error');
    return;
  }
  const name = selectedFundForWeb.name;
  const units = parseFloat(document.getElementById('newFundUnits').value);
  const cost = parseFloat(document.getElementById('newFundCost').value);
  if (!code || !name || isNaN(units) || units <= 0 || isNaN(cost) || cost < 0) {
    showMsg('Geçerli fon kodunu seçip adet ve maliyeti gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('fund_holdings')
    .upsert({ user_id: user.id, code, name, units, cost, deleted_at: null }, { onConflict: 'user_id,code' });
  if (error) {
    showMsg('Fon eklenemedi: ' + error.message, 'error');
    return;
  }
  codeInput.value = '';
  nameInput.value = '';
  document.getElementById('newFundUnits').value = '';
  document.getElementById('newFundCost').value = '';
  selectedFundForWeb = null;
  await loadFundHoldings();
});

/* ==================================================================
 * VİOP'LARIM
 * FAZ 8 notu: mobildeki viop_holdings_sync_service.dart'ta
 * category_index alanı 0=Hisse,1=Endeks,2=Döviz,3=Kıymetli Maden,
 * 4=Diğer şeklinde anlamlı bir değer taşıyor; web tarafı ise
 * eskiden bunu hep 0 yazıyordu (bilinen düşük öncelikli hata). Yeni
 * "newViopCategory" seçim kutusuyla artık doğru değer yazılıyor.
 * ================================================================== */
async function loadViopHoldings() {
  const { data, error } = await supa
    .from('viop_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('viopBody');
  const emptyState = document.getElementById('viopEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('VİOP verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const lot = Number(row.lot) || 0;
    const cost = row.cost == null ? null : Number(row.cost);
    const invested = cost != null ? lot * cost : null;
    const symKey = encodeURIComponent(row.symbol || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol || '')}</div>
        <div class="name">${escapeHtml(
          [row.underlying, row.is_option ? 'Opsiyon' : 'Vadeli İşlem'].filter(Boolean).join(' • ')
        )}</div>
      </td>
      <td class="num">${fmtNumber(row.lot)}</td>
      <td class="num">${cost == null ? '—' : fmtTL(cost)}</td>
      <td class="num">${invested == null ? '—' : fmtTL(invested)}</td>
      <td class="num" id="viop-price-${symKey}">…</td>
      <td class="num" id="viop-value-${symKey}">…</td>
      <td class="num" id="viop-pl-${symKey}">…</td>
      <td class="num">
        <button type="button" class="del viop-delete" data-symbol="${escapeHtml(row.symbol || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.viop-delete').addEventListener('click', () => deleteViopHolding(row.symbol));
    tbody.appendChild(tr);
  }
  loadViopLivePrices(data);
}

async function loadViopLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const symbol = row.symbol || '';
    const symKey = encodeURIComponent(symbol);
    const priceEl = document.getElementById(`viop-price-${symKey}`);
    const valueEl = document.getElementById(`viop-value-${symKey}`);
    const plEl = document.getElementById(`viop-pl-${symKey}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(symbol)}`);
      const lot = Number(row.lot) || 0;
      const currentValue = lot * quote.price;
      priceEl.textContent = fmtTLPrecise(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      if (row.cost != null) {
        const invested = lot * Number(row.cost);
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

async function deleteViopHolding(symbol) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !symbol) return;
  const { error } = await supa
    .from('viop_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('symbol', symbol);
  if (error) {
    showMsg('VİOP pozisyonu silinemedi: ' + error.message, 'error');
    return;
  }
  await loadViopHoldings();
}

document.getElementById('addViopBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const symbol = document.getElementById('newViopSymbol').value.trim();
  const underlying = document.getElementById('newViopUnderlying').value.trim();
  const categoryIndex = parseInt(document.getElementById('newViopCategory').value, 10);
  const isOption = document.getElementById('newViopIsOption').value === 'true';
  const lot = parseFloat(document.getElementById('newViopLot').value);
  const costRaw = document.getElementById('newViopCost').value.trim();
  const cost = costRaw === '' ? null : parseFloat(costRaw);
  if (!symbol || isNaN(lot) || (cost != null && isNaN(cost))) {
    showMsg('Lütfen VİOP pozisyon bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }
  const { error } = await supa.from('viop_holdings').upsert({
    user_id: user.id, symbol, underlying: underlying || null, code: null,
    is_option: isOption, category_index: isNaN(categoryIndex) ? 4 : categoryIndex,
    lot, cost, deleted_at: null
  }, { onConflict: 'user_id,symbol' });
  if (error) {
    showMsg('VİOP pozisyonu eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newViopSymbol', 'newViopUnderlying', 'newViopLot', 'newViopCost']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newViopIsOption').value = 'false';
  document.getElementById('newViopCategory').value = '4';
  await loadViopHoldings();
});

/* ==================================================================
 * SAYFA YÜKLEYİCİSİ (Varlığım — 10 kategori)
 * ================================================================== */
function loadVarligimPage() {
  loadVarligimCurrencyOptions();
  loadVarligimCurrencyHoldings();
  loadCommodityHoldings();
  loadHoldings();
  loadFundHoldings();
  loadCryptoHoldings();
  loadViopHoldings();
  loadVarligimDeposits();
  loadRealEstateHoldings();
  loadVehicleHoldings();
  loadOtherAssetHoldings();
}

registerPageLoader('varligim', loadVarligimPage);
