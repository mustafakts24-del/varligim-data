/* ==================================================================
 * app-uyelik.js — Üyelik Bilgileri sayfası (2026-09-11, güncelleme
 * 2026-09-11: 3 paketten 6 pakete genişletildi)
 *
 * Mobildeki membership_screen.dart ile BİREBİR aynı yapı, web'e
 * taşındı: üstte sabit kalan (yatay kaydırılabilen) 6 paket sekmesi,
 * altında bunlara bağlı sağa/sola kayan 6 panel, ardından "Yıllık
 * Üyeliği Başlat" / "Aylık Üyeliği Başlat" butonları ve en altta
 * "Ön Bilgilendirme Formu" / "Mesafeli Satış Sözleşmesi" butonları.
 *
 * Paket sırası/renkleri kullanıcı talebiyle birebir: Varlığım (yeşil),
 * Varlığım Plus (mavi), Varlığım Pro (pembe), Varlığım AI (sarı),
 * Varlığım AI Pro (turuncu), Varlığım AI Pro Plus (kırmızı). Her
 * sekmenin aktifken kendi rengiyle vurgulanması ve panelindeki ikonun
 * da aynı renkte olması için her pakete bir `color` eklendi.
 *
 * DÜRÜSTLÜK NOTU (mobildeki ile AYNI): kullanıcı bu 6 paketin gerçek
 * içeriğini HENÜZ vermedi ("daha sonra ekleyeceğiz" dedi) — bu yüzden
 * sahte özellik listesi/fiyat UYDURULMADI; her panel dürüst bir
 * "içerik yakında eklenecek" yer tutucusu gösteriyor. Aynı şekilde
 * gerçek bir ödeme sağlayıcısı ve "Ön Bilgilendirme Formu" / "Mesafeli
 * Satış Sözleşmesi" belgelerinin gerçek metni de henüz YOK — butonlar,
 * uygulamada zaten var olan app-premium.js ile AYNI dürüst "çok
 * yakında" desenini kullanıyor.
 * ================================================================== */

const MEMBERSHIP_PLANS = [
  { key: 'varligim', label: 'Varlığım', icon: 'candlestick_chart', color: '#22C55E' },
  { key: 'varligim_plus', label: 'Varlığım Plus', icon: 'trending_up', color: '#3B82F6' },
  { key: 'varligim_pro', label: 'Varlığım Pro', icon: 'workspace_premium', color: '#EC4899' },
  { key: 'varligim_ai', label: 'Varlığım AI', icon: 'smart_toy', color: '#FBBF24' },
  { key: 'varligim_ai_pro', label: 'Varlığım AI Pro', icon: 'auto_awesome', color: '#F97316' },
  { key: 'varligim_ai_pro_plus', label: 'Varlığım AI Pro Plus', icon: 'diamond', color: '#EF4444' },
];

function _uyelikComingSoon(btn, message) {
  if (!btn) return;
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = message;
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = original;
  }, 2400);
}

function renderUyelikPage() {
  const body = document.getElementById('uyelikPageBody');
  if (!body) return;
  // Zaten oluşturulmuşsa yeniden kurmuyoruz (sekme/kaydırma durumu
  // sayfalar arası geçişte korunsun diye).
  if (body.dataset.built === '1') return;
  body.dataset.built = '1';

  body.innerHTML = `
    <h1 class="page-title">Üyelik Bilgileri</h1>
    <p class="page-lead">Paketlerini incele.</p>
    <div class="membership-tabbar" id="membershipTabbar">
      ${MEMBERSHIP_PLANS.map(
        (p, i) => `<div class="membership-tab${i === 0 ? ' active' : ''}" data-index="${i}" style="--tab-c:${p.color}">${escapeHtml(p.label)}</div>`
      ).join('')}
    </div>
    <div class="membership-panels" id="membershipPanels">
      ${MEMBERSHIP_PLANS.map(
        (p) => `
        <div class="membership-panel">
          <span class="msr big" style="color:${p.color}">${p.icon}</span>
          <h2>${escapeHtml(p.label)}</h2>
          <p>Bu paketin içeriği yakında eklenecek.</p>
        </div>`
      ).join('')}
    </div>
    <div class="membership-actions">
      <button class="btn primary full" id="membershipYearlyBtn">Yıllık Üyeliği Başlat</button>
      <button class="btn outline full" id="membershipMonthlyBtn">Aylık Üyeliği Başlat</button>
      <div class="membership-legal-row">
        <button class="btn" id="membershipPreInfoBtn">Ön Bilgilendirme Formu</button>
        <div class="membership-legal-divider"></div>
        <button class="btn" id="membershipDistanceSaleBtn">Mesafeli Satış Sözleşmesi</button>
      </div>
    </div>
  `;

  const tabbar = document.getElementById('membershipTabbar');
  const panels = document.getElementById('membershipPanels');
  const tabs = Array.from(tabbar.querySelectorAll('.membership-tab'));

  function setActiveTab(index) {
    tabs.forEach((t) => t.classList.toggle('active', Number(t.dataset.index) === index));
    const activeTab = tabs[index];
    if (activeTab && activeTab.scrollIntoView) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const index = Number(tab.dataset.index);
      setActiveTab(index);
      panels.scrollTo({ left: panels.clientWidth * index, behavior: 'smooth' });
    });
  });

  // "sağa ve sola kayan sayfalar" — kaydırma/sürükleme ile de sekmeler
  // senkron kalır (mobildeki PageView.onPageChanged ile aynı).
  let scrollTimer = null;
  panels.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const index = Math.round(panels.scrollLeft / panels.clientWidth);
      setActiveTab(index);
    }, 80);
  });

  document
    .getElementById('membershipYearlyBtn')
    .addEventListener('click', (e) => _uyelikComingSoon(e.currentTarget, 'Ödeme sistemi çok yakında 🚀'));
  document
    .getElementById('membershipMonthlyBtn')
    .addEventListener('click', (e) => _uyelikComingSoon(e.currentTarget, 'Ödeme sistemi çok yakında 🚀'));
  document
    .getElementById('membershipPreInfoBtn')
    .addEventListener('click', (e) => _uyelikComingSoon(e.currentTarget, 'Ön Bilgilendirme Formu yakında eklenecek.'));
  document
    .getElementById('membershipDistanceSaleBtn')
    .addEventListener('click', (e) => _uyelikComingSoon(e.currentTarget, 'Mesafeli Satış Sözleşmesi yakında eklenecek.'));
}
registerPageLoader('uyelik', renderUyelikPage);

document.getElementById('sidebarMembershipBtn')?.addEventListener('click', () => showPage('uyelik'));
