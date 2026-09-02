/* ==================================================================
 * app-piyasa-fon.js
 * "Varlıklar → Yatırım Fonları": TEFAS'taki TÜM fon kataloğu
 * (mobildeki funds_screen.dart + fund_detail_screen.dart'ın web
 * karşılığı) — sadece kullanıcının sahip olduğu fonlar değil.
 * Kullanıcının KENDİ fon portföyü "Varlığım" menüsünde (app-varligim.js).
 *
 * Bilinen sınırlama (FAZ 4): mobildeki toplu "fonGetiriBazliBilgiGetir"
 * uç noktası (sayfalanmış, 10 sayfaya kadar) performans/timeout riski
 * nedeniyle price-proxy'de proxy'lenmedi (bkz. index.ts yorumu); bu
 * yüzden katalogda "getiriye göre sırala" YOK — kod/ad/kurucu/risk'e
 * göre sıralama/arama var. Fon DETAY sayfasında ise gerçek dönemsel
 * getiri, fund-history üzerinden istemci tarafında hesaplanır.
 * ================================================================== */

const FON_RANGE_MONTHS = { '1A': 1, '3A': 3, '6A': 6, 'YBB': null, '1Y': 12, '3Y': 36, '5Y': 60 };

// Mobildeki funds_screen.dart _matchesFundType() anahtar kelime haritasından
// BİREBİR alınmıştır (kural: mobildeki mantığı referans al). "Emeklilik"
// mobilde ayrı bir anahtar kelime seti olarak yok; TEFAS'ta emeklilik
// fonları genelde ad içinde "Emeklilik Yatırım Fonu" ibaresi taşıdığından
// bu tek anahtar kelimeyle (ad üzerinden) eklenmiştir — şeffaflık için
// burada not ediliyor.
const FON_CATEGORY_KEYWORDS = {
  'Hisse Senedi': ['HİSSE SENEDİ', 'HISSE SENEDI'],
  'Değişken': ['DEĞİŞKEN', 'DEGISKEN'],
  'Para Piyasası': ['PARA PİYASASI', 'PARA PIYASASI'],
  'Borçlanma Araçları': ['BORÇLANMA', 'TAHVİL', 'BONO'],
  'Kıymetli Madenler': ['KIYMETLİ MADEN', 'KIYMETLI MADEN', 'ALTIN', 'GÜMÜŞ', 'GUMUS'],
  'Fon Sepeti': ['FON SEPETİ', 'FON SEPETI'],
  'Katılım': ['KATILIM'],
  'Emeklilik': ['EMEKLİLİK', 'EMEKLILIK'],
  'Serbest': ['SERBEST']
};

function fundMatchesCategory(fund, catLabel) {
  if (catLabel === 'all') return true;
  const keywords = FON_CATEGORY_KEYWORDS[catLabel];
  if (!keywords) return true;
  const source = `${fund.fundType || ''} ${fund.name || ''}`.toLocaleUpperCase('tr-TR');
  return keywords.some(k => source.includes(k));
}

let fonCatalog = [];
let fonVisibleCount = 40;
const FON_PAGE_SIZE = 40;
let fonFilterText = '';
let fonActiveCategory = 'all';

async function ensureFonCatalog() {
  if (fonCatalog.length > 0) return;
  try {
    const result = await cachedFetch('fund-catalog', 30 * 60 * 1000, () =>
      fetchPriceProxy('type=fund-catalog'));
    fonCatalog = (result && Array.isArray(result.funds)) ? result.funds : [];
  } catch (e) {
    fonCatalog = [];
  }
}

function filteredFonCatalog() {
  const q = fonFilterText.trim().toLocaleUpperCase('tr-TR');
  return fonCatalog.filter(f => {
    if (!fundMatchesCategory(f, fonActiveCategory)) return false;
    if (!q) return true;
    return (f.code || '').toLocaleUpperCase('tr-TR').includes(q) ||
      (f.name || '').toLocaleUpperCase('tr-TR').includes(q) ||
      (f.founderName || '').toLocaleUpperCase('tr-TR').includes(q);
  });
}

function renderFonList() {
  const tbody = document.getElementById('fonMarketBody');
  const emptyState = document.getElementById('fonMarketEmptyState');
  const loadMoreBtn = document.getElementById('fonLoadMoreBtn');
  const filtered = filteredFonCatalog();
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  const visible = filtered.slice(0, fonVisibleCount);
  tbody.innerHTML = visible.map(f => `
    <tr>
      <td>${favoriteStarHtml('fon', f.code, { name: f.name, price: f.price })}</td>
      <td class="market-row-logo">${fundLogoImg(f.founderName, f.name, f.code, 26)}</td>
      <td>
        <div class="sym">${escapeHtml(f.code)}</div>
        <div class="name">${escapeHtml(f.name || '')}${f.founderName ? ' · ' + escapeHtml(f.founderName) : ''}</div>
      </td>
      <td class="num">${naIfMissing(f.price, fmtTLPrecise)}</td>
      <td class="num"><button type="button" class="detail-btn" data-open-fund="${escapeHtml(f.code)}">Detay</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-open-fund]').forEach(btn => {
    btn.addEventListener('click', () => openFundDetail(btn.dataset.openFund));
  });
  loadMoreBtn.style.display = filtered.length > fonVisibleCount ? '' : 'none';
}

async function loadFonMarketPage() {
  fonVisibleCount = FON_PAGE_SIZE;
  const emptyState = document.getElementById('fonMarketEmptyState');
  await ensureFonCatalog();
  if (fonCatalog.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = 'Fon kataloğu şu anda alınamıyor.';
    document.getElementById('fonMarketBody').innerHTML = '';
    document.getElementById('fonLoadMoreBtn').style.display = 'none';
    return;
  }
  renderFonList();
}

document.getElementById('fonSearchInput').addEventListener('input', debounce((e) => {
  fonFilterText = e.target.value;
  fonVisibleCount = FON_PAGE_SIZE;
  renderFonList();
}, 250));

document.getElementById('fonLoadMoreBtn').addEventListener('click', () => {
  fonVisibleCount += FON_PAGE_SIZE;
  renderFonList();
});

document.querySelectorAll('#fonCategoryChips .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#fonCategoryChips .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    fonActiveCategory = chip.dataset.cat;
    fonVisibleCount = FON_PAGE_SIZE;
    renderFonList();
  });
});

function fmtInvestorCount(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Math.round(Number(v)).toLocaleString('tr-TR');
}

function fmtFundSizeTl(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (n >= 1e9) return `₺${(n / 1e9).toFixed(2).replace('.', ',')} Mr`;
  if (n >= 1e6) return `₺${(n / 1e6).toFixed(1).replace('.', ',')} Mn`;
  return fmtTL(n);
}

function fmtManagementFee(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `%${Number(v).toFixed(2).replace('.', ',')}`;
}

async function openFundDetail(code) {
  const meta = fonCatalog.find(f => f.code === code) || { code, name: '' };
  openDetailModal(
    `${escapeHtml(code)} <span class="sub">${escapeHtml(meta.name || '')}</span>`,
    `
    <div class="stat-mini-grid" id="fundDetailStats">
      <div class="stat-mini"><div class="lbl">Güncel Fiyat</div><div class="val">${naIfMissing(meta.price, fmtTLPrecise)}</div></div>
      <div class="stat-mini"><div class="lbl">Kurucu</div><div class="val" style="font-size:12px;">${escapeHtml(meta.founderName || '—')}</div></div>
      <div class="stat-mini"><div class="lbl">Fon Tipi</div><div class="val" style="font-size:12px;">${escapeHtml(meta.fundType || '—')}</div></div>
      <div class="stat-mini"><div class="lbl">Risk Değeri</div><div class="val" id="fundDetailRisk">${naIfMissing(meta.riskValue)}</div></div>
    </div>

    <!-- KULLANICI RAPORU #7: Tedavüldeki Pay/Fon Büyüklüğü/Yatırımcı Sayısı
         TEFAS toplu kataloğundan (ek istek olmadan) geliyor; Yönetim Ücreti
         ise tek fon için KAP'tan (type=fund-detail) tembel (lazy) yükleniyor. -->
    <div class="stat-mini-grid" id="fundDetailStats2" style="margin-top:8px;">
      <div class="stat-mini"><div class="lbl">Tedavüldeki Pay</div><div class="val" style="font-size:12.5px;">${fmtInvestorCount(meta.outstandingShareCount)}</div></div>
      <div class="stat-mini"><div class="lbl">Yönetim Ücreti</div><div class="val" id="fundDetailFee">Yükleniyor…</div></div>
      <div class="stat-mini"><div class="lbl">Fon Büyüklüğü</div><div class="val" style="font-size:12.5px;">${fmtFundSizeTl(meta.fundSize)}</div></div>
      <div class="stat-mini"><div class="lbl">Yatırımcı Sayısı</div><div class="val" style="font-size:12.5px;">${fmtInvestorCount(meta.investorCount)}</div></div>
    </div>

    <div class="chart-range-row" id="fundRangeChips">
      ${Object.keys(FON_RANGE_MONTHS).map(r => `<div class="filter-chip" data-range="${r}">${r}</div>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="detailChartFund"></canvas></div>
    <div class="detail-section-title">Getiri Performansı</div>
    <table class="kv-table" id="fundReturnTable"><tr><td>Yükleniyor…</td><td></td></tr></table>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
      ${technicalAnalysisButtonHtml('fundTaBtn')}
      <button type="button" class="btn outline small" id="fundCompetitorBtn">
        <span class="msr" style="font-size:15px; vertical-align:-3px;">bar_chart</span> Rakip Analizi
      </button>
    </div>
    <div id="fundCompetitorBlock" style="display:none; margin-top:10px;"></div>
    `
  );
  bindTechnicalAnalysisButton('fundTaBtn', {
    title: `${code} — ${meta.name || ''}`, assetType: 'fund', fundCode: code,
  });

  bindChartRangeChips(document.getElementById('fundRangeChips'), '1Y', async (rangeKey) => {
    const table = document.getElementById('fundReturnTable');
    try {
      const points = await fetchFundRangeSeries(code, rangeKey);
      renderPriceChart('detailChartFund', points);
      const stats = periodStatsFromPoints(points);
      table.innerHTML = stats
        ? `<tr><td>${escapeHtml(rangeKey)} Getiri</td><td>${changeChipHtml(stats.changePercent)}</td></tr>
           <tr><td>Dönem Düşük</td><td>${fmtTLPrecise(stats.low)}</td></tr>
           <tr><td>Dönem Yüksek</td><td>${fmtTLPrecise(stats.high)}</td></tr>`
        : `<tr><td colspan="2">Bu dönem için veri yok.</td></tr>`;
    } catch (e) {
      renderPriceChart('detailChartFund', []);
      table.innerHTML = `<tr><td colspan="2">Fiyat geçmişi alınamadı.</td></tr>`;
    }
  });

  // Yönetim Ücreti + (kataloğun veremediği durumlarda) Risk Değeri: KAP
  // taraması tek fon için lazy-load edilir (bkz. price-proxy type=fund-detail).
  (async () => {
    const feeEl = document.getElementById('fundDetailFee');
    const riskEl = document.getElementById('fundDetailRisk');
    try {
      const result = await cachedFetch(`fund-detail:${code}`, 30 * 60 * 1000, () =>
        fetchPriceProxy(`type=fund-detail&code=${encodeURIComponent(code)}&name=${encodeURIComponent(meta.name || '')}`));
      const kap = result && result.kap;
      if (feeEl) feeEl.textContent = fmtManagementFee(kap && kap.managementFee);
      if (riskEl && meta.riskValue == null && kap && kap.riskValue != null) {
        riskEl.textContent = String(kap.riskValue);
      }
    } catch (e) {
      if (feeEl) feeEl.textContent = '—';
    }
  })();

  const competitorBtn = document.getElementById('fundCompetitorBtn');
  const competitorBlock = document.getElementById('fundCompetitorBlock');
  if (competitorBtn && competitorBlock) {
    competitorBtn.addEventListener('click', async () => {
      const opening = competitorBlock.style.display === 'none';
      competitorBlock.style.display = opening ? '' : 'none';
      if (!opening) return;
      competitorBlock.innerHTML = `<div class="empty" style="padding:10px 0;">Yükleniyor…</div>`;
      await renderFundCompetitors(code, competitorBlock);
    });
  }
}

/* ------------------------------------------------------------------
 * RAKİP ANALİZİ (kullanıcı raporu #7)
 * Dürüstlük notu: mobil uygulamadaki "fon rakip analiz" ekranının
 * kaynak kodu bu teslimatta mevcut değildi (kontrol edildi), o yüzden
 * o ekranın iç mantığı uydurulmadı. Bunun yerine, ELİMİZDE GERÇEKTEN
 * olan veriyle (aynı kategori + güncel fiyat) dürüst ve kullanışlı bir
 * karşılaştırma listesi üretilir: fonun adına göre (TEFAS artık
 * fonTuru alanını döndürmediği için) hangi FON_CATEGORY_KEYWORDS
 * kategorisine girdiği bulunur, o kategorideki diğer fonlar listelenir.
 * ------------------------------------------------------------------ */
function fundCategoriesOf(fund) {
  return Object.keys(FON_CATEGORY_KEYWORDS).filter(cat => fundMatchesCategory(fund, cat));
}

async function renderFundCompetitors(code, container) {
  await ensureFonCatalog();
  const fund = fonCatalog.find(f => f.code === code);
  if (!fund) {
    container.innerHTML = `<div class="empty" style="padding:10px 0;">Fon bulunamadı.</div>`;
    return;
  }
  const categories = fundCategoriesOf(fund);
  if (categories.length === 0) {
    container.innerHTML = `<div class="empty" style="padding:10px 0;">Bu fon için kategori eşleşmesi bulunamadı, rakip listesi çıkarılamadı.</div>`;
    return;
  }
  const peers = fonCatalog
    .filter(f => f.code !== code && categories.some(cat => fundMatchesCategory(f, cat)))
    .slice(0, 12);
  if (peers.length === 0) {
    container.innerHTML = `<div class="empty" style="padding:10px 0;">Aynı kategoride başka fon bulunamadı.</div>`;
    return;
  }
  container.innerHTML = `
    <div class="heatmap-section-sub" style="margin-bottom:8px;">
      Kategori: <strong>${escapeHtml(categories.join(', '))}</strong> · fon adına göre eşleştirildi
      (TEFAS artık fon türü/kurucu/risk alanlarını API üzerinden döndürmüyor —
      dürüstlük notu: getiriye göre sıralama yerine güncel fiyat listelendi).
    </div>
    <table class="kv-table market-table">
      <tbody>
        ${peers.map(f => `
          <tr>
            <td class="market-row-logo">${fundLogoImg(f.founderName, f.name, f.code, 22)}</td>
            <td><div class="sym">${escapeHtml(f.code)}</div><div class="name">${escapeHtml(f.name || '')}</div></td>
            <td class="num">${naIfMissing(f.price, fmtTLPrecise)}</td>
            <td class="num"><button type="button" class="detail-btn" data-open-fund-peer="${escapeHtml(f.code)}">Detay</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
  container.querySelectorAll('[data-open-fund-peer]').forEach(btn => {
    btn.addEventListener('click', () => openFundDetail(btn.dataset.openFundPeer));
  });
}

registerPageLoader('fon', loadFonMarketPage);
