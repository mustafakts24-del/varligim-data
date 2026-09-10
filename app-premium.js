/* ==================================================================
 * app-premium.js — Premium sayfası (2026-09)
 *
 * "AI Teknik Analiz" özelliğinin premium/ücretsiz deneme hakkı durumunu
 * (bkz. app-ai-analiz.js → aiCallFunction, aynı Edge Function'ın
 * "usage_status" action'ı) okuyup, kullanıcı zaten Premium'sa bir
 * "Zaten Premium'sun" kartı, değilse deneme hakkı özeti + özellik listesi
 * + "Premium'a Geç" kartı gösterir.
 *
 * ÖNEMLİ — kullanıcı talebi (madde 6/19): gerçek bir fiyat/paket/ödeme
 * sağlayıcısı bu turda BELİRLENMEDİ. Bu yüzden burada YER TUTUCU bir
 * fiyat ("₺XX / ay") gösterilir ve "Premium'a Geç" butonu sahte bir ödeme
 * akışı SİMÜLE ETMEZ — yalnızca dürüst bir "çok yakında" bilgisi verir.
 * Gerçek bir sağlayıcı (Stripe/iyzico/App Store/Play Store vb.) daha
 * sonra bağlandığında bu buton, o sağlayıcının checkout akışını
 * başlatacak şekilde güncellenecek — mimari buna hazır (bkz.
 * ai-usage-schema.sql: payment_provider / payment_reference alanları ve
 * webhook → Edge Function → premium_status akışı).
 * ================================================================== */

const PREMIUM_FEATURES = [
  { icon: 'all_inclusive', title: 'Sınırsız AI analiz', desc: 'Ücretsiz hak sınırı olmadan istediğin kadar grafik analiz et.' },
  { icon: 'image_search', title: 'Grafik görüntü analizi', desc: 'Hisse, kripto, döviz, emtia veya endeks grafiklerini yükle.' },
  { icon: 'ssid_chart', title: 'Teknik gösterge analizi', desc: 'MACD, RSI, SMA, EMA ve hacim yorumu.' },
  { icon: 'compare_arrows', title: 'Destek / direnç analizi', desc: 'Olası destek ve direnç seviyeleri.' },
  { icon: 'trending_up', title: 'Trend analizi', desc: 'Kısa / orta / uzun vadeli trend değerlendirmesi.' },
  { icon: 'price_change', title: 'Alım / satım bölgeleri', desc: 'Olası alım ve kâr alma bölgeleri.' },
  { icon: 'route', title: 'Senaryo analizi', desc: 'Yükseliş / yatay / düşüş senaryoları.' },
  { icon: 'forum', title: 'AI ile soru-cevap', desc: "Analiz hakkında AI'a doğrudan soru sor." },
];

function premiumFeatureGridHtml() {
  return `<div class="premium-feature-grid">${PREMIUM_FEATURES.map(f => `
    <div class="premium-feature-item">
      <span class="msr">${f.icon}</span>
      <div class="txt"><b>${escapeHtml(f.title)}</b>${escapeHtml(f.desc)}</div>
    </div>`).join('')}</div>`;
}

function premiumWireUpgradeButton() {
  const btn = document.getElementById('premiumUpgradeBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = 'Ödeme sistemi çok yakında 🚀';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = original;
    }, 2400);
  });
}

function renderPremiumAlready(usage) {
  const body = document.getElementById('premiumPageBody');
  if (!body) return;
  body.innerHTML = `
    <div class="premium-hero">
      <div class="crown">👑</div>
      <h1>Zaten Premium'sun!</h1>
      <p>AI Teknik Analiz'i sınırsız kullanabilirsin. Yeni paketler ve özellikler yakında burada görünecek.</p>
    </div>
    <div class="card premium-already-badge">
      <span class="premium-badge-lg">👑 Premium${usage.premiumPlan ? ' · ' + escapeHtml(String(usage.premiumPlan)) : ''}</span>
      ${usage.premiumExpiresAt ? `<p style="margin-top:12px; font-size:12.5px; color:var(--text-muted);">Yenileme/bitiş tarihi: ${new Date(usage.premiumExpiresAt).toLocaleDateString('tr-TR')}</p>` : ''}
    </div>
    ${premiumFeatureGridHtml()}
  `;
}

function renderPremiumUpgrade(usage) {
  const body = document.getElementById('premiumPageBody');
  if (!body) return;
  const remaining = usage ? usage.freeTrialRemaining : null;
  const total = usage ? usage.freeTrialTotal : null;

  body.innerHTML = `
    <div class="premium-hero">
      <div class="crown">👑</div>
      <h1>Premium'a Geç</h1>
      <p>AI Teknik Analiz'in tüm gücünden sınırsız yararlan — grafik yükle, yapay zekâ trend, destek/direnç,
      alım-satım bölgeleri, senaryo ve teknik skor üretsin.</p>
    </div>

    ${remaining != null ? `
    <div class="card" style="text-align:center; margin-bottom:16px;">
      <span class="ai-trial-counter${remaining <= 0 ? ' exhausted' : ''}" style="font-size:13.5px;">
        <span class="msr" style="font-size:16px; vertical-align:-3px;">smart_toy</span>
        ${remaining > 0 ? `Kalan ücretsiz analiz: ${remaining}/${total}` : 'Ücretsiz analiz hakkın bitti'}
      </span>
    </div>` : ''}

    ${premiumFeatureGridHtml()}

    <div class="card" style="text-align:center;">
      <div class="premium-price-row"><span class="amount">₺XX</span><span class="period">/ ay</span></div>
      <div class="premium-price-note">Fiyat henüz belirlenmedi — bu bir yer tutucudur (placeholder).</div>
      <button class="ai-premium-cta-btn" id="premiumUpgradeBtn" type="button" style="padding:12px 28px; font-size:14px;">
        👑 Premium'a Geç
      </button>
    </div>
  `;
  premiumWireUpgradeButton();
}

async function loadPremiumPage() {
  const body = document.getElementById('premiumPageBody');
  if (body) body.innerHTML = '<div class="empty" style="padding:40px 0;">Yükleniyor…</div>';
  try {
    const usage = await aiCallFunction({ action: 'usage_status' });
    if (usage.isPremium) {
      renderPremiumAlready(usage);
    } else {
      renderPremiumUpgrade(usage);
    }
  } catch (e) {
    // Durum alınamasa bile sayfa boş kalmasın — dürüst bir pitch göster,
    // ama gerçek olmayan bir sayaç UYDURMADAN (usage=null → sayaç
    // gizlenir, yalnızca genel özellik/fiyat kartları gösterilir).
    renderPremiumUpgrade(null);
  }
}

/* ==================================================================
 * REKLAM ALANI ALTYAPISI (Faz 3, madde 28-33) — DORMANT / PASİF
 * ==================================================================
 * Bu turda gerçek bir reklam ağı (ör. Google AdSense/AdMob) BAĞLANMADI
 * — kullanıcı henüz bir sağlayıcı belirlemedi ve "asla veri/içerik
 * uydurma" kuralı burada da geçerli: sahte veya yer tutucu olmayan bir
 * "gerçek reklammış gibi" içerik ASLA gösterilmez. Bu yalnızca ileride
 * gerçek bir sağlayıcı bağlanacağı zaman kullanılacak, şimdiden
 * yerleşimi hazır hale getiren ALTYAPI:
 *  - Premium kullanıcılarda (usage_status -> isPremium) alan tamamen
 *    gizli kalır (Premium'un reklamsız deneyim beklentisiyle tutarlı).
 *  - Premium olmayan/misafir kullanıcılarda, açıkça "yakında" olarak
 *    etiketlenmiş, dürüst bir boş kutu gösterilir.
 * Gerçek bir sağlayıcı bağlandığında yalnızca aşağıdaki placeholder
 * HTML'i değiştirmek yeterli olacak — çağıran kod (renderAdSlot'u
 * çağıran sayfa) DEĞİŞMEYECEK.
 *
 * Premium durumu aynı `usage_status` Edge Function çağrısını (AI
 * Teknik Analiz ile PAYLAŞILAN, zaten var olan altyapı — yeni bir
 * endpoint/tablo EKLENMEDİ) kullanır ve 5 dakika önbelleğe alınır ki
 * her sayfa/tekrar render'da gereksiz ağ isteği oluşmasın.
 * ================================================================== */

let _adSlotPremiumCache = { value: null, at: 0 };

async function _adSlotIsPremium() {
  const now = Date.now();
  if (_adSlotPremiumCache.value !== null && now - _adSlotPremiumCache.at < 5 * 60 * 1000) {
    return _adSlotPremiumCache.value;
  }
  try {
    const usage = await aiCallFunction({ action: 'usage_status' });
    _adSlotPremiumCache = { value: !!usage.isPremium, at: now };
    return _adSlotPremiumCache.value;
  } catch (e) {
    // Misafir modu / oturum yok / geçici servis hatası: güvenli
    // varsayım "Premium değil" — misafir zaten Premium olamaz;
    // geçici bir hata durumunda dormant yer tutucunun görünmesi
    // zararsızdır (gerçek reklam içeriği yok, sadece boş bir kutu).
    _adSlotPremiumCache = { value: false, at: now };
    return false;
  }
}

/**
 * Verilen id'deki container'a dormant bir reklam alanı yerleştirir.
 * Premium kullanıcılarda container gizlenir (display:none + boş).
 * `slotName` yalnızca gelecekte farklı yerleşimleri ayırt etmek için
 * (ör. ileride birden çok slot eklenirse) — şu an görüntülenmiyor.
 */
async function renderAdSlot(containerId, slotName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const premium = await _adSlotIsPremium();
  if (premium) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.style.display = '';
  el.innerHTML = `
    <div class="ad-slot-placeholder" data-ad-slot="${escapeHtml(slotName || '')}">
      <span class="msr">campaign</span>
      <span>Reklam alanı — yakında</span>
    </div>
  `;
}

registerPageLoader('premium', loadPremiumPage);
