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
 * "EKLE" FORMLARI — GÜNCEL FİYATTAN OTOMATİK MALİYET DOLDURMA
 * (2026-09, kullanıcı talebi: "hisse ekleme kısımında maliyet kısmı
 * güncel veri üzerinden otomatik doldurulsun kullanıcı sadece lot
 * miktarını yazsın ve ekle butonunun üzerinde tutar otomatik
 * hesaplanıp gösterilsin kullanıcı isterse kendisi maliyet kısmına
 * tutar girsin, bunu varlığım kısmındaki bütün ekleme bölümlerine
 * ayarla").
 *
 * Kapsam: Döviz, Emtia, Hisse, Fon, Kripto, VİOP — bu 6 bölümün
 * hepsinde price-proxy üzerinden GERÇEK bir güncel fiyat mevcut
 * (mevcut liste/detay sayfalarının zaten kullandığı AYNI uçlar).
 * Mevduat/Gayrimenkul/Araç/Diğer Varlıklarım kapsam DIŞI bırakıldı —
 * bunların (mobilde de) canlı bir piyasa fiyatı yok, bu yüzden
 * "otomatik doldurma" burada UYDURMA bir sayı üretmek anlamına
 * gelirdi.
 *
 * Davranış: kullanıcı bir enstrüman seçtiğinde (veya arama/kod
 * alanında geçerli bir eşleşme bulunduğunda) maliyet alanı güncel
 * fiyatla dolduruluyor; kullanıcı bu alana KENDİSİ bir şey yazarsa
 * ("manuallyEdited") bir sonraki otomatik doldurma o alana artık
 * dokunmuyor — yalnızca yeni bir enstrüman seçildiğinde sıfırlanıp
 * yeniden otomatik dolduruluyor. Miktar/lot/adet veya maliyet
 * alanlarından biri her değiştiğinde, ekle butonunun hemen üzerinde
 * "Tahmini toplam tutar" canlı olarak gösteriliyor.
 * ================================================================== */
function bindVarligimAutoCost(cfg) {
  const qtyEl = document.getElementById(cfg.qtyId);
  const costEl = document.getElementById(cfg.costId);
  const hintEl = document.getElementById(cfg.hintId);
  if (!qtyEl || !costEl) return { notifyInstrumentChanged: async () => {}, recomputeHint: () => {} };
  let manuallyEdited = false;
  let fetchSeq = 0;

  function recomputeHint() {
    if (!hintEl) return;
    const qty = parseFloat(qtyEl.value);
    const cost = parseFloat(costEl.value);
    if (!isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0) {
      hintEl.innerHTML = `<span class="msr">bolt</span> Tahmini toplam tutar: ${fmtTL(qty * cost)}`;
      hintEl.classList.add('visible');
    } else {
      hintEl.classList.remove('visible');
    }
  }

  function roundForCost(price) {
    // Küçük birim fiyatlarda (bazı dövizler/kripto) anlamlı basamak
    // sayısını korumak için ondalık hassasiyeti fiyatın büyüklüğüne göre
    // ayarla — mobil/web'de zaten kullanılan gerçek fiyat, yalnızca
    // gösterim/varsayılan-doldurma hassasiyeti ayarlanıyor.
    if (price >= 100) return Math.round(price * 100) / 100;
    if (price >= 1) return Math.round(price * 10000) / 10000;
    return Math.round(price * 1e8) / 1e8;
  }

  costEl.addEventListener('input', () => { manuallyEdited = true; recomputeHint(); });
  qtyEl.addEventListener('input', recomputeHint);

  async function notifyInstrumentChanged() {
    manuallyEdited = false;
    const seq = ++fetchSeq;
    let price = null;
    try {
      price = await cfg.fetchPrice();
    } catch (e) {
      price = null; // Sessizce yut — kullanıcı elle maliyet girebilir (mevcut davranış).
    }
    if (seq !== fetchSeq) return; // Araya yeni bir seçim girdi, bu sonucu at.
    if (manuallyEdited) return;   // Fiyat gelene kadar kullanıcı elle yazdıysa dokunma.
    if (price != null && isFinite(price) && price > 0) {
      costEl.value = roundForCost(price);
    }
    recomputeHint();
  }

  function reset() {
    manuallyEdited = false;
    fetchSeq++;
    recomputeHint();
  }

  return { notifyInstrumentChanged, recomputeHint, reset };
}

/* ==================================================================
 * GAYRİMENKUL
 * DÜZELTME (2026-09, tam parite denetimi): mobilde her gayrimenkul
 * kaydı düzenlenebilir (real_estate_screen.dart popup menüsü "Sil" +
 * "Düzenle"); web'de bu satır rastgele üretilen bir `id` ile
 * upsert edildiğinden (onConflict: 'user_id,id'), "tekrar ekle"
 * asla mevcut kaydı GÜNCELLEMİYOR, hep YENİ bir satır oluşturuyordu.
 * Aşağıya budget sayfasındaki (app-butce.js) ile aynı düzenleme
 * deseni eklendi: "Düzenle" satırı formu doldurur, "Ekle" butonu
 * "Güncelle"ye döner ve aynı id ile upsert yapılır.
 * Ayrıca mobildeki "Değer Değişimi %" ve "Yıllık Kira Getirisi %"
 * hesaplamaları (var olan alanlardan türetilir, uydurulmaz) eklendi.
 * ================================================================== */
let editingRealEstateId = null;

function resetRealEstateForm() {
  editingRealEstateId = null;
  document.getElementById('realEstateFormTitle').textContent = 'Gayrimenkul ekle';
  document.getElementById('addRealEstateBtn').textContent = 'Ekle';
  document.getElementById('cancelRealEstateEditBtn').style.display = 'none';
  ['newRealEstateTitle', 'newRealEstateCity', 'newRealEstateDistrict', 'newRealEstatePurchasePrice',
    'newRealEstateCurrentValue', 'newRealEstateMonthlyRent', 'newRealEstatePurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newRealEstateType').value = 'Konut';
}

function startEditRealEstate(row) {
  editingRealEstateId = row.id;
  document.getElementById('realEstateFormTitle').textContent = 'Gayrimenkulü düzenle';
  document.getElementById('addRealEstateBtn').textContent = 'Güncelle';
  document.getElementById('cancelRealEstateEditBtn').style.display = '';
  document.getElementById('newRealEstateType').value = row.type || 'Konut';
  document.getElementById('newRealEstateTitle').value = row.title || '';
  document.getElementById('newRealEstateCity').value = row.city || '';
  document.getElementById('newRealEstateDistrict').value = row.district || '';
  setGroupedInputValue('newRealEstatePurchasePrice', row.purchase_price);
  setGroupedInputValue('newRealEstateCurrentValue', row.current_value);
  setGroupedInputValue('newRealEstateMonthlyRent', row.monthly_rent);
  document.getElementById('newRealEstatePurchaseDate').value = row.purchase_date ? new Date(row.purchase_date).toISOString().slice(0, 10) : '';
  document.getElementById('newRealEstateTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelRealEstateEditBtn').addEventListener('click', resetRealEstateForm);

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
    const purchasePrice = Number(row.purchase_price) || 0;
    const currentValue = Number(row.current_value) || 0;
    const changePct = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : null;
    const rentYieldPct = (row.monthly_rent && currentValue > 0)
      ? ((Number(row.monthly_rent) * 12) / currentValue) * 100 : null;
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.title || row.type || 'Gayrimenkul')}</div>
        <div class="name">${escapeHtml(row.type || '')}</div>
      </td>
      <td>${escapeHtml(locationText)}</td>
      <td class="num">${fmtTL(row.purchase_price)}</td>
      <td class="num">${fmtTL(row.current_value)}</td>
      <td class="num">${row.monthly_rent ? fmtTL(row.monthly_rent) : '—'}</td>
      <td class="num">${changePct == null ? '—' : changeChipHtml(changePct)}</td>
      <td class="num">${rentYieldPct == null ? '—' : '%' + fmtNumber(rentYieldPct)}</td>
      <td class="num">
        <button type="button" class="btn outline small real-estate-edit" title="Düzenle" style="margin-right:4px;"><span class="msr" style="font-size:16px;">edit</span></button>
        <button type="button" class="del real-estate-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.real-estate-edit').addEventListener('click', () => startEditRealEstate(row));
    tr.querySelector('.real-estate-delete').addEventListener('click', () => deleteRealEstateHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteRealEstateHolding(id) {
  if (!confirmDelete('Bu gayrimenkul kaydını silmek istediğine emin misin?')) return;
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
  if (editingRealEstateId === id) resetRealEstateForm();
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

  const id = editingRealEstateId || `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
  resetRealEstateForm();
  await loadRealEstateHoldings();
});

/* ==================================================================
 * ARAÇ (aynı düzenleme/onay/hesaplama düzeltmesi — bkz. Gayrimenkul)
 * ================================================================== */
let editingVehicleId = null;

function resetVehicleForm() {
  editingVehicleId = null;
  document.getElementById('vehicleFormTitle').textContent = 'Araç ekle';
  document.getElementById('addVehicleBtn').textContent = 'Ekle';
  document.getElementById('cancelVehicleEditBtn').style.display = 'none';
  ['newVehicleBrand', 'newVehicleModel', 'newVehicleModelYear', 'newVehiclePlate',
    'newVehiclePurchasePrice', 'newVehicleCurrentValue', 'newVehiclePurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newVehicleType').value = 'Otomobil';
}

function startEditVehicle(row) {
  editingVehicleId = row.id;
  document.getElementById('vehicleFormTitle').textContent = 'Aracı düzenle';
  document.getElementById('addVehicleBtn').textContent = 'Güncelle';
  document.getElementById('cancelVehicleEditBtn').style.display = '';
  document.getElementById('newVehicleType').value = row.type || 'Otomobil';
  document.getElementById('newVehicleBrand').value = row.brand || '';
  document.getElementById('newVehicleModel').value = row.model || '';
  document.getElementById('newVehicleModelYear').value = row.model_year || '';
  document.getElementById('newVehiclePlate').value = row.plate || '';
  setGroupedInputValue('newVehiclePurchasePrice', row.purchase_price);
  setGroupedInputValue('newVehicleCurrentValue', row.current_value);
  document.getElementById('newVehiclePurchaseDate').value = row.purchase_date ? new Date(row.purchase_date).toISOString().slice(0, 10) : '';
  document.getElementById('newVehicleBrand').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelVehicleEditBtn').addEventListener('click', resetVehicleForm);

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
    const purchasePrice = Number(row.purchase_price) || 0;
    const currentValue = Number(row.current_value) || 0;
    const changePct = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : null;
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml([row.brand, row.model].filter(Boolean).join(' '))}</div>
        <div class="name">${escapeHtml(row.type || '')}</div>
      </td>
      <td>${escapeHtml(row.plate || '—')}</td>
      <td class="num">${row.model_year || '—'}</td>
      <td class="num">${fmtTL(row.purchase_price)}</td>
      <td class="num">${fmtTL(row.current_value)}</td>
      <td class="num">${changePct == null ? '—' : changeChipHtml(changePct)}</td>
      <td class="num">
        <button type="button" class="btn outline small vehicle-edit" title="Düzenle" style="margin-right:4px;"><span class="msr" style="font-size:16px;">edit</span></button>
        <button type="button" class="del vehicle-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.vehicle-edit').addEventListener('click', () => startEditVehicle(row));
    tr.querySelector('.vehicle-delete').addEventListener('click', () => deleteVehicleHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteVehicleHolding(id) {
  if (!confirmDelete('Bu aracı silmek istediğine emin misin?')) return;
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
  if (editingVehicleId === id) resetVehicleForm();
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

  const id = editingVehicleId || `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const purchaseDate = new Date(`${purchaseDateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('vehicle_holdings').upsert({
    id, user_id: user.id, type, brand, model, model_year: modelYear, plate: plate || null,
    purchase_price: purchasePrice, current_value: currentValue, purchase_date: purchaseDate, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('Araç eklenemedi: ' + error.message, 'error');
    return;
  }
  resetVehicleForm();
  await loadVehicleHoldings();
});

/* ==================================================================
 * MEVDUAT (Varlığım'daki ayrı görünüm — aynı `deposit_holdings`
 * tablosu, Faiz sayfasındaki liste ile aynı veriyi farklı bir
 * sayfadan da yönetilebilir kılar)
 * ================================================================== */
let editingVarligimDepositId = null;

function resetVarligimDepositForm() {
  editingVarligimDepositId = null;
  document.getElementById('varligimDepositFormTitle').textContent = 'Mevduat ekle';
  document.getElementById('addVarligimDepositBtn').textContent = 'Ekle';
  document.getElementById('cancelVarligimDepositEditBtn').style.display = 'none';
  ['newVarligimDepositBankName', 'newVarligimDepositPrincipal', 'newVarligimDepositAnnualRate',
    'newVarligimDepositWithholdingRate', 'newVarligimDepositStartDate', 'newVarligimDepositMaturityDate']
    .forEach(id => document.getElementById(id).value = '');
}

function startEditVarligimDeposit(row) {
  editingVarligimDepositId = row.id;
  document.getElementById('varligimDepositFormTitle').textContent = 'Mevduatı düzenle';
  document.getElementById('addVarligimDepositBtn').textContent = 'Güncelle';
  document.getElementById('cancelVarligimDepositEditBtn').style.display = '';
  document.getElementById('newVarligimDepositBankName').value = row.bank_name || '';
  setGroupedInputValue('newVarligimDepositPrincipal', row.principal);
  document.getElementById('newVarligimDepositAnnualRate').value = row.annual_rate ?? '';
  document.getElementById('newVarligimDepositWithholdingRate').value = row.withholding_rate ?? '';
  document.getElementById('newVarligimDepositStartDate').value = row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : '';
  document.getElementById('newVarligimDepositMaturityDate').value = row.maturity_date ? new Date(row.maturity_date).toISOString().slice(0, 10) : '';
  document.getElementById('newVarligimDepositBankName').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelVarligimDepositEditBtn').addEventListener('click', resetVarligimDepositForm);

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
  // Yaklaşan vade uyarısı (mobildeki deposit_notification_service.dart'ın
  // 7/3/1/0 gün eşiğiyle aynı mantık — burada push bildirimi yerine
  // pasif bir liste olarak gösterilir; bkz. teslim raporu).
  const upcoming = data.filter(row => {
    if (!row.maturity_date) return false;
    const days = Math.ceil((new Date(row.maturity_date) - new Date()) / 86400000);
    return days >= 0 && days <= 7;
  });
  let upcomingBanner = document.getElementById('varligimDepositUpcomingBanner');
  if (upcoming.length > 0) {
    const html = `<span class="msr" style="vertical-align:middle;">event_upcoming</span> Yaklaşan vade: ` +
      upcoming.map(r => `${escapeHtml(r.bank_name || 'Mevduat')} (${new Date(r.maturity_date).toLocaleDateString('tr-TR')})`).join(', ');
    if (!upcomingBanner) {
      upcomingBanner = document.createElement('div');
      upcomingBanner.id = 'varligimDepositUpcomingBanner';
      upcomingBanner.className = 'banner-warning';
      tbody.closest('.table-wrap').before(upcomingBanner);
    }
    upcomingBanner.innerHTML = html;
    upcomingBanner.style.display = '';
  } else if (upcomingBanner) {
    upcomingBanner.style.display = 'none';
  }
  for (const row of data) {
    const tr = document.createElement('tr');
    const maturityText = row.maturity_date ? new Date(row.maturity_date).toLocaleDateString('tr-TR') : '—';
    const rateText = row.annual_rate == null ? '—' : `%${fmtNumber(row.annual_rate)}`;
    const currentValue = depositCurrentValue(row);
    const netInterest = currentValue - (Number(row.principal) || 0);
    tr.innerHTML = `
      <td><div class="sym">${escapeHtml(row.bank_name || 'Mevduat')}</div></td>
      <td class="num">${fmtTL(row.principal)}</td>
      <td class="num">${rateText}</td>
      <td class="num">${escapeHtml(maturityText)}</td>
      <td class="num">${fmtTL(currentValue)}</td>
      <td class="num">${netInterest > 0 ? '+' + fmtTL(netInterest) : fmtTL(netInterest)}</td>
      <td class="num">
        <button type="button" class="btn outline small varligim-deposit-edit" title="Düzenle" style="margin-right:4px;"><span class="msr" style="font-size:16px;">edit</span></button>
        <button type="button" class="del varligim-deposit-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>`;
    tr.querySelector('.varligim-deposit-edit').addEventListener('click', () => startEditVarligimDeposit(row));
    tr.querySelector('.varligim-deposit-delete').addEventListener('click', () => deleteVarligimDeposit(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteVarligimDeposit(id) {
  if (!confirmDelete('Bu mevduat kaydını silmek istediğine emin misin?')) return;
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
  if (editingVarligimDepositId === id) resetVarligimDepositForm();
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
  const id = editingVarligimDepositId || `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
  resetVarligimDepositForm();
  await loadVarligimDeposits();
});

/* ==================================================================
 * DİĞER VARLIKLAR
 * ================================================================== */
let editingOtherAssetId = null;

function resetOtherAssetForm() {
  editingOtherAssetId = null;
  document.getElementById('otherAssetFormTitle').textContent = 'Diğer varlık ekle';
  document.getElementById('addOtherAssetBtn').textContent = 'Ekle';
  document.getElementById('cancelOtherAssetEditBtn').style.display = 'none';
  ['newOtherAssetTitle', 'newOtherAssetDescription', 'newOtherAssetPurchasePrice',
    'newOtherAssetCurrentValue', 'newOtherAssetPurchaseDate']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newOtherAssetType').value = 'Diğer';
}

function startEditOtherAsset(row) {
  editingOtherAssetId = row.id;
  document.getElementById('otherAssetFormTitle').textContent = 'Diğer varlığı düzenle';
  document.getElementById('addOtherAssetBtn').textContent = 'Güncelle';
  document.getElementById('cancelOtherAssetEditBtn').style.display = '';
  document.getElementById('newOtherAssetType').value = row.type || 'Diğer';
  document.getElementById('newOtherAssetTitle').value = row.title || '';
  document.getElementById('newOtherAssetDescription').value = row.description || '';
  setGroupedInputValue('newOtherAssetPurchasePrice', row.purchase_price);
  setGroupedInputValue('newOtherAssetCurrentValue', row.current_value);
  document.getElementById('newOtherAssetPurchaseDate').value = row.purchase_date ? new Date(row.purchase_date).toISOString().slice(0, 10) : '';
  document.getElementById('newOtherAssetTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelOtherAssetEditBtn').addEventListener('click', resetOtherAssetForm);

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
        <button type="button" class="btn outline small other-asset-edit" title="Düzenle" style="margin-right:4px;"><span class="msr" style="font-size:16px;">edit</span></button>
        <button type="button" class="del other-asset-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.other-asset-edit').addEventListener('click', () => startEditOtherAsset(row));
    tr.querySelector('.other-asset-delete').addEventListener('click', () => deleteOtherAssetHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteOtherAssetHolding(id) {
  if (!confirmDelete('Bu varlığı silmek istediğine emin misin?')) return;
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
  if (editingOtherAssetId === id) resetOtherAssetForm();
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

  const id = editingOtherAssetId || `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const purchaseDate = new Date(`${purchaseDateRaw}T12:00:00`).toISOString();

  const { error } = await supa.from('other_asset_holdings').upsert({
    id, user_id: user.id, type, title, description: description || null,
    purchase_price: purchasePrice, current_value: currentValue, purchase_date: purchaseDate, deleted_at: null
  }, { onConflict: 'user_id,id' });

  if (error) {
    showMsg('Diğer varlık eklenemedi: ' + error.message, 'error');
    return;
  }
  resetOtherAssetForm();
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

const varligimCurrencyAutoCost = bindVarligimAutoCost({
  qtyId: 'newVarligimCurrencyAmount', costId: 'newVarligimCurrencyCost', hintId: 'varligimCurrencyCostHint',
  fetchPrice: async () => {
    const currency = resolveVarligimCurrency(document.getElementById('newVarligimCurrencySearch')?.value);
    if (!currency) return null;
    const q = await fetchPriceProxy(`type=currency&code=${encodeURIComponent(currency.code)}`);
    return q.price;
  }
});
let _varligimCurrencyLastResolvedCode = null;
document.getElementById('newVarligimCurrencySearch')?.addEventListener('input', debounce(() => {
  const currency = resolveVarligimCurrency(document.getElementById('newVarligimCurrencySearch').value);
  const code = currency ? currency.code : null;
  if (code !== _varligimCurrencyLastResolvedCode) {
    _varligimCurrencyLastResolvedCode = code;
    if (code) varligimCurrencyAutoCost.notifyInstrumentChanged();
  }
}, 300));

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
  if (!confirmDelete('Bu dövizi silmek istediğine emin misin?')) return;
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
  _varligimCurrencyLastResolvedCode = null;
  varligimCurrencyAutoCost.reset();
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

const stockAutoCost = bindVarligimAutoCost({
  qtyId: 'newLot', costId: 'newCost', hintId: 'stockCostHint',
  fetchPrice: async () => {
    const symbol = document.getElementById('newStockSelect')?.value;
    if (!symbol) return null;
    const q = await fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(symbol)}`);
    return q.price;
  }
});
document.getElementById('newStockSelect')?.addEventListener('change', () => stockAutoCost.notifyInstrumentChanged());

function renderStockPortfolioSummary(data) {
  const el = document.getElementById('stockPortfolioSummary');
  if (!el) return;
  if (!data || data.length === 0) { el.style.display = 'none'; return; }
  const invested = data.reduce((sum, row) => sum + (Number(row.lot) || 0) * (Number(row.cost) || 0), 0);
  el.style.display = '';
  el.innerHTML = `
    <div class="stat-mini"><div class="lbl">Toplam Yatırılan</div><div class="val">${fmtTL(invested)}</div></div>
    <div class="stat-mini"><div class="lbl">Güncel Değer</div><div class="val" id="stockPortfolioTotalValue">…</div></div>
    <div class="stat-mini"><div class="lbl">Kâr/Zarar</div><div class="val" id="stockPortfolioTotalPl">…</div></div>
  `;
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
  renderStockPortfolioSummary(data);
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const invested = (Number(row.lot) || 0) * (Number(row.cost) || 0);
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          ${typeof stockLogoImg === 'function' ? stockLogoImg(row.symbol, 24) : ''}
          <div>
            <div class="sym">${escapeHtml(row.symbol)}</div>
            ${row.name ? `<div class="name">${escapeHtml(row.name)}</div>` : ''}
          </div>
        </div>
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
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.stock-delete')) return;
      if (typeof openStockDetail === 'function') openStockDetail(row.symbol);
    });
    tr.querySelector('.stock-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHolding(row.symbol);
    });
    tbody.appendChild(tr);
  }
  loadStockLivePrices(data);
}

async function loadStockLivePrices(rows) {
  let totalInvested = 0, totalValue = 0, anyKnown = false;
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
      totalInvested += invested;
      totalValue += currentValue;
      anyKnown = true;
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
  const totalValueEl = document.getElementById('stockPortfolioTotalValue');
  const totalPlEl = document.getElementById('stockPortfolioTotalPl');
  if (totalValueEl && totalPlEl) {
    if (anyKnown) {
      totalValueEl.textContent = fmtTL(totalValue);
      totalPlEl.innerHTML = profitLossHtml(totalInvested, totalValue);
    } else {
      totalValueEl.textContent = '—';
      totalPlEl.textContent = '—';
    }
  }
}

async function deleteHolding(symbol) {
  if (!confirmDelete('Bu hisseyi portföyünden silmek istediğine emin misin?')) return;
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
  stockAutoCost.reset();
  loadHoldings();
});

/* ==================================================================
 * EMTİA PORTFÖYÜM
 * ================================================================== */
// DÜZELTME (2026-09, tam parite denetimi): bu liste eskiden yalnızca 7
// kalemlik elle yazılmış bir kopyaydı; piyasa sayfasındaki (app-piyasa-
// emtia.js) COMMODITY_MARKET_ITEMS artık 16 kalem içeriyor (5 fiziki
// altın sikkesi + 4 "Ons ... USD" dahil) ama buradaki Emtia Portföyüm
// ekleme listesi güncellenmemişti — kullanıcı örn. "Çeyrek Altın"ı
// portföyüne EKLEYEMİYORDU. Artık TEK kaynaktan (COMMODITY_MARKET_ITEMS)
// türetiliyor, iki liste birbirinden asla sapamaz.
const commodityMarketList = (typeof COMMODITY_MARKET_ITEMS !== 'undefined' ? COMMODITY_MARKET_ITEMS : []).map(item => ({
  key: item.key, symbol: item.key, name: item.name, unit: item.unit, currency: item.currency
}));

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

const commodityAutoCost = bindVarligimAutoCost({
  qtyId: 'newCommodityAmount', costId: 'newCommodityCost', hintId: 'commodityCostHint',
  fetchPrice: async () => {
    const commodity = resolveCommodity(document.getElementById('newCommoditySearch')?.value);
    if (!commodity) return null;
    const q = await fetchPriceProxy(`type=commodity&key=${encodeURIComponent(commodity.key)}`);
    return q.price;
  }
});
let _commodityLastResolvedKey = null;
document.getElementById('newCommoditySearch')?.addEventListener('input', debounce(() => {
  const commodity = resolveCommodity(document.getElementById('newCommoditySearch').value);
  const key = commodity ? commodity.key : null;
  if (key !== _commodityLastResolvedKey) {
    _commodityLastResolvedKey = key;
    if (key) commodityAutoCost.notifyInstrumentChanged();
  }
}, 300));

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
    tr.style.cursor = 'pointer';
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
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-commodity-key]')) return;
      if (typeof openCommodityDetail === 'function') openCommodityDetail(row.commodity_key);
    });
    tr.querySelector('[data-commodity-key]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCommodityHolding(row.commodity_key);
    });
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
      const marketItem = commodityMarketList.find(c => c.key === row.commodity_key);
      const isUsd = marketItem ? marketItem.currency === 'USD' : row.commodity_key === 'BRENT_USD';
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
  if (!confirmDelete('Bu emtiayı silmek istediğine emin misin?')) return;
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
  _commodityLastResolvedKey = null;
  commodityAutoCost.reset();
  await loadCommodityHoldings();
});

/* ==================================================================
 * KRİPTO SEÇİM LİSTESİ + PORTFÖYÜM
 * ================================================================== */
// DÜZELTME (2026-09, tam parite denetimi): bu seçim listesi eskiden
// elle yazılmış ~30 kripto paraydı; "Varlıklar → Kripto Paralar" piyasa
// sayfası (app-piyasa-kripto.js) zaten CoinGecko'dan piyasa değerine
// göre İLK 100 kripto parayı çekiyor (kriptoMarketList) — bu listeyi
// TEKRAR ETMEK yerine artık ondan besleniyoruz; henüz o sayfa hiç
// açılmadıysa (kriptoMarketList boşsa) burada aynı uçtan tembel
// (lazy) olarak çekilir. Ağ isteği başarısız olursa mobil/web ortak
// en-likit ~30 paralık dar bir yedek listeye düşülür (uydurma değil,
// yalnızca kesintide en azından en bilinen paraların eklenebilmesi
// için bir yedek).
const CRYPTO_OPTIONS_FALLBACK = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }, { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' }, { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' }, { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' }, { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' }, { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' }
];

async function loadCryptoOptions() {
  const select = document.getElementById('newCryptoSelect');
  if (!select) return;
  let source = CRYPTO_OPTIONS_FALLBACK;
  try {
    if (typeof kriptoMarketList !== 'undefined' && kriptoMarketList.length > 0) {
      source = kriptoMarketList;
    } else if (typeof fetchKriptoMarkets === 'function') {
      const fetched = await fetchKriptoMarkets();
      if (Array.isArray(fetched) && fetched.length > 0) {
        kriptoMarketList = fetched;
        source = fetched;
      }
    }
  } catch (e) {
    // Sessizce yedek listeye düş.
  }
  const currentValue = select.value;
  select.innerHTML = '<option value="">Kripto seç...</option>';
  source.forEach((crypto) => {
    const option = document.createElement('option');
    option.value = crypto.id;
    option.textContent = `${(crypto.symbol || '').toUpperCase()} — ${crypto.name}`;
    option.dataset.symbol = (crypto.symbol || '').toUpperCase();
    option.dataset.name = crypto.name;
    option.dataset.image = crypto.image || '';
    select.appendChild(option);
  });
  if (currentValue) select.value = currentValue;
}

const cryptoAutoCost = bindVarligimAutoCost({
  qtyId: 'newCryptoAmount', costId: 'newCryptoCost', hintId: 'cryptoCostHint',
  fetchPrice: async () => {
    const cryptoId = document.getElementById('newCryptoSelect')?.value;
    if (!cryptoId) return null;
    const q = await fetchPriceProxy(`type=crypto-quote&id=${encodeURIComponent(cryptoId)}&vs=try`);
    return q.price;
  }
});
document.getElementById('newCryptoSelect')?.addEventListener('change', () => cryptoAutoCost.notifyInstrumentChanged());

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
    tr.style.cursor = 'pointer';
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
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.crypto-delete')) return;
      if (typeof openCryptoDetail === 'function') openCryptoDetail(row.crypto_id);
    });
    tbody.appendChild(tr);
  }
  loadCryptoLivePrices(data);
  tbody.querySelectorAll('.crypto-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCryptoHolding(btn.dataset.id);
    });
  });
}

async function deleteCryptoHolding(cryptoId) {
  if (!confirmDelete('Bu kriptoyu silmek istediğine emin misin?')) return;
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
  cryptoAutoCost.reset();
  loadCryptoHoldings();
});

/* ==================================================================
 * YATIRIM FONLARIM
 * ================================================================== */
function renderFundPortfolioSummary(data) {
  const el = document.getElementById('fundPortfolioSummary');
  if (!el) return;
  if (!data || data.length === 0) { el.style.display = 'none'; return; }
  const invested = data.reduce((sum, row) => sum + (Number(row.units) || 0) * (Number(row.cost) || 0), 0);
  el.style.display = '';
  el.innerHTML = `
    <div class="stat-mini"><div class="lbl">Toplam Yatırılan</div><div class="val">${fmtTL(invested)}</div></div>
    <div class="stat-mini"><div class="lbl">Güncel Değer</div><div class="val" id="fundPortfolioTotalValue">…</div></div>
    <div class="stat-mini"><div class="lbl">Kâr/Zarar</div><div class="val" id="fundPortfolioTotalPl">…</div></div>
  `;
}

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
  renderFundPortfolioSummary(data);
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
    tr.style.cursor = 'pointer';
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
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-fund-code]')) return;
      if (typeof openFundDetail === 'function') openFundDetail(row.code);
    });
    tr.querySelector('[data-fund-code]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFundHolding(row.code);
    });
    tbody.appendChild(tr);
  }
  loadFundLivePrices(data);
}

async function loadFundLivePrices(rows) {
  let totalInvested = 0, totalValue = 0, anyKnown = false;
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
        totalInvested += invested;
      }
      totalValue += currentValue;
      anyKnown = true;
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
  const totalValueEl = document.getElementById('fundPortfolioTotalValue');
  const totalPlEl = document.getElementById('fundPortfolioTotalPl');
  if (totalValueEl && totalPlEl) {
    if (anyKnown) {
      totalValueEl.textContent = fmtTL(totalValue);
      totalPlEl.innerHTML = profitLossHtml(totalInvested, totalValue);
    } else {
      totalValueEl.textContent = '—';
      totalPlEl.textContent = '—';
    }
  }
}

async function deleteFundHolding(code) {
  if (!confirmDelete('Bu fonu silmek istediğine emin misin?')) return;
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

const fundAutoCost = bindVarligimAutoCost({
  qtyId: 'newFundUnits', costId: 'newFundCost', hintId: 'fundCostHint',
  fetchPrice: async () => {
    if (!selectedFundForWeb) return null;
    const q = await fetchPriceProxy(`type=fund&code=${encodeURIComponent(selectedFundForWeb.code)}`);
    return q.price;
  }
});

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
    fundAutoCost.notifyInstrumentChanged();
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
  fundAutoCost.reset();
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
  fundAutoCost.reset();
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
// VİOP sözleşme sembolü serbest metin olarak girildiği (kataloğa bağlı bir
// seçim kutusu yok) için burada bir "seçim değişti" olayı yok — sembol tam
// olarak mevcut bir sözleşmeyle eşleşirse (bkz. price-proxy getViopQuote,
// AYNI tam-eşleşme mantığı liste/detay sayfalarında da kullanılıyor)
// alandan çıkıldığında (blur) en iyi çaba ile güncel fiyat denenir;
// eşleşmezse (yazım tamamlanmadıysa/sözleşme adı farklıysa) sessizce
// hiçbir şey yapılmaz ve kullanıcı maliyeti elle girmeye devam edebilir.
const viopAutoCost = bindVarligimAutoCost({
  qtyId: 'newViopLot', costId: 'newViopCost', hintId: 'viopCostHint',
  fetchPrice: async () => {
    const symbol = document.getElementById('newViopSymbol')?.value.trim();
    if (!symbol) return null;
    const q = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(symbol)}`);
    return q.price;
  }
});
document.getElementById('newViopSymbol')?.addEventListener('blur', () => viopAutoCost.notifyInstrumentChanged());

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
    tr.style.cursor = 'pointer';
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
    tr.addEventListener('click', async (e) => {
      if (e.target.closest('.viop-delete')) return;
      if (typeof openViopDetail !== 'function') return;
      let livePrice = null, liveChange = null;
      try {
        const q = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(row.symbol)}`);
        livePrice = q.price;
        liveChange = q.changePercent;
      } catch (err) { /* modal "—" gösterecek */ }
      const categoryKey = { 0: 'equity', 1: 'index', 2: 'currency', 3: 'metal', 4: 'other' }[row.category_index] || 'other';
      openViopDetail({
        symbol: row.symbol, underlying: row.underlying, category: categoryKey,
        isOption: row.is_option, price: livePrice, changePercent: liveChange,
        volumeTl: null, volumeLot: null
      });
    });
    tr.querySelector('.viop-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteViopHolding(row.symbol);
    });
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
  if (!confirmDelete('Bu VİOP pozisyonunu silmek istediğine emin misin?')) return;
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
  viopAutoCost.reset();
  await loadViopHoldings();
});

document.getElementById('clearAllStocksBtn')?.addEventListener('click', () =>
  clearAllHoldings('stock_holdings', 'Tüm hisse portföyünü silmek istediğine emin misin? Bu işlem geri alınamaz.', loadHoldings));
document.getElementById('clearAllFundsBtn')?.addEventListener('click', () =>
  clearAllHoldings('fund_holdings', 'Tüm fon portföyünü silmek istediğine emin misin? Bu işlem geri alınamaz.', loadFundHoldings));

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
