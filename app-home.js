/* ==================================================================
 * app-home.js
 * Ana Sayfa: Toplam Net Varlık hero kartı, kategori özet kartları,
 * Piyasalar mini bölümü ve aylık bütçe özeti.
 * Tüm hesaplamalar mevcut Supabase tabloları ve price-proxy
 * uç noktaları üzerinden, eski loadSummary() mantığı genişletilerek
 * yapılır (kural: mevcut hesaplama mantığını bozma).
 * ================================================================== */

const CATEGORY_META = {
  hisse: { label: 'Hisse Portföyü', icon: 'candlestick_chart', color: 'var(--cat-stock)' },
  kripto: { label: 'Kripto', icon: 'currency_bitcoin', color: 'var(--cat-crypto)' },
  doviz: { label: 'Döviz', icon: 'currency_exchange', color: 'var(--cat-cash)' },
  emtia: { label: 'Emtia', icon: 'diamond', color: 'var(--cat-commodity)' },
  fon: { label: 'Fonlar', icon: 'donut_small', color: 'var(--cat-fund)' },
  gayrimenkul: { label: 'Gayrimenkul', icon: 'home_work', color: 'var(--cat-realestate)' },
  arac: { label: 'Araç', icon: 'directions_car', color: 'var(--cat-vehicle)' },
  mevduat: { label: 'Mevduat', icon: 'savings', color: 'var(--cat-deposit)' },
  diger: { label: 'Diğer Varlıklar', icon: 'category', color: 'var(--cat-other)' },
  viop: { label: 'VİOP', icon: 'show_chart', color: 'var(--cat-viop)' },
  gelir: { label: 'Aylık Gelir', icon: 'trending_up', color: 'var(--cat-budget)' },
  gider: { label: 'Aylık Gider', icon: 'trending_down', color: 'var(--negative)' },
  tasarruf: { label: 'Tasarruf', icon: 'savings', color: 'var(--secondary)' }
};

function statCardHtml(key, value, pl) {
  const meta = CATEGORY_META[key];
  const plHtml = pl == null
    ? `<span class="chip neu">—</span>`
    : profitLossHtml(pl.invested, pl.value);
  return `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:${meta.color};"><span class="msr">${meta.icon}</span></div>
        <div class="stat-name">${meta.label}</div>
      </div>
      <div class="stat-value">${fmtTL(value)}</div>
      <div class="stat-change">${plHtml}</div>
    </div>
  `;
}

async function computeYahooBackedCategory(rows, priceParamFn, amountField, costField) {
  let value = 0;
  let investedKnown = 0;
  let valueKnown = 0;
  await Promise.all(rows.map(async row => {
    try {
      const quote = await fetchPriceProxy(priceParamFn(row));
      const amount = Number(row[amountField]) || 0;
      const price = quote.price;
      const rowValue = amount * price;
      value += rowValue;
      const cost = row[costField];
      if (cost != null) {
        investedKnown += amount * Number(cost);
        valueKnown += rowValue;
      }
    } catch (e) {}
  }));
  return { value, invested: investedKnown, valueKnown };
}

/* ------------------------------------------------------------------
 * FAZ 11 EKLEMELERİ: hızlı gezinme kutuları, genişletilmiş piyasa/
 * emtia mini bölümleri, "Piyasa Hareketleri" ve varlık dağılım grafiği.
 * Mobildeki home_screen.dart'ta OLMAYAN ama kullanıcının bu çalışma
 * için AÇIKÇA istediği ek bölümler: gelir/gider/tasarruf özeti (zaten
 * yukarıdaki statGrid'de vardı) ve varlık dağılım grafiği (aşağıda).
 * "AI Analiz" banner'ı ve "Toplam Net Borç" kartı bilinçli olarak
 * eklenmedi (mobilde de fonksiyonel değil / borç verisi senkron değil).
 * ------------------------------------------------------------------ */
const HOME_QUICK_LINKS = [
  { page: 'varligim', icon: 'account_balance_wallet', label: 'Varlığım' },
  { page: 'emtia', icon: 'storefront', label: 'Varlıklar' },
  { page: 'butce', icon: 'savings', label: 'Bütçe' },
  { page: 'bulten', icon: 'newspaper', label: 'Bülten' }
];

// "Piyasa Hareketleri" için örneklem: BIST'in en büyük/likit hisseleri
// (tam BIST100 üyelik listesi bu sürümde doğrulanamadığı için "BIST100"
// olarak iddia edilmiyor — dürüstlük kuralı). Tek istekte (stock-batch)
// toplu çekilip işlem hacmine (fiyat × hacim) göre sıralanır.
const HOME_LIQUID_STOCK_SAMPLE = [
  'THYAO','TUPRS','BIMAS','GARAN','YKBNK','ISCTR','KCHOL','SAHOL','SISE','EREGL',
  'FROTO','TOASO','TCELL','TAVHL','PETKM','ENKAI','SASA','MGROS','ASELS','AKBNK',
  'PGSUS','KOZAL','TTKOM','VAKBN','HALKB','ARCLK','EKGYO','TTRAK','ULKER','DOAS',
  'KONTR','SOKM','VESTL','AEFES','CCOLA','ALARK','AGHOL','KOZAA','ISMEN','GUBRF',
  'HEKTS','OYAKC','TSKB','SKBNK','KRDMD','ODAS','ASTOR','CIMSA','AKSEN','MAVI',
  'ENJSA','ANHYT','TKFEN','BRSAN','CWENE','QUAGR','GESAN'
];

function renderHomeQuickGrid() {
  const grid = document.getElementById('homeQuickGrid');
  if (!grid) return;
  grid.innerHTML = HOME_QUICK_LINKS.map(l => `
    <div class="home-quick-box" data-goto="${l.page}">
      <span class="msr">${l.icon}</span>
      <div class="lbl">${escapeHtml(l.label)}</div>
    </div>
  `).join('');
  grid.querySelectorAll('[data-goto]').forEach(box => {
    box.addEventListener('click', () => showPage(box.dataset.goto));
  });
}

async function loadExtraTickerGrid(containerId, tickers) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = tickers.map(t => `
    <div class="ticker-box">
      <div class="ticker-name">${escapeHtml(t.name)}</div>
      <div class="ticker-value" id="ticker2-value-${t.id}">…</div>
      <div id="ticker2-chip-${t.id}"><span class="chip neu">…</span></div>
    </div>
  `).join('');
  await Promise.all(tickers.map(async t => {
    const valueEl = document.getElementById(`ticker2-value-${t.id}`);
    const chipEl = document.getElementById(`ticker2-chip-${t.id}`);
    try {
      const quote = await t.fetcher();
      valueEl.textContent = t.fmt(quote.price);
      chipEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      valueEl.textContent = '—';
      chipEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

async function fetchCryptoUsdQuote(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const price = data?.[id]?.usd;
  const changePercent = data?.[id]?.usd_24h_change;
  if (typeof price !== 'number') throw new Error('fiyat yok');
  return { price, changePercent: typeof changePercent === 'number' ? changePercent : null };
}

async function fetchViop30Quote() {
  const result = await cachedFetch('viop-list', 30000, () => fetchPriceProxy('type=viop-list'));
  const contracts = result.contracts || [];
  const match = contracts.find(c => c.category === 'index' && /XU ?030|BIST ?30/i.test(c.underlying || c.symbol || ''));
  if (!match) throw new Error('VİOP30 sözleşmesi bulunamadı');
  return { price: match.price, changePercent: match.changePercent };
}

async function loadHomeMarketSections() {
  await loadExtraTickerGrid('tickerGrid', [
    { id: 'usdtry', name: 'USD/TRY', fmt: fmtTLPrecise, fetcher: () => fetchPriceProxy('type=currency&code=USD') },
    { id: 'eurtry', name: 'EUR/TRY', fmt: fmtTLPrecise, fetcher: () => fetchPriceProxy('type=currency&code=EUR') },
    { id: 'btcusd', name: 'BTC/USD', fmt: fmtUSD, fetcher: () => fetchCryptoUsdQuote('bitcoin') },
    { id: 'ethusd', name: 'ETH/USD', fmt: fmtUSD, fetcher: () => fetchCryptoUsdQuote('ethereum') },
    { id: 'bist100', name: 'BIST 100', fmt: fmtNumber, fetcher: () => fetchPriceProxy('type=stock&symbol=XU100') },
    { id: 'viop30', name: 'VİOP30 (yakın vade)', fmt: fmtNumber, fetcher: fetchViop30Quote }
  ]);

  await loadExtraTickerGrid('tickerGridEmtia', [
    { id: 'goldgr', name: 'Gram Altın', fmt: fmtTLPrecise, fetcher: () => fetchPriceProxy('type=commodity&key=GOLD') },
    { id: 'goldons', name: 'Ons Altın', fmt: fmtUSD, fetcher: () => fetchPriceProxy('type=commodity&key=GOLD_ONS_USD') },
    { id: 'silvergr', name: 'Gümüş (gram)', fmt: fmtTLPrecise, fetcher: () => fetchPriceProxy('type=commodity&key=SILVER') },
    { id: 'brent', name: 'Brent Petrol (varil)', fmt: fmtTL, fetcher: () => fetchPriceProxy('type=commodity&key=BRENT') }
  ]);
}

async function loadHomeMovers() {
  const listEl = document.getElementById('moversList');
  if (!listEl) return;
  try {
    const result = await cachedFetch('stock-batch-home', 60000, () =>
      fetchPriceProxy(`type=stock-batch&symbols=${HOME_LIQUID_STOCK_SAMPLE.join(',')}`));
    const quotes = (result.quotes || []).filter(q => q.price != null && q.volume != null);
    quotes.sort((a, b) => (b.price * b.volume) - (a.price * a.volume));
    const top5 = quotes.slice(0, 5);
    if (top5.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Veri alınamadı.</div>`;
      return;
    }
    listEl.innerHTML = top5.map(q => `
      <div class="movers-row">
        <div class="sym">${escapeHtml(q.symbol)}</div>
        <div>${fmtTL(q.price)}</div>
        ${changeChipHtml(q.changePercent)}
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Veri alınamadı.</div>`;
  }
}

const ASSET_DISTRIBUTION_COLORS = {
  hisse: '#5B6EF5', kripto: '#2AA9E0', doviz: '#3984F6', emtia: '#7047EB',
  fon: '#9B3FF0', gayrimenkul: '#6D5BD0', arac: '#3EA0D9', mevduat: '#4C6FE7',
  diger: '#64748B', viop: '#22D3EE'
};

function renderAssetDistributionChart(cards) {
  const canvas = document.getElementById('assetDistributionChart');
  const legendEl = document.getElementById('assetDistributionLegend');
  if (!canvas || typeof Chart === 'undefined') return;
  const dist = cards.filter(c => ASSET_DISTRIBUTION_COLORS[c.key] && c.value > 0);
  if (_chartInstances['assetDistributionChart']) {
    _chartInstances['assetDistributionChart'].destroy();
    delete _chartInstances['assetDistributionChart'];
  }
  if (dist.length === 0) {
    legendEl.innerHTML = `<div class="empty" style="padding:10px 0;">Henüz varlık eklenmemiş.</div>`;
    return;
  }
  const total = dist.reduce((s, c) => s + c.value, 0);
  _chartInstances['assetDistributionChart'] = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: dist.map(c => CATEGORY_META[c.key].label),
      datasets: [{
        data: dist.map(c => c.value),
        backgroundColor: dist.map(c => ASSET_DISTRIBUTION_COLORS[c.key]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      cutout: '65%'
    }
  });
  legendEl.innerHTML = dist
    .sort((a, b) => b.value - a.value)
    .map(c => {
      const pct = total > 0 ? (c.value / total) * 100 : 0;
      return `
      <div style="display:flex; align-items:center; gap:8px; padding:6px 0;">
        <span style="width:10px; height:10px; border-radius:50%; background:${ASSET_DISTRIBUTION_COLORS[c.key]}; flex-shrink:0;"></span>
        <span style="flex:1;">${escapeHtml(CATEGORY_META[c.key].label)}</span>
        <span style="color:var(--text-muted);">%${pct.toFixed(1)}</span>
      </div>`;
    }).join('');
}

async function loadHomePage() {
  const totalEl = document.getElementById('heroTotal');
  const updatedEl = document.getElementById('heroUpdated');
  const statGrid = document.getElementById('statGrid');
  const tickerGrid = document.getElementById('tickerGrid');
  if (!totalEl || !statGrid) return;

  totalEl.textContent = '…';
  updatedEl.textContent = '';
  statGrid.innerHTML = '';
  tickerGrid.innerHTML = '';
  renderHomeQuickGrid();

  const [
    stockRes, cryptoRes, currencyRes, commodityRes, fundRes,
    viopRes, realEstateRes, vehicleRes, otherAssetsRes, depositRes, budgetRes
  ] = await Promise.all([
    supa.from('stock_holdings').select('*').is('deleted_at', null),
    supa.from('crypto_holdings').select('*').is('deleted_at', null),
    supa.from('currency_holdings').select('*').is('deleted_at', null),
    supa.from('commodity_holdings').select('*').is('deleted_at', null),
    supa.from('fund_holdings').select('*').is('deleted_at', null),
    supa.from('viop_holdings').select('*').is('deleted_at', null),
    supa.from('real_estate_holdings').select('*').is('deleted_at', null),
    supa.from('vehicle_holdings').select('*').is('deleted_at', null),
    supa.from('other_asset_holdings').select('*').is('deleted_at', null),
    supa.from('deposit_holdings').select('*').is('deleted_at', null),
    supa.from('budget_transactions').select('*').is('deleted_at', null)
  ]);

  const cards = [];

  // ---- HİSSE ----
  {
    const rows = stockRes.data || [];
    const r = await computeYahooBackedCategory(
      rows, row => `type=stock&symbol=${encodeURIComponent(row.symbol)}`, 'lot', 'cost'
    );
    cards.push({ key: 'hisse', value: r.value, invested: r.invested, valueKnown: r.valueKnown });
  }

  // ---- KRİPTO ----
  {
    const rows = cryptoRes.data || [];
    let value = 0, invested = 0;
    try {
      const prices = await fetchCryptoPricesTry(rows.map(r => r.crypto_id));
      for (const row of rows) {
        const price = prices[row.crypto_id];
        if (price) {
          const amount = Number(row.amount) || 0;
          value += amount * price;
          if (row.cost != null) invested += amount * Number(row.cost);
        }
      }
    } catch (e) {}
    cards.push({ key: 'kripto', value, invested, valueKnown: value });
  }

  // ---- DÖVİZ ----
  {
    const rows = currencyRes.data || [];
    const r = await computeYahooBackedCategory(
      rows, row => `type=currency&code=${encodeURIComponent(row.currency_code)}`, 'amount', 'cost'
    );
    cards.push({ key: 'doviz', value: r.value, invested: r.invested, valueKnown: r.valueKnown });
  }

  // ---- EMTİA ----
  {
    const rows = commodityRes.data || [];
    let value = 0, investedKnown = 0, valueKnown = 0, usdTry = null;
    await Promise.all(rows.map(async row => {
      try {
        const quote = await fetchPriceProxy(`type=commodity&key=${encodeURIComponent(row.commodity_key)}`);
        let priceTry = quote.price;
        if (row.commodity_key === 'BRENT_USD') {
          if (usdTry == null) {
            const usdQuote = await fetchPriceProxy('type=currency&code=USD');
            usdTry = usdQuote.price;
          }
          priceTry = quote.price * usdTry;
        }
        const amount = Number(row.amount) || 0;
        const rowValue = amount * priceTry;
        value += rowValue;
        if (row.cost != null) {
          const costTry = row.commodity_key === 'BRENT_USD' ? Number(row.cost) * usdTry : Number(row.cost);
          investedKnown += amount * costTry;
          valueKnown += rowValue;
        }
      } catch (e) {}
    }));
    cards.push({ key: 'emtia', value, invested: investedKnown, valueKnown });
  }

  // ---- FON ----
  {
    const rows = fundRes.data || [];
    const r = await computeYahooBackedCategory(
      rows, row => `type=fund&code=${encodeURIComponent(row.code)}`, 'units', 'cost'
    );
    cards.push({ key: 'fon', value: r.value, invested: r.invested, valueKnown: r.valueKnown });
  }

  // ---- GAYRİMENKUL ----
  {
    const rows = realEstateRes.data || [];
    const value = rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    const invested = rows.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    cards.push({ key: 'gayrimenkul', value, invested, valueKnown: value });
  }

  // ---- ARAÇ ----
  {
    const rows = vehicleRes.data || [];
    const value = rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    const invested = rows.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    cards.push({ key: 'arac', value, invested, valueKnown: value });
  }

  // ---- MEVDUAT ----
  {
    const rows = depositRes.data || [];
    const value = rows.reduce((s, r) => s + depositCurrentValue(r), 0);
    const invested = rows.reduce((s, r) => s + (Number(r.principal) || 0), 0);
    cards.push({ key: 'mevduat', value, invested, valueKnown: value });
  }

  // ---- DİĞER VARLIKLAR ----
  {
    const rows = otherAssetsRes.data || [];
    const value = rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    const investedRows = rows.filter(r => r.purchase_price != null);
    const invested = investedRows.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    const valueKnown = investedRows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    cards.push({ key: 'diger', value, invested, valueKnown });
  }

  // ---- VİOP ----
  {
    const rows = viopRes.data || [];
    const r = await computeYahooBackedCategory(
      rows, row => `type=viop&symbol=${encodeURIComponent(row.symbol)}`, 'lot', 'cost'
    );
    cards.push({ key: 'viop', value: r.value, invested: r.invested, valueKnown: r.valueKnown });
  }

  // ---- BÜTÇE (bu ayki gelir / gider / tasarruf) ----
  {
    const rows = budgetRes.data || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let income = 0, expense = 0;
    for (const row of rows) {
      const txDate = new Date(row.transaction_date);
      const appliesThisMonth = row.is_recurring
        ? txDate < monthEnd
        : (txDate >= monthStart && txDate < monthEnd);
      if (!appliesThisMonth) continue;
      const amount = Number(row.amount) || 0;
      if (row.type === 'Gelir') income += amount;
      else if (row.type === 'Gider') expense += amount;
    }
    cards.push({ key: 'gelir', value: income, invested: null, valueKnown: null });
    cards.push({ key: 'gider', value: expense, invested: null, valueKnown: null });
    cards.push({ key: 'tasarruf', value: income - expense, invested: null, valueKnown: null });
  }

  // Toplam Borç: senkronize bir Supabase tablosu olmadığı için (borçlar
  // yalnızca cihaz-içi yerel depoda tutuluyor), kural 11 gereği burada
  // GERÇEK OLMAYAN bir tutar gösterilmiyor; kart eklenmiyor.

  const grandTotal = ['hisse', 'kripto', 'doviz', 'emtia', 'fon', 'gayrimenkul', 'arac', 'mevduat', 'diger', 'viop']
    .map(k => cards.find(c => c.key === k)?.value || 0)
    .reduce((a, b) => a + b, 0);

  totalEl.textContent = fmtTL(grandTotal);
  updatedEl.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');

  statGrid.innerHTML = cards.map(c => {
    const pl = (c.invested != null && c.invested > 0) ? { invested: c.invested, value: c.valueKnown } : null;
    return statCardHtml(c.key, c.value, pl);
  }).join('');

  // ---- VARLIK DAĞILIM GRAFİĞİ (FAZ 11, kullanıcının açıkça istediği ek) ----
  renderAssetDistributionChart(cards.filter(c => ASSET_DISTRIBUTION_COLORS[c.key]));

  // ---- PİYASALAR / EMTİALAR mini bölümleri + Piyasa Hareketleri ----
  await Promise.all([
    loadHomeMarketSections(),
    loadHomeMovers()
  ]);
}

registerPageLoader('home', loadHomePage);
