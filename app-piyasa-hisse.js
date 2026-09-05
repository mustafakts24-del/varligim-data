/* ==================================================================
 * app-piyasa-hisse.js
 * "Varlıklar → Hisse Senetleri": Ana Endeksler, Sektör Endeksleri ve
 * tüm hisse listesi (mobildeki bist_market_screen.dart +
 * stocks_screen.dart + stock_detail_screen.dart'ın web karşılığı).
 * Kullanıcının KENDİ hisse portföyü burada DEĞİL — "Varlığım" menüsünde
 * (app-varligim.js).
 *
 * Bilinen sınırlama (FAZ 3): mobildeki stock_detail_screen.dart'taki
 * tam KAP/İş Yatırım finansal tablo taraması (gelir tablosu/bilanço/
 * nakit akış, banka bazlı şablonlar) bu sürüme dahil edilmedi —
 * Edge Function üzerinden güvenilir biçimde yeniden üretmek başlı
 * başına büyük bir çalışma. Bunun yerine Yahoo Finance'ten GERÇEK
 * (uydurulmamış) temel çarpanlar/oranlar (F/K, PD/DD, piyasa değeri,
 * temettü verimi, 52 hafta aralığı vb.) ve mevcut analist tavsiyeleri
 * kaynağı (analyst-recommendations.json) gösterilir.
 * ================================================================== */

const BIST_INDICES = [
  { code: 'XU030', name: 'BIST 30' },
  { code: 'XU050', name: 'BIST 50' },
  { code: 'XU100', name: 'BIST 100' },
  { code: 'XU500', name: 'BIST 500' }
];

const BIST_SECTORS = [
  { code: 'XBANK', name: 'Bankacılık' },
  { code: 'XHOLD', name: 'Holding' },
  { code: 'XUTEK', name: 'Teknoloji' },
  { code: 'XUSIN', name: 'Sınai' },
  { code: 'XUMAL', name: 'Mali' },
  { code: 'XUHIZ', name: 'Hizmetler' },
  { code: 'XULAS', name: 'Ulaştırma' },
  { code: 'XELKT', name: 'Elektrik' },
  { code: 'XBLSM', name: 'Bilişim' },
  { code: 'XGIDA', name: 'Gıda İçecek' },
  { code: 'XMADN', name: 'Madencilik' },
  { code: 'XGMYO', name: 'GYO' }
];

/* ------------------------------------------------------------------
 * ENDEKS BİLEŞENLERİ (gerçek, uydurulmamış — mobil uygulamanın kendi
 * `bist_market_screen.dart` / `markets_overview_screen.dart` dosyalarından
 * BİREBİR taşındı; mobilde de aynı sabit listeler kullanılıyor, BIST'in
 * kendisi anlık bileşen API'si sunmadığı için hem web hem mobil bu
 * "dönemsel güncellenen sabit liste" yaklaşımını paylaşıyor). Kullanıcı
 * talebi (2026-09 hata raporu #6): her endeks/sektör kutusunda "Teknik
 * Analiz" yanına "[Endeks Adı] Hisseleri" butonu — sadece o an o endekste
 * bulunan güncel hisseleri, canlı fiyatlarıyla listeler.
 * XU500 (BIST 500) için ayrı bir sabit liste yok — mobil tarafta da bu
 * endeks, o an yüklü TÜM hisse kataloğu olarak ele alınıyor (bkz.
 * `_bist500Symbols()` → `BistStockListService().getCachedStocks()`);
 * web tarafında da aynı mantıkla `hisseCatalog`/`BIST_STOCKS_475`
 * kullanılır (özel bir 'ALL' işaretiyle).
 * ------------------------------------------------------------------ */
const BIST_INDEX_CONSTITUENTS = {
  XU030: ['AEFES', 'AKBNK', 'ASELS', 'ASTOR', 'BIMAS', 'DSTKF', 'EKGYO',
    'ENKAI', 'EREGL', 'FROTO', 'GARAN', 'GUBRF', 'ISCTR', 'KCHOL',
    'KRDMD', 'MGROS', 'PETKM', 'PGSUS', 'SAHOL', 'SASA', 'SISE',
    'TAVHL', 'TCELL', 'THYAO', 'TOASO', 'TRALT', 'TTKOM', 'TUPRS',
    'VAKBN', 'YKBNK'],
  XU050: ['AEFES', 'AKBNK', 'AKSEN', 'ALARK', 'ASELS', 'ASTOR', 'BIMAS',
    'BRSAN', 'BTCIM', 'CANTE', 'CCOLA', 'CIMSA', 'DSTKF', 'ECILC', 'EFOR',
    'EKGYO', 'ENKAI', 'EREGL', 'FROTO', 'GARAN', 'GLRMK', 'GUBRF', 'HALKB',
    'HEKTS', 'ISCTR', 'KCHOL', 'KRDMD', 'KTLEV', 'KUYAS', 'MGROS', 'MIATK',
    'OYAKC', 'PASEU', 'PETKM', 'PGSUS', 'SAHOL', 'SASA', 'SISE', 'TAVHL',
    'TCELL', 'THYAO', 'TOASO', 'TRALT', 'TRMET', 'TTKOM', 'TUPRS', 'TURSG',
    'ULKER', 'VAKBN', 'YKBNK'],
  XU100: ['AEFES', 'AKBNK', 'AKSA', 'AKSEN', 'ALARK', 'ALTNY', 'ANSGR',
    'ARCLK', 'ASELS', 'ASTOR', 'BALSU', 'BERA', 'BIMAS', 'BRSAN', 'BRYAT',
    'BSOKE', 'BTCIM', 'CANTE', 'CCOLA', 'CIMSA', 'CVKMD', 'CWENE', 'DAPGM',
    'DOAS', 'DOHOL', 'DSTKF', 'ECILC', 'EFOR', 'EKGYO', 'ENERY', 'ENJSA',
    'ENKAI', 'EREGL', 'ESEN', 'EUPWR', 'EUREN', 'FENER', 'FROTO', 'GARAN',
    'GENIL', 'GESAN', 'GLRMK', 'GRSEL', 'GRTHO', 'GSRAY', 'GUBRF', 'HALKB',
    'HEKTS', 'IEYHO', 'ISCTR', 'ISMEN', 'IZENR', 'KCHOL', 'KLRHO', 'KRDMD',
    'KTLEV', 'KUYAS', 'MAGEN', 'MAVI', 'MGROS', 'MIATK', 'MPARK', 'OBAMS',
    'ODAS', 'ODINE', 'OTKAR', 'OYAKC', 'PAHOL', 'PASEU', 'PATEK', 'PETKM',
    'PGSUS', 'PSGYO', 'QUAGR', 'RALYH', 'REEDR', 'SAHOL', 'SARKY', 'SASA',
    'SISE', 'SKBNK', 'SOKM', 'TAVHL', 'TCELL', 'THYAO', 'TKFEN', 'TOASO',
    'TRALT', 'TRENJ', 'TRMET', 'TSKB', 'TTKOM', 'TUKAS', 'TUPRS', 'TURSG',
    'ULKER', 'VAKBN', 'VESTL', 'YKBNK', 'ZOREN'],
  XU500: 'ALL',
  XBANK: ['AKBNK', 'YKBNK', 'ISCTR', 'GARAN', 'HALKB', 'VAKBN', 'SKBNK', 'TSKB', 'ALBRK'],
  XHOLD: ['KCHOL', 'SAHOL', 'ALARK', 'DOHOL', 'AGHOL', 'GLYHO', 'IEYHO', 'KLRHO', 'PAHOL', 'RALYH'],
  XUTEK: ['ASELS', 'ODINE', 'MIATK', 'LOGO', 'ARDYZ', 'PATEK', 'ALTNY', 'REEDR', 'FORTE', 'KAREL'],
  XUSIN: ['TUPRS', 'EREGL', 'ASTOR', 'SASA', 'FROTO', 'CCOLA', 'TRALT', 'TOASO', 'AEFES', 'GUBRF',
    'KRDMD', 'CIMSA', 'ARCLK', 'ULKER', 'BRYAT'],
  XUMAL: ['AKBNK', 'YKBNK', 'ISCTR', 'KCHOL', 'SAHOL', 'GARAN', 'SISE', 'TAVHL', 'EKGYO', 'VAKBN',
    'HALKB', 'TSKB', 'ISMEN'],
  XUHIZ: ['THYAO', 'TCELL', 'TTKOM', 'PGSUS', 'TAVHL', 'BIMAS', 'MGROS', 'SOKM', 'MPARK', 'GRSEL', 'PASEU'],
  XULAS: ['THYAO', 'PGSUS', 'TAVHL', 'CLEBI', 'RYSAS', 'TUREX', 'GRSEL', 'PASEU', 'PLTUR', 'LIDER'],
  XELKT: ['ENJSA', 'AKSEN', 'ENERY', 'AHGAZ', 'MAGEN', 'CWENE', 'CANTE', 'ODAS', 'IZENR', 'ZOREN',
    'AKENR', 'GWIND', 'BIOEN', 'AYDEM'],
  XBLSM: ['ODINE', 'MIATK', 'LOGO', 'ARDYZ', 'PATEK', 'FORTE', 'KFEIN', 'LINK', 'PAPIL', 'SMART', 'FONET'],
  XGIDA: ['AEFES', 'CCOLA', 'ULKER', 'TUKAS', 'OBAMS', 'BALSU', 'BANVT', 'KERVT', 'PENGD', 'TATGD'],
  XMADN: ['TRALT', 'CVKMD', 'KOZAL', 'KOZAA', 'IPEKE', 'PRKME', 'SARKY'],
  XGMYO: ['EKGYO', 'PSGYO', 'ISGYO', 'AKFGY', 'ALGYO', 'HLGYO', 'KLGYO', 'OZKGY', 'RYGYO', 'TRGYO', 'VKGYO']
};

// DÜZELTME (2026-09, kullanıcı raporu: hisse detayında "Sektör" hep
// "—" gösteriyordu — bkz. openStockDetail): Yahoo'nun sektör/endüstri
// bilgisini veren tek ucu (v10/quoteSummary/assetProfile) bu ortamdan
// engellendiği için, GERÇEK bir alternatif olarak hissenin zaten var
// olan BIST_INDEX_CONSTITUENTS listesindeki resmi BIST sektör endeksi
// üyeliğinden (Borsa İstanbul'un kendi sınıflandırması) sektör adı
// türetilir. Uydurma değildir — hisse gerçekten o sektör endeksinin
// bileşenidir; yalnızca Yahoo'nun serbest metin "industry" alanı kadar
// ayrıntılı değildir (bu yüzden "Alt Sektör/Endüstri" ayrı bırakılır).
function deriveSectorForSymbol(symbol) {
  for (const sector of BIST_SECTORS) {
    const list = BIST_INDEX_CONSTITUENTS[sector.code];
    if (Array.isArray(list) && list.includes(symbol)) return sector.name;
  }
  return null;
}

const INDEX_CONSTITUENTS_PAGE_SIZE = 40;
let indexConstituentsState = { symbols: [], visibleCount: INDEX_CONSTITUENTS_PAGE_SIZE };

function resolveIndexConstituentSymbols(code) {
  const list = BIST_INDEX_CONSTITUENTS[code];
  if (list === 'ALL') {
    const source = hisseCatalog.length > 0 ? hisseCatalog : ((typeof BIST_STOCKS_475 !== 'undefined') ? BIST_STOCKS_475 : []);
    return source.map(s => s.symbol);
  }
  return Array.isArray(list) ? list : [];
}

async function renderIndexConstituentsList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { symbols, visibleCount } = indexConstituentsState;
  if (symbols.length === 0) {
    container.innerHTML = `<div class="empty" style="padding:10px 0;">Bu endeks için bileşen listesi bulunamadı.</div>`;
    return;
  }
  const visible = symbols.slice(0, visibleCount);
  container.innerHTML = `
    <table class="kv-table market-table">
      <tbody id="${containerId}Body">
        ${visible.map(sym => {
          const meta = hisseCatalog.find(s => s.symbol === sym) || (typeof BIST_STOCKS_475 !== 'undefined' ? BIST_STOCKS_475.find(s => s.symbol === sym) : null) || { symbol: sym, name: '' };
          return `
          <tr>
            <td>${favoriteStarHtml('hisse', sym, { name: meta.name })}</td>
            <td class="market-row-logo">${stockLogoImg(sym, 22)}</td>
            <td><div class="sym">${escapeHtml(sym)}</div><div class="name">${escapeHtml(meta.name || '')}</div></td>
            <td class="num" id="idxc-price-${sym}">…</td>
            <td class="num" id="idxc-chg-${sym}">…</td>
            <td class="num"><button type="button" class="detail-btn" data-open-stock="${escapeHtml(sym)}">Detay</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${symbols.length > visibleCount ? `<button type="button" class="btn outline small" id="${containerId}LoadMoreBtn" style="margin-top:8px;">Daha Fazla Göster</button>` : ''}
  `;
  container.querySelectorAll('[data-open-stock]').forEach(btn => {
    btn.addEventListener('click', () => openStockDetail(btn.dataset.openStock));
  });
  const loadMoreBtn = document.getElementById(`${containerId}LoadMoreBtn`);
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      indexConstituentsState.visibleCount += INDEX_CONSTITUENTS_PAGE_SIZE;
      renderIndexConstituentsList(containerId);
    });
  }
  await Promise.all(visible.map(async (sym) => {
    const priceEl = document.getElementById(`idxc-price-${sym}`);
    const chgEl = document.getElementById(`idxc-chg-${sym}`);
    if (!priceEl || !chgEl) return;
    try {
      const quote = await cachedFetch(`stock:${sym}`, 30000, () =>
        fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(sym)}`));
      priceEl.textContent = fmtTL(quote.price);
      chgEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      priceEl.textContent = '—';
      chgEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

const ANALYST_RECOMMENDATIONS_URL = 'https://mustafakts24-del.github.io/varligim-data/analyst-recommendations.json';

let hisseCatalog = [];
let hisseCatalogSource = 'static';
let hisseVisibleCount = 40;
const HISSE_PAGE_SIZE = 40;
let hisseFilterText = '';

async function ensureHisseCatalog() {
  if (hisseCatalog.length > 0) return;
  try {
    const result = await cachedFetch('stock-catalog', 6 * 3600 * 1000, () =>
      fetchPriceProxy('type=stock-catalog'));
    if (result && result.source === 'kap' && Array.isArray(result.companies) && result.companies.length >= 50) {
      hisseCatalog = result.companies;
      hisseCatalogSource = 'canlı (KAP)';
      return;
    }
  } catch (e) {
    // sessizce statik listeye düş
  }
  hisseCatalog = (typeof BIST_STOCKS_475 !== 'undefined') ? BIST_STOCKS_475 : [];
  hisseCatalogSource = 'statik (mobil ile aynı, 475 hisse)';
}

async function renderIndexGrid(containerId, items) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = items.map(it => `
    <div class="index-card" data-open-index="${it.code}">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div class="idx-name">${escapeHtml(it.name)}</div>
        ${favoriteStarHtml('endeks', it.code, { name: it.name })}
      </div>
      <div class="idx-value" id="idx-price-${it.code}">…</div>
      <div id="idx-chg-${it.code}">…</div>
    </div>
  `).join('');
  grid.querySelectorAll('[data-open-index]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.fav-star')) return;
      openIndexDetail(card.dataset.openIndex, items);
    });
  });
  await Promise.all(items.map(async (it) => {
    try {
      const quote = await cachedFetch(`stock:${it.code}`, 30000, () =>
        fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(it.code)}`));
      document.getElementById(`idx-price-${it.code}`).textContent = fmtNumber(quote.price);
      document.getElementById(`idx-chg-${it.code}`).innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      document.getElementById(`idx-price-${it.code}`).textContent = '—';
      document.getElementById(`idx-chg-${it.code}`).innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

function filteredHisseCatalog() {
  const q = hisseFilterText.trim().toLocaleUpperCase('tr-TR');
  if (!q) return hisseCatalog;
  return hisseCatalog.filter(s =>
    s.symbol.toLocaleUpperCase('tr-TR').includes(q) ||
    (s.name || '').toLocaleUpperCase('tr-TR').includes(q)
  );
}

// DÜZELTME (2026-09, tam parite denetimi): mobildeki bist_market_screen.
// dart'ta "Yükselenler / Düşenler / Yüksek Hacim" hızlı filtre çipleri var
// — web'de yalnızca alfabetik + arama vardı. Tüm katalog TEK toplu
// istekle (stock-batch, ≤150'lik parçalar) çekilip sıralanır; 60 saniye
// önbelleklenir (kural 12: gereksiz sık istek yapılmaz).
let hisseMoverFilter = 'all';

async function fetchHisseMoverList(filter) {
  const quotes = await cachedFetch('hisse-mover-quotes', 60000, () =>
    fetchStockBatchQuotes(hisseCatalog.map(s => s.symbol)));
  const bySymbol = new Map(quotes.filter(q => q && q.price != null).map(q => [q.symbol, q]));
  const merged = hisseCatalog
    .map(s => ({ ...s, ...(bySymbol.get(s.symbol) || {}) }))
    .filter(s => s.price != null);
  if (filter === 'gainers') {
    return merged.filter(s => s.changePercent != null).sort((a, b) => b.changePercent - a.changePercent).slice(0, 40);
  }
  if (filter === 'losers') {
    return merged.filter(s => s.changePercent != null).sort((a, b) => a.changePercent - b.changePercent).slice(0, 40);
  }
  if (filter === 'volume') {
    return merged.filter(s => s.volume != null).sort((a, b) => (b.price * b.volume) - (a.price * a.volume)).slice(0, 40);
  }
  return merged;
}

async function renderHisseList() {
  const tbody = document.getElementById('hisseMarketBody');
  const emptyState = document.getElementById('hisseMarketEmptyState');
  const loadMoreBtn = document.getElementById('hisseLoadMoreBtn');
  if (!tbody) return;

  if (hisseMoverFilter !== 'all') {
    loadMoreBtn.style.display = 'none';
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Yükleniyor…</td></tr>`;
    let moverList = [];
    try {
      moverList = await fetchHisseMoverList(hisseMoverFilter);
    } catch (e) { moverList = []; }
    if (moverList.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    tbody.innerHTML = moverList.map(s => `
      <tr>
        <td>${favoriteStarHtml('hisse', s.symbol, { name: s.name })}</td>
        <td class="market-row-logo">${stockLogoImg(s.symbol, 26)}</td>
        <td>
          <div class="sym">${escapeHtml(s.symbol)}</div>
          <div class="name">${escapeHtml(s.name || '')}</div>
        </td>
        <td class="num">${fmtTL(s.price)}</td>
        <td class="num">${changeChipHtml(s.changePercent)}</td>
        <td class="num"><button type="button" class="detail-btn" data-open-stock="${s.symbol}">Detay</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-open-stock]').forEach(btn => {
      btn.addEventListener('click', () => openStockDetail(btn.dataset.openStock));
    });
    return;
  }

  const filtered = filteredHisseCatalog();
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  const visible = filtered.slice(0, hisseVisibleCount);
  tbody.innerHTML = visible.map(s => `
    <tr>
      <td>${favoriteStarHtml('hisse', s.symbol, { name: s.name })}</td>
      <td class="market-row-logo">${stockLogoImg(s.symbol, 26)}</td>
      <td>
        <div class="sym">${escapeHtml(s.symbol)}</div>
        <div class="name">${escapeHtml(s.name || '')}</div>
      </td>
      <td class="num" id="hisse-price-${s.symbol}">…</td>
      <td class="num" id="hisse-chg-${s.symbol}">…</td>
      <td class="num"><button type="button" class="detail-btn" data-open-stock="${s.symbol}">Detay</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-open-stock]').forEach(btn => {
    btn.addEventListener('click', () => openStockDetail(btn.dataset.openStock));
  });
  loadMoreBtn.style.display = filtered.length > hisseVisibleCount ? '' : 'none';

  // Performans (kural 12): yalnızca o an görünen (en fazla 40) satır
  // için canlı fiyat çekilir, 475 hissenin tamamı için değil.
  await Promise.all(visible.map(async (s) => {
    const priceEl = document.getElementById(`hisse-price-${s.symbol}`);
    const chgEl = document.getElementById(`hisse-chg-${s.symbol}`);
    if (!priceEl || !chgEl) return;
    try {
      const quote = await cachedFetch(`stock:${s.symbol}`, 30000, () =>
        fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(s.symbol)}`));
      priceEl.textContent = fmtTL(quote.price);
      chgEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      priceEl.textContent = '—';
      chgEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

async function loadHisseMarketPage() {
  document.getElementById('hisseCatalogSource').textContent = '';
  hisseVisibleCount = HISSE_PAGE_SIZE;
  renderIndexGrid('bistIndexGrid', BIST_INDICES);
  renderIndexGrid('bistSectorGrid', BIST_SECTORS);
  await ensureHisseCatalog();
  document.getElementById('hisseCatalogSource').textContent = `Kaynak: ${hisseCatalogSource} · ${hisseCatalog.length} hisse`;
  await renderHisseList();
}

document.querySelectorAll('#hisseMoverChips .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#hisseMoverChips .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    hisseMoverFilter = chip.dataset.mover;
    renderHisseList();
  });
});

document.getElementById('hisseSearchInput').addEventListener('input', debounce((e) => {
  hisseFilterText = e.target.value;
  hisseVisibleCount = HISSE_PAGE_SIZE;
  renderHisseList();
}, 250));

document.getElementById('hisseLoadMoreBtn').addEventListener('click', () => {
  hisseVisibleCount += HISSE_PAGE_SIZE;
  renderHisseList();
});

async function openIndexDetail(code, items) {
  const meta = items.find(i => i.code === code) || { code, name: code };
  openDetailModal(
    `${escapeHtml(meta.name)} <span class="sub">${escapeHtml(code)}</span>`,
    `
    <div class="stat-mini-grid" id="indexDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Değer</div><div class="val" id="idxDetailPrice">…</div></div>
      <div class="stat-mini"><div class="lbl">Günlük Değişim</div><div class="val" id="idxDetailChange">…</div></div>
    </div>
    <div class="chart-range-row" id="indexRangeChips">
      ${Object.keys(YAHOO_CHART_RANGES).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="detailChartIndex"></canvas></div>
    <div class="stat-mini-grid" id="indexPeriodStats"></div>
    <div id="indexApproxNote" style="font-size:11.5px; color:var(--text-faint); margin:2px 0 8px;"></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      ${technicalAnalysisButtonHtml('indexTaBtn')}
    </div>

    <!-- KULLANICI RAPORU #6: her ana endeksin içine mobildeki gibi
         günlük piyasa haritası + hacim lot/TL + yükselen/nötr/düşen
         sayıları eklendi (bkz. loadIndexHeatmapAndVolume()). -->
    <div class="idx-volume-row">
      <div class="idx-volume-item">
        <div class="lbl">Hacim Lot</div>
        <div class="val" id="idxVolumeLot">Hesaplanıyor…</div>
      </div>
      <div class="idx-volume-sep"></div>
      <div class="idx-volume-item align-right">
        <div class="lbl">Hacim TL</div>
        <div class="val" id="idxVolumeTl">Hesaplanıyor…</div>
      </div>
    </div>

    <div class="heatmap-section-title">Günlük Piyasa Haritası</div>
    <div class="heatmap-section-sub">Kutu büyüklüğü işlem hacmini, renk günlük değişimi göstermektedir.</div>
    <div class="heatmap-grid" id="idxHeatmapGrid">
      <div class="heatmap-empty">Yükleniyor…</div>
    </div>
    <div class="heatmap-legend" id="idxHeatmapLegend"></div>

    <button type="button" class="btn outline small" id="indexConstituentsBtn" style="margin-top:14px;">
      <span class="msr" style="font-size:15px; vertical-align:-3px;">list_alt</span> ${escapeHtml(meta.name)} Hisseleri
    </button>
    <div id="indexConstituentsBlock" style="display:none; margin-top:10px;"></div>
    `
  );
  bindTechnicalAnalysisButton('indexTaBtn', {
    title: meta.name, assetType: 'index', yahooSymbol: `${code}.IS`,
  });
  const constituentsBtn = document.getElementById('indexConstituentsBtn');
  const constituentsBlock = document.getElementById('indexConstituentsBlock');
  if (constituentsBtn && constituentsBlock) {
    constituentsBtn.addEventListener('click', async () => {
      const opening = constituentsBlock.style.display === 'none';
      constituentsBlock.style.display = opening ? '' : 'none';
      if (!opening) return;
      if (hisseCatalog.length === 0) await ensureHisseCatalog();
      indexConstituentsState = { symbols: resolveIndexConstituentSymbols(code), visibleCount: INDEX_CONSTITUENTS_PAGE_SIZE };
      constituentsBlock.innerHTML = `<div class="empty" style="padding:10px 0;">Yükleniyor…</div>`;
      await renderIndexConstituentsList('indexConstituentsBlock');
    });
  }
  // PERFORMANS DÜZELTMESİ (2026-09, kullanıcı raporu: "veri akışı çok
  // yavaş, sayfalar geç açılıyor"): fiyat/değişim, grafik ve piyasa
  // haritası/hacim birbirinden BAĞIMSIZ veri kaynaklarıdır — önceden
  // fiyat isteği bitmeden grafik isteği hiç başlamıyordu (sıralı bekleme,
  // toplam süre ikisinin TOPLAMI kadardı). Artık üçü de AYNI ANDA
  // başlatılıyor; hiçbir veri/davranış değişmedi, yalnızca ZAMANLAMA
  // paralelleşti.
  const quotePromise = fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(code)}`).catch(() => null);
  loadIndexHeatmapAndVolume(code);

  // DÜZELTME (2026-09, kullanıcı raporu: "BIST 50 ve sektör endekslerinde
  // grafik görünmüyor"): Yahoo'nun endeks/sektör "sembolleri" için genelde
  // yalnızca tek bir güncel bar döndürdüğü doğrulandı (bkz. price-proxy
  // yorumu). Endeksin GERÇEK bileşen hisselerinden (ilk 8, zaten var olan
  // BIST_INDEX_CONSTITUENTS listesinden) yaklaşık bir seri hesaplanabilmesi
  // için bunlar `fallbackSymbols` olarak gönderiliyor — doğrudan veri
  // yeterliyse bu hiç kullanılmaz.
  const fallbackSymbols = resolveIndexConstituentSymbols(code).slice(0, 8).map(s => `${s}.IS`);
  bindChartRangeChips(document.getElementById('indexRangeChips'), '1A', async (rangeKey) => {
    const statsEl = document.getElementById('indexPeriodStats');
    const noteEl = document.getElementById('indexApproxNote');
    try {
      const points = await fetchYahooRangeSeries(`${code}.IS`, rangeKey, fallbackSymbols);
      renderPriceChart('detailChartIndex', points);
      const stats = periodStatsFromPoints(points);
      statsEl.innerHTML = stats ? `
        <div class="stat-mini"><div class="lbl">Dönem Düşük</div><div class="val">${fmtNumber(stats.low)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Yüksek</div><div class="val">${fmtNumber(stats.high)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Değişimi</div><div class="val">${changeChipHtml(stats.changePercent)}</div></div>
      ` : `<div class="stat-mini"><div class="lbl">Veri yok</div><div class="val">—</div></div>`;
      if (noteEl) {
        noteEl.textContent = points.approximate
          ? 'Not: Bu endeks için Yahoo Finance\'te doğrudan geçmiş grafik verisi bulunmuyor; grafik, endeksin bileşen hisselerinin ortalama değişiminden yaklaşık olarak hesaplanmıştır (uydurulmuş veri değildir, gerçek hisse fiyatlarından türetilmiştir).'
          : '';
      }
    } catch (e) {
      statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Veri alınamadı</div><div class="val">—</div></div>`;
      if (noteEl) noteEl.textContent = '';
    }
  });

  const quote = await quotePromise;
  if (quote) {
    document.getElementById('idxDetailPrice').textContent = fmtNumber(quote.price);
    document.getElementById('idxDetailChange').innerHTML = changeChipHtml(quote.changePercent);
  } else {
    document.getElementById('idxDetailPrice').textContent = '—';
    document.getElementById('idxDetailChange').textContent = '—';
  }
}

/* ------------------------------------------------------------------
 * GÜNLÜK PİYASA HARİTASI + HACİM LOT/TL (kullanıcı raporu #6)
 * Mobildeki bist_index_detail_screen.dart (_loadHeatmap / _loadVolumeSummary
 * / _MarketTreemap / _HeatmapLegend) ile AYNI mantık: endeksin ilk 20
 * bileşeni haritada gösterilir (turnover = hacim×fiyat sıralı), ±0.05%
 * bandı ile yükselen/nötr/düşen sayılır. Hacim Lot/TL ise endeksin TÜM
 * bileşenleri toplanarak hesaplanır. Web tarafı, mobildeki sembol-başına
 * ayrı ayrı Yahoo isteği yerine price-proxy'nin zaten var olan toplu
 * `type=stock-batch` ucunu kullanır (sunucu tarafında 20'lik paralel
 * gruplar) — bu hem daha hızlı hem de mobille aynı Yahoo v8/finance/chart
 * kaynağından besleniyor.
 * ------------------------------------------------------------------ */
function heatmapTileColor(changePercent) {
  const c = changePercent;
  if (c > 3) return '#087F4A';
  if (c > 1) return '#15945A';
  if (c > 0.05) return '#246845';
  if (c < -3) return '#B4232D';
  if (c < -1) return '#96323A';
  if (c < -0.05) return '#6F3439';
  return '#46505C';
}

function fmtCompactLot(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} Mr`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mn`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} B`;
  return String(Math.round(value));
}

function fmtCompactTl(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1e12) return `₺${(value / 1e12).toFixed(2)} Tr`;
  if (value >= 1e9) return `₺${(value / 1e9).toFixed(2)} Mr`;
  if (value >= 1e6) return `₺${(value / 1e6).toFixed(1)} Mn`;
  return `₺${Math.round(value)}`;
}

async function fetchStockBatchQuotes(symbols) {
  if (!symbols || symbols.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 150) chunks.push(symbols.slice(i, i + 150));
  const chunkResults = await Promise.all(chunks.map(chunk =>
    fetchPriceProxy(`type=stock-batch&symbols=${encodeURIComponent(chunk.join(','))}`)
      .then(r => (r && Array.isArray(r.quotes)) ? r.quotes : [])
      .catch(() => [])
  ));
  return chunkResults.flat();
}

async function loadIndexHeatmapAndVolume(code) {
  const gridEl = document.getElementById('idxHeatmapGrid');
  const legendEl = document.getElementById('idxHeatmapLegend');
  const lotEl = document.getElementById('idxVolumeLot');
  const tlEl = document.getElementById('idxVolumeTl');
  if (!gridEl) return; // kullanıcı modalı zaten kapattıysa hiçbir şey yapma

  if (hisseCatalog.length === 0) await ensureHisseCatalog();
  const allSymbols = resolveIndexConstituentSymbols(code);
  if (allSymbols.length === 0) {
    gridEl.innerHTML = `<div class="heatmap-empty">Bu endeks için bileşen listesi bulunamadı.</div>`;
    if (lotEl) lotEl.textContent = '—';
    if (tlEl) tlEl.textContent = '—';
    return;
  }
  const top20 = allSymbols.slice(0, 20);

  let heatmapStocks = [];
  try {
    const quotes = await cachedFetch(`idx-heatmap:${code}`, 60000, () => fetchStockBatchQuotes(top20));
    heatmapStocks = quotes
      .filter(q => q && q.price != null)
      .map(q => ({
        symbol: q.symbol,
        price: q.price,
        changePercent: q.changePercent ?? 0,
        volume: q.volume ?? 0,
        turnover: (q.volume && q.price) ? q.volume * q.price : 0,
      }))
      .sort((a, b) => b.turnover - a.turnover);
  } catch (e) {
    heatmapStocks = [];
  }

  if (!document.getElementById('idxHeatmapGrid')) return; // modal artık DOM'da değil

  if (heatmapStocks.length === 0) {
    gridEl.innerHTML = `<div class="heatmap-empty">Piyasa haritası verisi alınamadı.</div>`;
    legendEl.innerHTML = '';
  } else {
    gridEl.innerHTML = heatmapStocks.map((s, idx) => {
      const symbolic = idx >= 15;
      const rankClass = symbolic ? 'rank-symbolic' : (idx <= 2 ? `rank-${idx}` : '');
      const pctText = `${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(2).replace('.', ',')}%`;
      return `
        <div class="heatmap-tile ${rankClass}" style="background:${heatmapTileColor(s.changePercent)};" data-open-stock="${escapeHtml(s.symbol)}" title="${escapeHtml(s.symbol)} ${pctText}">
          <div class="ht-sym">${escapeHtml(s.symbol)}</div>
          <div class="ht-pct">${pctText}</div>
          <div class="ht-turnover">₺${fmtCompactLot(s.turnover)}</div>
        </div>`;
    }).join('');
    gridEl.querySelectorAll('[data-open-stock]').forEach(tile => {
      tile.addEventListener('click', () => openStockDetail(tile.dataset.openStock));
    });

    const positive = heatmapStocks.filter(s => s.changePercent > 0.05).length;
    const negative = heatmapStocks.filter(s => s.changePercent < -0.05).length;
    const neutral = heatmapStocks.length - positive - negative;
    legendEl.innerHTML = `
      <div class="heatmap-legend-item"><span class="heatmap-legend-dot" style="background:#27C77A;"></span>${positive} yükselen</div>
      <div class="heatmap-legend-item"><span class="heatmap-legend-dot" style="background:#667085;"></span>${neutral} nötr</div>
      <div class="heatmap-legend-item"><span class="heatmap-legend-dot" style="background:#FF525D;"></span>${negative} düşen</div>
    `;
  }

  // Hacim Lot/TL: haritada zaten çekilen ilk 20'yi tekrar istemeden,
  // kalan bileşenleri toplu (≤150'lik gruplar) çekip topla.
  try {
    const remaining = allSymbols.slice(20);
    const remainingQuotes = remaining.length > 0
      ? await cachedFetch(`idx-volume-rest:${code}`, 60000, () => fetchStockBatchQuotes(remaining))
      : [];
    let totalLot = 0, totalTl = 0;
    for (const s of heatmapStocks) { totalLot += s.volume || 0; totalTl += s.turnover || 0; }
    for (const q of remainingQuotes) {
      if (!q || q.price == null || q.volume == null) continue;
      totalLot += q.volume;
      totalTl += q.volume * q.price;
    }
    if (!document.getElementById('idxVolumeLot')) return;
    if (totalLot <= 0 && totalTl <= 0) {
      document.getElementById('idxVolumeLot').textContent = '—';
      document.getElementById('idxVolumeTl').textContent = '—';
    } else {
      document.getElementById('idxVolumeLot').textContent = fmtCompactLot(totalLot);
      document.getElementById('idxVolumeTl').textContent = fmtCompactTl(totalTl);
    }
  } catch (e) {
    if (document.getElementById('idxVolumeLot')) {
      document.getElementById('idxVolumeLot').textContent = '—';
      document.getElementById('idxVolumeTl').textContent = '—';
    }
  }
}

let analystRecommendationsCache = null;
let analystRecommendationsCacheTime = 0;
const ANALYST_RECOMMENDATIONS_TTL = 15 * 60 * 1000; // mobil ile AYNI (AnalystRecommendationsService._cacheTtl)

// DÜZELTME (2026-09, kullanıcı raporu: "analist tavsiyesi sayısı çok az" /
// "bazı hisselerde hiç tavsiye yok"): mobil uygulama (bkz.
// analyst_recommendations_service.dart) bu JSON'u her istekte zaman
// damgalı cache-busting ile çekiyor ki CDN/tarayıcı önbelleği ESKİ (daha
// az sayıda kayıt içeren) bir sürümü döndürmesin — web tarafı bunu
// yapmıyordu ve süre sınırı olmadan TÜM oturum boyunca ilk çekilen
// sürümü kullanıyordu. Artık mobille AYNI yöntem (cache-busting + 15
// dakikalık yenileme) kullanılıyor.
//
// DÜRÜSTLÜK NOTU: bu dosyanın kaynağı (mobil kodundaki kendi yorumunda
// da açıkça belirtildiği gibi) ücretsiz/otomatik bir analist verisi API'si
// DEĞİLDİR — aracı kurum raporları takip edilerek ELLE girilen tek bir
// JSON dosyasıdır (fintables.com ve benzeri siteler bu veriyi ücretsiz
// sunmuyor). Bu nedenle bazı hisselerde hiç tavsiye bulunmaması, veri
// kaynağının kendisinin doğal bir sınırlamasıdır — mobil uygulama da
// AYNI dosyayı kullandığından aynı sınırlamaya tabidir. Kapsamı
// genişletmek (yeni "kaynaklar" eklemek) veri uydurmak ya da ücretli bir
// servisi izinsiz kazımak anlamına geleceğinden yapılmamıştır; bkz.
// teslim raporu.
async function fetchAnalystRecommendations(symbol) {
  const isStale = analystRecommendationsCache === null ||
    (Date.now() - analystRecommendationsCacheTime) > ANALYST_RECOMMENDATIONS_TTL;
  if (isStale) {
    try {
      const res = await fetch(`${ANALYST_RECOMMENDATIONS_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        analystRecommendationsCache = await res.json();
        analystRecommendationsCacheTime = Date.now();
      } else if (analystRecommendationsCache === null) {
        analystRecommendationsCache = {};
      }
    } catch (e) {
      if (analystRecommendationsCache === null) analystRecommendationsCache = {};
    }
  }
  return analystRecommendationsCache[symbol] || analystRecommendationsCache[symbol?.toUpperCase()] || null;
}

async function openStockDetail(symbol) {
  const stockMeta = hisseCatalog.find(s => s.symbol === symbol) || { symbol, name: '' };
  openDetailModal(
    `${escapeHtml(symbol)} <span class="sub">${escapeHtml(stockMeta.name || '')}</span>`,
    `
    <div class="stat-mini-grid" id="stockDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Fiyat</div><div class="val" id="sdPrice">…</div></div>
      <div class="stat-mini"><div class="lbl">Günlük Değişim</div><div class="val" id="sdChange">…</div></div>
      <div class="stat-mini"><div class="lbl">Önceki Kapanış</div><div class="val" id="sdPrevClose">…</div></div>
      <div class="stat-mini"><div class="lbl">Gün İçi Düşük/Yüksek</div><div class="val" id="sdDayRange">…</div></div>
    </div>
    <div class="chart-range-row" id="stockRangeChips">
      ${Object.keys(YAHOO_CHART_RANGES).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="detailChartStock"></canvas></div>
    <div class="stat-mini-grid" id="stockPeriodStats"></div>
    ${technicalAnalysisButtonHtml('stockTaBtn')}

    <div class="detail-section-title">Şirket Bilgisi</div>
    <table class="kv-table" id="stockCompanyInfoTable">
      <tr><td>Şirket</td><td>…</td></tr>
    </table>

    <div class="detail-section-title">Temel Oranlar / Çarpanlar</div>
    <table class="kv-table" id="stockFundamentalsTable">
      <tr><td>F/K (Fiyat/Kazanç)</td><td>…</td></tr>
    </table>
    <p style="font-size:11.5px; color:var(--text-faint); margin-top:6px;">
      Kaynak: Yahoo Finance, İş Yatırım şirket kartı ve BIST sektör endeksi üyeliği.
      Bir alan görünmüyorsa o veri hiçbir kaynakta mevcut değildir (uydurulmamıştır).
      Tam KAP/İş Yatırım finansal tablo (gelir tablosu/bilanço)
      bu sürüme dahil değildir — bkz. teslim raporu, bilinen sınırlamalar.
    </p>

    <div class="detail-section-title">Temettü Geçmişi</div>
    <div id="stockDividendBlock"><div class="empty" style="padding:14px 0;">Yükleniyor…</div></div>
    <p style="font-size:11.5px; color:var(--text-faint); margin-top:6px;">
      Kaynak: Yahoo Finance geçmiş kurumsal aksiyon (temettü ödeme) kayıtları.
      "Temettü Verimi" satırı için birincil kaynak boşsa, buradaki gerçek
      ödemelerden hesaplanan son 12 aylık verim otomatik olarak kullanılır.
      Bu hisse için hiç ödeme kaydı yoksa, uydurma bir sayı göstermek yerine
      dürüstçe "kayıt bulunamadı" yazılır.
    </p>

    <div class="detail-section-title">Analist Tavsiyeleri</div>
    <div id="stockAnalystBlock"><div class="empty" style="padding:14px 0;">Yükleniyor…</div></div>
    `
  );
  bindTechnicalAnalysisButton('stockTaBtn', {
    title: symbol, assetType: 'stock', yahooSymbol: `${symbol}.IS`,
  });

  // PERFORMANS DÜZELTMESİ (2026-09, kullanıcı raporu: "veri akışı çok
  // yavaş, sayfalar geç açılıyor"): fiyat, gün içi mumlar, temel oranlar
  // ve analist tavsiyeleri birbirinden BAĞIMSIZ 4 ayrı veri kaynağıdır —
  // önceden dördü de SIRAYLA (biri bitmeden diğeri başlamadan) çekiliyordu,
  // bu da modalın tam dolmasını (özellikle stock-fundamentals'ın kendi
  // içinde birden fazla dış kaynağı sırayla deneyebildiği durumlarda)
  // gereksiz yere saniyelerce geciktiriyordu. Artık dördü de AYNI ANDA
  // başlatılıyor; hiçbir veri/davranış değişmedi, yalnızca ZAMANLAMA
  // paralelleşti (toplam bekleme artık sürelerin TOPLAMI değil, en YAVAŞ
  // olanı kadar).
  const quotePromise = fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(symbol)}`).catch(() => null);
  const todayPointsPromise = fetchYahooRangeSeries(`${symbol}.IS`, '1G').catch(() => []);
  const fxPromise = cachedFetch(`fund:${symbol}`, 6 * 3600 * 1000, () =>
    fetchPriceProxy(`type=stock-fundamentals&symbol=${encodeURIComponent(symbol)}`)).catch(() => null);
  const recPromise = fetchAnalystRecommendations(symbol).catch(() => null);
  // YENİ (kullanıcı raporu: "temettü verimi yazan kısım hala boş ayrıntılı
  // yıllık temettü gösterelim"): gerçek geçmiş temettü ödeme kayıtları +
  // bunlardan hesaplanan trailing-12-ay verim (bkz. price-proxy'deki
  // getStockDividendEvents yorumu — Yahoo v8/finance/chart, events=div).
  const dividendsPromise = cachedFetch(`div:${symbol}`, 6 * 3600 * 1000, () =>
    fetchPriceProxy(`type=stock-dividends&symbol=${encodeURIComponent(symbol)}`)).catch(() => null);

  bindChartRangeChips(document.getElementById('stockRangeChips'), '1A', async (rangeKey) => {
    const statsEl = document.getElementById('stockPeriodStats');
    try {
      const points = await fetchYahooRangeSeries(`${symbol}.IS`, rangeKey);
      renderPriceChart('detailChartStock', points);
      const stats = periodStatsFromPoints(points);
      statsEl.innerHTML = stats ? `
        <div class="stat-mini"><div class="lbl">Dönem Düşük</div><div class="val">${fmtNumber(stats.low)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Yüksek</div><div class="val">${fmtNumber(stats.high)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Değişimi</div><div class="val">${changeChipHtml(stats.changePercent)}</div></div>
      ` : `<div class="stat-mini"><div class="lbl">Veri yok</div><div class="val">—</div></div>`;
    } catch (e) {
      statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Veri alınamadı</div><div class="val">—</div></div>`;
    }
  });

  const quote = await quotePromise;
  if (quote) {
    document.getElementById('sdPrice').textContent = fmtTL(quote.price);
    document.getElementById('sdChange').innerHTML = changeChipHtml(quote.changePercent);
    document.getElementById('sdPrevClose').textContent = naIfMissing(quote.previousClose, fmtTL);
  } else {
    document.getElementById('sdPrice').textContent = '—';
    document.getElementById('sdChange').textContent = '—';
    document.getElementById('sdPrevClose').textContent = '—';
  }

  // Gün içi düşük/yüksek: bugünkü 5 dakikalık mumlardan türetilir
  // (gerçek veri; taban/tavan bant bilgisi hisseye göre değişebildiği
  // için burada uydurulmaz, gösterilmez).
  const todayPoints = await todayPointsPromise;
  const highs = todayPoints.map(p => p.h).filter(Number.isFinite);
  const lows = todayPoints.map(p => p.l).filter(Number.isFinite);
  if (highs.length && lows.length) {
    document.getElementById('sdDayRange').textContent =
      `${fmtNumber(Math.min(...lows))} / ${fmtNumber(Math.max(...highs))}`;
  } else {
    document.getElementById('sdDayRange').textContent = '—';
  }

  const fx = await fxPromise;
  const dividends = await dividendsPromise;
  if (fx) {
    const pct = v => v == null ? '—' : `%${fmtPercent(v * 100, 2)}`;
    // DÜZELTME (kullanıcı raporu: "temettü verimi yazan kısım hala boş"):
    // birincil kaynak (Yahoo v7/v10 veya İş Yatırım etiket taraması) boşsa,
    // gerçek geçmiş temettü ödemelerinden (v8/finance/chart, events=div)
    // hesaplanan son 12 aylık verim yedek olarak kullanılır — ikisi de
    // yoksa dürüstçe "—" kalır, uydurma bir sayı üretilmez.
    const dividendYieldMerged = fx.dividendYield != null
      ? fx.dividendYield
      : (dividends && dividends.trailingYield != null ? dividends.trailingYield : null);
    document.getElementById('stockFundamentalsTable').innerHTML = `
      <tr><td>F/K (Fiyat/Kazanç)</td><td>${naIfMissing(fx.trailingPE, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>PD/DD (Piyasa Değeri/Defter Değeri)</td><td>${naIfMissing(fx.priceToBook, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>FD/FAVÖK</td><td>${naIfMissing(fx.evEbitda, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>FD/Satışlar</td><td>${naIfMissing(fx.evSales, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>Piyasa Değeri</td><td>${naIfMissing(fx.marketCap, v => fmtTL(v))}</td></tr>
      <tr><td>Temettü Verimi</td><td>${pct(dividendYieldMerged)}</td></tr>
      <tr><td>52 Hafta Aralığı</td><td>${naIfMissing(fx.fiftyTwoWeekLow, fmtNumber)} / ${naIfMissing(fx.fiftyTwoWeekHigh, fmtNumber)}</td></tr>
      <tr><td>Özkaynak Kârlılığı (ROE)</td><td>${pct(fx.returnOnEquity)}</td></tr>
      <tr><td>Net Kâr Marjı</td><td>${pct(fx.profitMargins)}</td></tr>
      <tr><td>Son Yıllık Satışlar</td><td>${naIfMissing(fx.recentRevenue, v => fmtTL(v))}</td></tr>
      <tr><td>Son Yıllık Net Kâr</td><td>${naIfMissing(fx.recentNetProfit, v => fmtTL(v))}</td></tr>
      <tr><td>Hisse Başı Kazanç (EPS, TTM)</td><td>${naIfMissing(fx.epsTrailingTwelveMonths, fmtNumber)}</td></tr>
      <tr><td>Beta</td><td>${naIfMissing(fx.beta, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>Net Borç</td><td>${naIfMissing(fx.netDebt, v => fmtTL(v))}</td></tr>
      <tr><td>Borç/Özkaynak (D/E)</td><td>${naIfMissing(fx.debtToEquity, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>Cari Oran</td><td>${naIfMissing(fx.currentRatio, v => fmtDecimal(v, 2))}</td></tr>
      <tr><td>Halka Açıklık Oranı</td><td>${naIfMissing(fx.freeFloatPercent, v => '%' + fmtPercent(v, 2))}</td></tr>
      <tr><td>Yabancı Oranı</td><td>${naIfMissing(fx.foreignOwnershipPercent, v => '%' + fmtPercent(v, 2))}</td></tr>
      <tr><td>Son Bilanço Tarihi</td><td>${naIfMissing(fx.mostRecentQuarter, v => new Date(v * 1000).toLocaleDateString('tr-TR'))}</td></tr>
    `;
    // DÜZELTME (2026-09, kullanıcı raporu: "Şirket Bilgisi'nde eksik
    // alanlar var"): Yahoo'nun v7/v10 uçları bu ortamdan engellendiği
    // için Şirket Adı ve Sektör her zaman "—" kalıyordu — oysa ikisi de
    // uygulamanın ZATEN sahip olduğu, uydurulmamış gerçek verilerden
    // doldurulabilir: Şirket Adı için hisse kataloğundaki (hisseCatalog/
    // BIST_STOCKS_475 — tüm uygulamada zaten aynı isim gösteriliyor)
    // kayıtlı ünvan; Sektör için BIST'in kendi resmi sektör endeksi
    // üyeliği (BIST_INDEX_CONSTITUENTS — Borsa İstanbul'un gerçek sektör
    // sınıflandırması, bu uygulamanın "Sektör Endeksleri" bölümünde zaten
    // kullanılıyor). Alt Sektör/Endüstri, Temettü Verimi, Beta, Borç/
    // Özkaynak, Cari Oran ve Son Bilanço Tarihi için GERÇEK bir alternatif
    // kaynak bulunamadı (bu alanlar yalnızca Yahoo'nun engellenen v10/
    // quoteSummary'sinden gelir) — bunlar dürüstçe "—" bırakılır, bkz.
    // teslim raporu.
    document.getElementById('stockCompanyInfoTable').innerHTML = `
      <tr><td>Şirket Adı</td><td>${escapeHtml(fx.longName || stockMeta.name || '—')}</td></tr>
      <tr><td>Kod</td><td>${escapeHtml(symbol)}</td></tr>
      <tr><td>Sektör</td><td>${escapeHtml(fx.sector || deriveSectorForSymbol(symbol) || '—')}</td></tr>
      <tr><td>Alt Sektör / Endüstri</td><td>${naIfMissing(fx.industry, v => escapeHtml(v))}</td></tr>
      <tr><td>Açılış</td><td>${naIfMissing(fx.open, v => fmtTL(v))}</td></tr>
      <tr><td>Önceki Kapanış</td><td>${naIfMissing(fx.previousClose, v => fmtTL(v))}</td></tr>
      <tr><td>Gün İçi Düşük/Yüksek</td><td>${naIfMissing(fx.dayLow, v => fmtNumber(v))} / ${naIfMissing(fx.dayHigh, v => fmtNumber(v))}</td></tr>
      <tr><td>Hacim</td><td>${naIfMissing(fx.volume, v => fmtNumber(v))}</td></tr>
    `;
  } else {
    document.getElementById('stockFundamentalsTable').innerHTML = `<tr><td colspan="2">Veri alınamadı.</td></tr>`;
    document.getElementById('stockCompanyInfoTable').innerHTML = `
      <tr><td>Şirket Adı</td><td>${escapeHtml(stockMeta.name || '—')}</td></tr>
      <tr><td>Kod</td><td>${escapeHtml(symbol)}</td></tr>
      <tr><td>Sektör</td><td>${escapeHtml(deriveSectorForSymbol(symbol) || '—')}</td></tr>
    `;
  }

  // YENİ (kullanıcı raporu: "ayrıntılı yıllık temettü gösterelim"): gerçek
  // ödeme kayıtları yıla göre gruplanır (en yeni yıl en üstte), her yılın
  // toplamı ve o yıl içindeki tek tek ödeme tarihleri/tutarları gösterilir.
  // Bu bölüm fx'ten (Temel Oranlar) BAĞIMSIZDIR — fx başarısız olsa bile
  // temettü geçmişi kendi kaynağından ayrıca gösterilebilir.
  const dividendBlock = document.getElementById('stockDividendBlock');
  if (dividendBlock) {
    const events = (dividends && Array.isArray(dividends.events)) ? dividends.events : [];
    if (events.length === 0) {
      dividendBlock.innerHTML = `<div class="empty" style="padding:14px 0;">Bu hisse için temettü ödeme kaydı bulunamadı (Yahoo Finance geçmiş verisinde kurumsal aksiyon bilgisi yok ya da hisse hiç temettü dağıtmamış olabilir).</div>`;
    } else {
      const byYear = new Map();
      events.forEach(ev => {
        const year = new Date(ev.t).getFullYear();
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(ev);
      });
      const years = Array.from(byYear.keys()).sort((a, b) => b - a);
      dividendBlock.innerHTML = years.map(year => {
        const yearEvents = byYear.get(year).slice().sort((a, b) => b.t - a.t);
        const yearTotal = yearEvents.reduce((acc, e) => acc + e.amount, 0);
        const rows = yearEvents.map(e =>
          `<tr><td>${new Date(e.t).toLocaleDateString('tr-TR')}</td><td>${fmtNumber(e.amount)} ₺/hisse</td></tr>`
        ).join('');
        return `
          <div class="dividend-year-block">
            <div class="dividend-year-title">${year} — Toplam: ${fmtNumber(yearTotal)} ₺/hisse</div>
            <table class="kv-table">${rows}</table>
          </div>
        `;
      }).join('');
    }
  }

  const rec = await recPromise;
  const block = document.getElementById('stockAnalystBlock');
  if (!rec || (Array.isArray(rec) && rec.length === 0)) {
    block.innerHTML = `<div class="empty" style="padding:14px 0;">Bu hisse için analist tavsiyesi bulunamadı.</div>`;
  } else {
    // DÜZELTME (2026-09, tam parite denetimi): mobildeki AnalystRecommendation
    // modelinde olan `date` (tavsiye tarihi) ve `modelPortfolio` (model
    // portföyde mi) alanları çekiliyordu ama tabloda hiç GÖSTERİLMİYORDU;
    // ayrıca mobildeki gibi bir üst özet (ortalama hedef fiyat, min/maks)
    // yoktu. İkisi de mobilin AynıŞema'sına göre eklendi (bkz.
    // analyst_recommendation.dart: bank/recommendation/targetPrice/date/
    // modelPortfolio).
    const RECO_LABELS = { al: 'AL', sat: 'SAT', tut: 'TUT', endeks_ustu: 'Endeks Üstü', endekse_paralel: 'Endekse Paralel' };
    const list = Array.isArray(rec) ? rec : (rec.recommendations || []);
    const targets = list.map(r => Number(r.targetPrice)).filter(Number.isFinite);
    const summaryHtml = targets.length > 0 ? `
      <div class="stat-mini-grid" style="margin-bottom:8px;">
        <div class="stat-mini"><div class="lbl">Ortalama Hedef</div><div class="val">${fmtTL(targets.reduce((a, b) => a + b, 0) / targets.length)}</div></div>
        <div class="stat-mini"><div class="lbl">En Düşük / En Yüksek Hedef</div><div class="val">${fmtTL(Math.min(...targets))} / ${fmtTL(Math.max(...targets))}</div></div>
        <div class="stat-mini"><div class="lbl">Tavsiye Sayısı</div><div class="val">${list.length}</div></div>
      </div>` : '';
    block.innerHTML = summaryHtml + `<table class="kv-table">${list.map(r => {
      const label = RECO_LABELS[(r.recommendation || r.tavsiye || '').toLowerCase()] || (r.recommendation || r.tavsiye || '');
      const dateText = r.date ? new Date(r.date).toLocaleDateString('tr-TR') : '';
      const modelBadge = r.modelPortfolio ? ' <span class="chip pos" style="font-size:10.5px;">Model Portföyde</span>' : '';
      return `<tr><td>${escapeHtml(r.bank || r.brokerage || r.kurum || '')}${dateText ? `<div class="name">${escapeHtml(dateText)}</div>` : ''}</td><td>${escapeHtml(label)}${r.targetPrice || r.hedef_fiyat ? ' · Hedef: ' + fmtTL(r.targetPrice || r.hedef_fiyat) : ''}${modelBadge}</td></tr>`;
    }).join('')}</table>`;
  }
}

registerPageLoader('hisse', loadHisseMarketPage);
