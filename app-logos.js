/* ==================================================================
 * app-logos.js
 * Ortak LOGO/İKON çözümleyicisi. Mobil uygulamadaki kaynaklarla AYNI
 * mantığı kullanır:
 *  - Hisse (BIST) logoları: mobildeki StockLogoService'in BİRİNCİL
 *    kaynağı olan jsdelivr/GitHub BIST logo deposu. Mobildeki ikincil
 *    kaynak (Brandfetch) bir ücretli/API-anahtarlı servistir ve mobil
 *    tarafta da yapılandırılmamış durumda (BURAYA_BRANDFETCH_CLIENT_ID
 *    placeholder'ı) — bu yüzden web tarafında da eklenmedi (uydurma
 *    bir anahtar kullanılmaz). Bulunamayan logo, harf rozetine döner.
 *  - Fon logoları: mobil uygulamanın assets/fund_logos/ klasöründeki
 *    AYNI 54 PNG (web için 96x96'ya küçültülüp yeniden kodlanmış hali
 *    — orijinaller ortalama ~950KB/dosya idi, performans için ~2KB'a
 *    indirildi) + AYNI kurucu-adı eşleştirme tablosu.
 *  - Emtia ikonları: mobil uygulamada emtialar için özel bir logo/ikon
 *    seti YOK (yalnızca genel Material ikonları kullanılıyor) — bu
 *    yüzden burada web'e özel, temaya uygun basit SVG ikonlar
 *    eklendi (dürüstlük notu: mobilden alınmadı, bu çalışmada web'e
 *    özel bir görsel iyileştirmedir).
 *  - VİOP logoları: hisse sözleşmelerinde hisse logosu, diğerlerinde
 *    kategori ikonu kullanılır.
 * ================================================================== */

const STOCK_LOGO_BASE =
  'https://cdn.jsdelivr.net/gh/ahmeterenodaci/' +
  'Istanbul-Stock-Exchange--BIST--including-symbols-and-logos/logos/';

function letterAvatarHtml(text, size) {
  const letter = (text || '?').trim().charAt(0).toUpperCase() || '?';
  const px = size || 24;
  return `<span class="logo-fallback" style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.5)}px;">${escapeHtml(letter)}</span>`;
}

/**
 * BIST hisse logosu <img> HTML'i döner. Görsel bulunamazsa (404/ağ
 * hatası) tarayıcının kendi `onerror` mekanizmasıyla harf rozetine
 * döner — mobildeki gibi ayrı bir HEAD isteğiyle önceden kontrol
 * ETMEZ (performans: yüzlerce satır için ekstra istek atılmaz,
 * kural 12/14).
 */
function stockLogoImg(symbol, size) {
  const px = size || 24;
  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) return letterAvatarHtml('?', px);
  const url = STOCK_LOGO_BASE + encodeURIComponent(sym) + '.png';
  const fallback = letterAvatarHtml(sym, px).replace(/"/g, '&quot;');
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;">` +
    `<img src="${url}" alt="" width="${px}" height="${px}" loading="lazy" class="logo-img" ` +
    `onerror="this.outerHTML='${fallback}';">` +
    `</span>`;
}

// Mobildeki FundLogoService._assets tablosuyla AYNI (kurucu adı ->
// yerel dosya), yalnızca dosya yolu web'deki fund_logos/ klasörünü
// gösterecek şekilde uyarlandı.
const FUND_LOGO_ASSETS = {
  'A1 CAPITAL PORTFÖY': 'a1_capital_portfoy.png', 'A1 CAPITAL PORTFOY': 'a1_capital_portfoy.png',
  'AK PORTFÖY': 'ak_portfoy.png',
  'AKTİF PORTFÖY': 'aktif_portfoy.png', 'AKTIF PORTFÖY': 'aktif_portfoy.png',
  'AHLATCI PORTFÖY': 'ahlatci_portfoy.png', 'AHLATÇI PORTFÖY': 'ahlatci_portfoy.png',
  'ALBARAKA PORTFÖY': 'albaraka_portfoy.png',
  'ALLBATROSS PORTFÖY': 'allbatross_portfoy.png',
  'ASTRA PORTFÖY': 'astra_portfoy.png',
  'ATA PORTFÖY': 'ata_portfoy.png',
  'ATLAS PORTFÖY': 'atlas_portfoy.png',
  'AURA PORTFÖY': 'aura_portfoy.png',
  'AZİMUT PORTFÖY': 'azimut_portfoy.png', 'AZIMUT PORTFÖY': 'azimut_portfoy.png',
  'BULLS PORTFÖY': 'bulls_portfoy.png',
  'BV PORTFÖY': 'bv_portfoy.png',
  'DENİZ PORTFÖY': 'deniz_portfoy.png', 'DENIZ PORTFÖY': 'deniz_portfoy.png',
  'DESTEK PORTFÖY': 'destek_portfoy.png',
  'EMAA BLUE PORTFÖY': 'emaa_blue_portfoy.png',
  'FİBA PORTFÖY': 'fiba_portfoy.png', 'FIBA PORTFÖY': 'fiba_portfoy.png',
  'FONMAP PORTFÖY': 'fonmap_portfoy.png',
  'GARANTİ PORTFÖY': 'garanti_portfoy.png', 'GARANTI PORTFÖY': 'garanti_portfoy.png',
  'GLOBAL MD PORTFÖY': 'global_md_portfoy.png',
  'HALK PORTFÖY': 'halk_portfoy.png',
  'HEDEF PORTFÖY': 'hedef_portfoy.png',
  'HSBC PORTFÖY': 'hsbc_portfoy.png',
  'INVEO PORTFÖY': 'inveo_portfoy.png',
  'İŞ PORTFÖY': 'is_portfoy.png', 'IS PORTFÖY': 'is_portfoy.png',
  'İSTANBUL PORTFÖY': 'istanbul_portfoy.png', 'ISTANBUL PORTFÖY': 'istanbul_portfoy.png',
  'KUVEYT TÜRK PORTFÖY': 'kuveyt_turk_portfoy.png', 'KUVEYT TURK PORTFÖY': 'kuveyt_turk_portfoy.png',
  'MARMARA CAPITAL': 'marmara_capital.png',
  'NEO PORTFÖY': 'neo_portfoy.png',
  'NUROL PORTFÖY': 'nurol_portfoy.png',
  'ONE PORTFÖY': 'one_portfoy.png',
  'OYAK PORTFÖY': 'oyak_portfoy.png',
  'PARDUS PORTFÖY': 'pardus_portfoy.png',
  'RE-PIE PORTFÖY': 'repie_portfoy.png', 'RE PIE PORTFÖY': 'repie_portfoy.png', 'REPIE PORTFÖY': 'repie_portfoy.png',
  'RE-PIE PORTFOY': 'repie_portfoy.png', 'RE PIE PORTFOY': 'repie_portfoy.png', 'REPIE PORTFOY': 'repie_portfoy.png',
  'OSMANLI PORTFÖY': 'osmanli_portfoy.png', 'OSMANLI PORTFOY': 'osmanli_portfoy.png',
  'TRIVE PORTFÖY': 'trive_portfoy.png', 'TRIVE PORTFOY': 'trive_portfoy.png',
  'PHILLIP PORTFÖY': 'phillip_portfoy.png', 'PHILLIP PORTFOY': 'phillip_portfoy.png',
  'PERFORM PORTFÖY': 'perform_portfoy.png', 'PERFORM PORTFOY': 'perform_portfoy.png',
  'V PORTFÖY': 'v_portfoy.png', 'V PORTFOY': 'v_portfoy.png', 'VPORTFÖY': 'v_portfoy.png', 'VPORTFOY': 'v_portfoy.png',
  'MT PORTFÖY': 'mt_portfoy.png', 'MT PORTFOY': 'mt_portfoy.png',
  'PUSULA PORTFÖY': 'pusula_portfoy.png', 'PUSULA PORTFOY': 'pusula_portfoy.png',
  'PİRAMİT PORTFÖY': 'piramit_portfoy.png', 'PIRAMIT PORTFÖY': 'piramit_portfoy.png',
  'PİRAMİT PORTFOY': 'piramit_portfoy.png', 'PIRAMIT PORTFOY': 'piramit_portfoy.png',
  'VEGA PORTFÖY': 'vega_portfoy.png', 'VEGA PORTFOY': 'vega_portfoy.png',
  '24 GAYRİMENKUL': '24_portfoy.png', '24 GAYRIMENKUL': '24_portfoy.png',
  '24 PORTFÖY': '24_portfoy.png', '24 PORTFOY': '24_portfoy.png',
  'QNB PORTFÖY': 'qnb_portfoy.png',
  'ROTA PORTFÖY': 'rota_portfoy.png',
  'STRATEJİ PORTFÖY': 'strateji_portfoy.png', 'STRATEJI PORTFÖY': 'strateji_portfoy.png',
  'TACİRLER PORTFÖY': 'tacirler_portfoy.png', 'TACIRLER PORTFÖY': 'tacirler_portfoy.png',
  'TEB PORTFÖY': 'teb_portfoy.png',
  'TERA PORTFÖY': 'tera_portfoy.png',
  'ÜNLÜ PORTFÖY': 'unlu_portfoy.png', 'UNLU PORTFÖY': 'unlu_portfoy.png',
  'VAKIF PORTFÖY': 'vakif_portfoy.png',
  'YAPI KREDİ PORTFÖY': 'yapi_kredi_portfoy.png', 'YAPI KREDI PORTFÖY': 'yapi_kredi_portfoy.png',
  'ZİRAAT PORTFÖY': 'ziraat_portfoy.png', 'ZIRAAT PORTFÖY': 'ziraat_portfoy.png',
};

function normalizeTr(value) {
  return (value || '')
    .trim().toUpperCase()
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ğ/g, 'G')
    .replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fundLogoFile(founderName, fundName) {
  const source = normalizeTr(`${founderName || ''} ${fundName || ''}`);
  for (const key of Object.keys(FUND_LOGO_ASSETS)) {
    if (source.includes(normalizeTr(key))) return FUND_LOGO_ASSETS[key];
  }
  return null;
}

function fundLogoImg(founderName, fundName, code, size) {
  const px = size || 24;
  const file = fundLogoFile(founderName, fundName);
  if (!file) return letterAvatarHtml(code, px);
  const fallback = letterAvatarHtml(code, px).replace(/"/g, '&quot;');
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;">` +
    `<img src="fund_logos/${file}" alt="" width="${px}" height="${px}" loading="lazy" class="logo-img" ` +
    `onerror="this.outerHTML='${fallback}';">` +
    `</span>`;
}

// Emtia ikonları — mobilde karşılığı olmayan, web'e özel basit SVG
// ikon seti (dürüstlük notu yukarıda). Renkler mevcut koyu temaya
// uygun seçildi.
const COMMODITY_ICON_SVG = {
  GOLD: ['#F5C542', '#B8860B'], GOLD_ONS_USD: ['#F5C542', '#B8860B'],
  GOLD_22K: ['#F0C24B', '#A9720C'], GOLD_CEYREK: ['#EFC24E', '#9C6A17'],
  GOLD_YARIM: ['#EEC155', '#8F651E'], GOLD_TAM: ['#EDC05C', '#835F25'],
  GOLD_ATA: ['#ECC063', '#785A2C'],
  SILVER: ['#D9D9E3', '#8A8A99'], SILVER_ONS_USD: ['#D9D9E3', '#8A8A99'],
  COPPER: ['#E07B39', '#8A4B1F'],
  PLATINUM: ['#CBD3D8', '#6E7B84'], PLATINUM_ONS_USD: ['#CBD3D8', '#6E7B84'],
  PALLADIUM: ['#C9C2D9', '#6C5F87'], PALLADIUM_ONS_USD: ['#C9C2D9', '#6C5F87'],
  BRENT: ['#3B3B3B', '#111111'], BRENT_USD: ['#3B3B3B', '#111111'],
};

function commodityIconSvg(key, size) {
  const px = size || 24;
  const colors = COMMODITY_ICON_SVG[(key || '').toUpperCase()] || ['#5B6EF5', '#3145A6'];
  const isBar = (key || '').toUpperCase().startsWith('BRENT') ? false : true;
  const inner = isBar
    ? `<circle cx="12" cy="12" r="9" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="1.5"/>
       <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="${colors[1]}" font-family="sans-serif">Au</text>`
    : `<rect x="4" y="8" width="16" height="10" rx="2" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="1.5"/>
       <path d="M7 8 V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" fill="none" stroke="${colors[1]}" stroke-width="1.5"/>`;
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;">` +
    `<svg width="${px}" height="${px}" viewBox="0 0 24 24">${inner}</svg>` +
    `</span>`;
}

// Banka logosu: mobildeki BankRateService/interest_credit_calculator_
// screen.dart ile AYNI mantık — Clearbit artık 403 döndüğü için
// mobil de anahtarsız Google favicon servisine geçmişti; price-proxy
// zaten `logoDomain` alanını (mobildeki _logoDomains regex listesiyle
// AYNI eşleştirme) hesaplayıp döndürüyor (bkz. index.ts getBankRates).
function bankLogoImg(offer, size) {
  const px = size || 28;
  const domain = offer && offer.logoDomain;
  const fallback = letterAvatarHtml(offer ? offer.bankName : '?', px).replace(/"/g, '&quot;');
  if (!domain) return letterAvatarHtml(offer ? offer.bankName : '?', px);
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;background:#fff;border-radius:8px;">` +
    `<img src="${url}" alt="" width="${px}" height="${px}" loading="lazy" class="logo-img" style="object-fit:contain;padding:3px;" ` +
    `onerror="this.parentElement.outerHTML='${fallback}';">` +
    `</span>`;
}

// VİOP: hisse dayanaklı sözleşmelerde hisse logosu, diğerlerinde
// kategori ikonu.
function viopLogo(underlying, category, size) {
  const px = size || 24;
  if (category === 'equity') return stockLogoImg(underlying, px);
  const glyphs = { index: '📊', currency: '💱', metal: '🥇', other: '📄' };
  const glyph = glyphs[category] || '📄';
  return `<span class="logo-slot logo-emoji" style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.65)}px;">${glyph}</span>`;
}
