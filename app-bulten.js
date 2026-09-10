/* ==================================================================
 * app-bulten.js
 * "Bülten" sayfası: mobil uygulamayla AYNI 5 RSS kaynağından
 * (bulletin_screen.dart) haberler — price-proxy'nin yeni type=news
 * ucu üzerinden (server-side fetch, CORS ve User-Agent gereksinimi
 * nedeniyle tarayıcıdan doğrudan çekilemiyor).
 * ================================================================== */

let bultenArticles = [];
let bultenActiveCategory = 'all';
let bultenSearchText = '';
let bultenAutoRefreshTimer = null;

async function loadBultenPage() {
  const grid = document.getElementById('bultenGrid');
  const emptyState = document.getElementById('bultenEmptyState');
  grid.innerHTML = '';
  emptyState.style.display = 'none';
  try {
    const result = await cachedFetch('news:all', 5 * 60 * 1000, () => fetchPriceProxy('type=news'));
    bultenArticles = result.articles || [];
  } catch (e) {
    bultenArticles = [];
  }
  const tsEl = document.getElementById('bultenLastUpdated');
  if (tsEl) tsEl.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');
  // DORMANT reklam alanı (Faz 3, madde 28-33) — bkz. app-premium.js.
  // Premium kullanıcılarda otomatik gizlenir; hata olursa sessizce
  // atlanır (bülten akışını asla bozmaz).
  if (typeof renderAdSlot === 'function') {
    renderAdSlot('bultenAdSlot', 'bulten-top').catch(() => {});
  }
  if (bultenArticles.length === 0) {
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
        const result = await fetchPriceProxy('type=news');
        bultenArticles = result.articles || [];
        const ts = document.getElementById('bultenLastUpdated');
        if (ts) ts.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');
        renderBultenGrid();
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
  const catLabels = { ekonomi: 'Ekonomi', borsa: 'Borsa', emtia: 'Emtia', doviz: 'Döviz', kap: 'KAP' };
  // DÜZELTME (Faz 3, madde 28-33 — parite denetimi): mobildeki
  // NewsArticleCard (bulletin_screen.dart) haber KARTINDA kaynak adını
  // hiç GÖSTERMİYOR — yalnızca göreli bir zaman ("X dk önce") gösteriyor;
  // kaynak adı yalnızca haber DETAY ekranında yer alıyor (bkz.
  // news_detail_screen.dart satır 163). Web'de daha önce kart üzerinde
  // hem kaynak adı hem de tam tarih/saat gösteriliyordu — bu, mobil
  // ile davranış farkı yaratıyordu. Kart meta satırı artık mobildeki
  // gibi yalnızca göreli zamanı gösteriyor; kaynak adı openNewsDetail()
  // içindeki detay modalında (mobildeki gibi) korunuyor.
  grid.innerHTML = filtered.map((a, idx) => `
    <div class="news-card" data-open-news="${idx}">
      ${a.imageUrl ? `<img src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy" />` : ''}
      <div class="news-card-body">
        <div class="news-card-cat">${escapeHtml(catLabels[a.category] || a.category)}</div>
        <div class="news-card-title">${escapeHtml(a.title)}</div>
        <div class="news-card-meta">${bultenRelativeTime(a.publishedAt)}</div>
      </div>
    </div>
  `).join('');
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

function openNewsDetail(article) {
  if (!article) return;
  openDetailModal(
    'Haber Detayı',
    `
    ${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="" style="width:100%; border-radius:var(--radius-sm); margin-bottom:14px;" />` : ''}
    <div class="news-card-cat">${escapeHtml(article.category)}</div>
    <h2 style="margin:8px 0 10px; font-size:18px;">${escapeHtml(article.title)}</h2>
    <div class="news-card-meta" style="margin-bottom:14px;">${escapeHtml(article.source)}${article.publishedAt ? ' · ' + new Date(article.publishedAt).toLocaleString('tr-TR') : ''}</div>
    ${article.summary ? `<p style="font-size:14px; line-height:1.6; color:var(--text-muted);">${escapeHtml(article.summary)}</p>` : ''}
    <a class="btn primary full" style="margin-top:16px; display:inline-block; text-align:center;" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Haberin Tamamını Oku</a>
    `
  );
}

registerPageLoader('bulten', loadBultenPage);
