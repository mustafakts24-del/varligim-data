/* ==================================================================
 * app-varliklar.js
 * "Varlıklar" alt menüsü: Emtialar, Hisse Senetleri, Yatırım Fonları,
 * Kripto Paralar, Faiz, Kredi Hesaplama, VİOP Aktif Vade.
 * Emtia/Hisse/Fon/Kripto/VİOP bölümleri, eski portfoy.html'deki
 * ÇALIŞAN Supabase sorguları ve price-proxy çağrıları birebir
 * korunarak buraya taşındı (kural: mevcut mantığı bozma).
 * ================================================================== */

/* ==================================================================
 * HİSSE SEÇİM LİSTESİ + PORTFÖYÜ
 * ================================================================== */
const stockMarketList = [
  { symbol:'AEFES', name:'Anadolu Efes' },
  { symbol:'AGHOL', name:'AG Anadolu Grubu Holding' },
  { symbol:'AKBNK', name:'Akbank' },
  { symbol:'AKCNS', name:'Akçansa' },
  { symbol:'AKSA', name:'Aksa Akrilik' },
  { symbol:'AKSEN', name:'Aksa Enerji' },
  { symbol:'ALARK', name:'Alarko Holding' },
  { symbol:'ALBRK', name:'Albaraka Türk' },
  { symbol:'ALGYO', name:'Alarko GYO' },
  { symbol:'ALKIM', name:'Alkim Kimya' },
  { symbol:'ANHYT', name:'Anadolu Hayat Emeklilik' },
  { symbol:'ANSGR', name:'Anadolu Sigorta' },
  { symbol:'ARCLK', name:'Arçelik' },
  { symbol:'ASELS', name:'Aselsan' },
  { symbol:'ASTOR', name:'Astor Enerji' },
  { symbol:'AYGAZ', name:'Aygaz' },
  { symbol:'BIMAS', name:'BİM Birleşik Mağazalar' },
  { symbol:'BRSAN', name:'Borusan Boru' },
  { symbol:'BRYAT', name:'Borusan Yatırım' },
  { symbol:'BSOKE', name:'Batısöke Çimento' },
  { symbol:'CCOLA', name:'Coca-Cola İçecek' },
  { symbol:'CIMSA', name:'Çimsa' },
  { symbol:'CLEBI', name:'Çelebi Hava Servisi' },
  { symbol:'CWENE', name:'CW Enerji' },
  { symbol:'DOAS', name:'Doğuş Otomotiv' },
  { symbol:'DOHOL', name:'Doğan Holding' },
  { symbol:'ECILC', name:'Eczacıbaşı İlaç' },
  { symbol:'EGEEN', name:'Ege Endüstri' },
  { symbol:'EKGYO', name:'Emlak Konut GYO' },
  { symbol:'ENJSA', name:'Enerjisa Enerji' },
  { symbol:'ENKAI', name:'Enka İnşaat' },
  { symbol:'EREGL', name:'Ereğli Demir Çelik' },
  { symbol:'FROTO', name:'Ford Otosan' },
  { symbol:'GARAN', name:'Garanti BBVA' },
  { symbol:'GESAN', name:'Girişim Elektrik' },
  { symbol:'GLYHO', name:'Global Yatırım Holding' },
  { symbol:'GUBRF', name:'Gübre Fabrikaları' },
  { symbol:'HALKB', name:'Halkbank' },
  { symbol:'HEKTS', name:'Hektaş' },
  { symbol:'ISCTR', name:'Türkiye İş Bankası C' },
  { symbol:'ISGYO', name:'İş GYO' },
  { symbol:'ISMEN', name:'İş Yatırım Menkul Değerler' },
  { symbol:'KARSN', name:'Karsan Otomotiv' },
  { symbol:'KCHOL', name:'Koç Holding' },
  { symbol:'KONTR', name:'Kontrolmatik Teknoloji' },
  { symbol:'KORDS', name:'Kordsa Teknik Tekstil' },
  { symbol:'KOZAA', name:'Koza Anadolu Metal' },
  { symbol:'KOZAL', name:'Koza Altın' },
  { symbol:'KRDMD', name:'Kardemir D' },
  { symbol:'MAVI', name:'Mavi Giyim' },
  { symbol:'MGROS', name:'Migros' },
  { symbol:'MIATK', name:'Mia Teknoloji' },
  { symbol:'ODAS', name:'Odaş Elektrik' },
  { symbol:'OTKAR', name:'Otokar' },
  { symbol:'OYAKC', name:'Oyak Çimento' },
  { symbol:'PETKM', name:'Petkim' },
  { symbol:'PGSUS', name:'Pegasus' },
  { symbol:'QUAGR', name:'Qua Granite' },
  { symbol:'SAHOL', name:'Sabancı Holding' },
  { symbol:'SASA', name:'Sasa Polyester' },
  { symbol:'SISE', name:'Şişecam' },
  { symbol:'SKBNK', name:'Şekerbank' },
  { symbol:'SOKM', name:'Şok Marketler' },
  { symbol:'TAVHL', name:'TAV Havalimanları' },
  { symbol:'TCELL', name:'Turkcell' },
  { symbol:'THYAO', name:'Türk Hava Yolları' },
  { symbol:'TKFEN', name:'Tekfen Holding' },
  { symbol:'TOASO', name:'Tofaş' },
  { symbol:'TSKB', name:'TSKB' },
  { symbol:'TTKOM', name:'Türk Telekom' },
  { symbol:'TTRAK', name:'Türk Traktör' },
  { symbol:'TUPRS', name:'Tüpraş' },
  { symbol:'ULKER', name:'Ülker Bisküvi' },
  { symbol:'VAKBN', name:'VakıfBank' },
  { symbol:'VESBE', name:'Vestel Beyaz Eşya' },
  { symbol:'VESTL', name:'Vestel Elektronik' },
  { symbol:'YKBNK', name:'Yapı Kredi' },
  { symbol:'ZOREN', name:'Zorlu Enerji' }
];

function loadStockOptions() {
  const select = document.getElementById('newStockSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Hisse seç...</option>';
  const sorted = [...stockMarketList].sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'));
  for (const stock of sorted) {
    const option = document.createElement('option');
    option.value = stock.symbol;
    option.textContent = `${stock.symbol} — ${stock.name}`;
    option.dataset.name = stock.name;
    select.appendChild(option);
  }
}

async function loadHoldings() {
  const { data, error } = await supa
    .from('stock_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('symbol', { ascending: true });
  const tbody = document.getElementById('holdingsBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Hisse verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const invested = (Number(row.lot) || 0) * (Number(row.cost) || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol)}</div>
        ${row.name ? `<div class="name">${escapeHtml(row.name)}</div>` : ''}
      </td>
      <td class="num">${fmtNumber(row.lot)}</td>
      <td class="num">${fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="stock-price-${escapeHtml(row.symbol)}">…</td>
      <td class="num" id="stock-value-${escapeHtml(row.symbol)}">…</td>
      <td class="num" id="stock-pl-${escapeHtml(row.symbol)}">…</td>
      <td class="num">
        <button type="button" class="del stock-delete" data-symbol="${escapeHtml(row.symbol)}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.stock-delete').addEventListener('click', () => deleteHolding(row.symbol));
    tbody.appendChild(tr);
  }
  loadStockLivePrices(data);
}

async function loadStockLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const priceEl = document.getElementById(`stock-price-${row.symbol}`);
    const valueEl = document.getElementById(`stock-value-${row.symbol}`);
    const plEl = document.getElementById(`stock-pl-${row.symbol}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=stock&symbol=${encodeURIComponent(row.symbol)}`);
      const lot = Number(row.lot) || 0;
      const invested = lot * (Number(row.cost) || 0);
      const currentValue = lot * quote.price;
      priceEl.textContent = fmtTL(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      plEl.innerHTML = profitLossHtml(invested, currentValue);
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteHolding(symbol) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('stock_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('symbol', symbol);
  if (error) {
    showMsg('Hisse silinemedi: ' + error.message, 'error');
    return;
  }
  loadHoldings();
}

document.getElementById('addBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const select = document.getElementById('newStockSelect');
  const selectedOption = select.options[select.selectedIndex];
  const symbol = select.value;
  const name = selectedOption?.dataset?.name || '';
  const lot = parseFloat(document.getElementById('newLot').value);
  const cost = parseFloat(document.getElementById('newCost').value);
  if (!symbol || !name || isNaN(lot) || lot <= 0 || isNaN(cost) || cost <= 0) {
    showMsg('Lütfen hisseyi seçip lot ve maliyeti eksiksiz gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('stock_holdings')
    .upsert({ user_id: user.id, symbol, name, lot, cost }, { onConflict: 'user_id,symbol' });
  if (error) {
    showMsg('Hisse eklenemedi: ' + error.message, 'error');
    return;
  }
  select.value = '';
  document.getElementById('newLot').value = '';
  document.getElementById('newCost').value = '';
  loadHoldings();
});

/* ==================================================================
 * EMTİA
 * ================================================================== */
const commodityMarketList = [
  { key:'GOLD', symbol:'Au', name:'Altın', unit:'Gram' },
  { key:'SILVER', symbol:'Ag', name:'Gümüş', unit:'Gram' },
  { key:'COPPER', symbol:'Cu', name:'Bakır', unit:'Gram' },
  { key:'PLATINUM', symbol:'Pt', name:'Platin', unit:'Gram' },
  { key:'PALLADIUM', symbol:'Pd', name:'Paladyum', unit:'Gram' },
  { key:'BRENT', symbol:'BRENT', name:'Brent Petrol', unit: 'Varil' },
  { key:'BRENT_USD', symbol:'BRENT_USD', name:'Brent Petrol (USD)', unit: 'Varil' }
];

function loadCommodityOptions() {
  const list = document.getElementById('commodityOptions');
  if (!list) return;
  list.innerHTML = '';
  for (const commodity of commodityMarketList) {
    const option = document.createElement('option');
    option.value = `${commodity.name} — ${commodity.key}`;
    list.appendChild(option);
  }
}

function resolveCommodity(rawValue) {
  const value = String(rawValue || '').trim().toLocaleUpperCase('tr-TR');
  if (!value) return null;
  return commodityMarketList.find(commodity => {
    const key = commodity.key.toLocaleUpperCase('tr-TR');
    const symbol = commodity.symbol.toLocaleUpperCase('tr-TR');
    const name = commodity.name.toLocaleUpperCase('tr-TR');
    return value === key || value === symbol || value === name ||
      value.startsWith(`${name} —`) || value.includes(key) || value.includes(name);
  }) || null;
}

async function loadCommodityHoldings() {
  const { data, error } = await supa
    .from('commodity_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('commodity_key', { ascending: true });
  const tbody = document.getElementById('commodityBody');
  const emptyState = document.getElementById('commodityEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Emtia verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const costText = row.cost == null ? '—' : fmtTL(row.cost);
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.name || row.commodity_key)}</div>
        <div class="name">${escapeHtml(row.symbol || '')}${row.unit ? ' · ' + escapeHtml(row.unit) : ''}</div>
      </td>
      <td class="num">${fmtNumber(row.amount)}</td>
      <td class="num">${costText}</td>
      <td class="num" id="commodity-price-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num" id="commodity-value-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num" id="commodity-pl-${escapeHtml(row.commodity_key)}">…</td>
      <td class="num">
        <button type="button" class="del" title="Sil" data-commodity-key="${escapeHtml(row.commodity_key)}">✕</button>
      </td>
    `;
    tr.querySelector('[data-commodity-key]').addEventListener('click', () => deleteCommodityHolding(row.commodity_key));
    tbody.appendChild(tr);
  }
  loadCommodityLivePrices(data);
}

async function loadCommodityLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const priceEl = document.getElementById(`commodity-price-${row.commodity_key}`);
    const valueEl = document.getElementById(`commodity-value-${row.commodity_key}`);
    const plEl = document.getElementById(`commodity-pl-${row.commodity_key}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=commodity&key=${encodeURIComponent(row.commodity_key)}`);
      const isUsd = row.commodity_key === 'BRENT_USD';
      const fmt = isUsd ? fmtUSD : fmtTL;
      const amount = Number(row.amount) || 0;
      const currentValue = amount * quote.price;
      priceEl.textContent = fmt(quote.price);
      valueEl.textContent = fmt(currentValue);
      if (row.cost != null) {
        const invested = amount * Number(row.cost);
        plEl.innerHTML = profitLossHtml(invested, currentValue, fmt);
      } else {
        plEl.textContent = '—';
      }
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteCommodityHolding(commodityKey) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('commodity_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('commodity_key', commodityKey);
  if (error) {
    showMsg('Emtia silinemedi: ' + error.message, 'error');
    return;
  }
  await loadCommodityHoldings();
}

document.getElementById('addCommodityBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const searchInput = document.getElementById('newCommoditySearch');
  const commodity = resolveCommodity(searchInput.value);
  const amount = parseFloat(document.getElementById('newCommodityAmount').value);
  const costRaw = document.getElementById('newCommodityCost').value.trim();
  const cost = costRaw === '' ? null : parseFloat(costRaw);
  if (!commodity || isNaN(amount) || amount <= 0 || (cost !== null && (isNaN(cost) || cost < 0))) {
    showMsg('Lütfen emtiayı seçip geçerli bir miktar gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('commodity_holdings')
    .upsert({
      user_id: user.id, commodity_key: commodity.key, symbol: commodity.symbol,
      name: commodity.name, unit: commodity.unit, amount, cost, deleted_at: null
    }, { onConflict: 'user_id,commodity_key' });
  if (error) {
    showMsg('Emtia eklenemedi: ' + error.message, 'error');
    return;
  }
  searchInput.value = '';
  document.getElementById('newCommodityAmount').value = '';
  document.getElementById('newCommodityCost').value = '';
  await loadCommodityHoldings();
});

/* ==================================================================
 * KRİPTO SEÇİM LİSTESİ + PORTFÖYÜ
 * ================================================================== */
function loadCryptoOptions() {
  const select = document.getElementById('newCryptoSelect');
  if (!select) return;
  const cryptos = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'tether', symbol: 'USDT', name: 'Tether' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
    { id: 'tron', symbol: 'TRX', name: 'TRON' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
    { id: 'matic-network', symbol: 'POL', name: 'Polygon' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
    { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol' },
    { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer' },
    { id: 'aptos', symbol: 'APT', name: 'Aptos' },
    { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
    { id: 'optimism', symbol: 'OP', name: 'Optimism' },
    { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
    { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
    { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera' },
    { id: 'vechain', symbol: 'VET', name: 'VeChain' },
    { id: 'the-open-network', symbol: 'TON', name: 'Toncoin' },
    { id: 'sui', symbol: 'SUI', name: 'Sui' },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe' }
  ];
  select.innerHTML = '<option value="">Kripto seç...</option>';
  cryptos.forEach((crypto) => {
    const option = document.createElement('option');
    option.value = crypto.id;
    option.textContent = `${crypto.symbol} — ${crypto.name}`;
    option.dataset.symbol = crypto.symbol;
    option.dataset.name = crypto.name;
    option.dataset.image = '';
    select.appendChild(option);
  });
}

async function loadCryptoLivePrices(rows) {
  let prices = {};
  try {
    prices = await fetchCryptoPricesTry(rows.map(row => row.crypto_id));
  } catch (e) {
    // Toplu istek başarısız olduysa her satır aşağıda '—' gösterecek.
  }
  for (const row of rows) {
    const priceEl = document.getElementById(`crypto-price-${row.crypto_id}`);
    const valueEl = document.getElementById(`crypto-value-${row.crypto_id}`);
    const plEl = document.getElementById(`crypto-pl-${row.crypto_id}`);
    if (!priceEl || !valueEl || !plEl) continue;
    const price = prices[row.crypto_id];
    if (!price) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
      continue;
    }
    const amount = Number(row.amount) || 0;
    const invested = amount * (Number(row.cost) || 0);
    const currentValue = amount * price;
    priceEl.textContent = fmtTL(price);
    valueEl.textContent = fmtTL(currentValue);
    plEl.innerHTML = profitLossHtml(invested, currentValue);
  }
}

async function loadCryptoHoldings() {
  const { data, error } = await supa
    .from('crypto_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('symbol', { ascending: true });
  const tbody = document.getElementById('cryptoBody');
  const emptyState = document.getElementById('cryptoEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Kripto verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const invested = (Number(row.amount) || 0) * (Number(row.cost) || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol)}</div>
        ${row.name ? `<div class="name">${escapeHtml(row.name)}</div>` : ''}
      </td>
      <td class="num">${fmtNumber(row.amount)}</td>
      <td class="num">${fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="crypto-price-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num" id="crypto-value-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num" id="crypto-pl-${escapeHtml(row.crypto_id)}">…</td>
      <td class="num">
        <button class="del crypto-delete" data-id="${escapeHtml(row.crypto_id)}" title="Sil">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  loadCryptoLivePrices(data);
  tbody.querySelectorAll('.crypto-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCryptoHolding(btn.dataset.id));
  });
}

async function deleteCryptoHolding(cryptoId) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('crypto_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('crypto_id', cryptoId);
  if (error) {
    showMsg('Kripto silinemedi: ' + error.message, 'error');
    return;
  }
  await loadCryptoHoldings();
}

document.getElementById('addCryptoBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const select = document.getElementById('newCryptoSelect');
  const selectedOption = select.options[select.selectedIndex];
  const cryptoId = select.value;
  const symbol = selectedOption?.dataset?.symbol || '';
  const name = selectedOption?.dataset?.name || '';
  const imageUrl = selectedOption?.dataset?.image || null;
  const amount = parseFloat(document.getElementById('newCryptoAmount').value);
  const cost = parseFloat(document.getElementById('newCryptoCost').value);
  if (!cryptoId || !symbol || !name || isNaN(amount) || amount <= 0 || isNaN(cost) || cost <= 0) {
    showMsg('Lütfen kriptoyu seçip miktar ve maliyeti eksiksiz gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('crypto_holdings')
    .upsert({
      user_id: user.id, deleted_at: null, crypto_id: cryptoId,
      symbol, name, amount, cost, image_url: imageUrl
    }, { onConflict: 'user_id,crypto_id' });
  if (error) {
    showMsg('Kripto eklenemedi: ' + error.message, 'error');
    return;
  }
  select.value = '';
  document.getElementById('newCryptoAmount').value = '';
  document.getElementById('newCryptoCost').value = '';
  loadCryptoHoldings();
});

/* ==================================================================
 * FON PORTFÖYÜ
 * ================================================================== */
async function loadFundHoldings() {
  const { data, error } = await supa
    .from('fund_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('code', { ascending: true });
  const tbody = document.getElementById('fundBody');
  const emptyState = document.getElementById('fundEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Fon verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const units = Number(row.units) || 0;
    const cost = Number(row.cost) || 0;
    const invested = units * cost;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.code || '')}</div>
        <div class="name">${escapeHtml(row.name || '')}</div>
      </td>
      <td class="num">${fmtNumber(row.units)}</td>
      <td class="num">${row.cost == null ? '—' : fmtTL(row.cost)}</td>
      <td class="num">${fmtTL(invested)}</td>
      <td class="num" id="fund-price-${escapeHtml(row.code || '')}">…</td>
      <td class="num" id="fund-value-${escapeHtml(row.code || '')}">…</td>
      <td class="num" id="fund-pl-${escapeHtml(row.code || '')}">…</td>
      <td class="num">
        <button type="button" class="del fund-delete" data-fund-code="${escapeHtml(row.code || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('[data-fund-code]').addEventListener('click', () => deleteFundHolding(row.code));
    tbody.appendChild(tr);
  }
  loadFundLivePrices(data);
}

async function loadFundLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const code = row.code || '';
    const priceEl = document.getElementById(`fund-price-${code}`);
    const valueEl = document.getElementById(`fund-value-${code}`);
    const plEl = document.getElementById(`fund-pl-${code}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=fund&code=${encodeURIComponent(code)}`);
      const units = Number(row.units) || 0;
      const currentValue = units * quote.price;
      priceEl.textContent = fmtTLPrecise(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      if (row.cost != null) {
        const invested = units * Number(row.cost);
        plEl.innerHTML = profitLossHtml(invested, currentValue);
      } else {
        plEl.textContent = '—';
      }
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteFundHolding(code) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { error } = await supa
    .from('fund_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('code', code);
  if (error) {
    showMsg('Fon silinemedi: ' + error.message, 'error');
    return;
  }
  await loadFundHoldings();
}

let selectedFundForWeb = null;
let fundLookupTimer = null;
let fundLookupRequestId = 0;

async function findFundByExactCode(rawCode) {
  const code = String(rawCode || '').trim().toLocaleUpperCase('tr-TR');
  if (!code) return null;
  const { data, error } = await supa
    .from('fund_catalog')
    .select('code,name')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const foundCode = String(data.code || '').trim().toLocaleUpperCase('tr-TR');
  const foundName = String(data.name || '').trim();
  if (foundCode !== code || !foundName) return null;
  return { code: foundCode, name: foundName };
}

async function resolveFundCodeInput() {
  const codeInput = document.getElementById('newFundCode');
  const nameInput = document.getElementById('newFundName');
  const code = String(codeInput.value || '').trim().toLocaleUpperCase('tr-TR');
  codeInput.value = code;
  nameInput.value = '';
  selectedFundForWeb = null;
  if (!code) return;
  const requestId = ++fundLookupRequestId;
  nameInput.value = 'Fon aranıyor...';
  try {
    const fund = await findFundByExactCode(code);
    if (requestId !== fundLookupRequestId) return;
    if (!fund) {
      nameInput.value = '';
      showMsg(code + ' koduyla eşleşen fon bulunamadı. Fon kodunu kontrol et.', 'error');
      return;
    }
    selectedFundForWeb = fund;
    nameInput.value = fund.name;
    hideMsg();
  } catch (err) {
    if (requestId !== fundLookupRequestId) return;
    nameInput.value = '';
    showMsg('Fon kataloğu okunamadı: ' + (err?.message || 'Bilinmeyen hata'), 'error');
  }
}

document.getElementById('newFundCode').addEventListener('input', () => {
  clearTimeout(fundLookupTimer);
  const codeInput = document.getElementById('newFundCode');
  codeInput.value = String(codeInput.value || '').toLocaleUpperCase('tr-TR');
  selectedFundForWeb = null;
  document.getElementById('newFundName').value = '';
  fundLookupTimer = setTimeout(() => { resolveFundCodeInput(); }, 450);
});

document.getElementById('newFundCode').addEventListener('blur', () => {
  clearTimeout(fundLookupTimer);
  resolveFundCodeInput();
});

document.getElementById('addFundBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const codeInput = document.getElementById('newFundCode');
  const nameInput = document.getElementById('newFundName');
  const code = String(codeInput.value || '').trim().toLocaleUpperCase('tr-TR');
  if (!selectedFundForWeb || selectedFundForWeb.code !== code) {
    await resolveFundCodeInput();
  }
  if (!selectedFundForWeb || selectedFundForWeb.code !== code) {
    showMsg('Önce geçerli bir fon kodu yaz ve fonun bulunmasını bekle.', 'error');
    return;
  }
  const name = selectedFundForWeb.name;
  const units = parseFloat(document.getElementById('newFundUnits').value);
  const cost = parseFloat(document.getElementById('newFundCost').value);
  if (!code || !name || isNaN(units) || units <= 0 || isNaN(cost) || cost < 0) {
    showMsg('Geçerli fon kodunu seçip adet ve maliyeti gir.', 'error');
    return;
  }
  const { error } = await supa
    .from('fund_holdings')
    .upsert({ user_id: user.id, code, name, units, cost, deleted_at: null }, { onConflict: 'user_id,code' });
  if (error) {
    showMsg('Fon eklenemedi: ' + error.message, 'error');
    return;
  }
  codeInput.value = '';
  nameInput.value = '';
  document.getElementById('newFundUnits').value = '';
  document.getElementById('newFundCost').value = '';
  selectedFundForWeb = null;
  await loadFundHoldings();
});

/* ==================================================================
 * VİOP PORTFÖYÜ
 * ================================================================== */
async function loadViopHoldings() {
  const { data, error } = await supa
    .from('viop_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('viopBody');
  const emptyState = document.getElementById('viopEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('VİOP verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const lot = Number(row.lot) || 0;
    const cost = row.cost == null ? null : Number(row.cost);
    const invested = cost != null ? lot * cost : null;
    const symKey = encodeURIComponent(row.symbol || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="sym">${escapeHtml(row.symbol || '')}</div>
        <div class="name">${escapeHtml(
          [row.underlying, row.is_option ? 'Opsiyon' : 'Vadeli İşlem'].filter(Boolean).join(' • ')
        )}</div>
      </td>
      <td class="num">${fmtNumber(row.lot)}</td>
      <td class="num">${cost == null ? '—' : fmtTL(cost)}</td>
      <td class="num">${invested == null ? '—' : fmtTL(invested)}</td>
      <td class="num" id="viop-price-${symKey}">…</td>
      <td class="num" id="viop-value-${symKey}">…</td>
      <td class="num" id="viop-pl-${symKey}">…</td>
      <td class="num">
        <button type="button" class="del viop-delete" data-symbol="${escapeHtml(row.symbol || '')}" title="Sil">✕</button>
      </td>
    `;
    tr.querySelector('.viop-delete').addEventListener('click', () => deleteViopHolding(row.symbol));
    tbody.appendChild(tr);
  }
  loadViopLivePrices(data);
}

async function loadViopLivePrices(rows) {
  await Promise.all(rows.map(async (row) => {
    const symbol = row.symbol || '';
    const symKey = encodeURIComponent(symbol);
    const priceEl = document.getElementById(`viop-price-${symKey}`);
    const valueEl = document.getElementById(`viop-value-${symKey}`);
    const plEl = document.getElementById(`viop-pl-${symKey}`);
    if (!priceEl || !valueEl || !plEl) return;
    try {
      const quote = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(symbol)}`);
      const lot = Number(row.lot) || 0;
      const currentValue = lot * quote.price;
      priceEl.textContent = fmtTLPrecise(quote.price);
      valueEl.textContent = fmtTL(currentValue);
      if (row.cost != null) {
        const invested = lot * Number(row.cost);
        plEl.innerHTML = profitLossHtml(invested, currentValue);
      } else {
        plEl.textContent = '—';
      }
    } catch (e) {
      priceEl.textContent = '—';
      valueEl.textContent = '—';
      plEl.textContent = '—';
    }
  }));
}

async function deleteViopHolding(symbol) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !symbol) return;
  const { error } = await supa
    .from('viop_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('symbol', symbol);
  if (error) {
    showMsg('VİOP pozisyonu silinemedi: ' + error.message, 'error');
    return;
  }
  await loadViopHoldings();
}

document.getElementById('addViopBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const symbol = document.getElementById('newViopSymbol').value.trim();
  const underlying = document.getElementById('newViopUnderlying').value.trim();
  const isOption = document.getElementById('newViopIsOption').value === 'true';
  const lot = parseFloat(document.getElementById('newViopLot').value);
  const costRaw = document.getElementById('newViopCost').value.trim();
  const cost = costRaw === '' ? null : parseFloat(costRaw);
  if (!symbol || isNaN(lot) || (cost != null && isNaN(cost))) {
    showMsg('Lütfen VİOP pozisyon bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }
  const { error } = await supa.from('viop_holdings').upsert({
    user_id: user.id, symbol, underlying: underlying || null, code: null,
    is_option: isOption, category_index: 0, lot, cost, deleted_at: null
  }, { onConflict: 'user_id,symbol' });
  if (error) {
    showMsg('VİOP pozisyonu eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newViopSymbol', 'newViopUnderlying', 'newViopLot', 'newViopCost']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('newViopIsOption').value = 'false';
  await loadViopHoldings();
});

/* ==================================================================
 * FAİZ — Mevduat hesaplayıcı + mevcut mevduat kayıtları
 * ================================================================== */
async function loadDepositHoldings() {
  const { data, error } = await supa
    .from('deposit_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('depositBody');
  const emptyState = document.getElementById('depositEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Mevduat verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const maturityText = row.maturity_date ? new Date(row.maturity_date).toLocaleDateString('tr-TR') : '—';
    const rateText = row.annual_rate == null ? '—' : `%${fmtNumber(row.annual_rate)}`;
    const currentValue = depositCurrentValue(row);
    tr.innerHTML = `
      <td><div class="sym">${escapeHtml(row.bank_name || 'Mevduat')}</div></td>
      <td class="num">${fmtTL(row.principal)}</td>
      <td class="num">${rateText}</td>
      <td class="num">${escapeHtml(maturityText)}</td>
      <td class="num">${fmtTL(currentValue)}</td>
      <td class="num">
        <button type="button" class="del deposit-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>`;
    tr.querySelector('.deposit-delete').addEventListener('click', () => deleteDepositHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteDepositHolding(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('deposit_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Mevduat silinemedi: ' + error.message, 'error');
    return;
  }
  await loadDepositHoldings();
}

document.getElementById('addDepositBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const bankName = document.getElementById('newDepositBankName').value.trim();
  const principal = parseFloat(document.getElementById('newDepositPrincipal').value);
  const annualRate = parseFloat(document.getElementById('newDepositAnnualRate').value);
  const withholdingRateRaw = document.getElementById('newDepositWithholdingRate').value.trim();
  const withholdingRate = withholdingRateRaw === '' ? 0 : parseFloat(withholdingRateRaw);
  const startDateRaw = document.getElementById('newDepositStartDate').value;
  const maturityDateRaw = document.getElementById('newDepositMaturityDate').value;
  if (!bankName || isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 ||
      isNaN(withholdingRate) || withholdingRate < 0 || !startDateRaw || !maturityDateRaw) {
    showMsg('Lütfen mevduat bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }
  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const startDate = new Date(`${startDateRaw}T12:00:00`).toISOString();
  const maturityDate = new Date(`${maturityDateRaw}T12:00:00`).toISOString();
  const { error } = await supa.from('deposit_holdings').upsert({
    id, user_id: user.id, bank_name: bankName, principal, annual_rate: annualRate,
    withholding_rate: withholdingRate, start_date: startDate, maturity_date: maturityDate, deleted_at: null
  }, { onConflict: 'user_id,id' });
  if (error) {
    showMsg('Mevduat eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newDepositBankName', 'newDepositPrincipal', 'newDepositAnnualRate',
    'newDepositWithholdingRate', 'newDepositStartDate', 'newDepositMaturityDate']
    .forEach(id => document.getElementById(id).value = '');
  await loadDepositHoldings();
});

document.getElementById('calcDepositBtn').addEventListener('click', () => {
  const resultsEl = document.getElementById('calcDepositResults');
  const principal = parseFloat(document.getElementById('calcDepositPrincipal').value);
  const annualRate = parseFloat(document.getElementById('calcDepositRate').value);
  const withholdingRate = parseFloat(document.getElementById('calcDepositWithholding').value) || 0;
  const startRaw = document.getElementById('calcDepositStart').value;
  const maturityRaw = document.getElementById('calcDepositMaturity').value;
  if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 || !startRaw || !maturityRaw) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Lütfen tüm alanları geçerli şekilde doldur.</div>`;
    return;
  }
  const startMs = new Date(`${startRaw}T12:00:00`).getTime();
  const maturityMs = new Date(`${maturityRaw}T12:00:00`).getTime();
  let totalDays = Math.round((maturityMs - startMs) / 86400000);
  if (!Number.isFinite(totalDays) || totalDays < 1) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Vade tarihi, başlangıç tarihinden sonra olmalı.</div>`;
    return;
  }
  const grossInterest = principal * (annualRate / 100) * (totalDays / 365);
  const tax = grossInterest * (withholdingRate / 100);
  const netInterest = grossInterest - tax;
  const maturityAmount = principal + netInterest;
  resultsEl.innerHTML = `
    <div class="calc-result-row"><span class="lbl">Vade (gün)</span><span class="val">${totalDays}</span></div>
    <div class="calc-result-row"><span class="lbl">Brüt faiz</span><span class="val">${fmtTL(grossInterest)}</span></div>
    <div class="calc-result-row"><span class="lbl">Stopaj kesintisi</span><span class="val pl-neg">-${fmtTL(tax)}</span></div>
    <div class="calc-result-row"><span class="lbl">Net faiz kazancı</span><span class="val pl-pos">+${fmtTL(netInterest)}</span></div>
    <div class="calc-result-row"><span class="lbl">Vade sonu eline geçecek</span><span class="val">${fmtTL(maturityAmount)}</span></div>
  `;
});

/* ==================================================================
 * KREDİ HESAPLAMA — saf hesaplayıcı (Supabase'e kayıt YOK)
 * Anüite formülü: A = P × [i(1+i)^n] / [(1+i)^n − 1]
 * KKDF ve BSMV, aylık faiz oranına eklenerek "efektif" bir aylık
 * orana dönüştürülür; taksit bu efektif oran ile sabit hesaplanır.
 * Yıllık Maliyet Oranı (YMO), tahsis ücreti de dahil edilerek
 * ikiye bölme (bisection) yöntemiyle aylık iç verim oranından (IRR)
 * türetilir.
 * ================================================================== */
const LOAN_TAX_RATES = {
  ihtiyac: { kkdf: 0.15, bsmv: 0.05 },
  tasit: { kkdf: 0.15, bsmv: 0.05 },
  konut: { kkdf: 0, bsmv: 0 }
};

function annuityPayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * (monthlyRate * factor) / (factor - 1);
}

function solveMonthlyIrr(netProceeds, payment, months) {
  function pvDiff(rate) {
    let pv = 0;
    for (let t = 1; t <= months; t++) pv += payment / Math.pow(1 + rate, t);
    return netProceeds - pv;
  }
  let lo = 0, hi = 3; // %0 - %300 aylık aralık, her zaman yeterli
  for (let iter = 0; iter < 80; iter++) {
    const mid = (lo + hi) / 2;
    if (pvDiff(mid) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

let lastLoanSchedule = [];
let loanScheduleExpanded = false;

function renderLoanSchedule() {
  const tbody = document.getElementById('loanScheduleBody');
  const rows = loanScheduleExpanded ? lastLoanSchedule : lastLoanSchedule.slice(0, 12);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="num">${r.n}</td>
      <td class="num">${fmtTL(r.payment)}</td>
      <td class="num">${fmtTL(r.principalPart)}</td>
      <td class="num">${fmtTL(r.interestTaxPart)}</td>
      <td class="num">${fmtTL(r.remaining)}</td>
    </tr>
  `).join('');
  const toggleBtn = document.getElementById('toggleLoanScheduleBtn');
  if (lastLoanSchedule.length > 12) {
    toggleBtn.style.display = '';
    toggleBtn.textContent = loanScheduleExpanded ? 'Sadece ilk 12 ayı göster' : 'Tümünü göster';
  } else {
    toggleBtn.style.display = 'none';
  }
}

document.getElementById('toggleLoanScheduleBtn').addEventListener('click', () => {
  loanScheduleExpanded = !loanScheduleExpanded;
  renderLoanSchedule();
});

document.getElementById('calcLoanBtn').addEventListener('click', () => {
  const resultsEl = document.getElementById('loanResults');
  const scheduleCard = document.getElementById('loanScheduleCard');
  const principal = parseFloat(document.getElementById('loanAmount').value);
  const annualRate = parseFloat(document.getElementById('loanRate').value);
  const months = parseInt(document.getElementById('loanTerm').value, 10);
  const loanType = document.getElementById('loanType').value;
  const feeRate = parseFloat(document.getElementById('loanFeeRate').value) || 0;

  if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 ||
      isNaN(months) || months < 1) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Lütfen tüm alanları geçerli şekilde doldur.</div>`;
    scheduleCard.style.display = 'none';
    return;
  }

  const taxRates = LOAN_TAX_RATES[loanType] || LOAN_TAX_RATES.ihtiyac;
  const nominalMonthlyRate = annualRate / 12 / 100;
  const effectiveMonthlyRate = nominalMonthlyRate * (1 + taxRates.kkdf + taxRates.bsmv);
  const payment = annuityPayment(principal, effectiveMonthlyRate, months);

  let remaining = principal;
  const schedule = [];
  for (let n = 1; n <= months; n++) {
    const interestTaxPart = remaining * effectiveMonthlyRate;
    let principalPart = payment - interestTaxPart;
    if (n === months) principalPart = remaining; // yuvarlama farkını son taksitte kapat
    remaining = Math.max(0, remaining - principalPart);
    schedule.push({ n, payment, principalPart, interestTaxPart, remaining });
  }
  lastLoanSchedule = schedule;
  loanScheduleExpanded = false;

  const totalRepayment = payment * months;
  const totalInterestTax = totalRepayment - principal;
  const allocationFee = principal * (feeRate / 100);
  const netProceeds = principal - allocationFee;
  const monthlyIrr = solveMonthlyIrr(netProceeds, payment, months);
  const annualCostRate = (Math.pow(1 + monthlyIrr, 12) - 1) * 100;

  resultsEl.innerHTML = `
    <div class="calc-result-row"><span class="lbl">Aylık taksit tutarı</span><span class="val">${fmtTL(payment)}</span></div>
    <div class="calc-result-row"><span class="lbl">Toplam geri ödeme</span><span class="val">${fmtTL(totalRepayment)}</span></div>
    <div class="calc-result-row"><span class="lbl">Toplam faiz + vergi</span><span class="val pl-neg">${fmtTL(totalInterestTax)}</span></div>
    <div class="calc-result-row"><span class="lbl">Tahsis ücreti (yaklaşık)</span><span class="val">${fmtTL(allocationFee)}</span></div>
    <div class="calc-result-row"><span class="lbl">Yıllık Maliyet Oranı (YMO)</span><span class="val">%${annualCostRate.toFixed(2)}</span></div>
  `;
  scheduleCard.style.display = '';
  renderLoanSchedule();
});

/* ==================================================================
 * SAYFA YÜKLEYİCİLERİ — sidebar'dan bir "Varlıklar" alt sayfasına
 * geçildiğinde ilgili tablo yeniden yüklensin diye kaydedilir.
 * ================================================================== */
registerPageLoader('emtia', loadCommodityHoldings);
registerPageLoader('hisse', loadHoldings);
registerPageLoader('fon', loadFundHoldings);
registerPageLoader('kripto', loadCryptoHoldings);
registerPageLoader('faiz', loadDepositHoldings);
registerPageLoader('viop', loadViopHoldings);
