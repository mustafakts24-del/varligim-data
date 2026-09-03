/* ==================================================================
 * app-charts.js
 * Ortak GELİŞMİŞ GRAFİK katmanı. app-core.js'teki mevcut basit
 * renderSeriesChart/fetchYahooRangeSeries/bindChartRangeChips ÇALIŞAN
 * kodlarına DOKUNULMADI — bu dosya onların üzerine, zengin tarih/OHLCV
 * tooltip'i olan bir çizim fonksiyonu ve fon geçmişi için birleşik
 * `type=history` uç noktasını kullanan bir yardımcı ekliyor. Ayrıca her
 * detay modalına "Teknik Analiz" butonunu bağlayan tek bir fonksiyon
 * sağlıyor (app-technical-analysis.js'i tembel/lazy yükler — kural 14:
 * ağır kütüphane yalnızca kullanıcı gerçekten butona basınca yüklenir).
 * ================================================================== */

/**
 * fetchYahooRangeSeries ile AYNI sözleşim, tek fark: Yahoo sembolü
 * yerine TEFAS fon kodu alır ve birleşik `type=history&assetType=fund`
 * ucunu kullanır (bkz. price-proxy index.ts). fund-history endpoint'i
 * DEĞİŞTİRİLMEDİ; bu yalnızca aynı sonucu döndüren alternatif bir yol.
 */
const FON_RANGE_MONTHS_MAP = { '1A': 1, '3A': 3, '6A': 6, 'YBB': null, '1Y': 12, '3Y': 36, '5Y': 60 };

async function fetchFundRangeSeries(code, rangeKey) {
  let months = FON_RANGE_MONTHS_MAP[rangeKey];
  if (months == null) {
    // YBB (yıl başından bugüne): ay sayısını bugünün ayına göre hesapla.
    months = new Date().getMonth() + 1;
  }
  const cacheKey = `history:fund:${code}:${months}`;
  const data = await cachedFetch(cacheKey, 60000, () =>
    fetchPriceProxy(`type=history&assetType=fund&symbol=${encodeURIComponent(code)}&months=${months}`)
  );
  return data.points || [];
}

/**
 * renderSeriesChart'ın zengin sürümü: fare/dokunma ile üzerine
 * gelindiğinde tarih/saat + açılış/yüksek/düşük/kapanış/hacim
 * (mevcutsa) gösteren bir tooltip kullanır. Chart.js'in interaction
 * mode:'index' özelliğiyle grafik üzerinde herhangi bir yatay
 * konumda gezinmek en yakın veri noktasını gösterir.
 */
function renderPriceChart(canvasId, points, opts) {
  opts = opts || {};
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
  if (!points || points.length === 0) return null;

  const values = points.map(p => p.c);
  const isUp = values.length > 1 && values[values.length - 1] >= values[0];
  const lineColor = opts.color || (isUp ? '#16a34a' : '#dc2626');

  const spanMs = points.length > 1 ? (points[points.length - 1].t - points[0].t) : 0;
  const isIntraday = spanMs > 0 && spanMs < 3 * 24 * 3600 * 1000;
  const labels = points.map(p => isIntraday
    ? new Date(p.t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : new Date(p.t).toLocaleDateString('tr-TR'));

  _chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: lineColor,
        backgroundColor: lineColor + '22',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: lineColor,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => {
              const p = points[items[0].dataIndex];
              return new Date(p.t).toLocaleString('tr-TR');
            },
            label: (item) => {
              const p = points[item.dataIndex];
              const lines = [];
              if (p.o != null) lines.push(`Açılış: ${fmtNumber(p.o)}`);
              if (p.h != null) lines.push(`Yüksek: ${fmtNumber(p.h)}`);
              if (p.l != null) lines.push(`Düşük: ${fmtNumber(p.l)}`);
              lines.push(`Kapanış: ${fmtNumber(p.c)}`);
              if (p.v != null) lines.push(`Hacim: ${fmtNumber(p.v)}`);
              return lines;
            }
          }
        }
      },
      scales: {
        x: { display: opts.showXAxis !== false, ticks: { maxTicksLimit: 6, autoSkip: true } },
        y: { display: true, ticks: { maxTicksLimit: 5 } }
      }
    }
  });
  return _chartInstances[canvasId];
}

/**
 * "Teknik Analiz" butonu markup'ı. `containerEl` içine eklenir;
 * tıklanınca app-technical-analysis.js'i (henüz yüklenmediyse) tembel
 * yükler ve tam ekran teknik analiz modunu açar.
 *
 * `getPoints()` -> güncel dönem noktalarını (o/h/l/c/v) döndüren bir
 * fonksiyon olmalı (VİOP gibi geçmiş verisi olmayan varlıklarda bu
 * buton hiç eklenmez, bkz. çağıran kod).
 */
let _taModuleLoadPromise = null;
function ensureTechnicalAnalysisModule() {
  if (typeof openTechnicalAnalysis === 'function') return Promise.resolve();
  if (_taModuleLoadPromise) return _taModuleLoadPromise;
  _taModuleLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'app-technical-analysis.js?v=20260903-4';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Teknik analiz modülü yüklenemedi.'));
    document.head.appendChild(script);
  });
  return _taModuleLoadPromise;
}

function technicalAnalysisButtonHtml(id) {
  return `<button type="button" class="btn outline small ta-open-btn" id="${id}" style="margin-top:8px;">
    <span class="msr" style="font-size:15px; vertical-align:-3px;">candlestick_chart</span> Teknik Analiz
  </button>`;
}

/**
 * Bir detay modalındaki "Teknik Analiz" butonunu bağlar.
 * @param buttonId  buton elementinin id'si
 * @param config    { title, assetType: 'stock'|'commodity'|'index'|'fund'|'crypto',
 *                    symbol, yahooSymbol, fundCode, cryptoId, currency }
 */
function bindTechnicalAnalysisButton(buttonId, config) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = 'Yükleniyor…';
    try {
      await ensureTechnicalAnalysisModule();
      await openTechnicalAnalysis(config);
    } catch (e) {
      showMsg('Teknik analiz modülü yüklenemedi: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}
