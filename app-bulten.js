/* ==================================================================
 * app-bulten.js
 * "Bülten" sayfası: mobil uygulamayla AYNI 5 RSS kaynağından
 * (bulletin_screen.dart) haberler — price-proxy'nin yeni type=news
 * ucu üzerinden (server-side fetch, CORS ve User-Agent gereksinimi
 * nedeniyle tarayıcıdan doğrudan çekilemiyor).
 * ================================================================== */

let bultenArticles = [];
let bultenActiveCategory = 'all';

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
  if (bultenArticles.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  renderBultenGrid();
}

function renderBultenGrid() {
  const grid = document.getElementById('bultenGrid');
  const emptyState = document.getElementById('bultenEmptyState');
  const filtered = bultenActiveCategory === 'all'
    ? bultenArticles
    : bultenArticles.filter(a => a.category === bultenActiveCategory);
  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  const catLabels = { ekonomi: 'Ekonomi', borsa: 'Borsa', emtia: 'Emtia', doviz: 'Döviz', kap: 'KAP' };
  grid.innerHTML = filtered.map((a, idx) => `
    <div class="news-card" data-open-news="${idx}">
      ${a.imageUrl ? `<img src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy" />` : ''}
      <div class="news-card-body">
        <div class="news-card-cat">${escapeHtml(catLabels[a.category] || a.category)}</div>
        <div class="news-card-title">${escapeHtml(a.title)}</div>
        <div class="news-card-meta">${escapeHtml(a.source)}${a.publishedAt ? ' · ' + new Date(a.publishedAt).toLocaleString('tr-TR') : ''}</div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('[data-open-news]').forEach(card => {
    card.addEventListener('click', () => openNewsDetail(filtered[Number(card.dataset.openNews)]));
  });
}

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
