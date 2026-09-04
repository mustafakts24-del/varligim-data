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

// DÜZELTME #10 (2026-09, kullanıcı raporu: "fon logoları eksik"): Canlı
// sitede GitHub API ile repo ağacı incelendiğinde 54 PNG'nin GERÇEKTEN
// yüklendiği ama `fund_logos/` alt klasörüne DEĞİL, repo KÖKÜNE düz
// (ör. `pardus_portfoy.png`) yüklendiği doğrulandı — GitHub'ın web
// arayüzünden bir klasörü sürüklerken içindekilerin düzleşmesi
// (klasör yapısının korunmaması) sık karşılaşılan bir durum. Kullanıcıya
// tekrar manuel taşıma/yeniden yükleme yaptırmak yerine (hataya açık),
// <img> önce beklenen `fund_logos/` alt yolunu dener, 404 olursa TEK
// SEFERLİK olarak repo kökünü dener, o da yoksa harf rozetine döner —
// böylece dosyalar ister alt klasörde ister kökte olsun logo görünür.
function fundLogoImg(founderName, fundName, code, size) {
  const px = size || 24;
  const file = fundLogoFile(founderName, fundName);
  if (!file) return letterAvatarHtml(code, px);
  const fallback = letterAvatarHtml(code, px).replace(/"/g, '&quot;');
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;">` +
    `<img src="fund_logos/${file}" alt="" width="${px}" height="${px}" loading="lazy" class="logo-img" ` +
    `onerror="if(!this.dataset.rootTried){this.dataset.rootTried='1';this.src='${file}';}else{this.outerHTML='${fallback}';}">` +
    `</span>`;
}

// Emtia ikonları — mobilde karşılığı olmayan, web'e özel SVG ikon seti
// (dürüstlük notu yukarıda). Renkler mevcut koyu temaya uygun seçildi.
//
// DÜZELTME (2026-09, kullanıcı talebi: "emtia logolarını daha modern
// yap"): iki ayrı sorun giderildi. (1) ÖNCEKİ sürümde metal rozetlerinin
// TÜMÜ (gümüş, bakır, platin, paladyum dahil) yanlışlıkla sabit "Au"
// harfini gösteriyordu — her metal artık KENDİ doğru element sembolünü
// gösteriyor (Au/Ag/Cu/Pt/Pd). (2) Görsel stil düz tek renk daireden,
// radyal degrade + parlama efektli "sikke" görünümüne ve Brent Petrol
// için düz bardak yerine daha modern bir "damla" ikonuna geçirildi.
const COMMODITY_ICON_SVG = {
  GOLD: { symbol: 'Au', c1: '#FFE9AE', c2: '#B9860F' },
  GOLD_ONS_USD: { symbol: 'Au', c1: '#FFE9AE', c2: '#B9860F' },
  GOLD_22K: { symbol: 'Au', c1: '#FBE0A0', c2: '#A9740F' },
  GOLD_CEYREK: { symbol: 'Au', c1: '#F8DB97', c2: '#96650E' },
  GOLD_YARIM: { symbol: 'Au', c1: '#F5D68E', c2: '#82570D' },
  GOLD_TAM: { symbol: 'Au', c1: '#F2D186', c2: '#70490C' },
  GOLD_ATA: { symbol: 'Au', c1: '#EFCC7D', c2: '#5E3C0A' },
  SILVER: { symbol: 'Ag', c1: '#F4F6FA', c2: '#8992A6' },
  SILVER_ONS_USD: { symbol: 'Ag', c1: '#F4F6FA', c2: '#8992A6' },
  COPPER: { symbol: 'Cu', c1: '#F2B27F', c2: '#93481A' },
  PLATINUM: { symbol: 'Pt', c1: '#E8ECF0', c2: '#71808D' },
  PLATINUM_ONS_USD: { symbol: 'Pt', c1: '#E8ECF0', c2: '#71808D' },
  PALLADIUM: { symbol: 'Pd', c1: '#E1DBF2', c2: '#6B5C97' },
  PALLADIUM_ONS_USD: { symbol: 'Pd', c1: '#E1DBF2', c2: '#6B5C97' },
  BRENT: { symbol: null, c1: '#4C4C55', c2: '#0E0E11' },
  BRENT_USD: { symbol: null, c1: '#4C4C55', c2: '#0E0E11' },
};

let _commodityIconGradSeq = 0;
function commodityIconSvg(key, size) {
  const px = size || 24;
  const cfg = COMMODITY_ICON_SVG[(key || '').toUpperCase()] || { symbol: '?', c1: '#8B9BF8', c2: '#3145A6' };
  const gid = `ci-grad-${_commodityIconGradSeq++}`;
  const inner = cfg.symbol == null
    // Brent Petrol: bardak yerine modern bir "damla" simgesi.
    ? `<path d="M12 5.2c2.2 2.9 4.4 5.6 4.4 8.4a4.4 4.4 0 1 1-8.8 0c0-2.8 2.2-5.5 4.4-8.4z" fill="rgba(255,255,255,0.92)"/>
       <ellipse cx="10.3" cy="12" rx="1.4" ry="2.1" fill="${cfg.c1}" opacity="0.55"/>`
    : `<ellipse cx="9" cy="7.8" rx="4.3" ry="2.3" fill="rgba(255,255,255,0.4)" transform="rotate(-25 9 7.8)"/>
       <text x="12" y="15.6" text-anchor="middle" font-size="8.5" font-weight="700" fill="#fff" stroke="${cfg.c2}" stroke-width="0.35" paint-order="stroke" font-family="Roboto, sans-serif" letter-spacing="-0.3">${cfg.symbol}</text>`;
  return `<span class="logo-slot" style="width:${px}px;height:${px}px;">` +
    `<svg width="${px}" height="${px}" viewBox="0 0 24 24">` +
    `<defs><radialGradient id="${gid}" cx="35%" cy="30%" r="75%">` +
    `<stop offset="0%" stop-color="${cfg.c1}"/><stop offset="100%" stop-color="${cfg.c2}"/>` +
    `</radialGradient></defs>` +
    `<circle cx="12" cy="12" r="10" fill="url(#${gid})"/>` +
    `<circle cx="12" cy="12" r="10" fill="none" stroke="${cfg.c2}" stroke-opacity="0.4" stroke-width="0.75"/>` +
    inner +
    `</svg></span>`;
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
