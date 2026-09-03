/* ==================================================================
 * app-core.js
 * Supabase istemcisi, kimlik doğrulama, paylaşılan yardımcı
 * fonksiyonlar ve sidebar navigasyon/route yönetimi.
 * Bu dosya diğer tüm app-*.js dosyalarından ÖNCE yüklenmelidir.
 * ================================================================== */

const SUPABASE_URL = 'https://dybyvluatryiflljogro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9lHBXG5EHmjwL05Mr9Ly6A_Tywh2-Wh';
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authView = document.getElementById('authView');
const appShell = document.getElementById('appShell');
const userEmailEl = document.getElementById('userEmail');
const msgEl = document.getElementById('msg');

let authMode = 'login';

/* ------------------------------------------------------------------
 * MESAJ
 * ------------------------------------------------------------------ */
function showMsg(text, type) {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = type === 'error' ? 'error' : 'success';
}
function hideMsg() {
  if (!msgEl) return;
  msgEl.className = '';
  msgEl.textContent = '';
}

// DÜZELTME (2026-09, kullanıcı raporu: "tüm sayfaların aktif çalışıp
// çalışmadığını... kontrol et"): mobil uygulama, bir kaydı silmeden
// önce HER YERDE bir onay diyaloğu gösterir (AlertDialog). Web tarafı
// bunu hiç yapmıyordu — silme butonuna basar basmaz kayıt geri
// dönüşsüz siliniyordu (soft-delete olsa da kullanıcı arayüzünden
// geri getirme yolu yok). Bu ortak yardımcı, tüm silme akışlarına
// tek satırla eklenir; tarayıcının yerleşik confirm()'i kullanılır
// (ek bir modal bileşeni gerektirmez, mobildeki "Sil / Vazgeç" ikili
// seçimiyle aynı işlevi görür).
function confirmDelete(message) {
  return window.confirm(message || 'Bu kaydı silmek istediğine emin misin?');
}

// DÜZELTME (2026-09, tam parite denetimi): mobil, birçok portföy
// ekranında "Tümünü Temizle" (bulk soft-delete) sunuyor; web'de bu
// yalnızca tek tek silme ile mümkündü. Ortak, tekrar kullanılabilir bir
// yardımcı — her tablo için ayrı ayrı yazmak yerine tek satırla kullanılır.
async function clearAllHoldings(tableName, confirmMsg, afterReload) {
  if (!confirmDelete(confirmMsg)) return;
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from(tableName)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('deleted_at', null);
  if (error) {
    showMsg('Toplu silme başarısız: ' + error.message, 'error');
    return;
  }
  if (typeof afterReload === 'function') await afterReload();
}

/* ------------------------------------------------------------------
 * FORMAT YARDIMCILARI
 * ------------------------------------------------------------------ */
function fmtTL(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n) || 0);
}
function fmtUSD(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}
function fmtTLPrecise(n) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY',
    minimumFractionDigits: 2, maximumFractionDigits: 6
  }).format(Number(n) || 0);
}
function fmtNumber(n) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 8 }).format(Number(n) || 0);
}
// DÜZELTME (2026-09, hata raporu #11): app genelinde bazı ekranlar
// (değişim yüzdesi rozetleri, F/K/PD/DD gibi oranlar, banka faiz
// aralıkları, YMO) doğrudan JS'in yerleşik `.toFixed()` fonksiyonunu
// kullanıyordu — bu HER ZAMAN nokta ondalık ayracı üretir (ör. "3.50"),
// Türkçe biçimde olması gereken virgül yerine ("3,50"). `fmtTL`/
// `fmtNumber` zaten `Intl.NumberFormat('tr-TR', ...)` kullanıyordu
// (doğruydu); bu iki yardımcı da AYNI yaklaşımı yüzde/ondalık
// göstergelere de yayar — böylece uygulamadaki TÜM sayısal görüntüleme
// tutarlı biçimde binlik ayracı nokta, ondalık ayracı virgül olur.
// NOT: <input type="number"> alanlarına YAZILAN değerler bu kapsamın
// DIŞINDA bırakıldı — tarayıcı sayı girişleri yalnızca nokta ondalık
// kabul eder, virgül yazılırsa değer sessizce boşalır/geçersiz olur.
function fmtPercent(n, decimals) {
  const d = decimals == null ? 2 : decimals;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
}
function fmtDecimal(n, decimals) {
  const d = decimals == null ? 2 : decimals;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
}
// DÜZELTME (2026-09, kullanıcı raporu: "tutar girme kısımlarını her 3
// basamakta 1 nokta ekleyerek kolay okunur hale getir"): yukarıdaki not
// artık kısmen aşılıyor — büyük TL tutarı girilen alanlar (kredi/mevduat
// anaparası, gayrimenkul/araç alış-güncel değeri, bütçe tutarı vb.)
// `type="number"`'dan `type="text" inputmode="decimal"`'e çevrilip bu
// yardımcılarla canlı olarak binlik nokta ile biçimlendiriliyor — birim
// maliyet/oran/lot/adet gibi küçük veya ondalıklı alanlar (mobildeki
// ThousandsInputFormatter'ın kapsamı DIŞINDA tutulduğu gibi) DEĞİŞMEDİ.
// Mantık mobildeki utils/number_format.dart (formatGroupedNumber/
// ThousandsInputFormatter/parseGroupedAmount) ile AYNI: nokta binlik
// ayraç, virgül ondalık ayracı, imleç konumu rakam sayısına göre korunur.
function formatGroupedInputText(digitsOnly) {
  let d = String(digitsOnly || '').replace(/[^\d]/g, '');
  d = d.replace(/^0+(?=\d)/, '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseGroupedAmount(text) {
  if (text == null) return NaN;
  const raw = String(text).trim();
  if (!raw) return NaN;
  // Zaten düz sayısal bir metin (programatik `input.value = 500000`
  // ataması gibi, nokta/virgül YOK) gelirse dokunmadan çözülür.
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  return Number(cleaned);
}

function setGroupedInputValue(elOrId, num) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  if (num == null || !Number.isFinite(Number(num))) { el.value = ''; return; }
  el.value = formatGroupedInputText(String(Math.round(Number(num))));
}

function attachGroupedAmountFormatter(el) {
  if (!el || el.dataset.groupedFmtAttached === '1') return;
  el.dataset.groupedFmtAttached = '1';
  if (el.value) el.value = formatGroupedInputText(el.value.replace(/[^\d]/g, ''));
  el.addEventListener('input', () => {
    const prevValue = el.value;
    const prevCursor = el.selectionStart ?? prevValue.length;
    const digitsBeforeCursor = prevValue.slice(0, prevCursor).replace(/[^\d]/g, '').length;
    const digitsOnly = prevValue.replace(/[^\d]/g, '');
    const next = formatGroupedInputText(digitsOnly);
    el.value = next;
    // İmleci, önceki konumdaki rakam SAYISINI koruyarak yeniden konumla
    // (mobildeki ThousandsInputFormatter ile aynı yaklaşım).
    let seen = 0, pos = next.length;
    for (let i = 0; i < next.length; i++) {
      if (/\d/.test(next[i])) seen++;
      if (seen >= digitsBeforeCursor) { pos = i + 1; break; }
    }
    if (digitsBeforeCursor === 0) pos = 0;
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  });
}

function initGroupedAmountInputs() {
  document.querySelectorAll('.amt-grouped').forEach(attachGroupedAmountFormatter);
}
document.addEventListener('DOMContentLoaded', initGroupedAmountInputs);
// Sayfa yüklendiğinde DOMContentLoaded çoktan geçmiş olabilir (bu script
// modallar açıldıktan sonra da çalışabilir) — güvenlik için hemen de dene.
if (document.readyState !== 'loading') initGroupedAmountInputs();

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ------------------------------------------------------------------
 * CANLI FİYAT YARDIMCILARI
 * Hisse/Döviz/Emtia/Fon/VİOP fiyatları tarayıcıdan doğrudan
 * çekilemediği için (CORS), mevcut `price-proxy` Edge Function'ı
 * üzerinden çekilir. Kripto için CoinGecko'nun genel API'si
 * doğrudan çağrılabildiği için ayrı bir yardımcı kullanılır.
 * ------------------------------------------------------------------ */
async function fetchPriceProxy(params) {
  const url = `${SUPABASE_URL}/functions/v1/price-proxy?${params}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.error) ? data.error : `HTTP ${res.status}`);
  }
  return data;
}

async function fetchCryptoPricesTry(ids) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return {};
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' +
    encodeURIComponent(uniqueIds.join(',')) + '&vs_currencies=try';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kripto fiyat hatası: HTTP ${res.status}`);
  const data = await res.json();
  const result = {};
  for (const id of uniqueIds) {
    const price = data && data[id] && data[id].try;
    if (typeof price === 'number' && price > 0) result[id] = price;
  }
  return result;
}

/**
 * Kâr/zarar hücresi HTML'i üretir (tutar + yüzde, renkli).
 */
function profitLossHtml(invested, currentValue, fmt) {
  const formatter = fmt || fmtTL;
  const diff = currentValue - invested;
  const pct = invested > 0 ? (diff / invested) * 100 : 0;
  const cls = diff > 0 ? 'pl-pos' : (diff < 0 ? 'pl-neg' : 'pl-zero');
  const sign = diff > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${formatter(diff)} (${sign}${fmtPercent(pct)}%)</span>`;
}

/**
 * Değişim çipi HTML'i üretir (Ana Sayfa istatistik kartları / Piyasalar için).
 */
function changeChipHtml(pct) {
  if (pct == null || !Number.isFinite(pct)) {
    return `<span class="chip neu">—</span>`;
  }
  const cls = pct > 0 ? 'pos' : (pct < 0 ? 'neg' : 'neu');
  const sign = pct > 0 ? '+' : '';
  return `<span class="chip ${cls}">${sign}${fmtPercent(pct)}%</span>`;
}

/**
 * Mevcut mevduat kaydının o anki tahakkuk etmiş değerini hesaplar.
 * Mobil uygulamadaki DepositCalculatorService ile birebir aynı
 * basit faiz formülü (ACT/365, brüt -> stopaj -> net).
 */
function depositCurrentValue(row) {
  const principal = Number(row.principal) || 0;
  const annualRate = Number(row.annual_rate) || 0;
  const withholdingRate = Number(row.withholding_rate) || 0;
  const startMs = new Date(row.start_date).getTime();
  const maturityMs = new Date(row.maturity_date).getTime();
  let totalDays = Math.round((maturityMs - startMs) / 86400000);
  if (!Number.isFinite(totalDays) || totalDays < 1) totalDays = 1;
  let elapsedDays = Math.round((Date.now() - startMs) / 86400000);
  if (!Number.isFinite(elapsedDays) || elapsedDays < 0) elapsedDays = 0;
  if (elapsedDays > totalDays) elapsedDays = totalDays;
  const accruedGross = principal * (annualRate / 100) * (elapsedDays / 365);
  const accruedTax = accruedGross * (withholdingRate / 100);
  const accruedNet = accruedGross - accruedTax;
  return principal + accruedNet;
}

/* ------------------------------------------------------------------
 * BASİT ÖNBELLEK + DEBOUNCE (performans: aynı veriyi kısa sürede
 * tekrarlı çekmemek, arama kutularında her tuşta istek atmamak için)
 * ------------------------------------------------------------------ */
const _cache = new Map();
async function cachedFetch(key, ttlMs, fn) {
  const hit = _cache.get(key);
  const now = Date.now();
  if (hit && (now - hit.t) < ttlMs) return hit.v;
  const v = await fn();
  _cache.set(key, { v, t: now });
  return v;
}
function debounce(fn, ms) {
  let h;
  return (...args) => {
    clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  };
}

/* ------------------------------------------------------------------
 * FAVORİLER (merkezi Supabase `favorites` tablosu; mobil ile ortak)
 * ------------------------------------------------------------------ */
let favoritesSet = new Set();
let favoritesLoaded = false;

function favKey(category, symbol) {
  return `${String(category).toLowerCase()}_${String(symbol).toUpperCase()}`;
}

async function loadFavorites() {
  try {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    const { data, error } = await supa
      .from('favorites')
      .select('category,symbol')
      .is('deleted_at', null);
    if (error) throw error;
    favoritesSet = new Set((data || []).map(r => favKey(r.category, r.symbol)));
    favoritesLoaded = true;
    document.dispatchEvent(new CustomEvent('favorites:changed'));
  } catch (err) {
    console.error('Favoriler yüklenemedi:', err);
  }
}

function isFavorite(category, symbol) {
  return favoritesSet.has(favKey(category, symbol));
}

async function toggleFavorite(category, symbol, meta) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const key = favKey(category, symbol);
  const nowFav = favoritesSet.has(key);
  try {
    if (nowFav) {
      const { error } = await supa.from('favorites')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('category', category).eq('symbol', symbol);
      if (error) throw error;
      favoritesSet.delete(key);
    } else {
      const { error } = await supa.from('favorites')
        .upsert({
          user_id: user.id,
          category,
          symbol,
          name: (meta && meta.name) || null,
          price: (meta && meta.price != null && Number.isFinite(meta.price)) ? meta.price : null,
          change_percent: (meta && meta.changePercent != null && Number.isFinite(meta.changePercent)) ? meta.changePercent : null,
          deleted_at: null
        }, { onConflict: 'user_id,category,symbol' });
      if (error) throw error;
      favoritesSet.add(key);
    }
  } catch (err) {
    console.error('Favori güncellenemedi:', err);
    showMsg('Favori güncellenemedi: ' + (err.message || ''), 'error');
    return;
  }
  document.dispatchEvent(new CustomEvent('favorites:changed'));
}

function favoriteStarHtml(category, symbol, meta) {
  meta = meta || {};
  const active = isFavorite(category, symbol);
  return `<button type="button" class="fav-star ${active ? 'active' : ''}"
    data-fav-cat="${escapeHtml(category)}" data-fav-sym="${escapeHtml(symbol)}"
    data-fav-name="${escapeHtml(meta.name || '')}"
    data-fav-price="${meta.price != null && Number.isFinite(meta.price) ? meta.price : ''}"
    data-fav-chg="${meta.changePercent != null && Number.isFinite(meta.changePercent) ? meta.changePercent : ''}"
    title="Favorilere ekle/çıkar">${active ? '★' : '☆'}</button>`;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.fav-star');
  if (!btn) return;
  e.stopPropagation();
  const category = btn.dataset.favCat;
  const symbol = btn.dataset.favSym;
  const meta = {
    name: btn.dataset.favName || '',
    price: btn.dataset.favPrice !== '' ? Number(btn.dataset.favPrice) : null,
    changePercent: btn.dataset.favChg !== '' ? Number(btn.dataset.favChg) : null
  };
  toggleFavorite(category, symbol, meta).then(() => {
    document.querySelectorAll('.fav-star').forEach(el => {
      if (el.dataset.favCat === category && el.dataset.favSym === symbol) {
        const on = isFavorite(category, symbol);
        el.classList.toggle('active', on);
        el.textContent = on ? '★' : '☆';
      }
    });
  });
});

/* ------------------------------------------------------------------
 * GRAFİK YARDIMCISI (Chart.js — portfoy.html'e CDN ile eklendi)
 * ------------------------------------------------------------------ */
const _chartInstances = {};
function renderLineChart(canvasId, labels, values, opts) {
  opts = opts || {};
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
  const isUp = values.length > 1 && values[values.length - 1] >= values[0];
  const lineColor = opts.color || (isUp ? '#16a34a' : '#dc2626');
  _chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: lineColor,
        backgroundColor: lineColor + '22',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: opts.showXAxis !== false, ticks: { maxTicksLimit: 6, autoSkip: true } },
        y: { display: true, ticks: { maxTicksLimit: 5 } }
      }
    }
  });
  return _chartInstances[canvasId];
}
function renderSeriesChart(canvasId, points, opts) {
  const labels = points.map(p => new Date(p.t).toLocaleDateString('tr-TR'));
  const values = points.map(p => p.c);
  return renderLineChart(canvasId, labels, values, opts);
}

/* ------------------------------------------------------------------
 * DETAY MODALI (Piyasalar sayfalarında ortak kullanılan popup)
 * ------------------------------------------------------------------ */
function ensureDetailModal() {
  let modal = document.getElementById('detailModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'detailModal';
  modal.className = 'detail-modal-overlay';
  modal.innerHTML = `
    <div class="detail-modal">
      <div class="detail-modal-header">
        <div class="detail-modal-title" id="detailModalTitle"></div>
        <button type="button" class="detail-modal-close" id="detailModalClose">&times;</button>
      </div>
      <div class="detail-modal-body" id="detailModalBody"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeDetailModal(); });
  document.getElementById('detailModalClose').addEventListener('click', closeDetailModal);
  return modal;
}
function openDetailModal(titleHtml, bodyHtml) {
  if (typeof _detailCleanupFn === 'function') {
    try { _detailCleanupFn(); } catch (e) {}
    _detailCleanupFn = null;
  }
  const modal = ensureDetailModal();
  document.getElementById('detailModalTitle').innerHTML = titleHtml;
  document.getElementById('detailModalBody').innerHTML = bodyHtml;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
let _detailCleanupFn = null;
/**
 * Bir detay modalı açan kod, modal kapandığında temizlenmesi gereken
 * bir şeyi (ör. VİOP canlı fiyat polling interval'i) varsa burada
 * kaydeder. closeDetailModal her çağrıldığında otomatik çalıştırılır.
 */
function setDetailCleanup(fn) {
  _detailCleanupFn = fn;
}
function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  Object.keys(_chartInstances).forEach(id => {
    if (id.startsWith('detailChart')) {
      _chartInstances[id].destroy();
      delete _chartInstances[id];
    }
  });
  if (typeof _detailCleanupFn === 'function') {
    try { _detailCleanupFn(); } catch (e) {}
  }
  _detailCleanupFn = null;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetailModal(); });

/* ------------------------------------------------------------------
 * ORTAK GRAFİK ZAMAN ARALIĞI YARDIMCISI (Yahoo Finance chart)
 * Emtia/Hisse/Endeks detay sayfalarında ortak kullanılır. Mobildeki
 * 1G/1H/1A/3A/6A/YBB/1Y/3Y/5Y filtreleriyle birebir eşleşir. Yahoo'nun
 * desteklediği aralıklar sınırlı olduğu için (1d,5d,1mo,3mo,6mo,ytd,
 * 1y,2y,5y,10y,max) 3Y için 5y/1wk çekilip son ~156 hafta (3 yıl)
 * istemci tarafında kırpılır.
 * ------------------------------------------------------------------ */
const YAHOO_CHART_RANGES = {
  '1G': { range: '1d', interval: '5m' },
  '1H': { range: '5d', interval: '15m' },
  '1A': { range: '1mo', interval: '1d' },
  '3A': { range: '3mo', interval: '1d' },
  '6A': { range: '6mo', interval: '1d' },
  'YBB': { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '3Y': { range: '5y', interval: '1wk', sliceLastN: 156 },
  '5Y': { range: '5y', interval: '1wk' }
};

async function fetchYahooRangeSeries(yahooSymbol, rangeKey) {
  const cfg = YAHOO_CHART_RANGES[rangeKey] || YAHOO_CHART_RANGES['1A'];
  const cacheKey = `ohlc:${yahooSymbol}:${cfg.range}:${cfg.interval}`;
  const data = await cachedFetch(cacheKey, 60000, () =>
    fetchPriceProxy(`type=stock-ohlc&symbol=${encodeURIComponent(yahooSymbol)}&range=${cfg.range}&interval=${cfg.interval}`)
  );
  let points = data.points || [];
  if (cfg.sliceLastN && points.length > cfg.sliceLastN) {
    points = points.slice(points.length - cfg.sliceLastN);
  }
  return points;
}

function periodStatsFromPoints(points) {
  if (!points || points.length === 0) return null;
  const closes = points.map(p => p.c).filter(c => Number.isFinite(c));
  if (closes.length === 0) return null;
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePercent = first > 0 ? ((last - first) / first) * 100 : null;
  return { low, high, first, last, changePercent };
}

/**
 * Detay modalı içinde ortak "grafik + zaman aralığı çipleri" bloğunu
 * kurar. `onRangeChange(rangeKey)` her aralık değiştiğinde (ve ilk
 * açılışta '1A' ile) çağrılır; kendi içinde fetchYahooRangeSeries +
 * renderSeriesChart + periodStatsFromPoints kullanıp DOM'u güncellemek
 * çağıran koda kalır (her varlık türünün gösterdiği istatistik
 * alanları farklı olduğu için).
 */
function bindChartRangeChips(containerEl, defaultRange, onRangeChange) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.range === defaultRange);
    chip.addEventListener('click', () => {
      containerEl.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onRangeChange(chip.dataset.range);
    });
  });
  onRangeChange(defaultRange);
}

/* ------------------------------------------------------------------
 * VERİ YOK GÖSTERİMİ (kural: veri gelmiyorsa uydurma, "—" göster)
 * ------------------------------------------------------------------ */
function naIfMissing(v, formatter) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return formatter ? formatter(v) : v;
}

/* ------------------------------------------------------------------
 * GİRİŞ SEKMELERİ (Giriş Yap / Hesap Oluştur)
 * ------------------------------------------------------------------ */
document.querySelectorAll('#authView .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#authView .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    authMode = tab.dataset.tab;
    const btn = document.getElementById('authSubmitBtn');
    if (btn) btn.textContent = authMode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur';
  });
});

/* ------------------------------------------------------------------
 * GİRİŞ / KAYIT
 * ------------------------------------------------------------------ */
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('authSubmitBtn');
  btn.disabled = true;
  try {
    if (authMode === 'login') {
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supa.auth.signUp({ email, password });
      if (error) throw error;
      showMsg('Hesap oluşturuldu. E-postana gelen onay linkine tıkladıktan sonra giriş yapabilirsin.', 'success');
    }
  } catch (err) {
    showMsg(err.message || 'Bir hata oluştu.', 'error');
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------------
 * ÇIKIŞ
 * ------------------------------------------------------------------ */
document.getElementById('signOutBtn').addEventListener('click', async () => {
  await supa.auth.signOut();
});

/* ------------------------------------------------------------------
 * SIDEBAR NAVİGASYON / ROUTING
 * ------------------------------------------------------------------ */
const PAGE_TITLES = {
  home: 'Ana Sayfa',
  varliklar: 'Varlıklar',
  emtia: 'Emtialar',
  hisse: 'Hisse Senetleri',
  fon: 'Yatırım Fonları',
  kripto: 'Kripto Paralar',
  doviz: 'Döviz',
  faiz: 'Faiz',
  kredi: 'Kredi Hesaplama',
  viop: 'VİOP Aktif Vade',
  butce: 'Bütçe',
  favoriler: 'Favoriler',
  varligim: 'Varlığım',
  bulten: 'Bülten'
};

const VARLIKLAR_PAGES = ['emtia', 'hisse', 'fon', 'kripto', 'doviz', 'faiz', 'kredi', 'viop'];

const pageLoaders = {}; // Diğer app-*.js dosyaları buraya kendi yükleyici fonksiyonlarını kaydeder.
function registerPageLoader(pageId, fn) {
  pageLoaders[pageId] = fn;
}

function showPage(pageId) {
  if (!PAGE_TITLES[pageId]) pageId = 'home';

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  document.getElementById('topbarTitle').textContent = PAGE_TITLES[pageId];

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  document.querySelectorAll('.nav-subitem[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  const varliklarToggle = document.getElementById('navVarliklarToggle');
  const varliklarSubmenu = document.getElementById('submenuVarliklar');
  if (VARLIKLAR_PAGES.includes(pageId)) {
    varliklarToggle.classList.add('expanded');
    varliklarSubmenu.classList.add('open');
  }

  closeMobileSidebar();

  if (typeof pageLoaders[pageId] === 'function') {
    pageLoaders[pageId]();
  }

  try {
    if (window.location.hash.replace('#', '') !== pageId) {
      window.location.hash = pageId;
    }
  } catch (e) {}
}

// DÜZELTME (2026-09, kullanıcı raporu: "tarayıcı geri gitme butonu aktif
// çalışsın basıldığında bir önceki ekran geri gelsin"): showPage() her
// sayfa değişiminde location.hash'i güncelliyordu (bu tarayıcı geçmişine
// bir kayıt ekliyordu) ama hash DEĞİŞTİĞİNDE uygulamayı bilgilendirecek
// hiçbir dinleyici YOKTU — yani geri/ileri tuşuna basıldığında adres
// çubuğundaki hash değişiyordu ama görünen sayfa AYNI kalıyordu. Bu
// dinleyici, tarayıcı geçmiş gezinmesiyle (geri/ileri) veya hash'in
// programatik/manuel değişmesiyle tetiklenen her hashchange'de doğru
// sayfayı gösterir. showPage() içindeki yukarıdaki "sadece farklıysa
// yaz" koruması, bu dinleyicinin kendi tetiklediği döngüyü önler.
window.addEventListener('hashchange', () => {
  const pageId = (window.location.hash || '').replace('#', '') || 'home';
  showPage(pageId);
});

document.querySelectorAll('.nav-item[data-page], .nav-subitem[data-page]').forEach(el => {
  el.addEventListener('click', () => showPage(el.dataset.page));
});

// DÜZELTME (kullanıcı raporu #4): "Varlıklar" üst menü öğesine tıklamak
// artık sadece alt menüyü açıp kapatmıyor — aynı zamanda alt sayfaların
// (Emtialar/Hisse/Fon/Kripto/Faiz/Kredi/VİOP) kısa özetlerini gösteren
// yeni "Varlıklar" hub sayfasını açıyor (mobil uygulamadaki Varlıklar
// ekranıyla aynı 6 kategori kartı).
document.getElementById('navVarliklarToggle').addEventListener('click', () => {
  const toggle = document.getElementById('navVarliklarToggle');
  const submenu = document.getElementById('submenuVarliklar');
  toggle.classList.toggle('expanded');
  submenu.classList.toggle('open');
  showPage('varliklar');
});

document.querySelectorAll('.varliklar-hub-card[data-page]').forEach(el => {
  el.addEventListener('click', () => showPage(el.dataset.page));
});

/* ------------------------------------------------------------------
 * MOBİL HAMBURGER MENÜ
 * ------------------------------------------------------------------ */
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
document.getElementById('hamburgerBtn').addEventListener('click', openMobileSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

/* ------------------------------------------------------------------
 * OTURUM DURUMU
 * ------------------------------------------------------------------ */
supa.auth.onAuthStateChange((_event, session) => {
  if (session && session.user) {
    authView.style.display = 'none';
    appShell.style.display = 'flex';
    userEmailEl.textContent = session.user.email || '';

    // Seçim listelerini/kataloglarını bir kez doldur.
    if (typeof loadStockOptions === 'function') loadStockOptions();
    if (typeof loadCryptoOptions === 'function') loadCryptoOptions();
    if (typeof loadCommodityOptions === 'function') loadCommodityOptions();
    loadFavorites();

    // DÜZELTME (2026-09, kullanıcı raporu: tarayıcı geri tuşu çalışmıyor):
    // önceki satır yanlışlıkla PAGE_TITLES[initialPage] (başlık METNİ,
    // örn. "Yatırım Fonları") döndürüyordu ve bunu showPage'e sayfa KİMLİĞİ
    // olarak veriyordu — showPage içindeki geçerlilik kontrolü (satır
    // ~532) bunu tanımadığı için her zaman 'home'a düşülüyordu. Yani
    // #hisse/#fon/vb. gibi bir sayfada sayfayı yenilemek/geri gitmek her
    // zaman Ana Sayfa'ya dönüyordu. showPage kendi içinde zaten geçersiz
    // pageId'leri 'home'a düşürdüğü için doğrudan initialPage verilmesi
    // yeterli ve doğru.
    const initialPage = (window.location.hash || '').replace('#', '') || 'home';
    showPage(initialPage);
  } else {
    authView.style.display = '';
    appShell.style.display = 'none';
  }
});
