/* ==================================================================
 * app-arac-fiyat-sorgulama.js — AI Araç Fiyat Sorgulama (YENİ, 2026-09-12)
 *
 * Kullanıcı isteği: marka/model/model yılı/km/ağır hasar kaydı/hasar
 * tutarı/vites/yakıt/çekiş tipi girilip "AI ile fiyat sorgula" denince,
 * gerçek web araması yapan bir AI karşılaştırılabilir ilanların
 * ORTALAMASINI hesaplasın, sonuç 15 gün paylaşımlı önbellekte tutulsun,
 * Premium kullanıcılar ayda 5 sorguyla sınırlansın.
 *
 * Mimari: Web → Supabase Edge Function (vehicle-price-inquiry) →
 * Anthropic Claude (web_search aracıyla GERÇEK arama) → yapılandırılmış
 * JSON → Web. AI API anahtarı YALNIZCA Edge Function secret'ı olarak
 * saklanır (ai-chart-analysis ile AYNI ANTHROPIC_API_KEY) — bu dosyada
 * veya tarayıcıda KESİNLİKLE bulunmaz (kural 24).
 *
 * Bu dosya KASITLI OLARAK TAMAMEN BAĞIMSIZDIR — app-varligim.js'teki
 * `attachAutocomplete` fonksiyonuna bağımlı değildir (kendi
 * `arfAttachAutocomplete` kopyasını kullanır); yalnızca app-core.js'in
 * global `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`supa`/`registerPageLoader`
 * değişkenlerine, app-guest.js'in `isGuestSessionMode`/`openAuthOverlay`
 * fonksiyonlarına ve app-vehicle-catalog.js'in `VEHICLE_BRANDS`/
 * `vehicleModelsForBrand`'ına bağımlıdır (hepsi zaten portfoy.html'de
 * bu dosyadan ÖNCE yüklenir).
 * ================================================================== */

const ARF_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/vehicle-price-inquiry`;

let arfUsageCache = null;
let arfPageWired = false;
let arfGateWired = false;

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
// Marka/Model kademeli otomatik tamamlama (kendi bağımsız helper'ı,
// bkz. dosya başı notu) — kullanıcı isteği: "araç ve model seçimi
// kolay seçilir olsun". Listede olmayan bir marka/model her zaman
// serbestçe yazılabilir (otomatik tamamlama sadece bir öneridir).
// ============================================================
function arfAttachAutocomplete(inputEl, optionsFn, onSelect) {
  if (!inputEl) return;
  let wrap = inputEl.parentElement;
  if (!wrap || !wrap.classList.contains('autocomplete-wrap')) {
    wrap = document.createElement('div');
    wrap.className = 'autocomplete-wrap';
    inputEl.parentNode.insertBefore(wrap, inputEl);
    wrap.appendChild(inputEl);
  }
  let dropdown = null;
  function closeDropdown() { if (dropdown) { dropdown.remove(); dropdown = null; } }
  function openDropdown() {
    closeDropdown();
    const options = (optionsFn(inputEl.value || '') || []).slice(0, 30);
    if (!options.length) return;
    dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    options.forEach((opt) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = opt;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        inputEl.value = opt;
        closeDropdown();
        onSelect(opt);
      });
      dropdown.appendChild(item);
    });
    wrap.appendChild(dropdown);
  }
  inputEl.addEventListener('focus', openDropdown);
  inputEl.addEventListener('input', openDropdown);
  inputEl.addEventListener('blur', () => setTimeout(closeDropdown, 150));
}

function arfSetupCatalogAutocomplete() {
  if (typeof window.VEHICLE_BRANDS === 'undefined') return;
  const brandInput = document.getElementById('arfBrandInput');
  const modelInput = document.getElementById('arfModelInput');
  if (!brandInput || !modelInput) return;
  arfAttachAutocomplete(
    brandInput,
    (q) => {
      const query = (q || '').trim().toLowerCase();
      if (!query) return window.VEHICLE_BRANDS;
      return window.VEHICLE_BRANDS.filter((b) => b.toLowerCase().includes(query));
    },
    () => { modelInput.focus(); },
  );
  arfAttachAutocomplete(
    modelInput,
    (q) => {
      const models = (window.vehicleModelsForBrand(brandInput.value) || []).map((m) => m.name);
      const query = (q || '').trim().toLowerCase();
      if (!query) return models;
      return models.filter((m) => m.toLowerCase().includes(query));
    },
    () => {},
  );
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

// Binlik ayraçlı sayı alanları (km, tramer tutarı) — mevcut projedeki
// "1.234.567" biçimiyle tutarlı, canlı biçimlendirme.
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
  const brand = (document.getElementById('arfBrandInput')?.value || '').trim();
  const model = (document.getElementById('arfModelInput')?.value || '').trim();
  const year = Number(document.getElementById('arfYearSelect')?.value);
  const km = arfParseGroupedNumber(document.getElementById('arfKmInput')?.value);
  const heavyDamage = !!document.getElementById('arfHeavyDamageCheckbox')?.checked;
  const damageAmount = heavyDamage
    ? arfParseGroupedNumber(document.getElementById('arfDamageAmountInput')?.value)
    : null;
  const transmission = document.getElementById('arfTransmissionSelect')?.value || '';
  const fuel = document.getElementById('arfFuelSelect')?.value || '';
  const driveType = document.getElementById('arfDriveTypeSelect')?.value || '';

  arfShowMsg('', null);
  const resultWrap = document.getElementById('arfResultWrap');
  if (resultWrap) resultWrap.style.display = 'none';

  if (!brand || !model) { arfShowMsg('Marka ve model bilgisi gerekli.', 'error'); return; }
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
      brand, model, year, km, heavyDamage,
      ...(heavyDamage ? { damageAmount } : {}),
      transmission, fuel, driveType,
    });
    arfRenderResult(result);
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

function arfRenderResult(r) {
  const wrap = document.getElementById('arfResultWrap');
  if (!wrap) return;

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
      </div>`;
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
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; font-style:italic; color:var(--text-faint);">${arfEscapeHtml(r.disclaimer || '')}</div>
    </div>
  `;
  wrap.style.display = 'block';
}

// ============================================================
// Sayfa kurulumu
// ============================================================
function arfWirePageOnce() {
  if (arfPageWired) return;
  arfPageWired = true;
  arfPopulateYearSelect();
  arfWireDamageToggle();
  arfSetupCatalogAutocomplete();
  arfWireThousandsInput('arfKmInput');
  arfWireThousandsInput('arfDamageAmountInput');
  document.getElementById('arfSubmitBtn')?.addEventListener('click', arfRunEstimate);
}

function loadAracFiyatPage() {
  arfWirePageOnce();
  const isGuest = arfApplyGuestGate();
  if (isGuest) return;
  arfLoadUsageStatus();
}

registerPageLoader('aracfiyat', loadAracFiyatPage);
