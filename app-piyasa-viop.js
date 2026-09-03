/* ==================================================================
 * app-piyasa-viop.js
 * "Varlıklar → VİOP Aktif Vade": piyasa genelindeki aktif vadeli
 * işlem/opsiyon sözleşmeleri (mobildeki viop_market_screen.dart +
 * viop_detail_screen.dart'ın web karşılığı — isyatirim.com.tr
 * kaynağı price-proxy'nin yeni type=viop-list ucu üzerinden).
 * Kullanıcının KENDİ VİOP pozisyonları "Varlığım" menüsünde
 * (app-varligim.js).
 *
 * Dürüstlük kuralı (mobille birebir): taban/tavan/gün içi yüksek/
 * düşük bu kaynakta YOKTUR, uydurulmaz — "—" gösterilir. Detay
 * grafiği geçmiş veri kaynağı olmadığı için mobildeki gibi yalnızca
 * modal AÇIKKEN 30 saniyede bir güncellenen, oturum içi (session-only)
 * bir "canlı fiyat" sparkline'ıdır; zaman aralığı filtresi YOKTUR.
 * ================================================================== */

let viopContracts = [];
let viopActiveCategory = 'all';

async function loadViopMarketPage() {
  const tbody = document.getElementById('viopMarketBody');
  const emptyState = document.getElementById('viopMarketEmptyState');
  try {
    const result = await cachedFetch('viop-list', 30000, () => fetchPriceProxy('type=viop-list'));
    viopContracts = result.contracts || [];
  } catch (e) {
    viopContracts = [];
  }
  if (viopContracts.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  renderViopList();
}

function renderViopList() {
  const tbody = document.getElementById('viopMarketBody');
  const emptyState = document.getElementById('viopMarketEmptyState');
  const filtered = viopActiveCategory === 'all'
    ? viopContracts
    : viopContracts.filter(c => c.category === viopActiveCategory);
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map((c, idx) => `
    <tr>
      <td>${favoriteStarHtml('viop', c.symbol, { name: c.underlying || c.symbol, price: c.price, changePercent: c.changePercent })}</td>
      <td class="market-row-logo">${viopLogo(c.underlying, c.category, 26)}</td>
      <td>
        <div class="sym">${escapeHtml(c.symbol)}</div>
        <div class="name">${escapeHtml([c.underlying, c.isOption ? 'Opsiyon' : 'Vadeli İşlem'].filter(Boolean).join(' • '))}</div>
      </td>
      <td class="num">${fmtNumber(c.price)}</td>
      <td class="num">${changeChipHtml(c.changePercent)}</td>
      <td class="num">${naIfMissing(c.volumeTl, fmtTL)}</td>
      <td class="num"><button type="button" class="detail-btn" data-open-viop="${idx}">Detay</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-open-viop]').forEach(btn => {
    btn.addEventListener('click', () => openViopDetail(filtered[Number(btn.dataset.openViop)]));
  });
}

document.querySelectorAll('#viopCategoryChips .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#viopCategoryChips .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    viopActiveCategory = chip.dataset.cat;
    renderViopList();
  });
});

function openViopDetail(contract) {
  if (!contract) return;
  const sessionPrices = [{ t: Date.now(), c: contract.price }];
  const categoryToIndex = { equity: 0, index: 1, currency: 2, metal: 3, other: 4 };

  openDetailModal(
    `${escapeHtml(contract.symbol)} <span class="sub">${escapeHtml(contract.underlying || '')}</span>`,
    `
    <div class="stat-mini-grid">
      <div class="stat-mini"><div class="lbl">Güncel Fiyat</div><div class="val" id="viopDetailPrice">${fmtNumber(contract.price)}</div></div>
      <div class="stat-mini"><div class="lbl">Değişim</div><div class="val" id="viopDetailChange">${changeChipHtml(contract.changePercent)}</div></div>
      <div class="stat-mini"><div class="lbl">Taban / Tavan</div><div class="val">— / —</div></div>
      <div class="stat-mini"><div class="lbl">Gün İçi Düşük/Yüksek</div><div class="val">— / —</div></div>
      <div class="stat-mini"><div class="lbl">Hacim (TL)</div><div class="val">${naIfMissing(contract.volumeTl, fmtTL)}</div></div>
      <div class="stat-mini"><div class="lbl">Hacim (Lot)</div><div class="val">${naIfMissing(contract.volumeLot, fmtNumber)}</div></div>
    </div>
    <p style="font-size:12px; color:var(--text-faint); margin: 4px 0 14px;">
      Taban/tavan ve gün içi düşük/yüksek bu kaynakta sağlanmıyor (mobil uygulamada
      da bu alanlar aynı nedenle "—" gösterilir — uydurulmaz).
    </p>
    <div class="detail-section-title">Canlı Fiyat (bu modal açıkken, oturum içi)</div>
    <div class="chart-wrap"><canvas id="detailChartViop"></canvas></div>
    <p style="font-size:11.5px; color:var(--text-faint);">
      Bu sözleşme için geçmiş fiyat veri kaynağı yok; grafik yalnızca bu modal
      açıkken 30 saniyede bir tazelenen anlık fiyatları gösterir.
    </p>
    <div class="detail-section-title">Varlığıma Ekle</div>
    <div class="add-form" style="grid-template-columns: 1fr 1fr;">
      <input id="viopDetailAddLot" type="number" step="any" placeholder="Lot" />
      <input id="viopDetailAddCost" type="number" step="any" placeholder="Birim maliyet (₺) - isteğe bağlı" />
      <button class="btn primary full" id="viopDetailAddBtn" type="button">Varlığıma Ekle</button>
    </div>
    `
  );
  renderSeriesChart('detailChartViop', sessionPrices);

  document.getElementById('viopDetailAddBtn')?.addEventListener('click', async () => {
    const lot = parseFloat(document.getElementById('viopDetailAddLot').value);
    const costRaw = document.getElementById('viopDetailAddCost').value.trim();
    const cost = costRaw === '' ? null : parseFloat(costRaw);
    if (isNaN(lot) || lot <= 0 || (cost != null && isNaN(cost))) {
      showMsg('Lütfen geçerli bir lot (ve isteğe bağlı maliyet) gir.', 'error');
      return;
    }
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    const { error } = await supa.from('viop_holdings').upsert({
      user_id: user.id, symbol: contract.symbol, underlying: contract.underlying || null, code: null,
      is_option: !!contract.isOption, category_index: categoryToIndex[contract.category] ?? 4,
      lot, cost, deleted_at: null
    }, { onConflict: 'user_id,symbol' });
    if (error) {
      showMsg('VİOP pozisyonu eklenemedi: ' + error.message, 'error');
      return;
    }
    showMsg(`${contract.symbol} varlığına eklendi.`, 'success');
  });

  const pollTimer = setInterval(async () => {
    try {
      const quote = await fetchPriceProxy(`type=viop&symbol=${encodeURIComponent(contract.symbol)}`);
      sessionPrices.push({ t: Date.now(), c: quote.price });
      if (sessionPrices.length > 120) sessionPrices.shift();
      renderSeriesChart('detailChartViop', sessionPrices);
      const priceEl = document.getElementById('viopDetailPrice');
      const chgEl = document.getElementById('viopDetailChange');
      if (priceEl) priceEl.textContent = fmtNumber(quote.price);
      if (chgEl) chgEl.innerHTML = changeChipHtml(quote.changePercent);
    } catch (e) {
      // Sessizce atla — bir başarısız anlık istek modalı bozmasın.
    }
  }, 30000);

  setDetailCleanup(() => clearInterval(pollTimer));
}

registerPageLoader('viop', loadViopMarketPage);
