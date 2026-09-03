/* ==================================================================
 * app-favoriler.js
 * "Favoriler" sayfası: merkezi Supabase `favorites` tablosundaki tüm
 * kayıtları listeler (mobil ile ortak — bkz. favorites tablosu SQL'i
 * ve mobil favorites_service.dart senkronizasyon değişikliği).
 * Favori EKLEME/ÇIKARMA, piyasa sayfalarındaki ★ simgesiyle yapılır
 * (app-core.js: toggleFavorite/favoriteStarHtml); bu sayfa sadece
 * listeler ve buradan da çıkarmaya izin verir.
 *
 * Kategori sözlüğü (mobil ile ORTAK, ASCII slug — Türkçe büyük/küçük
 * harf İ/i sorunlarından kaçınmak için hem web hem mobil senkron
 * yazarken bu sabit slug'ları kullanır): hisse, endeks, emtia, fon,
 * kripto, viop, doviz.
 * ================================================================== */

const FAVORI_CATEGORY_LABELS = {
  hisse: 'Hisse Senedi',
  endeks: 'Endeks',
  emtia: 'Emtia',
  fon: 'Fon',
  kripto: 'Kripto',
  viop: 'VİOP',
  doviz: 'Döviz'
};

let favoriRows = [];
let favoriActiveCategory = 'all';
let favoriSearchText = '';

// Favoriler listesi karma kategoriler içerdiğinden (hisse/endeks/emtia/
// fon/kripto/viop/doviz), her satır kendi türüne uygun logoyu/ikonu
// dener; bulunamazsa app-logos.js'in kendi harf-rozeti yedeğine düşer.
function favoriRowLogo(catSlug, r) {
  const sym = r.symbol || '';
  if (catSlug === 'hisse') return stockLogoImg(sym, 26);
  if (catSlug === 'endeks') return viopLogo(sym, 'index', 26);
  if (catSlug === 'emtia') return commodityIconSvg(sym, 26);
  if (catSlug === 'fon') return fundLogoImg(null, r.name, sym, 26);
  if (catSlug === 'viop') return viopLogo(r.name || sym, 'equity', 26);
  if (catSlug === 'doviz') return `<span class="logo-slot logo-emoji" style="width:26px;height:26px;font-size:17px;">💱</span>`;
  return letterAvatarHtml(sym, 26);
}

async function loadFavorilerPage() {
  const tbody = document.getElementById('favoriBody');
  const emptyState = document.getElementById('favoriEmptyState');
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { data, error } = await supa
    .from('favorites')
    .select('category,symbol,name,price,change_percent')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    showMsg('Favoriler yüklenemedi: ' + error.message, 'error');
    return;
  }
  favoriRows = data || [];
  renderFavoriList();
}

function renderFavoriList() {
  const tbody = document.getElementById('favoriBody');
  const emptyState = document.getElementById('favoriEmptyState');
  const q = favoriSearchText.trim().toLocaleUpperCase('tr-TR');
  const filtered = favoriRows.filter(r => {
    if (favoriActiveCategory !== 'all' && (r.category || '').toLowerCase() !== favoriActiveCategory) return false;
    if (q && !(`${r.symbol || ''} ${r.name || ''}`).toLocaleUpperCase('tr-TR').includes(q)) return false;
    return true;
  });
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  // DÜZELTME (2026-09, tam parite denetimi): satıra tıklayınca ilgili
  // varlığın detay sayfası/modalı açılmıyordu (mobilde favoriler
  // listesindeki her satır dokunulduğunda kendi detay ekranını açar).
  // Hisse/Fon/Kripto/Emtia/VİOP/Döviz için ilgili piyasa dosyasındaki
  // openXDetail() fonksiyonları burada yeniden kullanılıyor. Endeks
  // (BIST index) detayı bileşen listesi gerektirdiğinden bu kategori
  // tıklanabilir değildir — imleç ve stil buna göre ayarlanır.
  const CLICKABLE_CATS = new Set(['hisse', 'emtia', 'fon', 'kripto', 'viop', 'doviz']);
  tbody.innerHTML = filtered.map(r => {
    const catSlug = (r.category || '').toLowerCase();
    const label = FAVORI_CATEGORY_LABELS[catSlug] || r.category || '';
    const clickable = CLICKABLE_CATS.has(catSlug);
    return `
    <tr data-cat="${escapeHtml(catSlug)}" data-sym="${escapeHtml(r.symbol)}" data-name="${escapeHtml(r.name || '')}" style="${clickable ? 'cursor:pointer;' : ''}">
      <td>${favoriRowLogo(catSlug, r)}</td>
      <td>${escapeHtml(label)}</td>
      <td>
        <div class="sym">${escapeHtml(r.symbol)}</div>
        ${r.name ? `<div class="name">${escapeHtml(r.name)}</div>` : ''}
      </td>
      <td class="num">${r.price != null ? fmtNumber(r.price) : '—'}</td>
      <td class="num">${changeChipHtml(r.change_percent)}</td>
      <td class="num">
        <button type="button" class="del favori-remove" data-cat="${escapeHtml(r.category)}" data-sym="${escapeHtml(r.symbol)}" title="Favorilerden çıkar">✕</button>
      </td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.favori-remove').forEach(btn => {
    // toggleFavorite tamamlanınca 'favorites:changed' event'i tetiklenir;
    // aşağıdaki genel dinleyici bu sayfa aktifse otomatik yeniden yükler.
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.cat, btn.dataset.sym);
    });
  });
  tbody.querySelectorAll('tr[data-cat]').forEach(tr => {
    const catSlug = tr.dataset.cat;
    if (!CLICKABLE_CATS.has(catSlug)) return;
    tr.addEventListener('click', async () => {
      const sym = tr.dataset.sym;
      if (catSlug === 'hisse' && typeof openStockDetail === 'function') openStockDetail(sym);
      else if (catSlug === 'emtia' && typeof openCommodityDetail === 'function') openCommodityDetail(sym);
      else if (catSlug === 'fon' && typeof openFundDetail === 'function') openFundDetail(sym);
      else if (catSlug === 'kripto' && typeof openCryptoDetail === 'function') openCryptoDetail(sym);
      else if (catSlug === 'viop' && typeof openViopDetail === 'function') {
        let livePrice = null, liveChange = null;
        try {
          const q = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(sym)}`);
          livePrice = q.price; liveChange = q.changePercent;
        } catch (e) { /* modal "—" gösterecek */ }
        openViopDetail({ symbol: sym, underlying: tr.dataset.name, category: 'other', isOption: false, price: livePrice, changePercent: liveChange, volumeTl: null, volumeLot: null });
      }
      else if (catSlug === 'doviz' && typeof openDovizDetail === 'function') openDovizDetail(sym);
    });
  });
}

document.getElementById('favoriSearchInput')?.addEventListener('input', debounce((e) => {
  favoriSearchText = e.target.value;
  renderFavoriList();
}, 200));

document.querySelectorAll('#favoriCategoryChips .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#favoriCategoryChips .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    favoriActiveCategory = chip.dataset.cat;
    renderFavoriList();
  });
});

document.addEventListener('favorites:changed', () => {
  const favPage = document.getElementById('page-favoriler');
  if (favPage && favPage.classList.contains('active')) loadFavorilerPage();
});

registerPageLoader('favoriler', loadFavorilerPage);
