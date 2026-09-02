/* ==================================================================
 * app-piyasa-emtia.js
 * "Varlıklar → Emtialar": PİYASA fiyat listesi (mobildeki
 * commodity_overview_screen.dart + commodity_detail_screen.dart ile
 * aynı mantık). Bu, kullanıcının KENDİ emtia varlıkları DEĞİL — o
 * "Varlığım" menüsünde (app-varligim.js).
 *
 * GÜNCELLEME: mobildeki 5 fiziki altın sikkesi (22 Ayar/Çeyrek/Yarım/
 * Tam/Ata Altın) artık DAHİL — mobil kaynak incelemesinde bunların
 * mobilde de AYNI turkpidya kaynağından (StockPriceService.
 * getGoldCoinPrices, Tam/Yarım için %25 sapma düzeltmesiyle) geldiği
 * görüldü; price-proxy'ye aynı mantıkla eklendi (bkz. index.ts
 * getGoldCoinPrices). Önceki sürümde bu sikkeler "doğrulanamadı"
 * gerekçesiyle dışarıda bırakılmıştı — bu, mobil kaynağın daha
 * derinlemesine incelenmesiyle düzeltilen bir eksiklikti.
 * ================================================================== */

const COMMODITY_MARKET_ITEMS = [
  { key: 'GOLD', name: 'Altın (Has/24 Ayar)', unit: 'gram', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'GOLD_ONS_USD', name: 'Ons Altın', unit: 'ons', currency: 'USD', yahooSymbol: 'GC=F', isReference: false },
  { key: 'GOLD_22K', name: '22 Ayar Altın', unit: 'gram', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'GOLD_CEYREK', name: 'Çeyrek Altın', unit: 'adet', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'GOLD_YARIM', name: 'Yarım Altın', unit: 'adet', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'GOLD_TAM', name: 'Tam Altın', unit: 'adet', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'GOLD_ATA', name: 'Ata Altın', unit: 'adet', currency: 'TRY', yahooSymbol: 'GC=F', isReference: true },
  { key: 'SILVER', name: 'Gümüş', unit: 'gram', currency: 'TRY', yahooSymbol: 'SI=F', isReference: true },
  { key: 'SILVER_ONS_USD', name: 'Ons Gümüş', unit: 'ons', currency: 'USD', yahooSymbol: 'SI=F', isReference: false },
  { key: 'COPPER', name: 'Bakır', unit: 'kg', currency: 'TRY', yahooSymbol: 'HG=F', isReference: true },
  { key: 'PLATINUM', name: 'Platin', unit: 'gram', currency: 'TRY', yahooSymbol: 'PL=F', isReference: true },
  { key: 'PLATINUM_ONS_USD', name: 'Ons Platin', unit: 'ons', currency: 'USD', yahooSymbol: 'PL=F', isReference: false },
  { key: 'PALLADIUM', name: 'Paladyum', unit: 'gram', currency: 'TRY', yahooSymbol: 'PA=F', isReference: true },
  { key: 'PALLADIUM_ONS_USD', name: 'Ons Paladyum', unit: 'ons', currency: 'USD', yahooSymbol: 'PA=F', isReference: false },
  { key: 'BRENT', name: 'Brent Petrol', unit: 'varil', currency: 'TRY', yahooSymbol: 'BZ=F', isReference: true },
  { key: 'BRENT_USD', name: 'Brent Petrol', unit: 'varil', currency: 'USD', yahooSymbol: 'BZ=F', isReference: false }
];

function commodityFmt(item) {
  return item.currency === 'USD' ? fmtUSD : fmtTL;
}

async function loadEmtiaMarketPage() {
  const tbody = document.getElementById('emtiaMarketBody');
  const emptyState = document.getElementById('emtiaMarketEmptyState');
  if (!tbody) return;
  tbody.innerHTML = COMMODITY_MARKET_ITEMS.map(item => `
    <tr data-commodity-key="${item.key}">
      <td>${favoriteStarHtml('emtia', item.key, { name: item.name })}</td>
      <td class="market-row-logo">${commodityIconSvg(item.key, 26)}</td>
      <td>
        <div class="sym">${escapeHtml(item.name)}</div>
        <div class="name">${escapeHtml(item.unit)} · ${item.currency}</div>
      </td>
      <td class="num" id="emtia-price-${item.key}">…</td>
      <td class="num" id="emtia-chg-${item.key}">…</td>
      <td class="num"><button type="button" class="detail-btn" data-open-commodity="${item.key}">Detay</button></td>
    </tr>
  `).join('');
  emptyState.style.display = 'none';

  tbody.querySelectorAll('[data-open-commodity]').forEach(btn => {
    btn.addEventListener('click', () => openCommodityDetail(btn.dataset.openCommodity));
  });

  let anySuccess = false;
  await Promise.all(COMMODITY_MARKET_ITEMS.map(async (item) => {
    const priceEl = document.getElementById(`emtia-price-${item.key}`);
    const chgEl = document.getElementById(`emtia-chg-${item.key}`);
    try {
      const quote = await cachedFetch(`commodity:${item.key}`, 30000, () =>
        fetchPriceProxy(`type=commodity&key=${encodeURIComponent(item.key)}`));
      priceEl.textContent = commodityFmt(item)(quote.price);
      chgEl.innerHTML = changeChipHtml(quote.changePercent);
      anySuccess = true;
    } catch (e) {
      priceEl.textContent = '—';
      chgEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
  if (!anySuccess) emptyState.style.display = 'block';
}

async function openCommodityDetail(key) {
  const item = COMMODITY_MARKET_ITEMS.find(c => c.key === key);
  if (!item) return;
  const fmt = commodityFmt(item);

  openDetailModal(
    `${escapeHtml(item.name)} <span class="sub">${escapeHtml(item.unit)} · ${item.currency}</span>`,
    `
    <div class="stat-mini-grid" id="commodityDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Fiyat</div><div class="val" id="cdPrice">…</div></div>
      <div class="stat-mini"><div class="lbl">Günlük Değişim</div><div class="val" id="cdChange">…</div></div>
    </div>
    <div class="chart-range-row" id="commodityRangeChips">
      ${Object.keys(YAHOO_CHART_RANGES).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="detailChartCommodity"></canvas></div>
    <div class="stat-mini-grid" id="commodityPeriodStats"></div>
    ${item.isReference ? `<p style="font-size:12px; color:var(--text-faint); margin-top:10px;">
      Not: Bu grafik, ${escapeHtml(item.name.toLowerCase())} için uluslararası referans göstergesi olan
      USD vadeli işlem fiyatının (${escapeHtml(item.yahooSymbol)}) geçmiş seyrini gösterir. TL fiyatının
      kendi geçmiş verisi mevcut olmadığından uydurulmamıştır; yön ve dalgalanma USD seriyle büyük ölçüde
      örtüşür, seviye USD/TRY değişimine göre farklılık gösterebilir.</p>` : ''}
    ${technicalAnalysisButtonHtml('commodityTaBtn')}
    `
  );
  bindTechnicalAnalysisButton('commodityTaBtn', {
    title: item.name, assetType: 'commodity', yahooSymbol: item.yahooSymbol,
  });

  try {
    const quote = await fetchPriceProxy(`type=commodity&key=${encodeURIComponent(key)}`);
    document.getElementById('cdPrice').textContent = fmt(quote.price);
    document.getElementById('cdChange').innerHTML = changeChipHtml(quote.changePercent);
  } catch (e) {
    document.getElementById('cdPrice').textContent = '—';
    document.getElementById('cdChange').textContent = '—';
  }

  bindChartRangeChips(document.getElementById('commodityRangeChips'), '1A', async (rangeKey) => {
    const statsEl = document.getElementById('commodityPeriodStats');
    statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Yükleniyor…</div><div class="val">…</div></div>`;
    try {
      const points = await fetchYahooRangeSeries(item.yahooSymbol, rangeKey);
      renderPriceChart('detailChartCommodity', points);
      const stats = periodStatsFromPoints(points);
      if (stats) {
        statsEl.innerHTML = `
          <div class="stat-mini"><div class="lbl">Dönem Düşük</div><div class="val">${naIfMissing(stats.low, fmtNumber)}</div></div>
          <div class="stat-mini"><div class="lbl">Dönem Yüksek</div><div class="val">${naIfMissing(stats.high, fmtNumber)}</div></div>
          <div class="stat-mini"><div class="lbl">Dönem Değişimi</div><div class="val">${changeChipHtml(stats.changePercent)}</div></div>
        `;
      } else {
        statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Dönem verisi</div><div class="val">—</div></div>`;
      }
    } catch (e) {
      statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Veri alınamadı</div><div class="val">—</div></div>`;
    }
  });
}

registerPageLoader('emtia', loadEmtiaMarketPage);
