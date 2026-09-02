/* ==================================================================
 * app-piyasa-kripto.js
 * "Varlıklar → Kripto Paralar": piyasa değerine göre ilk 100 kripto
 * para (mobildeki crypto_screen.dart + crypto_detail_screen.dart'ın
 * web karşılığı — CoinGecko CORS-açık olduğu için Edge Function'a
 * gerek yok, mobille birebir aynı kaynak). Kullanıcının KENDİ kripto
 * portföyü "Varlığım" menüsünde (app-varligim.js).
 * ================================================================== */

// Mobil crypto_detail_screen.dart'taki _periods haritasıyla BİREBİR
// aynı (1G/7G/1A/3A/1Y) — CoinGecko'nun ücretsiz katmanı bunun ötesinde
// güvenilir aralık desteklemediğinden, diğer varlık sınıflarındaki
// 1A/3A/6A/YBB/1Y/3Y/5Y seti burada UYGULANMADI (mobille birebir aynı
// kalması tercih edildi — şeffaflık için not ediliyor).
const KRIPTO_RANGE_DAYS = { '1G': 1, '7G': 7, '1A': 30, '3A': 90, '1Y': 365 };

/**
 * Mobildeki CryptoService.getOhlcHistory() ile AYNI CoinGecko
 * `/coins/{id}/ohlc` ucu — gerçek OHLC mum verisi döner (hacim bu uç
 * noktada hiç yoktur, mobil de bunu 0/null bırakır — uydurulmaz).
 */
async function fetchCryptoOhlcSeries(id, days) {
  const data = await cachedFetch(`crypto-ohlc:${id}:${days}`, 60000, async () => {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/ohlc?vs_currency=try&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  if (!Array.isArray(data)) return [];
  return data
    .filter(row => Array.isArray(row) && row.length >= 5)
    .map(row => ({ t: row[0], o: row[1], h: row[2], l: row[3], c: row[4], v: null }));
}

let kriptoMarketList = [];
let kriptoFilterText = '';

async function fetchKriptoMarkets() {
  return cachedFetch('crypto-markets-100', 60000, async () => {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko hatası: HTTP ${res.status}`);
    return res.json();
  });
}

function filteredKriptoList() {
  const q = kriptoFilterText.trim().toLocaleUpperCase('tr-TR');
  if (!q) return kriptoMarketList;
  return kriptoMarketList.filter(c =>
    (c.symbol || '').toLocaleUpperCase('tr-TR').includes(q) ||
    (c.name || '').toLocaleUpperCase('tr-TR').includes(q)
  );
}

function renderKriptoList() {
  const tbody = document.getElementById('kriptoMarketBody');
  const emptyState = document.getElementById('kriptoMarketEmptyState');
  const filtered = filteredKriptoList();
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>${favoriteStarHtml('kripto', c.id, { name: c.name, price: c.current_price, changePercent: c.price_change_percentage_24h })}</td>
      <td class="market-row-logo">${c.image ? `<span class="logo-slot" style="width:26px;height:26px;"><img class="logo-img" src="${escapeHtml(c.image)}" alt="" width="26" height="26" loading="lazy" onerror="this.parentElement.outerHTML='${letterAvatarHtml((c.symbol || '?'), 26).replace(/'/g, "\\'")}';" /></span>` : letterAvatarHtml((c.symbol || '?'), 26)}</td>
      <td>
        <div class="sym">${escapeHtml((c.symbol || '').toUpperCase())}</div>
        <div class="name">${escapeHtml(c.name || '')}</div>
      </td>
      <td class="num">${fmtTL(c.current_price)}</td>
      <td class="num">${changeChipHtml(c.price_change_percentage_24h)}</td>
      <td class="num"><button type="button" class="detail-btn" data-open-crypto="${escapeHtml(c.id)}">Detay</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-open-crypto]').forEach(btn => {
    btn.addEventListener('click', () => openCryptoDetail(btn.dataset.openCrypto));
  });
}

async function loadKriptoMarketPage() {
  const emptyState = document.getElementById('kriptoMarketEmptyState');
  try {
    kriptoMarketList = await fetchKriptoMarkets();
    renderKriptoList();
  } catch (e) {
    kriptoMarketList = [];
    document.getElementById('kriptoMarketBody').innerHTML = '';
    emptyState.style.display = 'block';
    emptyState.textContent = 'Kripto piyasa verisi şu anda alınamıyor.';
  }
}

document.getElementById('kriptoSearchInput').addEventListener('input', debounce((e) => {
  kriptoFilterText = e.target.value;
  renderKriptoList();
}, 200));

async function openCryptoDetail(id) {
  const meta = kriptoMarketList.find(c => c.id === id) || { id, name: id, symbol: '' };
  openDetailModal(
    `${escapeHtml((meta.symbol || '').toUpperCase())} <span class="sub">${escapeHtml(meta.name || '')}</span>`,
    `
    <div class="stat-mini-grid" id="cryptoDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Fiyat</div><div class="val">${naIfMissing(meta.current_price, fmtTL)}</div></div>
      <div class="stat-mini"><div class="lbl">24s Değişim</div><div class="val">${changeChipHtml(meta.price_change_percentage_24h)}</div></div>
      <div class="stat-mini"><div class="lbl">Piyasa Değeri</div><div class="val">${naIfMissing(meta.market_cap, fmtTL)}</div></div>
      <div class="stat-mini"><div class="lbl">24s Hacim</div><div class="val">${naIfMissing(meta.total_volume, fmtTL)}</div></div>
      <div class="stat-mini"><div class="lbl">24s Düşük/Yüksek</div><div class="val">${naIfMissing(meta.low_24h, fmtTL)} / ${naIfMissing(meta.high_24h, fmtTL)}</div></div>
    </div>
    <div class="chart-range-row" id="cryptoRangeChips">
      ${Object.keys(KRIPTO_RANGE_DAYS).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="detailChartCrypto"></canvas></div>
    <div class="stat-mini-grid" id="cryptoPeriodStats"></div>
    ${technicalAnalysisButtonHtml('cryptoTaBtn')}
    `
  );
  bindTechnicalAnalysisButton('cryptoTaBtn', {
    title: `${(meta.symbol || '').toUpperCase()} — ${meta.name || ''}`, assetType: 'crypto', cryptoId: id,
  });

  bindChartRangeChips(document.getElementById('cryptoRangeChips'), '1A', async (rangeKey) => {
    const days = KRIPTO_RANGE_DAYS[rangeKey] || 30;
    const statsEl = document.getElementById('cryptoPeriodStats');
    try {
      const points = await fetchCryptoOhlcSeries(id, days);
      renderPriceChart('detailChartCrypto', points);
      const stats = periodStatsFromPoints(points);
      statsEl.innerHTML = stats ? `
        <div class="stat-mini"><div class="lbl">Dönem Düşük</div><div class="val">${fmtTL(stats.low)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Yüksek</div><div class="val">${fmtTL(stats.high)}</div></div>
        <div class="stat-mini"><div class="lbl">Dönem Değişimi</div><div class="val">${changeChipHtml(stats.changePercent)}</div></div>
      ` : `<div class="stat-mini"><div class="lbl">Veri yok</div><div class="val">—</div></div>`;
    } catch (e) {
      statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Veri alınamadı</div><div class="val">—</div></div>`;
    }
  });
}

registerPageLoader('kripto', loadKriptoMarketPage);
