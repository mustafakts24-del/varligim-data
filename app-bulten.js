/* ==================================================================
 * app-bulten.js
 * "Bülten" sayfası: mobil uygulamayla AYNI, PAYLAŞILAN merkezi haber
 * deposundan (price-proxy'nin type=news ucu -> Supabase news_articles
 * tablosu, 15 dakikada bir Supabase Cron ile dolduruluyor) haberler.
 *
 * DÜZELTME (2026-09-10, yeni özellik: "favori şirketler"): giriş yapmış
 * kullanıcılar Bülten'de takip etmek istedikleri şirket/konu adlarını
 * ekleyebilir (Supabase favorite_companies tablosu — mobille AYNI
 * tablo). Bu şirketlerle eşleşen haberler sunucu tarafında işaretlenip
 * "Favori Haberler" bölümünde en üste sabitlenir.
 * ================================================================== */

let bultenArticles = [];
let bultenFavoriteMatches = [];
let bultenActiveCategory = 'all';
let bultenSearchText = '';
let bultenAutoRefreshTimer = null;
let bultenFavoriteCompanies = [];

async function loadBultenFavoriteCompanies() {
  const { data: { user } } = await supa.auth.getUser();
  const guestEl = document.getElementById('bultenFavGuest');
  const manageEl = document.getElementById('bultenFavManage');

  if (!user) {
    bultenFavoriteCompanies = [];
    if (guestEl) guestEl.style.display = 'block';
    if (manageEl) manageEl.style.display = 'none';
    return;
  }

  if (guestEl) guestEl.style.display = 'none';
  if (manageEl) manageEl.style.display = 'block';

  const { data, error } = await supa
    .from('favorite_companies')
    .select('company_name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    bultenFavoriteCompanies = [];
    return;
  }

  bultenFavoriteCompanies = (data || []).map(r => r.company_name);
  renderBultenFavChips();
}

function renderBultenFavChips() {
  const wrap = document.getElementById('bultenFavChips');
  if (!wrap) return;
  if (bultenFavoriteCompanies.length === 0) {
    wrap.innerHTML = '<span style="font-size:11.5px; color:var(--text-faint);">Henüz favori şirket eklemedin.</span>';
    return;
  }
  wrap.innerHTML = bultenFavoriteCompanies.map(name => `
    <span class="filter-chip active" style="display:inline-flex; align-items:center; gap:6px;" data-fav-chip="${escapeHtml(name)}">
      ${escapeHtml(name)}
      <span data-fav-remove="${escapeHtml(name)}" style="cursor:pointer; font-weight:bold;">×</span>
    </span>
  `).join('');
  wrap.querySelectorAll('[data-fav-remove]').forEach(el => {
    el.addEventListener('click', () => removeBultenFavoriteCompany(el.dataset.favRemove));
  });
}

async function addBultenFavoriteCompany() {
  const input = document.getElementById('bultenFavCompanyInput');
  const name = (input?.value || '').trim();
  if (!name) return;

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;

  const { error } = await supa.from('favorite_companies').insert({
    user_id: user.id,
    company_name: name
  });

  if (error) {
    // Aynı şirket zaten eklenmişse (unique index) sessizce yoksay;
    // başka bir hata varsa kullanıcıya bildir.
    if (!(error.message || '').toLowerCase().includes('duplicate')) {
      showMsg('Şirket eklenemedi: ' + error.message, 'error');
      return;
    }
  }

  if (input) input.value = '';
  await loadBultenFavoriteCompanies();
  await refreshBultenArticles();
}

async function removeBultenFavoriteCompany(name) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;

  await supa
    .from('favorite_companies')
    .delete()
    .eq('user_id', user.id)
    .ilike('company_name', name);

  await loadBultenFavoriteCompanies();
  await refreshBultenArticles();
}

document.getElementById('bultenFavAddBtn')?.addEventListener('click', addBultenFavoriteCompany);
document.getElementById('bultenFavCompanyInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBultenFavoriteCompany();
});
document.getElementById('bultenFavLoginLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (typeof openAuthOverlay === 'function') {
    openAuthOverlay('login', {
      title: 'Favori şirket takip et',
      lead: 'Bülten\'de takip ettiğin şirketlerden haber geldiğinde en üstte görmek için giriş yap.'
    });
  }
});

function bultenFavoritesParam() {
  return bultenFavoriteCompanies.length ? '&favorites=' + encodeURIComponent(bultenFavoriteCompanies.join(',')) : '';
}

async function refreshBultenArticles() {
  const result = await fetchPriceProxy('type=news' + bultenFavoritesParam());
  const all = result.articles || [];
  bultenFavoriteMatches = all.filter(a => a.isFavoriteMatch);
  bultenArticles = all.filter(a => !a.isFavoriteMatch);
  const ts = document.getElementById('bultenLastUpdated');
  if (ts) ts.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');
  renderBultenGrid();
  renderBultenFavGrid();
}

function renderBultenFavGrid() {
  const section = document.getElementById('bultenFavSection');
  const grid = document.getElementById('bultenFavGrid');
  if (!section || !grid) return;
  if (bultenFavoriteMatches.length === 0) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }
  section.style.display = 'block';
  grid.innerHTML = bultenFavoriteMatches.map((a, idx) => bultenCardHtml(a, `data-open-fav-news="${idx}"`)).join('');
  grid.querySelectorAll('[data-open-fav-news]').forEach(card => {
    card.addEventListener('click', () => openNewsDetail(bultenFavoriteMatches[Number(card.dataset.openFavNews)]));
  });
}

async function loadBultenPage() {
  const grid = document.getElementById('bultenGrid');
  const emptyState = document.getElementById('bultenEmptyState');
  grid.innerHTML = '';
  emptyState.style.display = 'none';
  try {
    await loadBultenFavoriteCompanies();
  } catch (e) { /* misafirse veya hata olursa favori bölümü sessizce gizli kalır */ }
  try {
    const result = await cachedFetch('news:' + bultenFavoriteCompanies.join(','), 5 * 60 * 1000, () => fetchPriceProxy('type=news' + bultenFavoritesParam()));
    const all = result.articles || [];
    bultenFavoriteMatches = all.filter(a => a.isFavoriteMatch);
    bultenArticles = all.filter(a => !a.isFavoriteMatch);
  } catch (e) {
    bultenArticles = [];
    bultenFavoriteMatches = [];
  }
  const tsEl = document.getElementById('bultenLastUpdated');
  if (tsEl) tsEl.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');
  // DORMANT reklam alanı (Faz 3, madde 28-33) — bkz. app-premium.js.
  // Premium kullanıcılarda otomatik gizlenir; hata olursa sessizce
  // atlanır (bülten akışını asla bozmaz).
  if (typeof renderAdSlot === 'function') {
    renderAdSlot('bultenAdSlot', 'bulten-top').catch(() => {});
  }
  renderBultenFavGrid();
  if (bultenArticles.length === 0 && bultenFavoriteMatches.length === 0) {
    emptyState.textContent = 'Şu anda gösterilecek haber yok.';
    emptyState.style.display = 'block';
    return;
  }
  renderBultenGrid();
  // DÜZELTME (2026-09, tam parite denetimi): mobildeki bulletin_screen.dart
  // haberleri periyodik olarak (arka planda) tazeler ve son güncelleme
  // saatini gösterir — web'de bu hiç yoktu, sayfa yalnızca ilk açılışta
  // yükleniyordu. 15 dakikada bir sessizce yenilenir (kullanıcı akışını
  // bölmez, yalnızca sayfa hâlâ aktifse listeyi günceller).
  if (!bultenAutoRefreshTimer) {
    bultenAutoRefreshTimer = setInterval(async () => {
      const bultenPage = document.getElementById('page-bulten');
      if (!bultenPage || !bultenPage.classList.contains('active')) return;
      try {
        await refreshBultenArticles();
      } catch (e) { /* sessizce atla, mevcut liste ekranda kalır */ }
    }, 15 * 60 * 1000);
  }
}

// Mobildeki NewsArticleCard._relativeTime() ile AYNI eşikler/biçim
// ("az önce" / "X dk önce" / "X sa önce" / "X gün önce" / "GG.AA.YYYY").
function bultenRelativeTime(publishedAt) {
  if (!publishedAt) return '';
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const BULTEN_CAT_LABELS = { ekonomi: 'Ekonomi', borsa: 'Borsa', emtia: 'Emtia', doviz: 'Döviz', kap: 'KAP' };

// Normal grid ile "Favori Haberler" grid'i AYNI kart görünümünü
// kullanır (DRY) — extraAttr, çağıran tarafın kendi tıklama olay
// dinleyicisini bağlayabilmesi için karta eklenen data-* niteliğidir.
function bultenCardHtml(a, extraAttr) {
  return `
    <div class="news-card" ${extraAttr}>
      ${a.imageUrl ? `<img src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy" />` : ''}
      <div class="news-card-body">
        <div class="news-card-cat">${escapeHtml(BULTEN_CAT_LABELS[a.category] || a.category)}</div>
        <div class="news-card-title">${escapeHtml(a.title)}</div>
        <div class="news-card-meta">${bultenRelativeTime(a.publishedAt)}</div>
      </div>
    </div>
  `;
}

function renderBultenGrid() {
  const grid = document.getElementById('bultenGrid');
  const emptyState = document.getElementById('bultenEmptyState');
  const q = bultenSearchText.trim().toLocaleLowerCase('tr-TR');
  const filtered = bultenArticles.filter(a => {
    if (bultenActiveCategory !== 'all' && a.category !== bultenActiveCategory) return false;
    if (q && !(a.title || '').toLocaleLowerCase('tr-TR').includes(q)) return false;
    return true;
  });
  if (filtered.length === 0) {
    grid.innerHTML = '';
    // Mobildeki gibi (BulletinScreen._filtered kullanan build metodu):
    // arama/filtre sonucu boşsa farklı, gerçek veri hiç yoksa farklı
    // mesaj — kullanıcı neden boş olduğunu ayırt edebilsin. Web'de
    // ayrıca kategori filtresi de olduğundan (mobilde yok) metin bunu
    // da kapsayacak şekilde genel tutuldu.
    emptyState.textContent = bultenArticles.length === 0
      ? 'Şu anda gösterilecek haber yok.'
      : 'Bu filtrelerle eşleşen haber bulunamadı.';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  // DÜZELTME (Faz 3, madde 28-33 — parite denetimi): mobildeki
  // NewsArticleCard (bulletin_screen.dart) haber KARTINDA kaynak adını
  // hiç GÖSTERMİYOR — yalnızca göreli bir zaman ("X dk önce") gösteriyor;
  // kaynak adı yalnızca haber DETAY ekranında yer alıyor (bkz.
  // news_detail_screen.dart satır 163). Web'de daha önce kart üzerinde
  // hem kaynak adı hem de tam tarih/saat gösteriliyordu — bu, mobil
  // ile davranış farkı yaratıyordu. Kart meta satırı artık mobildeki
  // gibi yalnızca göreli zamanı gösteriyor; kaynak adı openNewsDetail()
  // içindeki detay modalında (mobildeki gibi) korunuyor.
  grid.innerHTML = filtered.map((a, idx) => bultenCardHtml(a, `data-open-news="${idx}"`)).join('');
  grid.querySelectorAll('[data-open-news]').forEach(card => {
    card.addEventListener('click', () => openNewsDetail(filtered[Number(card.dataset.openNews)]));
  });
}

document.getElementById('bultenSearchInput')?.addEventListener('input', debounce((e) => {
  bultenSearchText = e.target.value;
  renderBultenGrid();
}, 200));

document.querySelectorAll('#bultenCategoryChips .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#bultenCategoryChips .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    bultenActiveCategory = chip.dataset.cat;
    renderBultenGrid();
  });
});

// DÜZELTME (2026-09-10, kullanıcı isteği: "kaynaklar kırmızı i işaretiyle
// gizlensin, sadece imleç üzerine gelince kaynak gösterilsin"): kaynak adı
// artık meta satırında DOĞRUDAN yazmıyor — küçük, kırmızı, "i" harfli bir
// rozete dönüştürüldü; kaynak adı yalnızca bu rozetin üzerine gelindiğinde
// (hover) veya klavyeyle odaklanıldığında (erişilebilirlik için :focus da
// eklendi) beliren bir araç ipucunda (tooltip) gösteriliyor. Tarih/saat
// hâlâ doğrudan görünür kalıyor (bu bir "kaynak" değil).
function openNewsDetail(article) {
  if (!article) return;
  openDetailModal(
    'Haber Detayı',
    `
    ${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="" style="width:100%; border-radius:var(--radius-sm); margin-bottom:14px;" />` : ''}
    <div class="news-card-cat">${escapeHtml(article.category)}</div>
    <h2 style="margin:8px 0 10px; font-size:18px;">${escapeHtml(article.title)}</h2>
    <div class="news-card-meta" style="margin-bottom:14px; display:flex; align-items:center; gap:8px;">
      ${article.publishedAt ? `<span>${new Date(article.publishedAt).toLocaleString('tr-TR')}</span>` : ''}
      <span class="news-source-badge" tabindex="0">
        <span class="news-source-badge-icon">i</span>
        <span class="news-source-tooltip">Kaynak: ${escapeHtml(article.source)}</span>
      </span>
    </div>
    ${article.summary ? `<p style="font-size:14px; line-height:1.6; color:var(--text-muted); white-space:pre-line;">${escapeHtml(article.summary)}</p>` : ''}
    <!-- DÜZELTME (2026-09-10, kullanıcı isteği: "haberin tamamı okunabilsin,
         başka siteye yönlendirme olmasın"): yukarıdaki özet artık kaynağın
         RSS akışında GERÇEKTEN sağladığı tüm metni (1200 karaktere kadar,
         önceden 400'dü) gösteriyor — yapay bir kısaltma kaldırıldı. Ancak
         RSS akışları, yayıncının kendi tercihiyle, haberin TAMAMINI değil
         yalnızca bir özetini sağlıyor; kaynak sitedeki tam metni burada
         BİREBİR kopyalamak (telif hakkı ihlali olur) yapılmadı — bu yüzden
         "kaynağında oku" bağlantısı, artık kaynak adını göstermeden,
         korunuyor. -->
    <a class="btn primary full" style="margin-top:16px; display:inline-block; text-align:center;" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Kaynağında Devamını Oku</a>
    `
  );
}

registerPageLoader('bulten', loadBultenPage);
