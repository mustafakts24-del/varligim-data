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

registerPageLoader('premium', loadPremiumPage);
