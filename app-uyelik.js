/* ==================================================================
 * app-uyelik.js — Üyelik Bilgileri sayfası (2026-09-11)
 *
 * Mobildeki membership_screen.dart ile BİREBİR aynı yapı, web'e
 * taşındı: üstte sabit kalan Trade/Pro/Premium sekmeleri, altında
 * yatay kayan/tıklanan 3 panel (Trade varsayılan), ardından "Yıllık
 * Üyeliği Başlat" / "Aylık Üyeliği Başlat" butonları ve en altta
 * "Ön Bilgilendirme Formu" / "Mesafeli Satış Sözleşmesi" butonları.
 *
 * DÜRÜSTLÜK NOTU (mobildeki ile AYNI): kullanıcı bu 3 sayfanın
 * (Trade/Pro/Premium) gerçek içeriğini HENÜZ vermedi ("daha sonra
 * ekleyeceğiz" dedi) — bu yüzden sahte özellik listesi/fiyat
 * UYDURULMADI; her panel dürüst bir "içerik yakında eklenecek" yer
 * tutucusu gösteriyor. Aynı şekilde gerçek bir ödeme sağlayıcısı ve
 * "Ön Bilgilendirme Formu" / "Mesafeli Satış Sözleşmesi" belgelerinin
 * gerçek metni de henüz YOK — butonlar, uygulamada zaten var olan
 * app-premium.js ile AYNI dürüst "çok yakında" desenini kullanıyor.
 * ================================================================== */

const MEMBERSHIP_PLANS = [
  { key: 'trade', label: 'Trade', icon: 'candlestick_chart' },
  { key: 'pro', label: 'Pro', icon: 'workspace_premium' },
  { key: 'premium', label: 'Premium', icon: 'diamond' },
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
    <p class="page-lead">Trade, Pro ve Premium paketlerini incele.</p>
    <div class="membership-tabbar" id="membershipTabbar">
      ${MEMBERSHIP_PLANS.map(
        (p, i) => `<div class="membership-tab${i === 0 ? ' active' : ''}" data-index="${i}">${escapeHtml(p.label)}</div>`
      ).join('')}
    </div>
    <div class="membership-panels" id="membershipPanels">
      ${MEMBERSHIP_PLANS.map(
        (p) => `
        <div class="membership-panel">
          <span class="msr big">${p.icon}</span>
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
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const index = Number(tab.dataset.index);
      setActiveTab(index);
      panels.scrollTo({ left: panels.clientWidth * index, behavior: 'smooth' });
    });
  });

  // "sağa ve sola kayan 3 adet sayfa" — kaydırma/sürükleme ile de
  // sekmeler senkron kalır (mobildeki PageView.onPageChanged ile aynı).
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
