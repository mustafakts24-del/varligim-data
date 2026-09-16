/* ==================================================================
 * app-gayrimenkul-fiyat-sorgulama.js — EVA Gayrimenkul Fiyat Sorgulama (2026-09-13)
 *
 * Kullanıcı isteği: "EVA Araç Fiyat Sorgulama" bölümü gibi, cloud'un yapay
 * zekasını kullanarak, karşıdan alınan bilgilerle internetteki o eve YAKIN
 * evlerin fiyatlarını inceleyip belirli aralıklarda evin ederini yazsın.
 * Gerekli giriş alanları BİZİM tarafımızdan tasarlandı (kullanıcı bunu
 * açıkça bize bıraktı) — mevcut "Gayrimenkul Ekle" ekranındaki (bkz.
 * app-varligim.js, newRealEstate* alanları) alan adları/seçenekleri
 * (Konut Tipi, Isıtma Tipi, Tapu Durumu vb.) BİREBİR reuse edilmiştir
 * (kural: mobilin mevcut veri yapısını koru).
 *
 * Mimari: `app-arac-fiyat-sorgulama.js` ile TAMAMEN AYNI mimari —
 * Web → Supabase Edge Function (real-estate-price-inquiry) → Anthropic
 * Claude (web_search aracıyla GERÇEK arama) → yapılandırılmış JSON → Web.
 * AI API anahtarı YALNIZCA Edge Function secret'ı olarak saklanır — bu
 * dosyada veya tarayıcıda KESİNLİKLE bulunmaz (kural 24).
 *
 * Bu dosya KASITLI OLARAK TAMAMEN BAĞIMSIZDIR — yalnızca app-core.js'in
 * global `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`supa`/`registerPageLoader`
 * değişkenlerine ve app-guest.js'in `isGuestSessionMode`/`openAuthOverlay`
 * fonksiyonlarına bağımlıdır (hepsi zaten portfoy.html'de bu dosyadan
 * ÖNCE yüklenir). Araç Fiyat Sorgulama'nın aksine bir katalog seçimi
 * YOKTUR — il/ilçe/mahalle serbest metin, geri kalanı seçim/sayı alanı.
 * ================================================================== */

const GRF_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/real-estate-price-inquiry`;

let grfUsageCache = null;
let grfPageWired = false;
let grfGateWired = false;
let grfLastResult = null;   // grfRenderResult'a en son geçirilen sonuç (Gayrimenkullerime Ekle için)
let grfAddedToHoldings = false;

// Mevcut "Gayrimenkul Ekle" ekranı (app-varligim.js) ile AYNI seçenek
// listeleri — kural: mevcut mobil/web veri yapısını/adlandırmasını koru.
const GRF_HOUSING_TYPES = ['Daire', 'Villa', 'Rezidans', 'Müstakil Ev', 'Yazlık'];
const GRF_ROOM_PATTERNS = ['1+0 (Stüdyo)', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+1 ve üzeri'];
const GRF_HEATING_TYPES = ['Doğalgaz (Kombi)', 'Merkezi', 'Yerden Isıtma', 'Klima', 'Soba', 'Isıtma Yok'];
const GRF_TITLE_DEED_STATUSES = ['Kat Mülkiyeti', 'Kat İrtifakı', 'Hisseli Tapu', 'Müstakil Tapu', 'Tapu Yok'];

// ============================================================
// Supabase Edge Function çağrısı (kullanıcının kendi oturumuyla) —
// arfGetAuthToken/arfCallFunction ile AYNI desen.
// ============================================================
async function grfGetAuthToken() {
  try {
    const { data } = await supa.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

async function grfCallFunction(body) {
  const token = await grfGetAuthToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  let res;
  try {
    res = await fetch(GRF_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('EVA Gayrimenkul Fiyat Sorgulama servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'EVA Gayrimenkul Fiyat Sorgulama servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data;
}

// ============================================================
// Misafir/girişsiz kullanıcı kapısı — arfApplyGuestGate ile AYNI desen.
// ============================================================
function grfWireGateOnce() {
  if (grfGateWired) return;
  grfGateWired = true;
  const reason = {
    title: 'EVA Gayrimenkul Fiyat Sorgulama için giriş yap',
    lead: 'Bu özellik Premium üyelere özeldir. Devam etmek için giriş yap ya da hesap oluştur.',
  };
  document.getElementById('grfGateLoginBtn')?.addEventListener('click', () => {
    if (typeof window.openAuthOverlay === 'function') window.openAuthOverlay('login', reason);
  });
  document.getElementById('grfGateSignupBtn')?.addEventListener('click', () => {
    if (typeof window.openAuthOverlay === 'function') window.openAuthOverlay('signup', reason);
  });
}

/** @returns {boolean} true ise misafirdir (form gizlendi). */
function grfApplyGuestGate() {
  const gate = document.getElementById('grfGuestGate');
  const body = document.getElementById('grfBody');
  const isGuest = typeof window.isGuestSessionMode === 'function' ? window.isGuestSessionMode() : false;
  if (isGuest) {
    grfWireGateOnce();
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
// (Edge Function → ai_usage + real_estate_price_inquiry_usage) okunur.
// ============================================================
function grfRenderUsageBar(usage) {
  grfUsageCache = usage;
  const gateEl = document.getElementById('grfPremiumGate');
  const formWrap = document.getElementById('grfFormWrap');
  const usageBarEl = document.getElementById('grfUsageBar');
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
        <span class="msr" style="font-size:15px; vertical-align:-3px;">home_work</span>
        ${exhausted ? 'Bu ayki AI fiyat sorgulama hakkın doldu' : `Bu Ay Kullanılan: ${usage.used}/${usage.monthlyLimit}`}
      </span>
    `;
  }
  const submitBtn = document.getElementById('grfSubmitBtn');
  if (submitBtn) submitBtn.disabled = exhausted;
}

async function grfLoadUsageStatus() {
  try {
    const usage = await grfCallFunction({ action: 'usage_status' });
    grfRenderUsageBar(usage);
  } catch (e) {
    // Durum alınamazsa sessizce geç — asıl Premium/kota kontrolü zaten
    // backend'de (Edge Function, her "estimate" çağrısında) bağımsız
    // olarak korunuyor; bu yalnızca bir ARAYÜZ göstergesidir.
  }
}

// ============================================================
// Select doldurma — mevcut Gayrimenkul Ekle formuyla AYNI seçenekler.
// ============================================================
function grfPopulateSelect(id, options) {
  const sel = document.getElementById(id);
  if (!sel || sel.options.length) return;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seçiniz';
  sel.appendChild(placeholder);
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    sel.appendChild(el);
  });
}

function grfPopulateSelects() {
  grfPopulateSelect('grfHousingTypeSelect', GRF_HOUSING_TYPES);
  grfPopulateSelect('grfRoomPatternSelect', GRF_ROOM_PATTERNS);
  grfPopulateSelect('grfHeatingTypeSelect', GRF_HEATING_TYPES);
  grfPopulateSelect('grfTitleDeedStatusSelect', GRF_TITLE_DEED_STATUSES);
}

// Binlik ayraçlı sayı alanları (satın alma fiyatı) — mevcut projedeki
// "1.234.567" biçimiyle tutarlı, canlı biçimlendirme.
function grfWireThousandsInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const digits = el.value.replace(/\D/g, '');
    el.value = digits ? Number(digits).toLocaleString('tr-TR') : '';
  });
}

function grfParseGroupedNumber(str) {
  if (!str) return null;
  const cleaned = String(str).trim().replace(/\./g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function grfFormatTl(n) {
  return '₺' + Math.round(n).toLocaleString('tr-TR');
}

function grfEscapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function grfEscapeAttr(s) {
  return grfEscapeHtml(s).replace(/"/g, '&quot;');
}

function grfShowMsg(text, type) {
  const el = document.getElementById('grfMsg');
  if (!el) return;
  if (!text) { el.style.display = 'none'; el.textContent = ''; return; }
  el.textContent = text;
  el.className = 'ai-msg' + (type === 'error' ? ' error' : '');
  el.style.display = 'block';
}

// ============================================================
// Form gönderme
// ============================================================
async function grfRunEstimate() {
  const city = (document.getElementById('grfCityInput')?.value || '').trim();
  const district = (document.getElementById('grfDistrictInput')?.value || '').trim();
  const neighborhood = (document.getElementById('grfNeighborhoodInput')?.value || '').trim();
  const housingType = document.getElementById('grfHousingTypeSelect')?.value || '';
  const roomPattern = document.getElementById('grfRoomPatternSelect')?.value || '';
  const netAreaM2 = grfParseGroupedNumber(document.getElementById('grfNetAreaInput')?.value);
  const grossAreaM2 = grfParseGroupedNumber(document.getElementById('grfGrossAreaInput')?.value);
  const buildingAgeRaw = document.getElementById('grfBuildingAgeInput')?.value?.trim() || '';
  const buildingAge = buildingAgeRaw === '' ? null : parseInt(buildingAgeRaw, 10);
  const floorNoRaw = document.getElementById('grfFloorNoInput')?.value?.trim() || '';
  const floorNo = floorNoRaw === '' ? null : parseInt(floorNoRaw, 10);
  const totalFloorsRaw = document.getElementById('grfTotalFloorsInput')?.value?.trim() || '';
  const totalFloors = totalFloorsRaw === '' ? null : parseInt(totalFloorsRaw, 10);
  const heatingType = document.getElementById('grfHeatingTypeSelect')?.value || '';
  const titleDeedStatus = document.getElementById('grfTitleDeedStatusSelect')?.value || '';
  const siteName = (document.getElementById('grfSiteNameInput')?.value || '').trim();
  const hasElevator = !!document.getElementById('grfElevatorCheckbox')?.checked;
  const hasBalcony = !!document.getElementById('grfBalconyCheckbox')?.checked;
  const hasParking = !!document.getElementById('grfParkingCheckbox')?.checked;
  const furnished = !!document.getElementById('grfFurnishedCheckbox')?.checked;

  grfShowMsg('', null);
  const resultWrap = document.getElementById('grfResultWrap');
  if (resultWrap) { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
  grfLastResult = null;
  grfAddedToHoldings = false;

  if (!city || !district) { grfShowMsg('İl ve ilçe bilgisi gerekli.', 'error'); return; }
  if (!housingType) { grfShowMsg('Konut tipini seç.', 'error'); return; }
  if (!roomPattern) { grfShowMsg('Oda sayısını seç.', 'error'); return; }
  if (netAreaM2 === null || netAreaM2 <= 0) { grfShowMsg('Geçerli bir net m² değeri girin.', 'error'); return; }
  if (buildingAge === null || isNaN(buildingAge) || buildingAge < 0) { grfShowMsg('Geçerli bir bina yaşı girin.', 'error'); return; }

  const btn = document.getElementById('grfSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sorgulanıyor…'; }
  try {
    const result = await grfCallFunction({
      action: 'estimate',
      city, district,
      ...(neighborhood ? { neighborhood } : {}),
      housingType, roomPattern,
      netAreaM2,
      ...(grossAreaM2 != null ? { grossAreaM2 } : {}),
      buildingAge,
      ...(floorNo != null && !isNaN(floorNo) ? { floorNo } : {}),
      ...(totalFloors != null && !isNaN(totalFloors) ? { totalFloors } : {}),
      ...(heatingType ? { heatingType } : {}),
      hasElevator, hasBalcony, hasParking, furnished,
      ...(siteName ? { siteName } : {}),
      ...(titleDeedStatus ? { titleDeedStatus } : {}),
    });
    grfLastResult = result;
    grfRenderResult(result, {
      city, district, neighborhood, housingType, roomPattern, netAreaM2, grossAreaM2,
      buildingAge, floorNo, totalFloors, heatingType, titleDeedStatus, siteName,
      hasElevator, hasBalcony, hasParking, furnished,
    });
    // Gerçek hak backend'de düşürüldüğü için sayaç güncel gerçek değeri
    // yansıtsın diye tazelenir.
    grfLoadUsageStatus();
  } catch (e) {
    grfShowMsg(e.message || 'Bu ev için şu anda bir fiyat tahmini üretilemedi.', 'error');
  } finally {
    if (btn) {
      btn.disabled = !!(grfUsageCache && grfUsageCache.remaining <= 0);
      btn.textContent = 'AI ile Fiyat Sorgula';
    }
  }
}

// ============================================================
// Satın alma fiyatı -> AI ortalaması karşılaştırması. TAMAMEN istemci
// tarafında hesaplanır (AI'ye hiç sorulmaz) — uydurma riski yok, sade
// aritmetik. arfGainHtml ile AYNI desen.
// ============================================================
function grfGainHtml(purchasePrice, averagePrice) {
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
        ${sign}${grfFormatTl(Math.abs(diff))} (${sign}${Math.abs(pct).toFixed(1)}%)
      </div>
    </div>
  `;
}

function grfRenderResult(r, formSnapshot) {
  const wrap = document.getElementById('grfResultWrap');
  if (!wrap) return;

  const purchasePrice = grfParseGroupedNumber(document.getElementById('grfPurchasePriceInput')?.value);

  let priceHtml;
  if (r.dataSufficient && r.averagePrice != null) {
    priceHtml = `
      <div style="text-align:center; margin-bottom:10px;">
        <div style="font-size:12px; color:var(--text-muted);">Ortalama Fiyat</div>
        <div style="font-size:26px; font-weight:800; color:var(--secondary);">${grfFormatTl(r.averagePrice)}</div>
        ${r.minPrice != null && r.maxPrice != null
          ? `<div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${grfFormatTl(r.minPrice)} — ${grfFormatTl(r.maxPrice)} aralığında</div>`
          : ''}
        ${r.pricePerM2 != null ? `<div style="font-size:11.5px; color:var(--text-faint); margin-top:2px;">≈ ${grfFormatTl(r.pricePerM2)}/m²</div>` : ''}
        ${r.locationNote ? `<div style="font-size:11.5px; color:var(--text-faint); margin-top:4px;">${grfEscapeHtml(r.locationNote)}</div>` : ''}
      </div>
      ${grfGainHtml(purchasePrice, r.averagePrice)}`;
  } else {
    priceHtml = `
      <div style="background:rgba(255,180,0,0.10); border-radius:10px; padding:12px; margin-bottom:10px; font-size:12.5px;">
        <span class="msr" style="vertical-align:-3px; font-size:17px;">info</span>
        Bu konum/konut kombinasyonu için yeterli karşılaştırılabilir ilan bulunamadı — bu yüzden bir ortalama fiyat gösterilmiyor.
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
              ? `<a href="${grfEscapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px; font-weight:600;">${grfEscapeHtml(s.title || 'Kaynak')}</a>`
              : `<span style="font-size:12.5px; font-weight:600;">${grfEscapeHtml(s.title || 'Kaynak')}</span>`}
            ${s.note ? `<div style="font-size:11.5px; color:var(--text-muted);">${grfEscapeHtml(s.note)}</div>` : ''}
          </div>
          ${s.price != null ? `<div style="font-size:12.5px; font-weight:700;">${grfFormatTl(s.price)}</div>` : ''}
        </div>
      `).join('')}
    </div>` : '';

  const caveatsHtml = (r.caveats && r.caveats.length) ? `
    <ul style="margin:8px 0 0; padding-left:18px; font-size:12.5px; color:var(--text-muted);">
      ${r.caveats.map((c) => `<li>${grfEscapeHtml(c)}</li>`).join('')}
    </ul>` : '';

  wrap.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-weight:800; font-size:15px;">${grfEscapeHtml(r.housingType)} — ${grfEscapeHtml(r.district)}/${grfEscapeHtml(r.city)}</div>
        ${r.cached ? `<span style="font-size:10.5px; padding:3px 8px; border-radius:20px; background:rgba(120,120,120,0.15);">Önbellekten</span>` : ''}
      </div>
      ${priceHtml}
      ${r.analysisText ? `<p style="font-size:13px; line-height:1.5; margin:8px 0;">${grfEscapeHtml(r.analysisText)}</p>` : ''}
      ${caveatsHtml}
      ${sourcesHtml}
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">
        <button type="button" class="btn primary full" id="grfAddToHoldingsBtn">
          <span class="msr" style="vertical-align:-3px;">add_circle</span> Gayrimenkullerime Ekle
        </button>
        <div style="font-size:11px; color:var(--text-faint); margin-top:6px;">
          Gayrimenkullerime eklendikten sonra, değerini zamanla takip etmek için Varlıklarım → Gayrimenkuller'deki mevcut
          "Akıllı Değerleme" (Değeri Güncelle) özelliğini kullanabilirsin.
        </div>
      </div>
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; font-style:italic; color:var(--text-faint);">${grfEscapeHtml(r.disclaimer || '')}</div>
    </div>
  `;
  wrap.style.display = 'block';

  document.getElementById('grfAddToHoldingsBtn')?.addEventListener('click', () => grfAddToHoldings(r, formSnapshot));
}

// ============================================================
// "Gayrimenkullerime Ekle" — MEVCUT `real_estate_holdings` tablosuna,
// app-varligim.js (addRealEstateBtn) ile AYNI upsert şekliyle kayıt.
// Yeni bir "değer geçmişi" sistemi kurulmaz; bu gayrimenkul
// Gayrimenkullerim'e düştükten sonra oradaki mevcut "Akıllı Değerleme"
// (Değeri Güncelle) akışıyla ileride yeniden değerlenir.
// ============================================================
async function grfAddToHoldings(r, formSnapshot) {
  if (grfAddedToHoldings) return;
  const btn = document.getElementById('grfAddToHoldingsBtn');
  const { data: { user } } = await supa.auth.getUser();
  if (!user) { grfShowMsg('Gayrimenkul eklemek için giriş yapmalısın.', 'error'); return; }

  const purchasePrice = grfParseGroupedNumber(document.getElementById('grfPurchasePriceInput')?.value);
  const currentValue = (r.dataSufficient && r.averagePrice != null) ? r.averagePrice : (purchasePrice ?? 0);

  // "3+1" gibi bir oda deseninden mevcut room_count/living_room_count
  // sayısal alanlarına geri çeviri — mobil ile AYNI desen (bkz.
  // real_estate_price_inquiry_screen.dart, _addToHoldings).
  const parts = (r.roomPattern || '').split('+');
  const roomCount = parts.length ? parseFloat(parts[0].trim()) : null;
  const livingRoomCount = parts.length > 1 ? parseInt(parts[1].replace(/\D/g, '').trim(), 10) : null;

  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const payload = {
    id, user_id: user.id,
    type: 'Konut',
    title: `${r.housingType} — ${r.district}/${r.city}`,
    city: r.city || null, district: r.district || null,
    purchase_price: purchasePrice != null ? purchasePrice : currentValue,
    current_value: currentValue,
    monthly_rent: null,
    purchase_date: new Date().toISOString(),
    deleted_at: null,
    neighborhood: r.neighborhood || null,
    housing_type: r.housingType || null,
    room_count: Number.isFinite(roomCount) ? roomCount : null,
    living_room_count: Number.isFinite(livingRoomCount) ? livingRoomCount : null,
    net_area_m2: r.netAreaM2 != null ? r.netAreaM2 : null,
    gross_area_m2: formSnapshot.grossAreaM2 != null ? formSnapshot.grossAreaM2 : null,
    building_age: r.buildingAge != null ? r.buildingAge : null,
    floor_no: formSnapshot.floorNo != null && !isNaN(formSnapshot.floorNo) ? formSnapshot.floorNo : null,
    total_floors: formSnapshot.totalFloors != null && !isNaN(formSnapshot.totalFloors) ? formSnapshot.totalFloors : null,
    heating_type: formSnapshot.heatingType || null,
    has_balcony: !!formSnapshot.hasBalcony,
    has_elevator: !!formSnapshot.hasElevator,
    has_parking: !!formSnapshot.hasParking,
    site_name: formSnapshot.siteName || null,
    dues_amount: null,
    furnished: !!formSnapshot.furnished,
    facade: null,
    view_type: null,
    title_deed_status: formSnapshot.titleDeedStatus || null,
    loan_eligible: false,
    building_features: null,
  };

  if (btn) { btn.disabled = true; btn.textContent = 'Ekleniyor…'; }
  try {
    const { error } = await supa.from('real_estate_holdings').upsert(payload, { onConflict: 'user_id,id' });
    if (error) throw error;
    grfAddedToHoldings = true;
    if (btn) { btn.innerHTML = '<span class="msr" style="vertical-align:-3px;">check_circle</span> Gayrimenkullerime Eklendi'; }
    grfShowMsg('Gayrimenkul, Varlıklarım → Gayrimenkuller listene eklendi.', null);
  } catch (e) {
    grfShowMsg('Gayrimenkul eklenemedi: ' + (e.message || 'bilinmeyen hata'), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="msr" style="vertical-align:-3px;">add_circle</span> Gayrimenkullerime Ekle'; }
  }
}

// ============================================================
// Sayfa kurulumu
// ============================================================
function grfWirePageOnce() {
  if (grfPageWired) return;
  grfPageWired = true;
  grfPopulateSelects();
  grfWireThousandsInput('grfPurchasePriceInput');
  document.getElementById('grfSubmitBtn')?.addEventListener('click', grfRunEstimate);
}

function loadGayrimenkulFiyatPage() {
  grfWirePageOnce();
  const isGuest = grfApplyGuestGate();
  if (isGuest) return;
  grfLoadUsageStatus();
}

registerPageLoader('gayrimenkulfiyat', loadGayrimenkulFiyatPage);
