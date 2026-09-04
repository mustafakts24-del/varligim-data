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
 * KRİPTO 5 YILLIK GEÇMİŞ (2026-09, kullanıcı raporu): CoinGecko'nun
 * ücretsiz/anahtarsız katmanı geçmiş veriyi GERÇEKTEN en fazla 1 yılla
 * sınırlıyor (bkz. coingecko.com/en/api/pricing → Demo plan: "Daily
 * historical data: 1 year", "Hourly historical data: 1 year" — bu
 * doğrulandı, tahmin değildir). 5 yıla kadar GERÇEK veri sunabilmek
 * için başlıca kripto paralarda Yahoo Finance'in kendi `{SEMBOL}-USD`
 * kripto verisi (stock/emtia/endeks'te zaten kullanılan AYNI Yahoo
 * OHLC kaynağı) yedek/öncelikli kaynak olarak eklendi.
 *
 * Bu eşleme BİLİNÇLİ OLARAK KISITLI tutuldu: bazı CoinGecko sembolleri
 * Yahoo'da başka bir enstrümanla çakışabilir ya da marka değişikliği
 * sonrası farklı bir tiker koduna taşınmış olabilir — böyle bir durumda
 * YANLIŞ varlığın verisini göstermek, uydurma veri göstermekten farksız
 * bir hatadır. Bu yüzden yalnızca eşlemesi kesin olan başlıca kripto
 * paralar listelendi; listede olmayan (veya Yahoo'da geçici olarak
 * veri bulunamayan) bir kripto için GERÇEK CoinGecko 1 yıllık verisiyle
 * (₺) devam edilir ve bu arayüzde açıkça belirtilir — 5 yıla asla
 * uydurma veriyle tamamlanmaz.
 * ------------------------------------------------------------------ */
const TA_CRYPTO_YAHOO_MAP = {
  bitcoin: 'BTC-USD', ethereum: 'ETH-USD', tether: 'USDT-USD',
  binancecoin: 'BNB-USD', solana: 'SOL-USD', ripple: 'XRP-USD',
  'usd-coin': 'USDC-USD', cardano: 'ADA-USD', dogecoin: 'DOGE-USD',
  tron: 'TRX-USD', 'avalanche-2': 'AVAX-USD', chainlink: 'LINK-USD',
  polkadot: 'DOT-USD', 'matic-network': 'MATIC-USD', litecoin: 'LTC-USD',
  'shiba-inu': 'SHIB-USD', 'bitcoin-cash': 'BCH-USD', uniswap: 'UNI-USD',
  dai: 'DAI-USD', 'wrapped-bitcoin': 'WBTC-USD', cosmos: 'ATOM-USD',
  'ethereum-classic': 'ETC-USD', stellar: 'XLM-USD', near: 'NEAR-USD',
  filecoin: 'FIL-USD', aptos: 'APT-USD', arbitrum: 'ARB-USD',
  optimism: 'OP-USD', aave: 'AAVE-USD', algorand: 'ALGO-USD',
  vechain: 'VET-USD', 'internet-computer': 'ICP-USD', 'the-graph': 'GRT-USD',
  'hedera-hashgraph': 'HBAR-USD', monero: 'XMR-USD', maker: 'MKR-USD',
  sui: 'SUI-USD', 'injective-protocol': 'INJ-USD', fantom: 'FTM-USD',
  tezos: 'XTZ-USD', 'theta-token': 'THETA-USD', eos: 'EOS-USD',
  flow: 'FLOW-USD', kaspa: 'KAS-USD', 'immutable-x': 'IMX-USD',
  'crypto-com-chain': 'CRO-USD', bittensor: 'TAO-USD', celestia: 'TIA-USD',
  'sei-network': 'SEI-USD', 'worldcoin-wld': 'WLD-USD',
};

async function taFetchCryptoBars(config) {
  const yahooSymbol = TA_CRYPTO_YAHOO_MAP[config.cryptoId];
  if (yahooSymbol) {
    try {
      // KULLANICI TALEBİ (2026-09): kripto Teknik Analiz'de mumlar GÜNLÜK
      // olsun (öncesinde diğer varlık sınıflarıyla aynı YAHOO_CHART_RANGES
      // ['5Y'] kullanılıyordu — haftalık mum). O paylaşılan sözlüğe yeni
      // bir '5Y-günlük' anahtarı EKLENMEDİ, çünkü aynı sözlük hisse/emtia/
      // döviz detay sayfalarındaki aralık "chip" düğmelerini de besliyor;
      // oraya dokunmak istenmeyen yeni bir düğme ekler ve çalışan bir
      // sisteme müdahale eder. Bunun yerine yalnızca kripto Teknik Analiz'e
      // özel, doğrudan bir Yahoo günlük istek (`range=5y&interval=1d`)
      // yapılıyor — Yahoo'nun günlük mumlarda 5 yıl gibi uzun aralıkları
      // desteklemesi normaldir (kısıtlama yalnızca dakika/saatlik mumlarda
      // vardır), bu yüzden bu tamamen gerçek, sorunsuz bir veri isteğidir.
      const cacheKey = `ohlc:${yahooSymbol}:5y:1d`;
      const data = await cachedFetch(cacheKey, 60000, () =>
        fetchPriceProxy(`type=stock-ohlc&symbol=${encodeURIComponent(yahooSymbol)}&range=5y&interval=1d`));
      const points = Array.isArray(data.points) ? data.points : [];
      if (points.length >= 2) {
        points._taSource = 'yahoo5y';
        return points;
      }
    } catch (e) { /* aşağıdaki gerçek CoinGecko yedeğine düş */ }
  }
  // Yedek (veya eşlemesi olmayan kripto): CoinGecko /coins/{id}/ohlc —
  // mobildeki CryptoService.getOhlcHistory ile aynı gerçek OHLC kaynağı,
  // ücretsiz katmanın güvenilir biçimde desteklediği en geniş aralık
  // olan 365 gün (1Y) ile.
  const points = await fetchCryptoOhlcSeries(config.cryptoId, 365);
  points._taSource = 'coingecko1y';
  return points;
}

function taCryptoSourceLabel(bars) {
  if (bars && bars._taSource === 'yahoo5y') return 'Yahoo Finance ($, 5 yıla kadar gerçek veri, günlük mumlar)';
  // AÇIKLIK DÜZELTMESİ (2026-09, kullanıcı sorusu: "2 mum arasında 4-5
  // gün fark var, normal mi?"): CoinGecko'nun ücretsiz OHLC ucu uzun
  // aralıklarda (>30 gün) mum aralığını KENDİSİ otomatik olarak ~4 güne
  // genişletiyor (bu, CoinGecko'nun kendi belgelenmiş davranışıdır,
  // buradaki kodun bir hatası değildir) — bu artık dipnotta önceden
  // belirtiliyor ki kullanıcı mum aralıklarını görünce şaşırmasın.
  if (bars && bars._taSource === 'coingecko1y') return 'CoinGecko (₺, bu kripto için 5 yıllık geçmiş desteklenmiyor — en fazla 1 yıl, ~4 günlük mum aralığıyla gösteriliyor)';
  return '';
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
    return await taFetchCryptoBars(config);
  }
  if (config.assetType === 'stock') {
    // KULLANICI TALEBİ (2026-09): hisse Teknik Analiz'de mumlar GÜNLÜK
    // olsun (öncesinde diğer varlık sınıflarıyla aynı YAHOO_CHART_RANGES
    // ['5Y'] kullanılıyordu — range=5y&interval=1wk, yani haftalık mum).
    // Kripto'da uygulanan AYNI düzeltme deseni: paylaşılan sözlüğe yeni
    // bir anahtar EKLENMEDİ (o sözlük emtia/döviz/endeks detay
    // sayfalarındaki aralık "chip" düğmelerini de besliyor; oraya
    // dokunmak istenmeyen yeni bir düğme ekler), bunun yerine yalnızca
    // hisse Teknik Analiz'e özel, doğrudan bir Yahoo günlük istek
    // (`range=5y&interval=1d`) yapılıyor. Yahoo'nun günlük mumlarda 5
    // yıl gibi uzun aralıkları desteklemesi normaldir (kısıtlama
    // yalnızca dakika/saatlik mumlarda vardır), bu yüzden bu tamamen
    // gerçek, sorunsuz bir veri isteğidir.
    try {
      const cacheKey = `ohlc:${config.yahooSymbol}:5y:1d`;
      const data = await cachedFetch(cacheKey, 60000, () =>
        fetchPriceProxy(`type=stock-ohlc&symbol=${encodeURIComponent(config.yahooSymbol)}&range=5y&interval=1d`));
      const points = Array.isArray(data.points) ? data.points : [];
      if (points.length >= 2) return points;
    } catch (e) { /* aşağıdaki haftalık 5Y yoluna düş */ }
    // Yedek (günlük istek başarısız olursa): önceki, kanıtlanmış haftalık
    // 5Y yolu — dürüstlük gereği veri göstermemek yerine daha kaba
    // çözünürlükte de olsa gerçek veri gösterilir.
    return await fetchYahooRangeSeries(config.yahooSymbol, '5Y');
  }
  // commodity / index — bu turda kullanıcı yalnızca hisse grafiğini
  // istedi; bu iki varlık sınıfı önceki (haftalık 5Y) davranışında
  // değişmeden kalıyor.
  const points = await fetchYahooRangeSeries(config.yahooSymbol, '5Y');
  return points;
}

/* ------------------------------------------------------------------
 * NOT METNİ GİRİŞ PENCERESİ (2026-09, kullanıcı raporu: "T (Not Ekle)
 * aracına tıklayınca hiçbir şey açılmıyor").
 *
 * KÖK NEDEN: bu daha önce tarayıcının yerleşik `window.prompt()`
 * penceresini kullanıyordu. `window.prompt`/`alert`/`confirm` gibi
 * senkron tarayıcı diyalogları, kullanıcı (ya da sayfa) art arda birkaç
 * kez bu tür bir pencere tetiklediğinde tarayıcı tarafından SESSİZCE
 * bastırılabilir ("Bu sayfanın başka pencere açmasına izin verme"
 * onay kutusu bir kez işaretlendiğinde, o sekmedeki TÜM sonraki
 * prompt/alert/confirm çağrıları hiçbir hata vermeden anında `null`
 * döner) — bu, kullanıcının "hiçbir şey olmuyor" şeklinde bildirdiği
 * belirtiyle birebir örtüşüyor ve `window.prompt`'a bağımlı OLMASININ
 * kendisi kırılgan bir tasarımdır (mobilde de tutarsız davranabilir).
 * Düzeltme: tarayıcı diyaloğuna hiç bağımlı olmayan, uygulamanın kendi
 * koyu temasıyla tutarlı, sayfa içi (in-page) bir giriş kutusu.
 * ------------------------------------------------------------------ */
function taPromptText(hostEl, title) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'ta-text-modal-backdrop';
    backdrop.innerHTML = `
      <div class="ta-text-modal">
        <div class="ta-text-modal-title">${escapeHtml(title || 'Not Ekle')}</div>
        <input type="text" class="ta-text-modal-input" maxlength="80" placeholder="Not metnini yazın…" />
        <div class="ta-text-modal-actions">
          <button type="button" class="btn outline small" data-cancel>Vazgeç</button>
          <button type="button" class="btn primary small" data-ok>Ekle</button>
        </div>
      </div>
    `;
    hostEl.appendChild(backdrop);
    const input = backdrop.querySelector('.ta-text-modal-input');
    input.focus();

    function finish(value) {
      backdrop.remove();
      resolve(value);
    }
    backdrop.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
    backdrop.querySelector('[data-ok]').addEventListener('click', () => finish(input.value.trim() || null));
    // Arka plana tıklamak da vazgeçme sayılır (yalnızca arka planın
    // KENDİSİNE tıklanırsa — kutunun içine tıklamalar buraya sızmaz).
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) finish(null); });
    input.addEventListener('keydown', (e) => {
      // stopPropagation: bu tuş vuruşları .ta-overlay'in kendi Escape
      // dinleyicisine (tüm Teknik Analiz ekranını kapatan) sızmasın —
      // aksi hâlde Escape'e basmak yanlışlıkla TÜM ekranı kapatırdı.
      if (e.key === 'Enter') { e.stopPropagation(); finish(input.value.trim() || null); }
      else if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
    });
  });
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
          <button type="button" class="ta-btn active" data-osc="none">Alt Gösterge Yok</button>
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
    hoverPoint: null,
    mainChart: null,
    mainSeries: null,
    volumeSeries: null,
    overlaySeries: {},
    oscChart: null,
    oscSeries: [],
    refreshTimer: null,
    liveTickTimer: null,
  };

  function close() {
    document.body.style.overflow = '';
    overlay.remove();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onResize);
    if (state.refreshTimer) { clearInterval(state.refreshTimer); state.refreshTimer = null; }
    if (state.liveTickTimer) { clearInterval(state.liveTickTimer); state.liveTickTimer = null; }
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

  function taStatusText(extra) {
    let text = `${state.bars.length} veri noktası · ${escapeHtml(config.title || '')}`;
    if (config.assetType === 'crypto') {
      text += ` · Kaynak: ${taCryptoSourceLabel(state.bars)}`;
    }
    if (extra) text += ` · ${extra}`;
    return text;
  }
  overlay.querySelector('#taStatus').textContent = taStatusText(
    config.assetType === 'crypto' ? "Canlı — son mum 7 sn'de bir, tam grafik 60 sn'de bir yenilenir" : null
  );

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

  // SAAT DİLİMİ DÜZELTMESİ (2026-09, kullanıcı raporu: "gelen veriler 3
  // saat öncesini gösteriyor"): lightweight-charts, kendisine verilen
  // zaman değerini HER ZAMAN UTC olarak yorumlayıp öyle etiketler —
  // tarayıcının yerel saatine (ör. Türkiye UTC+3) hiç çevirmez. Bu
  // yüzden ham UTC epoch saniyesi verildiğinde tüm eksen/crosshair
  // etiketleri yerel saatten sistematik olarak geride görünüyordu
  // (Türkiye'de tam 3 saat). Veri NOKTALARI zaten doğruydu — yalnızca
  // GÖSTERİM saat dilimi hatalıydı; bu düzeltme kullanıcının tarayıcı
  // saat dilimi farkını (yaz/kış saati dahil) epoch değerine ekleyerek
  // grafiğin yerel duvar saatini doğru göstermesini sağlıyor.
  function toLwcTime(ms) {
    const offsetMs = -(new Date(ms).getTimezoneOffset()) * 60000;
    return Math.floor((ms + offsetMs) / 1000);
  }

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

  // CANLI SON MUM (2026-09, kullanıcı raporu: "grafikler 5-10 saniyede
  // güncellensin, yeni mumlar oluşsun"). Kullanıcıyla konuşulup dürüst
  // orta yol seçildi: kaynağın kendi gerçek çözünürlüğü (CoinGecko OHLC
  // en fazla ~30dk, Yahoo haftalık) bu kadar sık GERÇEKTEN yeni bir mum
  // sınırı oluşturmaya izin vermiyor — bunun yerine henüz kapanmamış SON
  // mum, gerçek anlık fiyatla sık sık güncelleniyor (tıpkı gerçek bir
  // borsa arayüzündeki "açık mum" gibi). `lightweight-charts`'ın
  // `series.update()` metodu yalnızca bu tek mumu değiştirir — tüm
  // grafiği yeniden çizmez, kullanıcının yakınlaştırma/kaydırma
  // konumunu bozmaz. Yeni mum sınırları yine 60 saniyelik tam
  // yenilemede (aşağıda) kaynağın kendi gerçek çözünürlüğünde oluşur.
  function applyLiveTick(price) {
    if (!Number.isFinite(price) || state.bars.length === 0 || !state.mainSeries) return;
    const last = state.bars[state.bars.length - 1];
    if (last.o == null) last.o = last.c != null ? last.c : price;
    last.c = price;
    if (last.h == null || price > last.h) last.h = price;
    if (last.l == null || price < last.l) last.l = price;
    const t = toLwcTime(last.t);
    try {
      if (state.chartType === 'candlestick') {
        state.mainSeries.update({ time: t, open: last.o, high: last.h, low: last.l, close: last.c });
      } else {
        state.mainSeries.update({ time: t, value: last.c });
      }
    } catch (e) { /* seri henüz hazır değilse sessizce geç, bir sonraki tikte tekrar denenir */ }
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

    // DÜZELTME (2026-09, kullanıcı raporu: "Trend Çizgisi'ni seçip
    // tıklıyorum, hâlâ hiçbir şey olmuyor"): Trend/Dikdörtgen/Ok/
    // Fibonacci İKİ tıklama gerektirir, ama ÖNCEDEN ilk tıklamadan sonra
    // ekranda KESİNLİKLE hiçbir şey görünmüyordu — çizim yalnızca ikinci
    // tıklamadan SONRA birdenbire beliriyordu. Bu, ilk tıklamanın gerçekten
    // algılanıp algılanmadığını kullanıcının hiçbir şekilde anlayamaması
    // anlamına geliyordu ve "araç çalışmıyor" izlenimi veriyordu — aracın
    // kendisi çalışıyordu, yalnızca ara geri bildirim yoktu. Artık ilk
    // noktaya tıklandığı AN küçük bir işaret noktası beliriyor ve fare
    // ikinci noktaya doğru hareket ettikçe kesikli bir önizleme çizgisi/
    // şekli anlık olarak takip ediyor — TradingView ve benzeri tüm grafik
    // araçlarındaki standart davranışın aynısı.
    if (state.pendingPoints.length === 1 && state.drawTool) {
      const p1 = state.pendingPoints[0];
      const mx1 = timeToX(p1.time), my1 = priceToY(p1.price);
      if (mx1 != null && my1 != null) {
        ctx.save();
        ctx.fillStyle = '#F5A623';
        ctx.beginPath(); ctx.arc(mx1, my1, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (state.hoverPoint) {
          const mx2 = timeToX(state.hoverPoint.time), my2 = priceToY(state.hoverPoint.price);
          if (mx2 != null && my2 != null) {
            ctx.save();
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = 'rgba(245,166,35,0.65)';
            if (state.drawTool === 'rect') {
              ctx.strokeRect(Math.min(mx1, mx2), Math.min(my1, my2), Math.abs(mx2 - mx1), Math.abs(my2 - my1));
            } else if (state.drawTool === 'arrow') {
              drawArrow(ctx, mx1, my1, mx2, my2);
            } else {
              // trend / fib için basit kesikli önizleme çizgisi yeterli
              ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke();
            }
            ctx.restore();
          }
        }
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

  drawCanvas.addEventListener('click', async (e) => {
    if (!state.drawTool) return;
    const rect = drawCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const pt = coordToPricePoint(x, y);
    if (!pt) {
      // DÜZELTME (2026-09): önceden bu durumda TAMAMEN SESSİZCE hiçbir
      // şey olmuyordu — kullanıcı tıklamanın grafiğe ulaşıp ulaşmadığını
      // anlayamıyordu. Artık en azından görünür bir geri bildirim var.
      overlay.querySelector('#taStatus').textContent =
        taStatusText('Bu noktaya çizim eklenemedi — grafiğin veri içeren bir bölümüne tıklayın.');
      return;
    }

    if (state.drawTool === 'text') {
      const text = await taPromptText(overlay, 'Not Ekle');
      if (text) { state.drawings.push({ type: 'text', p1: pt, text }); redrawAll(); }
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
      state.hoverPoint = null;
      redrawAll();
    } else {
      // İlk nokta kaydedildi — hemen bir işaret + canlı önizleme
      // gösterebilmek için redrawAll() burada da çağrılıyor (bkz.
      // redrawAll içindeki "bekleyen nokta" yorumu).
      redrawAll();
    }
  });

  // Trend/Dikdörtgen/Ok/Fibonacci için ilk tıklamadan sonra fareyi ikinci
  // noktaya doğru hareket ettirirken canlı (kesikli) önizleme çizgisi/
  // şekli göstermek için — bkz. redrawAll() içindeki ilgili yorum.
  drawCanvas.addEventListener('mousemove', (e) => {
    if (!state.drawTool || state.pendingPoints.length !== 1) return;
    const rect = drawCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    state.hoverPoint = coordToPricePoint(x, y);
    redrawAll();
  });

  state.mainChart.timeScale().subscribeVisibleTimeRangeChange(redrawAll);
  state.mainChart.subscribeCrosshairMove(() => {}); // no-op: gerekirse ileride crosshair-bağlı çizim eklenebilir

  const onResize = () => { resizeDrawCanvas(); };
  window.addEventListener('resize', onResize);
  // DÜZELTME (2026-09, dayanıklılık): tam ekran açılıp/kapanınca bazı
  // tarayıcılarda pencere `resize` olayı gecikmeli/eksik tetiklenebilir
  // — çizim katmanının boyutu grafikle senkron kalsın diye `fullscreen
  // change` olayı da aynı yeniden boyutlandırmayı tetikliyor.
  document.addEventListener('fullscreenchange', onResize);
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
      state.hoverPoint = null;
      if (!isActive) { btn.classList.add('active'); state.drawTool = btn.dataset.draw; }
      else { state.drawTool = null; }
      // DÜZELTME (2026-09, kullanıcı raporu: "grafik üzerinde çizim
      // yapılamıyor"): çizim katmanı (taDrawCanvas) yalnızca bir çizim
      // aracı SEÇİLİYKEN tıklamaları yakalamalı — CSS'teki bir seçici
      // hatası bu katmanı önceden HER ZAMAN tıklamaları yakalar hâlde
      // bırakıyordu (bkz. styles.css .ta-draw-canvas notu), bu da hiçbir
      // araç seçili değilken bile alttaki gerçek grafiğin kaydırma/
      // yakınlaştırma/crosshair etkileşimini tamamen engelliyordu. Artık
      // bu sınıf, aracın seçili olup olmamasıyla birebir eşleşiyor.
      drawCanvas.classList.toggle('ta-drawing-active', !!state.drawTool);
      redrawAll(); // aracı değiştirince yarım kalmış işaret/önizleme temizlensin
      return;
    }
    if (e.target.closest('#taClearDrawings')) {
      state.drawings = [];
      state.pendingPoints = [];
      state.hoverPoint = null;
      redrawAll();
    }
  });

  /* ---- CANLI YENİLEME (2026-09, kullanıcı raporu: "grafik anlık
   * olarak yenilensin") — yalnızca kripto için: kullanıcı bu talebi
   * özellikle "kripto grafiği" için yaptı, diğer varlık türleri zaten
   * çalışıyor ve dokunulmadı (kural: çalışan sistemlere dokunma).
   * VİOP detayındaki (app-piyasa-viop.js openViopDetail) canlı
   * setInterval deseniyle aynı mantık: periyodik olarak gerçek veri
   * yeniden çekilir, hiçbir şey uydurulmaz; kapanışta interval temizlenir. */
  if (config.assetType === 'crypto') {
    state.refreshTimer = setInterval(async () => {
      let freshBars;
      try {
        freshBars = await taFetchCryptoBars(config);
      } catch (e) {
        return; // Ağ hatası: mevcut veri korunur, bir sonraki turda tekrar denenir.
      }
      if (!Array.isArray(freshBars) || freshBars.length === 0) return;
      state.bars = freshBars;
      if (state.mainSeries) {
        state.mainSeries.setData(state.chartType === 'candlestick' ? barsAsCandles() : barsAsLine());
      }
      refreshOverlays();
      refreshOscillator();
      redrawAll();
      const stamp = new Date().toLocaleTimeString('tr-TR');
      overlay.querySelector('#taStatus').textContent = taStatusText(`Canlı — son güncelleme ${stamp}`);
    }, 60000);

    /* ---- CANLI SON MUM (2026-09, kullanıcı raporu: "grafikler 5-10
     * saniyede güncellensin, yeni mumlar oluşsun"). Kullanıcıyla
     * konuşulup dürüst orta yol seçildi (bkz. yukarıdaki applyLiveTick
     * yorumu): kaynağın kendi gerçek çözünürlüğü bu kadar sık GERÇEKTEN
     * yeni bir mum oluşturmaya izin vermediğinden, henüz kapanmamış SON
     * mum her 7 saniyede bir gerçek anlık fiyatla güncelleniyor. Fiyatın
     * para birimi (`vs`), o an grafikte gösterilen kaynakla EŞLEŞTİRİLİR
     * — Yahoo (BTC-USD gibi) kaynaklıysa USD, CoinGecko kaynaklıysa ₺;
     * aksi halde iki farklı ölçek karışıp anlamsız bir sıçrama gösterir. */
    state.liveTickTimer = setInterval(async () => {
      const vs = (state.bars && state.bars._taSource === 'yahoo5y') ? 'usd' : 'try';
      let price;
      try {
        price = await fetchCryptoLivePrice(config.cryptoId, vs);
      } catch (e) {
        return; // Ağ hatası: mevcut mum olduğu gibi kalır, bir sonraki tikte tekrar denenir.
      }
      if (price == null) return;
      applyLiveTick(price);
      // AÇIKLIK DÜZELTMESİ (2026-09, kullanıcı sorusu: "güncelleme 10
      // dakika öncesini gösteriyor, normal mi?"): son mumun tarih
      // ETİKETİ o mumun temsil ettiği DÖNEMİN BAŞLANGICIDIR (kaynağa
      // göre günlük/4 günlük/haftalık) — "şu an" değildir; bu, HER
      // mum grafiğinde normaldir (gerçek borsalarda da aynı). Fiyatın
      // GERÇEKTEN ne zaman tazelendiğini karışıklık olmadan görebilmek
      // için ayrı bir "son fiyat" damgası burada durum satırına yazılır.
      const stamp = new Date().toLocaleTimeString('tr-TR');
      overlay.querySelector('#taStatus').textContent = taStatusText(`Son fiyat güncellemesi: ${stamp}`);
    }, 7000);
  }
}
