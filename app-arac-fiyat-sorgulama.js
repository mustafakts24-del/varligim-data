/* ==================================================================
 * app-arac-fiyat-sorgulama.js — AI Araç Fiyat Sorgulama (GÜNCEL, 2026-09-12)
 *
 * Kullanıcı isteği: marka/model/model yılı/km/ağır hasar kaydı/hasar
 * tutarı/vites/yakıt/çekiş tipi girilip "AI ile fiyat sorgula" denince,
 * gerçek web araması yapan bir AI karşılaştırılabilir ilanların
 * ORTALAMASINI hesaplasın, sonuç 15 gün paylaşımlı önbellekte tutulsun,
 * Premium kullanıcılar ayda 5 sorguyla sınırlansın.
 *
 * YENİ (Araç Kataloğu, 2026-09-12): Serbest metin marka/model yazımı
 * yerine artık Kategori → Marka → Model → Nesil/Kasa → Motor → Versiyon
 * adım adım katalog seçimi kullanılıyor (bkz. app-arac-katalog.js,
 * window.VehicleCatalogPicker). Bu, kullanıcının açık isteği doğrultusunda
 * (1) yapay zeka analizine daha fazla/doğru veri sağlar (kategori/nesil/
 * motor/versiyon bilgisi arama sorgusuna ve önbellek anahtarına eklenir),
 * (2) profesyonel bir seçim deneyimi sunar, (3) kontrol doğruluğunu
 * artırır. Katalogda olmayan bir marka/model için her zaman "elle yaz"
 * seçeneği vardır (kural: bilinmeyen hiçbir nesil/motor/versiyon UYDURULMAZ,
 * bkz. app-arac-katalog.js "Nesil/Kasa bilgisi mevcut değil" davranışı).
 *
 * YENİ (2026-09-12): Sorgu sonucunda kullanıcı isteğe bağlı "Satın Alma
 * Fiyatı" girebilir; bu durumda AI'nin bulduğu ortalama fiyatla arasındaki
 * fark/yüzde SALT İSTEMCİ TARAFINDA (AI'ye hiç sorulmadan, uydurma riski
 * olmadan) hesaplanıp gösterilir. Ayrıca "Araçlarıma Ekle" butonuyla seçilen
 * araç + girilen bilgiler, MEVCUT `vehicle_holdings` tablosuna (Varlıklarım
 * → Araçlarım ile AYNI tablo, app-varligim.js'teki addVehicleBtn ile AYNI
 * upsert şekli) kaydedilir — yeni bir "değer geçmişi" sistemi KURULMADI;
 * bunun yerine kullanıcının zaten var olan "Akıllı Değerleme" (Değeri
 * Güncelle) özelliği, Araçlarım'a eklenen bu araç için doğrudan kullanılabilir.
 *
 * Mimari: Web → Supabase Edge Function (vehicle-price-inquiry) →
 * Anthropic Claude (web_search aracıyla GERÇEK arama) → yapılandırılmış
 * JSON → Web. AI API anahtarı YALNIZCA Edge Function secret'ı olarak
 * saklanır (ai-chart-analysis ile AYNI ANTHROPIC_API_KEY) — bu dosyada
 * veya tarayıcıda KESİNLİKLE bulunmaz (kural 24).
 *
 * Bu dosya KASITLI OLARAK TAMAMEN BAĞIMSIZDIR — app-varligim.js'teki
 * `attachAutocomplete` fonksiyonuna bağımlı değildir; yalnızca app-core.js'in
 * global `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`supa`/`registerPageLoader`
 * değişkenlerine, app-guest.js'in `isGuestSessionMode`/`openAuthOverlay`
 * fonksiyonlarına ve app-arac-katalog.js'in `VehicleCatalogPicker`'ına
 * bağımlıdır (hepsi zaten portfoy.html'de bu dosyadan ÖNCE yüklenir).
 * ================================================================== */

const ARF_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/vehicle-price-inquiry`;

let arfUsageCache = null;
let arfPageWired = false;
let arfGateWired = false;
let arfCatalogInstance = null;
let arfSelection = null;   // VehicleCatalogPicker'dan gelen son seçim
let arfLastResult = null;  // arfRenderResult'a en son geçirilen sonuç (Araçlarıma Ekle için)
let arfAddedToVehicles = false;

// ============================================================
// Supabase Edge Function çağrısı (kullanıcının kendi oturumuyla)
// ============================================================
async function arfGetAuthToken() {
  try {
    const { data } = await supa.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

async function arfCallFunction(body) {
  const token = await arfGetAuthToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  let res;
  try {
    res = await fetch(ARF_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('AI Araç Fiyat Sorgulama servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'AI Araç Fiyat Sorgulama servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data;
}

// ============================================================
// Misafir/girişsiz kullanıcı kapısı — app-guest.js'in mevcut, GERÇEKTEN
// aktif `isGuestSessionMode`/`openAuthOverlay` fonksiyonlarını kullanır.
// ============================================================
function arfWireGateOnce() {
  if (arfGateWired) return;
  arfGateWired = true;
  const reason = {
    title: 'AI Araç Fiyat Sorgulama için giriş yap',
    lead: 'Bu özellik Premium üyelere özeldir. Devam etmek için giriş yap ya da hesap oluştur.',
  };
  document.getElementById('arfGateLoginBtn')?.addEventListener('click', () => {
    if (typeof window.openAuthOverlay === 'function') window.openAuthOverlay('login', reason);
  });
  document.getElementById('arfGateSignupBtn')?.addEventListener('click', () => {
    if (typeof window.openAuthOverlay === 'function') window.openAuthOverlay('signup', reason);
  });
}

/** @returns {boolean} true ise misafirdir (form gizlendi). */
function arfApplyGuestGate() {
  const gate = document.getElementById('arfGuestGate');
  const body = document.getElementById('arfBody');
  const isGuest = typeof window.isGuestSessionMode === 'function' ? window.isGuestSessionMode() : false;
  if (isGuest) {
    arfWireGateOnce();
    if (gate) gate.style.display = 'block';
    if (body) body.style.display = 'none';
    return true;
  }
  if (gate) gate.style.display = 'none';
  if (body) body.style.display = '';
  return false;
}

// ============================================================
// Premium / aylık kullanım rozeti — gerçek değer HER ZAMAN backend'den
// (Edge Function → ai_usage + vehicle_price_inquiry_usage) okunur.
// ============================================================
function arfRenderUsageBar(usage) {
  arfUsageCache = usage;
  const gateEl = document.getElementById('arfPremiumGate');
  const formWrap = document.getElementById('arfFormWrap');
  const usageBarEl = document.getElementById('arfUsageBar');
  if (!usage) { if (usageBarEl) usageBarEl.innerHTML = ''; return; }

  if (!usage.isPremium) {
    if (gateEl) gateEl.style.display = 'block';
    if (formWrap) formWrap.style.display = 'none';
    if (usageBarEl) usageBarEl.innerHTML = '';
    return;
  }
  if (gateEl) gateEl.style.display = 'none';
  if (formWrap) formWrap.style.display = '';

  const remaining = usage.remaining;
  const exhausted = remaining <= 0;
  if (usageBarEl) {
    usageBarEl.innerHTML = `
      <span class="ai-trial-counter${exhausted ? ' exhausted' : ''}">
        <span class="msr" style="font-size:15px; vertical-align:-3px;">directions_car</span>
        ${exhausted ? 'Bu ayki AI fiyat sorgulama hakkın doldu' : `Bu Ay Kullanılan: ${usage.used}/${usage.monthlyLimit}`}
      </span>
    `;
  }
  const submitBtn = document.getElementById('arfSubmitBtn');
  if (submitBtn) submitBtn.disabled = exhausted;
}

async function arfLoadUsageStatus() {
  try {
    const usage = await arfCallFunction({ action: 'usage_status' });
    arfRenderUsageBar(usage);
  } catch (e) {
    // Durum alınamazsa sessizce geç — asıl Premium/kota kontrolü zaten
    // backend'de (Edge Function, her "estimate" çağrısında) bağımsız
    // olarak korunuyor; bu yalnızca bir ARAYÜZ göstergesidir.
  }
}

// ============================================================
// Katalog seçimi (Kategori → Marka → Model → Nesil/Kasa → Motor → Versiyon)
// ============================================================
function arfCatalogSummaryHtml(sel) {
  const parts = [sel.categoryName, sel.brandName, sel.modelName, sel.generationName, sel.engineName, sel.versionName]
    .filter(Boolean);
  const specBits = [
    sel.generationBodyType,
    sel.engineFuelType,
    sel.engineDisplacementCc ? `${sel.engineDisplacementCc} cc` : null,
    sel.enginePowerHp ? `${sel.enginePowerHp} hp` : null,
    sel.engineTransmission,
    sel.engineDrivetrain,
    sel.versionTrimLevel,
  ].filter(Boolean);
  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
      <div>
        <div style="font-weight:800; font-size:14.5px;">${arfEscapeHtml(parts.join(' › '))}</div>
        ${specBits.length ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:3px;">${arfEscapeHtml(specBits.join(' · '))}</div>` : ''}
      </div>
      <button type="button" class="btn outline" id="arfChangeSelectionBtn" style="white-space:nowrap;">Seçimi Değiştir</button>
    </div>
  `;
}

function arfOnCatalogComplete(sel) {
  arfSelection = sel;
  const catalogCard = document.getElementById('arfCatalogCard');
  const detailsCard = document.getElementById('arfDetailsCard');
  const summaryEl = document.getElementById('arfSelectionSummary');
  if (summaryEl) summaryEl.innerHTML = arfCatalogSummaryHtml(sel);
  document.getElementById('arfChangeSelectionBtn')?.addEventListener('click', arfChangeSelection);
  if (catalogCard) catalogCard.style.display = 'none';
  if (detailsCard) detailsCard.style.display = '';
  arfShowMsg('', null);
}

function arfChangeSelection() {
  arfSelection = null;
  arfLastResult = null;
  arfAddedToVehicles = false;
  const catalogCard = document.getElementById('arfCatalogCard');
  const detailsCard = document.getElementById('arfDetailsCard');
  const resultWrap = document.getElementById('arfResultWrap');
  if (catalogCard) catalogCard.style.display = '';
  if (detailsCard) detailsCard.style.display = 'none';
  if (resultWrap) { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
  if (arfCatalogInstance) arfCatalogInstance.reset();
}

function arfMountCatalogPicker() {
  const container = document.getElementById('arfCatalogPicker');
  if (!container || typeof window.VehicleCatalogPicker === 'undefined') return;
  arfCatalogInstance = window.VehicleCatalogPicker.mount(container, {
    onComplete: arfOnCatalogComplete,
  });
}

// ============================================================
// Yıl select doldurma (kullanıcı isteği: kolay seçim — serbest metin
// yerine dropdown, geçersiz yıl girişini de baştan engeller)
// ============================================================
function arfPopulateYearSelect() {
  const sel = document.getElementById('arfYearSelect');
  if (!sel || sel.options.length) return;
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1980; y--) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    sel.appendChild(opt);
  }
}

// Ağır hasar switch'i -> tramer tutarı alanının görünürlüğü.
function arfWireDamageToggle() {
  const checkbox = document.getElementById('arfHeavyDamageCheckbox');
  const row = document.getElementById('arfDamageAmountRow');
  if (!checkbox || !row) return;
  checkbox.addEventListener('change', () => {
    row.style.display = checkbox.checked ? '' : 'none';
  });
}

// Binlik ayraçlı sayı alanları (km, tramer tutarı, satın alma fiyatı) —
// mevcut projedeki "1.234.567" biçimiyle tutarlı, canlı biçimlendirme.
function arfWireThousandsInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const digits = el.value.replace(/\D/g, '');
    el.value = digits ? Number(digits).toLocaleString('tr-TR') : '';
  });
}

function arfParseGroupedNumber(str) {
  if (!str) return null;
  const cleaned = String(str).trim().replace(/\./g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function arfFormatTl(n) {
  return '₺' + Math.round(n).toLocaleString('tr-TR');
}

function arfEscapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function arfEscapeAttr(s) {
  return arfEscapeHtml(s).replace(/"/g, '&quot;');
}

function arfShowMsg(text, type) {
  const el = document.getElementById('arfMsg');
  if (!el) return;
  if (!text) { el.style.display = 'none'; el.textContent = ''; return; }
  el.textContent = text;
  el.className = 'ai-msg' + (type === 'error' ? ' error' : '');
  el.style.display = 'block';
}

// ============================================================
// Form gönderme
// ============================================================
async function arfRunEstimate() {
  if (!arfSelection || (!arfSelection.brandName) || (!arfSelection.modelName)) {
    arfShowMsg('Önce marka ve model seçimini tamamla.', 'error');
    return;
  }
  const year = Number(document.getElementById('arfYearSelect')?.value);
  const km = arfParseGroupedNumber(document.getElementById('arfKmInput')?.value);
  const heavyDamage = !!document.getElementById('arfHeavyDamageCheckbox')?.checked;
  const damageAmount = heavyDamage
    ? arfParseGroupedNumber(document.getElementById('arfDamageAmountInput')?.value)
    : null;
  const transmission = document.getElementById('arfTransmissionSelect')?.value || '';
  const fuel = document.getElementById('arfFuelSelect')?.value || '';
  const driveType = document.getElementById('arfDriveTypeSelect')?.value || '';
  const changedPartsCount = arfParseGroupedNumber(document.getElementById('arfChangedPartsInput')?.value);
  const paintedPartsCount = arfParseGroupedNumber(document.getElementById('arfPaintedPartsInput')?.value);

  arfShowMsg('', null);
  const resultWrap = document.getElementById('arfResultWrap');
  if (resultWrap) { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
  arfLastResult = null;
  arfAddedToVehicles = false;

  if (km === null || km < 0) { arfShowMsg('Geçerli bir kilometre değeri girin.', 'error'); return; }
  if (heavyDamage && damageAmount === null) {
    arfShowMsg('Ağır hasar kaydı işaretlendiyse tramer tutarını girin.', 'error');
    return;
  }

  const btn = document.getElementById('arfSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sorgulanıyor…'; }
  try {
    const result = await arfCallFunction({
      action: 'estimate',
      brand: arfSelection.brandName,
      model: arfSelection.modelName,
      year, km, heavyDamage,
      ...(heavyDamage ? { damageAmount } : {}),
      transmission, fuel, driveType,
      category: arfSelection.categoryName || '',
      generation: arfSelection.generationName || '',
      engine: arfSelection.engineName || '',
      version: arfSelection.versionName || '',
      changedPartsCount, paintedPartsCount,
      catalogIds: {
        categoryId: arfSelection.categoryId,
        brandId: arfSelection.brandId,
        modelId: arfSelection.modelId,
        generationId: arfSelection.generationId,
        engineId: arfSelection.engineId,
        versionId: arfSelection.versionId,
      },
    });
    arfLastResult = result;
    arfRenderResult(result, { year, km, transmission, fuel, driveType, heavyDamage, damageAmount, changedPartsCount, paintedPartsCount });
    // Gerçek hak backend'de düşürüldüğü için sayaç güncel gerçek değeri
    // yansıtsın diye tazelenir.
    arfLoadUsageStatus();
  } catch (e) {
    arfShowMsg(e.message || 'Bu araç için şu anda bir fiyat tahmini üretilemedi.', 'error');
  } finally {
    if (btn) {
      btn.disabled = !!(arfUsageCache && arfUsageCache.remaining <= 0);
      btn.textContent = 'AI ile Fiyat Sorgula';
    }
  }
}

// ============================================================
// Satın alma fiyatı -> AI ortalaması karşılaştırması. TAMAMEN istemci
// tarafında hesaplanır (AI'ye hiç sorulmaz) — uydurma riski yok, sade
// aritmetik. Kullanıcı isteği: "kazanç/getiri" göstergesi (bölüm 43).
// ============================================================
function arfGainHtml(purchasePrice, averagePrice) {
  if (!(purchasePrice > 0) || !(averagePrice > 0)) return '';
  const diff = averagePrice - purchasePrice;
  const pct = (diff / purchasePrice) * 100;
  const positive = diff >= 0;
  const color = positive ? 'var(--positive)' : 'var(--negative)';
  const sign = positive ? '+' : '−';
  return `
    <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div style="font-size:12px; color:var(--text-muted);">Satın Alma Fiyatına Göre</div>
      <div style="font-weight:800; font-size:14px; color:${color};">
        ${sign}${arfFormatTl(Math.abs(diff))} (${sign}${Math.abs(pct).toFixed(1)}%)
      </div>
    </div>
  `;
}

function arfRenderResult(r, formSnapshot) {
  const wrap = document.getElementById('arfResultWrap');
  if (!wrap) return;

  const purchasePrice = arfParseGroupedNumber(document.getElementById('arfPurchasePriceInput')?.value);

  let priceHtml;
  if (r.dataSufficient && r.averagePrice != null) {
    priceHtml = `
      <div style="text-align:center; margin-bottom:10px;">
        <div style="font-size:12px; color:var(--text-muted);">Ortalama Fiyat</div>
        <div style="font-size:26px; font-weight:800; color:var(--secondary);">${arfFormatTl(r.averagePrice)}</div>
        ${r.minPrice != null && r.maxPrice != null
          ? `<div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${arfFormatTl(r.minPrice)} — ${arfFormatTl(r.maxPrice)} aralığında</div>`
          : ''}
        ${r.kmNote ? `<div style="font-size:11.5px; color:var(--text-faint); margin-top:4px;">${arfEscapeHtml(r.kmNote)}</div>` : ''}
      </div>
      ${arfGainHtml(purchasePrice, r.averagePrice)}`;
  } else {
    priceHtml = `
      <div style="background:rgba(255,180,0,0.10); border-radius:10px; padding:12px; margin-bottom:10px; font-size:12.5px;">
        <span class="msr" style="vertical-align:-3px; font-size:17px;">info</span>
        Bu araç/yıl/km kombinasyonu için yeterli karşılaştırılabilir ilan bulunamadı — bu yüzden bir ortalama fiyat gösterilmiyor.
      </div>`;
  }

  const sourcesHtml = (r.sources && r.sources.length) ? `
    <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
      <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">Kullanılan Kaynaklar (${r.comparableCount})</div>
      ${r.sources.map((s) => `
        <div style="display:flex; gap:8px; padding:5px 0; align-items:flex-start;">
          <span class="msr" style="font-size:15px; color:${s.url ? 'var(--secondary)' : 'var(--text-faint)'};">${s.url ? 'link' : 'description'}</span>
          <div style="flex:1;">
            ${s.url
              ? `<a href="${arfEscapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px; font-weight:600;">${arfEscapeHtml(s.title || 'Kaynak')}</a>`
              : `<span style="font-size:12.5px; font-weight:600;">${arfEscapeHtml(s.title || 'Kaynak')}</span>`}
            ${s.note ? `<div style="font-size:11.5px; color:var(--text-muted);">${arfEscapeHtml(s.note)}</div>` : ''}
          </div>
          ${s.price != null ? `<div style="font-size:12.5px; font-weight:700;">${arfFormatTl(s.price)}</div>` : ''}
        </div>
      `).join('')}
    </div>` : '';

  const caveatsHtml = (r.caveats && r.caveats.length) ? `
    <ul style="margin:8px 0 0; padding-left:18px; font-size:12.5px; color:var(--text-muted);">
      ${r.caveats.map((c) => `<li>${arfEscapeHtml(c)}</li>`).join('')}
    </ul>` : '';

  wrap.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-weight:800; font-size:15px;">${arfEscapeHtml(r.brand)} ${arfEscapeHtml(r.model)} (${r.year})</div>
        ${r.cached ? `<span style="font-size:10.5px; padding:3px 8px; border-radius:20px; background:rgba(120,120,120,0.15);">Önbellekten</span>` : ''}
      </div>
      ${priceHtml}
      ${r.analysisText ? `<p style="font-size:13px; line-height:1.5; margin:8px 0;">${arfEscapeHtml(r.analysisText)}</p>` : ''}
      ${caveatsHtml}
      ${sourcesHtml}
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">
        <input type="text" id="arfPlateInput" placeholder="Plaka (opsiyonel)" style="width:100%; margin-bottom:8px;">
        <button type="button" class="btn primary full" id="arfAddToVehiclesBtn">
          <span class="msr" style="vertical-align:-3px;">add_circle</span> Araçlarıma Ekle
        </button>
        <div style="font-size:11px; color:var(--text-faint); margin-top:6px;">
          Araçlarıma eklendikten sonra, değerini zamanla takip etmek için Varlıklarım → Araçlarım'daki mevcut
          "Akıllı Değerleme" (Değeri Güncelle) özelliğini kullanabilirsin.
        </div>
      </div>
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; font-style:italic; color:var(--text-faint);">${arfEscapeHtml(r.disclaimer || '')}</div>
    </div>
  `;
  wrap.style.display = 'block';

  document.getElementById('arfAddToVehiclesBtn')?.addEventListener('click', () => arfAddToVehicles(r, formSnapshot));
}

// ============================================================
// "Araçlarıma Ekle" — MEVCUT `vehicle_holdings` tablosuna, app-varligim.js
// (addVehicleBtn) ile AYNI upsert şekliyle kayıt. Yeni bir "değer geçmişi"
// sistemi kurulmaz; bu araç Araçlarım'a düştükten sonra oradaki mevcut
// "Akıllı Değerleme" (Değeri Güncelle) akışıyla ileride yeniden değerlenir.
// ============================================================
async function arfAddToVehicles(r, formSnapshot) {
  if (arfAddedToVehicles) return;
  const btn = document.getElementById('arfAddToVehiclesBtn');
  const { data: { user } } = await supa.auth.getUser();
  if (!user) { arfShowMsg('Araç eklemek için giriş yapmalısın.', 'error'); return; }

  const plate = (document.getElementById('arfPlateInput')?.value || '').trim();
  const purchasePrice = arfParseGroupedNumber(document.getElementById('arfPurchasePriceInput')?.value);
  const currentValue = (r.dataSufficient && r.averagePrice != null) ? r.averagePrice : (purchasePrice ?? 0);

  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const payload = {
    id, user_id: user.id,
    type: arfSelection.categoryName || 'Otomobil',
    brand: arfSelection.brandName, model: arfSelection.modelName,
    model_year: formSnapshot.year || null,
    plate: plate || null,
    purchase_price: purchasePrice != null ? purchasePrice : currentValue,
    current_value: currentValue,
    purchase_date: new Date().toISOString(),
    deleted_at: null,
    version_package: arfSelection.versionName || null,
    fuel_type: formSnapshot.fuel || null,
    transmission: formSnapshot.transmission || null,
    engine: arfSelection.engineName || null,
    engine_displacement: arfSelection.engineDisplacementCc != null ? Number(arfSelection.engineDisplacementCc) / 1000 : null,
    horsepower: arfSelection.enginePowerHp != null ? Number(arfSelection.enginePowerHp) : null,
    mileage_km: formSnapshot.km != null ? Number(formSnapshot.km) : null,
    body_type: arfSelection.generationBodyType || null,
    drive_type: formSnapshot.driveType || null,
    has_damage_record: !!formSnapshot.heavyDamage,
    tramer_amount: formSnapshot.damageAmount != null ? Number(formSnapshot.damageAmount) : null,
    changed_parts_count: formSnapshot.changedPartsCount != null ? Number(formSnapshot.changedPartsCount) : null,
    painted_parts_count: formSnapshot.paintedPartsCount != null ? Number(formSnapshot.paintedPartsCount) : null,
    heavy_damage_record: !!formSnapshot.heavyDamage,
    // YENİ (Araç Kataloğu, 2026-09-12) — Varlığım'ın kendi kataloğuna
    // referans; nullable, mevcut satırları etkilemez.
    catalog_category_id: arfSelection.categoryId || null,
    catalog_brand_id: arfSelection.brandId || null,
    catalog_model_id: arfSelection.modelId || null,
    catalog_generation_id: arfSelection.generationId || null,
    catalog_engine_id: arfSelection.engineId || null,
    catalog_version_id: arfSelection.versionId || null,
  };

  if (btn) { btn.disabled = true; btn.textContent = 'Ekleniyor…'; }
  try {
    const { error } = await supa.from('vehicle_holdings').upsert(payload);
    if (error) throw error;
    arfAddedToVehicles = true;
    if (btn) { btn.innerHTML = '<span class="msr" style="vertical-align:-3px;">check_circle</span> Araçlarıma Eklendi'; }
    arfShowMsg('Araç, Varlıklarım → Araçlarım listene eklendi.', null);
  } catch (e) {
    arfShowMsg('Araç eklenemedi: ' + (e.message || 'bilinmeyen hata'), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="msr" style="vertical-align:-3px;">add_circle</span> Araçlarıma Ekle'; }
  }
}

// ============================================================
// Sayfa kurulumu
// ============================================================
function arfWirePageOnce() {
  if (arfPageWired) return;
  arfPageWired = true;
  arfPopulateYearSelect();
  arfWireDamageToggle();
  arfMountCatalogPicker();
  arfWireThousandsInput('arfKmInput');
  arfWireThousandsInput('arfDamageAmountInput');
  arfWireThousandsInput('arfPurchasePriceInput');
  document.getElementById('arfSubmitBtn')?.addEventListener('click', arfRunEstimate);
}

function loadAracFiyatPage() {
  arfWirePageOnce();
  const isGuest = arfApplyGuestGate();
  if (isGuest) return;
  arfLoadUsageStatus();
}

registerPageLoader('aracfiyat', loadAracFiyatPage);
