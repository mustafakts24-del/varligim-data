/* ==================================================================
 * app-piyasa-doviz.js
 * "Varlıklar → Döviz": PİYASA fiyat listesi + detay + çevirici
 * (mobildeki cash_currency_screen.dart + currency_detail_screen.dart'ın
 * web karşılığı). Bu, kullanıcının KENDİ döviz varlıkları DEĞİL — o
 * "Varlığım" menüsünde (app-varligim.js, DÖVİZ bölümü); buradan
 * "Varlığıma Ekle" kısayolu o sayfaya yönlendirir.
 *
 * DÜZELTME (2026-09, tam parite denetimi): bu sayfa daha önce hiç
 * yoktu — kullanıcı bir döviz kodunu ancak ezbere yazarak "Varlığım"a
 * ekleyebiliyordu; canlı kur listesi, geçmiş grafik ve çevirici
 * bulunmuyordu. price-proxy'nin var olan `type=currency` ucu (zaten
 * Varlığım/ana sayfa tarafından kullanılıyor) yeniden kullanıldı.
 *
 * Dürüstlük notu: price-proxy'de yalnızca USD/EUR/GBP/CHF/AUD/CAD
 * için DOĞRUDAN bir TRY paritesi Yahoo sembolü var (`{KOD}TRY=X`) ve
 * bu nedenle yalnızca bu 6 döviz için geçmiş grafik çizilebilir; JPY/
 * CNY/RUB/UAH gibi USD üzerinden çapraz hesaplanan kurlar için Yahoo'da
 * doğrudan TRY paritesi olmadığından geçmiş grafik UYDURULMAZ, bunun
 * yerine "bu döviz için grafik desteklenmiyor" notu gösterilir.
 * ================================================================== */

const DOVIZ_MARKET_LIST = [
  { code: 'USD', name: 'Amerikan Doları', chartable: true },
  { code: 'EUR', name: 'Euro', chartable: true },
  { code: 'GBP', name: 'İngiliz Sterlini', chartable: true },
  { code: 'CHF', name: 'İsviçre Frangı', chartable: true },
  { code: 'AUD', name: 'Avustralya Doları', chartable: true },
  { code: 'CAD', name: 'Kanada Doları', chartable: true },
  { code: 'JPY', name: 'Japon Yeni', chartable: false },
  { code: 'CNY', name: 'Çin Yuanı', chartable: false },
  { code: 'RUB', name: 'Rus Rublesi', chartable: false },
  { code: 'UAH', name: 'Ukrayna Grivnası', chartable: false }
];

let dovizFilterText = '';

function filteredDovizList() {
  const q = dovizFilterText.trim().toLocaleUpperCase('tr-TR');
  if (!q) return DOVIZ_MARKET_LIST;
  return DOVIZ_MARKET_LIST.filter(c =>
    c.code.toLocaleUpperCase('tr-TR').includes(q) || c.name.toLocaleUpperCase('tr-TR').includes(q));
}

async function renderDovizList() {
  const tbody = document.getElementById('dovizMarketBody');
  const emptyState = document.getElementById('dovizMarketEmptyState');
  const filtered = filteredDovizList();
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>${favoriteStarHtml('doviz', c.code, { name: c.name })}</td>
      <td class="market-row-logo"><span class="logo-slot logo-emoji" style="width:26px;height:26px;font-size:16px;">💱</span></td>
      <td>
        <div class="sym">${escapeHtml(c.code)}</div>
        <div class="name">${escapeHtml(c.name)}</div>
      </td>
      <td class="num" id="doviz-price-${c.code}">…</td>
      <td class="num" id="doviz-chg-${c.code}">…</td>
      <td class="num"><button type="button" class="detail-btn" data-open-doviz="${c.code}">Detay</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-open-doviz]').forEach(btn => {
    btn.addEventListener('click', () => openDovizDetail(btn.dataset.openDoviz));
  });
  await Promise.all(filtered.map(async (c) => {
    const priceEl = document.getElementById(`doviz-price-${c.code}`);
    const chgEl = document.getElementById(`doviz-chg-${c.code}`);
    if (!priceEl || !chgEl) return;
    try {
      const quote = await cachedFetch(`currency:${c.code}`, 30000, () => fetchPriceProxy(`type=currency&code=${c.code}`));
      priceEl.textContent = fmtTLPrecise(quote.price);
      chgEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      priceEl.textContent = '—';
      chgEl.innerHTML = `<span class="chip neu">—</span>`;
    }
  }));
}

async function loadDovizMarketPage() {
  await renderDovizList();
  initDovizConverter();
}

document.getElementById('dovizSearchInput')?.addEventListener('input', debounce((e) => {
  dovizFilterText = e.target.value;
  renderDovizList();
}, 200));

async function openDovizDetail(code) {
  const item = DOVIZ_MARKET_LIST.find(c => c.code === code);
  if (!item) return;
  openDetailModal(
    `${escapeHtml(item.code)} <span class="sub">${escapeHtml(item.name)}</span>`,
    `
    <div class="stat-mini-grid" id="dovizDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Kur</div><div class="val" id="ddPrice">…</div></div>
      <div class="stat-mini"><div class="lbl">Günlük Değişim</div><div class="val" id="ddChange">…</div></div>
      <div class="stat-mini"><div class="lbl">Önceki Kapanış</div><div class="val" id="ddPrevClose">…</div></div>
    </div>
    ${item.chartable ? `
      <div class="chart-range-row" id="dovizRangeChips">
        ${Object.keys(YAHOO_CHART_RANGES).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
      </div>
      <div class="chart-wrap"><canvas id="detailChartDoviz"></canvas></div>
      <div class="stat-mini-grid" id="dovizPeriodStats"></div>
    ` : `
      <p style="font-size:12px; color:var(--text-faint); margin:10px 0;">
        Bu döviz için geçmiş grafik desteklenmiyor: ${escapeHtml(item.code)}'nin doğrudan bir TL paritesi kaynağı
        yok, kuru USD üzerinden çapraz hesaplanıyor. Geçmiş veri uydurulmaz — yalnızca güncel kur gösterilir.
      </p>
    `}
    <div class="detail-section-title">Varlığıma Ekle</div>
    <p style="font-size:12.5px; color:var(--text-faint); margin:0 0 10px;">
      Döviz varlıkların "Varlığım" sayfasının Nakit ve Döviz bölümünden yönetilir.
    </p>
    <button class="btn primary full" id="dovizGoToAddBtn" type="button">Varlığım → Nakit ve Döviz'e git</button>
    `
  );
  document.getElementById('dovizGoToAddBtn')?.addEventListener('click', () => {
    if (typeof goToVarligimSubtab === 'function') goToVarligimSubtab('nakit-doviz');
  });

  try {
    const quote = await fetchPriceProxy(`type=currency&code=${encodeURIComponent(code)}`);
    document.getElementById('ddPrice').textContent = fmtTLPrecise(quote.price);
    document.getElementById('ddChange').innerHTML = changeChipHtml(quote.changePercent);
    document.getElementById('ddPrevClose').textContent = naIfMissing(quote.previousClose, fmtTLPrecise);
  } catch (e) {
    document.getElementById('ddPrice').textContent = '—';
    document.getElementById('ddChange').textContent = '—';
    document.getElementById('ddPrevClose').textContent = '—';
  }

  if (item.chartable) {
    bindChartRangeChips(document.getElementById('dovizRangeChips'), '1A', async (rangeKey) => {
      const statsEl = document.getElementById('dovizPeriodStats');
      try {
        const points = await fetchYahooRangeSeries(`${code}TRY=X`, rangeKey);
        renderPriceChart('detailChartDoviz', points);
        const stats = periodStatsFromPoints(points);
        statsEl.innerHTML = stats ? `
          <div class="stat-mini"><div class="lbl">Dönem Düşük</div><div class="val">${fmtTLPrecise(stats.low)}</div></div>
          <div class="stat-mini"><div class="lbl">Dönem Yüksek</div><div class="val">${fmtTLPrecise(stats.high)}</div></div>
          <div class="stat-mini"><div class="lbl">Dönem Değişimi</div><div class="val">${changeChipHtml(stats.changePercent)}</div></div>
        ` : `<div class="stat-mini"><div class="lbl">Veri yok</div><div class="val">—</div></div>`;
      } catch (e) {
        statsEl.innerHTML = `<div class="stat-mini"><div class="lbl">Veri alınamadı</div><div class="val">—</div></div>`;
      }
    });
  }
}

/* ------------------------------------------------------------------
 * DÖVİZ ÇEVİRİCİ (mobildeki CurrencyConverterScreen'in basitleştirilmiş
 * web karşılığı — TL <-> seçilen döviz, tek yönlü canlı kur ile).
 * ------------------------------------------------------------------ */
let dovizConverterInitialized = false;
function initDovizConverter() {
  if (dovizConverterInitialized) return;
  dovizConverterInitialized = true;
  const select = document.getElementById('dovizConverterCurrency');
  if (!select) { dovizConverterInitialized = false; return; }
  select.innerHTML = DOVIZ_MARKET_LIST.map(c => `<option value="${c.code}">${escapeHtml(c.code)} — ${escapeHtml(c.name)}</option>`).join('');

  const tryInput = document.getElementById('dovizConverterTry');
  const fxInput = document.getElementById('dovizConverterFx');
  let lastQuotePrice = null;

  async function refreshRate() {
    const code = select.value;
    try {
      const quote = await cachedFetch(`currency:${code}`, 30000, () => fetchPriceProxy(`type=currency&code=${code}`));
      lastQuotePrice = quote.price;
      const label = document.getElementById('dovizConverterRateLabel');
      if (label) label.textContent = `1 ${code} = ${fmtTLPrecise(quote.price)}`;
      recalcFromTry();
    } catch (e) {
      lastQuotePrice = null;
      const label = document.getElementById('dovizConverterRateLabel');
      if (label) label.textContent = 'Kur alınamadı';
    }
  }
  function recalcFromTry() {
    if (lastQuotePrice == null) return;
    const tryAmount = parseFloat(tryInput.value);
    if (!isNaN(tryAmount)) fxInput.value = (tryAmount / lastQuotePrice).toFixed(4);
  }
  function recalcFromFx() {
    if (lastQuotePrice == null) return;
    const fxAmount = parseFloat(fxInput.value);
    if (!isNaN(fxAmount)) tryInput.value = (fxAmount * lastQuotePrice).toFixed(2);
  }
  select.addEventListener('change', refreshRate);
  tryInput.addEventListener('input', recalcFromTry);
  fxInput.addEventListener('input', recalcFromFx);
  refreshRate();
}

registerPageLoader('doviz', loadDovizMarketPage);
