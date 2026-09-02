/* ==================================================================
 * app-technical-analysis.js
 * Tam ekran "Teknik Analiz" modu. app-charts.js tarafından tembel
 * (lazy) yüklenir — yalnızca kullanıcı gerçekten "Teknik Analiz"
 * butonuna bastığında indirilir (kural 14: performans).
 *
 * Mum/çizgi/alan grafiği + hacim TradingView'ın açık kaynaklı,
 * ücretsiz "lightweight-charts" kütüphanesiyle (CDN, MIT lisanslı)
 * çizilir. Göstergeler (SMA/EMA/RSI/MACD/Bollinger/Stochastic/VWAP)
 * bu dosyada saf JavaScript ile HESAPLANIR (uydurulmuş/örnek veri
 * DEĞİL — gerçek OHLCV noktalarından). Çizim araçları (trend/yatay/
 * dikey çizgi, dikdörtgen, ok, metin, Fibonacci) lightweight-charts'ın
 * ücretsiz sürümünde bulunmadığından, grafiğin üzerine yerleştirilen
 * şeffaf bir <canvas> katmanıyla BU DOSYADA uygulanmıştır; grafik
 * kaydırıldıkça/yakınlaştırıldıkça çizimler `timeScale`/`priceScale`
 * koordinat dönüşümleriyle yeniden hizalanır.
 *
 * VİOP hariç tüm gerçek OHLC kaynağı olan varlıklarda kullanılabilir
 * (bkz. bilinen sınırlama: VİOP'ta isyatirim.com.tr'den geçmiş fiyat
 * verisi alınamıyor, bu yüzden bu modül VİOP detaylarına eklenmedi).
 * ================================================================== */

const TA_LWC_CDN = 'https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';

function ensureLightweightCharts() {
  if (typeof LightweightCharts !== 'undefined') return Promise.resolve();
  if (window._lwcLoadPromise) return window._lwcLoadPromise;
  window._lwcLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TA_LWC_CDN;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Grafik kütüphanesi (lightweight-charts) yüklenemedi.'));
    document.head.appendChild(s);
  });
  return window._lwcLoadPromise;
}

/* ------------------------------------------------------------------
 * GÖSTERGE HESAPLAMALARI (gerçek OHLCV noktalarından — uydurulmaz)
 * ------------------------------------------------------------------ */
function taSMA(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function taEMA(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    if (prev == null) {
      // ilk period kadar basit ortalama ile başla
      if (i >= period - 1) {
        const slice = values.slice(i - period + 1, i + 1);
        prev = slice.reduce((a, b) => a + b, 0) / period;
        out[i] = prev;
      }
    } else {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

function taRSI(closes, period) {
  period = period || 14;
  const out = new Array(closes.length).fill(null);
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i <= period) {
      gainSum += gain; lossSum += loss;
      if (i === period) {
        const avgGain = gainSum / period, avgLoss = lossSum / period;
        out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
      }
    } else {
      gainSum = (gainSum * (period - 1) + gain) / period;
      lossSum = (lossSum * (period - 1) + loss) / period;
      out[i] = lossSum === 0 ? 100 : 100 - (100 / (1 + gainSum / lossSum));
    }
  }
  return out;
}

function taMACD(closes, fast, slow, signalPeriod) {
  fast = fast || 12; slow = slow || 26; signalPeriod = signalPeriod || 9;
  const emaFast = taEMA(closes, fast);
  const emaSlow = taEMA(closes, slow);
  const macdLine = closes.map((_, i) => (emaFast[i] != null && emaSlow[i] != null) ? emaFast[i] - emaSlow[i] : null);
  const macdValuesOnly = macdLine.filter(v => v != null);
  const signalRaw = taEMA(macdValuesOnly, signalPeriod);
  const signalLine = new Array(closes.length).fill(null);
  let j = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) { signalLine[i] = signalRaw[j] != null ? signalRaw[j] : null; j++; }
  }
  const histogram = closes.map((_, i) => (macdLine[i] != null && signalLine[i] != null) ? macdLine[i] - signalLine[i] : null);
  return { macdLine, signalLine, histogram };
}

function taBollinger(closes, period, mult) {
  period = period || 20; mult = mult || 2;
  const mid = taSMA(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i];
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { mid, upper, lower };
}

function taStochastic(highs, lows, closes, kPeriod, dPeriod) {
  kPeriod = kPeriod || 14; dPeriod = dPeriod || 3;
  const k = new Array(closes.length).fill(null);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const hSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lSlice = lows.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...hSlice), lowest = Math.min(...lSlice);
    k[i] = highest === lowest ? 50 : ((closes[i] - lowest) / (highest - lowest)) * 100;
  }
  const kValuesOnly = k.filter(v => v != null);
  const dRaw = taSMA(kValuesOnly, dPeriod);
  const d = new Array(closes.length).fill(null);
  let j = 0;
  for (let i = 0; i < closes.length; i++) {
    if (k[i] != null) { d[i] = dRaw[j] != null ? dRaw[j] : null; j++; }
  }
  return { k, d };
}

function taVWAP(bars) {
  // Kümülatif tipik fiyat × hacim / kümülatif hacim. Hacim verisi
  // olmayan noktalarda (bazı Yahoo aralıklarında/emtia-fon serilerinde
  // hacim yoktur) VWAP hesaplanamaz — bu durumda null dizisi döner ve
  // arayüz göstergeyi "bu varlık için hacim verisi yok" notuyla atlar.
  const out = new Array(bars.length).fill(null);
  let cumPV = 0, cumV = 0;
  let any = false;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (b.v == null || !Number.isFinite(b.v) || b.v <= 0) { out[i] = null; continue; }
    any = true;
    const typical = (b.h != null && b.l != null) ? (b.h + b.l + b.c) / 3 : b.c;
    cumPV += typical * b.v;
    cumV += b.v;
    out[i] = cumV > 0 ? cumPV / cumV : null;
  }
  return any ? out : null;
}

/* ------------------------------------------------------------------
 * VERİ ÇEKME — assetType'a göre en geniş güvenilir aralığı çeker.
 * ------------------------------------------------------------------ */
async function taFetchBars(config) {
  if (config.assetType === 'fund') {
    const points = await fetchFundRangeSeries(config.fundCode, '5Y');
    return points.map(p => ({ t: p.t, o: p.c, h: p.c, l: p.c, c: p.c, v: null }));
  }
  if (config.assetType === 'crypto') {
    // CoinGecko /coins/{id}/ohlc, mobildeki CryptoService.getOhlcHistory
    // ile aynı gerçek OHLC kaynağı (hacim bu uç noktada yok — uydurulmaz).
    return await fetchCryptoOhlcSeries(config.cryptoId, 90);
  }
  // stock / commodity / index — hepsi Yahoo sembolü ile aynı OHLC kaynağı.
  const points = await fetchYahooRangeSeries(config.yahooSymbol, '1Y');
  return points;
}

/* ------------------------------------------------------------------
 * ANA GİRİŞ NOKTASI
 * ------------------------------------------------------------------ */
async function openTechnicalAnalysis(config) {
  await ensureLightweightCharts();

  const overlay = document.createElement('div');
  overlay.className = 'ta-overlay';
  overlay.innerHTML = `
    <div class="ta-topbar">
      <div class="ta-title">${escapeHtml(config.title || '')}</div>
      <div class="ta-toolbar">
        <div class="ta-group" id="taChartTypeGroup">
          <button type="button" class="ta-btn active" data-chart-type="candlestick">Mum</button>
          <button type="button" class="ta-btn" data-chart-type="line">Çizgi</button>
          <button type="button" class="ta-btn" data-chart-type="area">Alan</button>
        </div>
        <div class="ta-group" id="taOverlayGroup">
          <button type="button" class="ta-btn" data-overlay="sma">SMA</button>
          <button type="button" class="ta-btn" data-overlay="ema">EMA</button>
          <button type="button" class="ta-btn" data-overlay="bollinger">Bollinger</button>
          <button type="button" class="ta-btn" data-overlay="vwap">VWAP</button>
          <button type="button" class="ta-btn active" data-overlay="volume">Hacim</button>
        </div>
        <div class="ta-group" id="taOscGroup">
          <button type="button" class="ta-btn" data-osc="none">Alt Gösterge Yok</button>
          <button type="button" class="ta-btn" data-osc="rsi">RSI</button>
          <button type="button" class="ta-btn" data-osc="macd">MACD</button>
          <button type="button" class="ta-btn" data-osc="stochastic">Stochastic</button>
        </div>
        <div class="ta-group" id="taDrawGroup">
          <button type="button" class="ta-btn" data-draw="trend" title="Trend Çizgisi">╱</button>
          <button type="button" class="ta-btn" data-draw="horizontal" title="Yatay Çizgi">─</button>
          <button type="button" class="ta-btn" data-draw="vertical" title="Dikey Çizgi">│</button>
          <button type="button" class="ta-btn" data-draw="rect" title="Dikdörtgen">▭</button>
          <button type="button" class="ta-btn" data-draw="arrow" title="Ok">↗</button>
          <button type="button" class="ta-btn" data-draw="fib" title="Fibonacci Retracement">Fib</button>
          <button type="button" class="ta-btn" data-draw="text" title="Not Ekle">T</button>
          <button type="button" class="ta-btn" id="taClearDrawings" title="Çizimleri Temizle">🗑</button>
        </div>
        <div class="ta-group">
          <button type="button" class="ta-btn" id="taFullscreenBtn" title="Tam Ekran">⛶</button>
          <button type="button" class="ta-btn ta-close" id="taCloseBtn">✕ Kapat</button>
        </div>
      </div>
    </div>
    <div class="ta-body">
      <div class="ta-chart-stack">
        <div class="ta-main-pane">
          <div id="taMainChart" class="ta-chart-el"></div>
          <canvas id="taDrawCanvas" class="ta-draw-canvas"></canvas>
        </div>
        <div id="taOscPane" class="ta-osc-pane" style="display:none;">
          <div id="taOscChart" class="ta-chart-el"></div>
        </div>
      </div>
      <div class="ta-status" id="taStatus">Veri yükleniyor…</div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const state = {
    bars: [],
    chartType: 'candlestick',
    overlays: new Set(['volume']),
    oscillator: 'none',
    drawTool: null,
    drawings: [],
    pendingPoints: [],
    mainChart: null,
    mainSeries: null,
    volumeSeries: null,
    overlaySeries: {},
    oscChart: null,
    oscSeries: [],
  };

  function close() {
    document.body.style.overflow = '';
    overlay.remove();
    window.removeEventListener('resize', onResize);
  }
  overlay.querySelector('#taCloseBtn').addEventListener('click', close);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  overlay.tabIndex = -1;
  overlay.focus();

  overlay.querySelector('#taFullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) overlay.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  try {
    state.bars = await taFetchBars(config);
  } catch (e) {
    overlay.querySelector('#taStatus').textContent = 'Geçmiş veri alınamadı: ' + e.message;
    return;
  }
  if (!state.bars || state.bars.length === 0) {
    overlay.querySelector('#taStatus').textContent = 'Bu varlık için geçmiş veri bulunamadı.';
    return;
  }
  overlay.querySelector('#taStatus').textContent = `${state.bars.length} veri noktası · ${escapeHtml(config.title || '')}`;

  const mainEl = overlay.querySelector('#taMainChart');
  const drawCanvas = overlay.querySelector('#taDrawCanvas');

  const chartOptions = {
    layout: { background: { color: 'transparent' }, textColor: '#9aa4c7' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.12)', timeVisible: true, secondsVisible: false },
    crosshair: { mode: 0 },
    autoSize: true,
  };

  state.mainChart = LightweightCharts.createChart(mainEl, chartOptions);

  function toLwcTime(ms) { return Math.floor(ms / 1000); }

  function barsAsCandles() {
    return state.bars.map(b => ({
      time: toLwcTime(b.t),
      open: b.o != null ? b.o : b.c,
      high: b.h != null ? b.h : b.c,
      low: b.l != null ? b.l : b.c,
      close: b.c,
    }));
  }
  function barsAsLine() {
    return state.bars.map(b => ({ time: toLwcTime(b.t), value: b.c }));
  }

  function createMainSeries() {
    if (state.mainSeries) { state.mainChart.removeSeries(state.mainSeries); state.mainSeries = null; }
    if (state.chartType === 'candlestick') {
      state.mainSeries = state.mainChart.addCandlestickSeries({
        upColor: '#16a34a', downColor: '#dc2626', borderVisible: false,
        wickUpColor: '#16a34a', wickDownColor: '#dc2626',
      });
      state.mainSeries.setData(barsAsCandles());
    } else if (state.chartType === 'area') {
      state.mainSeries = state.mainChart.addAreaSeries({
        lineColor: '#5B6EF5', topColor: 'rgba(91,110,245,0.35)', bottomColor: 'rgba(91,110,245,0.02)',
      });
      state.mainSeries.setData(barsAsLine());
    } else {
      state.mainSeries = state.mainChart.addLineSeries({ color: '#5B6EF5', lineWidth: 2 });
      state.mainSeries.setData(barsAsLine());
    }
  }
  createMainSeries();

  function clearOverlaySeries() {
    Object.values(state.overlaySeries).forEach(s => { try { state.mainChart.removeSeries(s); } catch (e) {} });
    state.overlaySeries = {};
    if (state.volumeSeries) { try { state.mainChart.removeSeries(state.volumeSeries); } catch (e) {} state.volumeSeries = null; }
  }

  function refreshOverlays() {
    clearOverlaySeries();
    const closes = state.bars.map(b => b.c);
    const times = state.bars.map(b => toLwcTime(b.t));

    if (state.overlays.has('volume')) {
      const hasVolume = state.bars.some(b => b.v != null);
      if (hasVolume) {
        state.volumeSeries = state.mainChart.addHistogramSeries({
          priceFormat: { type: 'volume' }, priceScaleId: '', color: 'rgba(91,110,245,0.35)',
        });
        state.volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        state.volumeSeries.setData(state.bars.map((b, i) => ({
          time: times[i], value: b.v || 0,
          color: (b.c >= (b.o != null ? b.o : b.c)) ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)',
        })));
      }
    }
    if (state.overlays.has('sma')) {
      const sma20 = taSMA(closes, 20);
      const s = state.mainChart.addLineSeries({ color: '#F5A623', lineWidth: 1.5, priceLineVisible: false });
      s.setData(times.map((t, i) => sma20[i] != null ? { time: t, value: sma20[i] } : null).filter(Boolean));
      state.overlaySeries.sma = s;
    }
    if (state.overlays.has('ema')) {
      const ema20 = taEMA(closes, 20);
      const s = state.mainChart.addLineSeries({ color: '#22D3EE', lineWidth: 1.5, priceLineVisible: false });
      s.setData(times.map((t, i) => ema20[i] != null ? { time: t, value: ema20[i] } : null).filter(Boolean));
      state.overlaySeries.ema = s;
    }
    if (state.overlays.has('bollinger')) {
      const bb = taBollinger(closes, 20, 2);
      const up = state.mainChart.addLineSeries({ color: 'rgba(155,63,240,0.7)', lineWidth: 1, priceLineVisible: false });
      const lo = state.mainChart.addLineSeries({ color: 'rgba(155,63,240,0.7)', lineWidth: 1, priceLineVisible: false });
      up.setData(times.map((t, i) => bb.upper[i] != null ? { time: t, value: bb.upper[i] } : null).filter(Boolean));
      lo.setData(times.map((t, i) => bb.lower[i] != null ? { time: t, value: bb.lower[i] } : null).filter(Boolean));
      state.overlaySeries.bollingerUpper = up;
      state.overlaySeries.bollingerLower = lo;
    }
    if (state.overlays.has('vwap')) {
      const vwap = taVWAP(state.bars);
      if (vwap) {
        const s = state.mainChart.addLineSeries({ color: '#EC4899', lineWidth: 1.5, priceLineVisible: false });
        s.setData(times.map((t, i) => vwap[i] != null ? { time: t, value: vwap[i] } : null).filter(Boolean));
        state.overlaySeries.vwap = s;
      } else {
        overlay.querySelector('#taStatus').textContent = 'VWAP: bu varlık için hacim verisi olmadığından hesaplanamıyor.';
      }
    }
  }
  refreshOverlays();

  function refreshOscillator() {
    if (state.oscChart) { state.oscChart.remove(); state.oscChart = null; state.oscSeries = []; }
    const pane = overlay.querySelector('#taOscPane');
    if (state.oscillator === 'none') { pane.style.display = 'none'; return; }
    pane.style.display = '';
    const oscEl = overlay.querySelector('#taOscChart');
    state.oscChart = LightweightCharts.createChart(oscEl, { ...chartOptions, timeScale: { ...chartOptions.timeScale, visible: true } });
    const closes = state.bars.map(b => b.c);
    const highs = state.bars.map(b => b.h != null ? b.h : b.c);
    const lows = state.bars.map(b => b.l != null ? b.l : b.c);
    const times = state.bars.map(b => toLwcTime(b.t));

    if (state.oscillator === 'rsi') {
      const rsi = taRSI(closes, 14);
      const s = state.oscChart.addLineSeries({ color: '#F5A623', lineWidth: 1.5 });
      s.setData(times.map((t, i) => rsi[i] != null ? { time: t, value: rsi[i] } : null).filter(Boolean));
      s.createPriceLine({ price: 70, color: 'rgba(220,38,38,0.5)', lineWidth: 1, lineStyle: 2, title: '70' });
      s.createPriceLine({ price: 30, color: 'rgba(22,163,74,0.5)', lineWidth: 1, lineStyle: 2, title: '30' });
    } else if (state.oscillator === 'macd') {
      const { macdLine, signalLine, histogram } = taMACD(closes, 12, 26, 9);
      const hist = state.oscChart.addHistogramSeries({ color: 'rgba(91,110,245,0.4)' });
      hist.setData(times.map((t, i) => histogram[i] != null ? { time: t, value: histogram[i], color: histogram[i] >= 0 ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)' } : null).filter(Boolean));
      const macdS = state.oscChart.addLineSeries({ color: '#5B6EF5', lineWidth: 1.5 });
      macdS.setData(times.map((t, i) => macdLine[i] != null ? { time: t, value: macdLine[i] } : null).filter(Boolean));
      const sigS = state.oscChart.addLineSeries({ color: '#F5A623', lineWidth: 1.5 });
      sigS.setData(times.map((t, i) => signalLine[i] != null ? { time: t, value: signalLine[i] } : null).filter(Boolean));
    } else if (state.oscillator === 'stochastic') {
      const { k, d } = taStochastic(highs, lows, closes, 14, 3);
      const kS = state.oscChart.addLineSeries({ color: '#22D3EE', lineWidth: 1.5 });
      kS.setData(times.map((t, i) => k[i] != null ? { time: t, value: k[i] } : null).filter(Boolean));
      const dS = state.oscChart.addLineSeries({ color: '#EC4899', lineWidth: 1.5 });
      dS.setData(times.map((t, i) => d[i] != null ? { time: t, value: d[i] } : null).filter(Boolean));
    }
    syncTimeScales();
  }

  function syncTimeScales() {
    if (!state.oscChart) return;
    const main = state.mainChart.timeScale();
    const osc = state.oscChart.timeScale();
    main.subscribeVisibleLogicalRangeChange((range) => { if (range) osc.setVisibleLogicalRange(range); });
    osc.subscribeVisibleLogicalRangeChange((range) => { if (range) main.setVisibleLogicalRange(range); });
  }

  /* ---- ÇİZİM ARAÇLARI (canvas overlay) ---- */
  function resizeDrawCanvas() {
    const rect = mainEl.getBoundingClientRect();
    drawCanvas.width = rect.width;
    drawCanvas.height = rect.height;
    redrawAll();
  }

  function priceToY(price) {
    try { return state.mainSeries.priceToCoordinate(price); } catch (e) { return null; }
  }
  function timeToX(timeSec) {
    try { return state.mainChart.timeScale().timeToCoordinate(timeSec); } catch (e) { return null; }
  }

  function redrawAll() {
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.strokeStyle = '#F5A623';
    ctx.fillStyle = '#F5A623';
    ctx.lineWidth = 1.5;
    ctx.font = '12px sans-serif';

    for (const d of state.drawings) {
      const x1 = timeToX(d.p1.time), y1 = priceToY(d.p1.price);
      if (x1 == null || y1 == null) continue;
      if (d.type === 'text') {
        ctx.fillText(d.text || '', x1, y1);
        continue;
      }
      const x2 = d.p2 ? timeToX(d.p2.time) : null;
      const y2 = d.p2 ? priceToY(d.p2.price) : null;

      if (d.type === 'horizontal') {
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(drawCanvas.width, y1); ctx.stroke();
      } else if (d.type === 'vertical') {
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, drawCanvas.height); ctx.stroke();
      } else if (d.type === 'trend' && x2 != null && y2 != null) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      } else if (d.type === 'rect' && x2 != null && y2 != null) {
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (d.type === 'arrow' && x2 != null && y2 != null) {
        drawArrow(ctx, x1, y1, x2, y2);
      } else if (d.type === 'fib' && x2 != null && y2 != null) {
        drawFib(ctx, x1, y1, x2, y2, d.p1.price, d.p2.price);
      }
    }
  }

  function drawArrow(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  function drawFib(ctx, x1, y1, x2, y2, price1, price2) {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    ctx.save();
    ctx.font = '11px sans-serif';
    for (const lvl of levels) {
      const price = price1 + (price2 - price1) * lvl;
      const y = priceToY(price);
      if (y == null) continue;
      ctx.strokeStyle = 'rgba(245,166,35,0.6)';
      ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke();
      ctx.fillStyle = '#F5A623';
      ctx.fillText(`${(lvl * 100).toFixed(1)}% (${price.toFixed(2)})`, minX + 4, y - 3);
    }
    ctx.restore();
  }

  function coordToPricePoint(x, y) {
    const time = state.mainChart.timeScale().coordinateToTime(x);
    const price = state.mainSeries.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time, price };
  }

  drawCanvas.addEventListener('click', (e) => {
    if (!state.drawTool) return;
    const rect = drawCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const pt = coordToPricePoint(x, y);
    if (!pt) return;

    if (state.drawTool === 'text') {
      const text = window.prompt('Not metni:', '');
      if (text) state.drawings.push({ type: 'text', p1: pt, text });
      redrawAll();
      return;
    }
    if (state.drawTool === 'horizontal' || state.drawTool === 'vertical') {
      state.drawings.push({ type: state.drawTool, p1: pt });
      redrawAll();
      return;
    }
    // İki noktalı araçlar: trend/rect/arrow/fib
    state.pendingPoints.push(pt);
    if (state.pendingPoints.length === 2) {
      state.drawings.push({ type: state.drawTool, p1: state.pendingPoints[0], p2: state.pendingPoints[1] });
      state.pendingPoints = [];
      redrawAll();
    }
  });

  state.mainChart.timeScale().subscribeVisibleTimeRangeChange(redrawAll);
  state.mainChart.subscribeCrosshairMove(() => {}); // no-op: gerekirse ileride crosshair-bağlı çizim eklenebilir

  const onResize = () => { resizeDrawCanvas(); };
  window.addEventListener('resize', onResize);
  resizeDrawCanvas();

  /* ---- TOOLBAR OLAYLARI ---- */
  overlay.querySelector('#taChartTypeGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chart-type]');
    if (!btn) return;
    overlay.querySelectorAll('#taChartTypeGroup .ta-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartType = btn.dataset.chartType;
    createMainSeries();
    refreshOverlays();
    redrawAll();
  });

  overlay.querySelector('#taOverlayGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-overlay]');
    if (!btn) return;
    const key = btn.dataset.overlay;
    if (state.overlays.has(key)) { state.overlays.delete(key); btn.classList.remove('active'); }
    else { state.overlays.add(key); btn.classList.add('active'); }
    refreshOverlays();
  });

  overlay.querySelector('#taOscGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-osc]');
    if (!btn) return;
    overlay.querySelectorAll('#taOscGroup .ta-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.oscillator = btn.dataset.osc;
    refreshOscillator();
  });

  overlay.querySelector('#taDrawGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-draw]');
    if (btn) {
      const isActive = btn.classList.contains('active');
      overlay.querySelectorAll('#taDrawGroup .ta-btn[data-draw]').forEach(b => b.classList.remove('active'));
      state.pendingPoints = [];
      if (!isActive) { btn.classList.add('active'); state.drawTool = btn.dataset.draw; }
      else { state.drawTool = null; }
      return;
    }
    if (e.target.closest('#taClearDrawings')) {
      state.drawings = [];
      redrawAll();
    }
  });
}
