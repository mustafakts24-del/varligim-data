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
  return `<span class="${cls}">${sign}${formatter(diff)} (${sign}${pct.toFixed(2)}%)</span>`;
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
  return `<span class="chip ${cls}">${sign}${pct.toFixed(2)}%</span>`;
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
  emtia: 'Emtialar',
  hisse: 'Hisse Senetleri',
  fon: 'Yatırım Fonları',
  kripto: 'Kripto Paralar',
  faiz: 'Faiz',
  kredi: 'Kredi Hesaplama',
  viop: 'VİOP Aktif Vade',
  butce: 'Bütçe',
  favoriler: 'Favoriler',
  varligim: 'Varlığım',
  bulten: 'Bülten'
};

const VARLIKLAR_PAGES = ['emtia', 'hisse', 'fon', 'kripto', 'faiz', 'kredi', 'viop'];

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
    window.location.hash = pageId;
  } catch (e) {}
}

document.querySelectorAll('.nav-item[data-page], .nav-subitem[data-page]').forEach(el => {
  el.addEventListener('click', () => showPage(el.dataset.page));
});

document.getElementById('navVarliklarToggle').addEventListener('click', () => {
  const toggle = document.getElementById('navVarliklarToggle');
  const submenu = document.getElementById('submenuVarliklar');
  toggle.classList.toggle('expanded');
  submenu.classList.toggle('open');
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

    const initialPage = (window.location.hash || '').replace('#', '') || 'home';
    showPage(PAGE_TITLES[initialPage] ? initialPage : 'home');
  } else {
    authView.style.display = '';
    appShell.style.display = 'none';
  }
});
