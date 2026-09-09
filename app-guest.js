/* ==================================================================
 * app-guest.js (YENİ, 2026-09 — misafir kullanım + üyelik sistemi)
 *
 * Bu dosya, kullanıcı hiç giriş yapmadan (misafir olarak) Varlığım web
 * uygulamasını deneyebilsin diye eklendi. app-core.js'in HEMEN
 * ardından yüklenir ve şunları yapar:
 *
 * 1) Oturum modunu yönetir ('guest' | 'authenticated') ve
 *    supa.auth.onAuthStateChange'in app-core.js'teki tek satırlık
 *    delege çağrısının (handleSessionChange) gerçek mantığını içerir.
 * 2) Misafir modundayken supa.from(<holdings tablosu>) ve
 *    supa.auth.getUser() çağrılarını ŞEFFAFCA yerel (sessionStorage)
 *    bir veri katmanına yönlendirir — app-varligim.js, app-varliklar.js,
 *    app-butce.js, app-favoriler.js, app-home.js, app-piyasa-*.js gibi
 *    dosyaların TEK SATIRI bile değişmeden misafir modunda da (Supabase'e
 *    hiç yazmadan) çalışmasını sağlar.
 * 3) Giriş/kayıt ekranını (#authView) artık zorunlu tam sayfa yerine,
 *    istendiğinde açılıp kapanan bir katman (overlay) olarak yönetir.
 * 4) 10-15 saniye sonra, oturum başına yalnızca bir kez, gecikmeli bir
 *    üyelik hatırlatma modalı gösterir.
 * 5) Misafirken eklenen geçici veriler, kullanıcı giriş/kayıt olunca
 *    "hesabına aktarmak ister misin?" sorusuyla isteğe bağlı olarak
 *    gerçek hesaba taşınır — hesapta zaten var olan hiçbir kayıt asla
 *    üzerine yazılmaz (ignoreDuplicates).
 *
 * ÖNEMLİ — KALICILIK KURALI: misafir verileri YALNIZCA sessionStorage'da
 * tutulur (tarayıcı sekmesi/oturumu kapanınca otomatik silinir). Sayfa
 * yenilemede (aynı sekme) korunması sorun değildir, bilhassa istenmiştir.
 * Hiçbir misafir verisi localStorage'a veya Supabase'e yazılmaz.
 * ================================================================== */

/* ------------------------------------------------------------------
 * 1) MİSAFİR VERİ DEPOSU (sessionStorage tabanlı, geçici)
 * ------------------------------------------------------------------ */
const GUEST_USER_ID = 'guest-local';
const GUEST_STORAGE_KEY = 'varligimGuestData';

const GUEST_TABLES = new Set([
  'stock_holdings', 'currency_holdings', 'commodity_holdings', 'crypto_holdings',
  'fund_holdings', 'real_estate_holdings', 'vehicle_holdings', 'deposit_holdings',
  'other_asset_holdings', 'viop_holdings', 'budget_transactions', 'favorites'
]);

// Hesaba aktarım sırasında gerçek Supabase tablolarına yazarken kullanılan
// aynı doğal anahtarlar (mevcut app-varligim.js/app-varliklar.js/app-butce.js/
// app-favoriler.js dosyalarındaki onConflict değerleriyle BİREBİR aynı).
const GUEST_TABLE_ONCONFLICT = {
  stock_holdings: 'user_id,symbol',
  currency_holdings: 'user_id,currency_code',
  commodity_holdings: 'user_id,commodity_key',
  crypto_holdings: 'user_id,crypto_id',
  fund_holdings: 'user_id,code',
  real_estate_holdings: 'user_id,id',
  vehicle_holdings: 'user_id,id',
  deposit_holdings: 'user_id,id',
  other_asset_holdings: 'user_id,id',
  viop_holdings: 'user_id,symbol',
  budget_transactions: 'user_id,id',
  favorites: 'user_id,category,symbol'
};

function _guestReadAll() {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function _guestWriteAll(store) {
  try { sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* sessionStorage yoksa (gizli mod vb.) sessizce yut */ }
}
function _guestTable(table) {
  const store = _guestReadAll();
  return Array.isArray(store[table]) ? store[table] : [];
}
function _guestSaveTable(table, rows) {
  const store = _guestReadAll();
  store[table] = rows;
  _guestWriteAll(store);
}

function guestHasAnyData() {
  const store = _guestReadAll();
  return Object.keys(store).some(t => Array.isArray(store[t]) && store[t].some(r => !r.deleted_at));
}

function clearGuestData() {
  try { sessionStorage.removeItem(GUEST_STORAGE_KEY); } catch (e) {}
}

/* ------------------------------------------------------------------
 * Supabase'in `supa.from(table).select()/.update()/.upsert()...`
 * zincirleme sorgu arayüzünün, yalnızca projede GERÇEKTEN kullanılan
 * alt kümesini (select+is+eq+order, update, upsert, maybeSingle)
 * taklit eden minimal bir "sahte" sorgu oluşturucu.
 * ------------------------------------------------------------------ */
class GuestQueryBuilder {
  constructor(table) {
    this.table = table;
    this._filters = [];
    this._order = null;
    this._single = false;
    this._op = { type: 'select' };
  }
  select() { if (this._op.type !== 'update' && this._op.type !== 'upsert') this._op = { type: 'select' }; return this; }
  is(col, val) { this._filters.push({ col, op: 'is', val }); return this; }
  eq(col, val) { this._filters.push({ col, op: 'eq', val }); return this; }
  order(col, opts) { this._order = { col, ascending: !opts || opts.ascending !== false }; return this; }
  maybeSingle() { this._single = true; return this; }
  update(patch) { this._op = { type: 'update', patch }; return this; }
  upsert(row, opts) { this._op = { type: 'upsert', row, opts: opts || {} }; return this; }
  then(resolve) {
    let result;
    try { result = this._execute(); } catch (e) { result = { data: null, error: e }; }
    resolve(result);
  }
  _matches(row) {
    return this._filters.every(f => {
      if (f.op === 'is') return f.val === null ? (row[f.col] == null) : row[f.col] === f.val;
      if (f.op === 'eq') return row[f.col] === f.val;
      return true;
    });
  }
  _execute() {
    const rows = _guestTable(this.table);
    if (this._op.type === 'select') {
      let result = rows.filter(r => this._matches(r));
      if (this._order) {
        const { col, ascending } = this._order;
        result = [...result].sort((a, b) => {
          const av = a[col], bv = b[col];
          if (av == null && bv == null) return 0;
          if (av == null) return ascending ? -1 : 1;
          if (bv == null) return ascending ? 1 : -1;
          if (av < bv) return ascending ? -1 : 1;
          if (av > bv) return ascending ? 1 : -1;
          return 0;
        });
      }
      if (this._single) return { data: result[0] || null, error: null };
      return { data: result, error: null };
    }
    if (this._op.type === 'update') {
      const next = rows.map(r => (this._matches(r) ? { ...r, ...this._op.patch } : r));
      _guestSaveTable(this.table, next);
      return { data: null, error: null };
    }
    if (this._op.type === 'upsert') {
      const onConflict = (this._op.opts.onConflict || 'id').split(',').map(s => s.trim()).filter(c => c !== 'user_id');
      const incoming = { ...this._op.row };
      if (!incoming.user_id) incoming.user_id = GUEST_USER_ID;
      if (!incoming.created_at) incoming.created_at = new Date().toISOString();
      let matched = false;
      const next = rows.map(r => {
        const isMatch = onConflict.length > 0 && onConflict.every(c => r[c] === incoming[c]);
        if (isMatch) { matched = true; return { ...r, ...incoming }; }
        return r;
      });
      if (!matched) next.push(incoming);
      _guestSaveTable(this.table, next);
      return { data: [incoming], error: null };
    }
    return { data: null, error: new Error('Bu işlem misafir modunda desteklenmiyor.') };
  }
}

/* ------------------------------------------------------------------
 * `supa` istemcisini, misafir modundayken YALNIZCA yukarıdaki
 * tablolar için yerel depoya yönlendirecek şekilde YAMALA. Diğer TÜM
 * çağrılar (fund_catalog, storage, functions, gerçek auth işlemleri)
 * dokunulmadan doğrudan gerçek Supabase istemcisine gider.
 * ------------------------------------------------------------------ */
function isGuestSessionMode() {
  return window.__varligimSessionMode !== 'authenticated';
}

const _realFrom = supa.from.bind(supa);
supa.from = function (table) {
  if (isGuestSessionMode() && GUEST_TABLES.has(table)) {
    return new GuestQueryBuilder(table);
  }
  return _realFrom(table);
};

const _realGetUser = supa.auth.getUser.bind(supa.auth);
supa.auth.getUser = async function () {
  if (isGuestSessionMode()) {
    return { data: { user: { id: GUEST_USER_ID, email: null } }, error: null };
  }
  return _realGetUser();
};

/* ------------------------------------------------------------------
 * 2) MİSAFİR → HESAP VERİ AKTARIMI
 * ignoreDuplicates:true kullanılır — kullanıcının hesabında AYNI doğal
 * anahtara sahip bir kayıt ZATEN varsa üzerine YAZILMAZ, atlanır. Bu
 * sayede mevcut hesap verisi hiçbir koşulda bozulmaz/değişmez.
 * ------------------------------------------------------------------ */
async function migrateGuestDataToAccount(user) {
  const store = _guestReadAll();
  for (const table of Object.keys(GUEST_TABLE_ONCONFLICT)) {
    const rows = Array.isArray(store[table]) ? store[table] : [];
    const payload = rows
      .filter(r => !r.deleted_at)
      .map(r => ({ ...r, user_id: user.id }));
    if (payload.length === 0) continue;
    const onConflict = GUEST_TABLE_ONCONFLICT[table];
    const { error } = await _realFrom(table).upsert(payload, { onConflict, ignoreDuplicates: true });
    if (error) throw error;
  }
}

/* ------------------------------------------------------------------
 * 3) OTURUM DURUMU (app-core.js'teki onAuthStateChange buraya delege
 * eder — bkz. app-core.js "OTURUM DURUMU" bölümü)
 * ------------------------------------------------------------------ */
window.__varligimSessionMode = 'guest';

function handleSessionChange(_event, session) {
  const authedFooter = document.getElementById('sidebarAuthedFooter');
  const guestFooter = document.getElementById('sidebarGuestFooter');

  if (session && session.user) {
    const wasGuestWithData = window.__varligimSessionMode !== 'authenticated' && guestHasAnyData();
    window.__varligimSessionMode = 'authenticated';

    closeAuthOverlay();
    hideGuestPrompt();
    appShell.style.display = 'flex';
    userEmailEl.textContent = session.user.email || '';
    if (authedFooter) authedFooter.style.display = '';
    if (guestFooter) guestFooter.style.display = 'none';

    if (wasGuestWithData) {
      const wantsMigration = window.confirm(
        'Misafir olarak eklediğin varlıklar var. Bunları hesabına kaydetmek ister misin?'
      );
      if (wantsMigration) {
        migrateGuestDataToAccount(session.user)
          .catch((e) => {
            console.error('Misafir verisi aktarılamadı:', e);
            // Kural: aktarım başarısız olursa hesaptaki mevcut kayıtlar
            // KESİNLİKLE bozulmaz (ignoreDuplicates zaten üzerine yazmaz);
            // kullanıcıya yalnızca bilgilendirme gösterilir.
            alert('Geçici veriler hesabına aktarılırken bir sorun oluştu. Hesabındaki mevcut kayıtların hiçbiri değiştirilmedi.');
          })
          .finally(() => {
            clearGuestData();
            finishBoot();
          });
        return;
      }
      clearGuestData();
    }
    finishBoot();
  } else {
    window.__varligimSessionMode = 'guest';
    appShell.style.display = 'flex';
    if (authedFooter) authedFooter.style.display = 'none';
    if (guestFooter) guestFooter.style.display = '';
    finishBoot();
    scheduleGuestPrompt();
  }
}

function finishBoot() {
  if (typeof loadStockOptions === 'function') loadStockOptions();
  if (typeof loadCryptoOptions === 'function') loadCryptoOptions();
  if (typeof loadCommodityOptions === 'function') loadCommodityOptions();
  if (typeof loadFavorites === 'function') loadFavorites();
  const initialPage = (window.location.hash || '').replace('#', '') || 'home';
  showPage(initialPage);
}

/* ------------------------------------------------------------------
 * 4) GİRİŞ/KAYIT KATMANI (overlay) — artık zorunlu değil, istenince açılır
 * ------------------------------------------------------------------ */
let _authOverlayOpen = false;

function setAuthTab(mode) {
  document.querySelectorAll('#authView .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
  authMode = mode;
  const btn = document.getElementById('authSubmitBtn');
  if (btn) btn.textContent = mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur';
}

function openAuthOverlay(mode, reason) {
  hideGuestPrompt();
  const view = document.getElementById('authView');
  if (!view) return;
  setAuthTab(mode || 'login');
  const titleEl = document.getElementById('authViewTitle');
  const leadEl = document.getElementById('authViewLead');
  if (titleEl) titleEl.textContent = (reason && reason.title) || 'Portföyüme giriş yap';
  if (leadEl) leadEl.textContent = (reason && reason.lead) ||
    'Varlığım uygulamasındaki hesabınla giriş yaparak tüm varlıklarını web üzerinden de yönetebilirsin.';
  if (typeof hideMsg === 'function') hideMsg();
  view.style.display = 'flex';
  _authOverlayOpen = true;
}

function closeAuthOverlay() {
  const view = document.getElementById('authView');
  if (view) view.style.display = 'none';
  _authOverlayOpen = false;
}

window.openAuthOverlay = openAuthOverlay;
window.closeAuthOverlay = closeAuthOverlay;
window.isGuestSessionMode = isGuestSessionMode;

document.getElementById('authCloseBtn')?.addEventListener('click', closeAuthOverlay);
// Arka plana (overlay'in kendisine, karta değil) tıklamak da kapatır.
document.getElementById('authView')?.addEventListener('click', (e) => {
  if (e.target.id === 'authView') closeAuthOverlay();
});
document.getElementById('sidebarLoginBtn')?.addEventListener('click', () => openAuthOverlay('login'));

/* ------------------------------------------------------------------
 * 5) 10-15 SANİYE SONRA, OTURUM BAŞINA BİR KEZ, ÜYELİK HATIRLATMASI
 * ------------------------------------------------------------------ */
const GUEST_PROMPT_DELAY_MS = 13000;
const GUEST_PROMPT_FLAG_KEY = 'varligimGuestPromptShown';
let _guestPromptTimer = null;

function scheduleGuestPrompt() {
  if (_guestPromptTimer) return;
  let alreadyShown = false;
  try { alreadyShown = sessionStorage.getItem(GUEST_PROMPT_FLAG_KEY) === '1'; } catch (e) {}
  if (alreadyShown) return;
  _guestPromptTimer = setTimeout(() => {
    if (window.__varligimSessionMode === 'guest' && !_authOverlayOpen) {
      showGuestPrompt();
    }
  }, GUEST_PROMPT_DELAY_MS);
}

function showGuestPrompt() {
  const overlay = document.getElementById('guestPromptOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  try { sessionStorage.setItem(GUEST_PROMPT_FLAG_KEY, '1'); } catch (e) {}
}
function hideGuestPrompt() {
  const overlay = document.getElementById('guestPromptOverlay');
  if (overlay) overlay.style.display = 'none';
}

document.getElementById('guestPromptLoginBtn')?.addEventListener('click', () => {
  openAuthOverlay('signup');
});
document.getElementById('guestPromptDismissBtn')?.addEventListener('click', hideGuestPrompt);
document.getElementById('guestPromptOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'guestPromptOverlay') hideGuestPrompt();
});
