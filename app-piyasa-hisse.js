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

async function renderHisseList() {
  const tbody = document.getElementById('hisseMarketBody');
  const emptyState = document.getElementById('hisseMarketEmptyState');
  const loadMoreBtn = document.getElementById('hisseLoadMoreBtn');
  if (!tbody) return;
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
    `
  );
  try {
    const quote = await fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(code)}`);
    document.getElementById('idxDetailPrice').textContent = fmtNumber(quote.price);
    document.getElementById('idxDetailChange').innerHTML = changeChipHtml(quote.changePercent);
  } catch (e) {
    document.getElementById('idxDetailPrice').textContent = '—';
    document.getElementById('idxDetailChange').textContent = '—';
  }
  bindChartRangeChips(document.getElementById('indexRangeChips'), '1A', async (rangeKey) => {
    const statsEl = document.getElementById('indexPeriodStats');
    try {
      const points = await fetchYahooRangeSeries(`${code}.IS`, rangeKey);
      renderSeriesChart('detailChartIndex', points);
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
}

let analystRecommendationsCache = null;
async function fetchAnalystRecommendations(symbol) {
  if (analystRecommendationsCache === null) {
    try {
      const res = await fetch(ANALYST_RECOMMENDATIONS_URL);
      analystRecommendationsCache = res.ok ? await res.json() : {};
    } catch (e) {
      analystRecommendationsCache = {};
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

    <div class="detail-section-title">Temel Oranlar / Çarpanlar</div>
    <table class="kv-table" id="stockFundamentalsTable">
      <tr><td>F/K (Fiyat/Kazanç)</td><td>…</td></tr>
    </table>
    <p style="font-size:11.5px; color:var(--text-faint); margin-top:6px;">
      Kaynak: Yahoo Finance. Bir alan görünmüyorsa o veri kaynakta mevcut değildir
      (uydurulmamıştır). Tam KAP/İş Yatırım finansal tablo (gelir tablosu/bilanço)
      bu sürüme dahil değildir — bkz. teslim raporu, bilinen sınırlamalar.
    </p>

    <div class="detail-section-title">Analist Tavsiyeleri</div>
    <div id="stockAnalystBlock"><div class="empty" style="padding:14px 0;">Yükleniyor…</div></div>
    `
  );

  try {
    const quote = await fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(symbol)}`);
    document.getElementById('sdPrice').textContent = fmtTL(quote.price);
    document.getElementById('sdChange').innerHTML = changeChipHtml(quote.changePercent);
    document.getElementById('sdPrevClose').textContent = naIfMissing(quote.previousClose, fmtTL);
  } catch (e) {
    document.getElementById('sdPrice').textContent = '—';
    document.getElementById('sdChange').textContent = '—';
    document.getElementById('sdPrevClose').textContent = '—';
  }

  // Gün içi düşük/yüksek: bugünkü 5 dakikalık mumlardan türetilir
  // (gerçek veri; taban/tavan bant bilgisi hisseye göre değişebildiği
  // için burada uydurulmaz, gösterilmez).
  try {
    const todayPoints = await fetchYahooRangeSeries(`${symbol}.IS`, '1G');
    const highs = todayPoints.map(p => p.h).filter(Number.isFinite);
    const lows = todayPoints.map(p => p.l).filter(Number.isFinite);
    if (highs.length && lows.length) {
      document.getElementById('sdDayRange').textContent =
        `${fmtNumber(Math.min(...lows))} / ${fmtNumber(Math.max(...highs))}`;
    } else {
      document.getElementById('sdDayRange').textContent = '—';
    }
  } catch (e) {
    document.getElementById('sdDayRange').textContent = '—';
  }

  bindChartRangeChips(document.getElementById('stockRangeChips'), '1A', async (rangeKey) => {
    const statsEl = document.getElementById('stockPeriodStats');
    try {
      const points = await fetchYahooRangeSeries(`${symbol}.IS`, rangeKey);
      renderSeriesChart('detailChartStock', points);
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

  try {
    const fx = await cachedFetch(`fund:${symbol}`, 6 * 3600 * 1000, () =>
      fetchPriceProxy(`type=stock-fundamentals&symbol=${encodeURIComponent(symbol)}`));
    const pct = v => v == null ? '—' : `%${(v * 100).toFixed(2)}`;
    document.getElementById('stockFundamentalsTable').innerHTML = `
      <tr><td>F/K (Fiyat/Kazanç)</td><td>${naIfMissing(fx.trailingPE, v => v.toFixed(2))}</td></tr>
      <tr><td>PD/DD (Piyasa Değeri/Defter Değeri)</td><td>${naIfMissing(fx.priceToBook, v => v.toFixed(2))}</td></tr>
      <tr><td>Piyasa Değeri</td><td>${naIfMissing(fx.marketCap, v => fmtTL(v))}</td></tr>
      <tr><td>Temettü Verimi</td><td>${pct(fx.dividendYield)}</td></tr>
      <tr><td>52 Hafta Aralığı</td><td>${naIfMissing(fx.fiftyTwoWeekLow, v => v.toFixed(2))} / ${naIfMissing(fx.fiftyTwoWeekHigh, v => v.toFixed(2))}</td></tr>
      <tr><td>Özkaynak Kârlılığı (ROE)</td><td>${pct(fx.returnOnEquity)}</td></tr>
      <tr><td>Net Kâr Marjı</td><td>${pct(fx.profitMargins)}</td></tr>
      <tr><td>Hisse Başı Kazanç (EPS, TTM)</td><td>${naIfMissing(fx.epsTrailingTwelveMonths, v => v.toFixed(2))}</td></tr>
      <tr><td>Beta</td><td>${naIfMissing(fx.beta, v => v.toFixed(2))}</td></tr>
    `;
  } catch (e) {
    document.getElementById('stockFundamentalsTable').innerHTML = `<tr><td colspan="2">Veri alınamadı.</td></tr>`;
  }

  try {
    const rec = await fetchAnalystRecommendations(symbol);
    const block = document.getElementById('stockAnalystBlock');
    if (!rec || (Array.isArray(rec) && rec.length === 0)) {
      block.innerHTML = `<div class="empty" style="padding:14px 0;">Bu hisse için analist tavsiyesi bulunamadı.</div>`;
    } else {
      const list = Array.isArray(rec) ? rec : (rec.recommendations || []);
      block.innerHTML = `<table class="kv-table">${list.map(r => `
        <tr><td>${escapeHtml(r.bank || r.brokerage || r.kurum || '')}</td><td>${escapeHtml(r.recommendation || r.tavsiye || '')}${r.targetPrice || r.hedef_fiyat ? ' · Hedef: ' + fmtTL(r.targetPrice || r.hedef_fiyat) : ''}</td></tr>
      `).join('')}</table>`;
    }
  } catch (e) {
    document.getElementById('stockAnalystBlock').innerHTML = `<div class="empty" style="padding:14px 0;">Analist verisi alınamadı.</div>`;
  }
}

registerPageLoader('hisse', loadHisseMarketPage);
