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

  // ---- PİYASALAR ----
  const tickers = [
    { name: 'BIST 100', params: 'type=stock&symbol=XU100', fmt: fmtTL },
    { name: 'USD/TRY', params: 'type=currency&code=USD', fmt: fmtTLPrecise },
    { name: 'EUR/TRY', params: 'type=currency&code=EUR', fmt: fmtTLPrecise },
    { name: 'Gram Altın', params: 'type=commodity&key=GOLD', fmt: fmtTLPrecise }
  ];
  tickerGrid.innerHTML = tickers.map(t => `
    <div class="ticker-box">
      <div class="ticker-name">${escapeHtml(t.name)}</div>
      <div class="ticker-value" id="ticker-value-${t.name.replace(/[^a-zA-Z0-9]/g, '')}">…</div>
      <div id="ticker-chip-${t.name.replace(/[^a-zA-Z0-9]/g, '')}"><span class="chip neu">…</span></div>
    </div>
  `).join('');

  await Promise.all(tickers.map(async t => {
    const key = t.name.replace(/[^a-zA-Z0-9]/g, '');
    const valueEl = document.getElementById(`ticker-value-${key}`);
    const chipEl = document.getElementById(`ticker-chip-${key}`);
    try {
      const quote = await fetchPriceProxy(t.params);
      valueEl.textContent = t.fmt(quote.price);
      chipEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      valueEl.textContent = '—';
      chipEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

registerPageLoader('home', loadHomePage);
