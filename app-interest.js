/* ==================================================================
 * app-interest.js
 * FAZ 13: "Faiz" ve "Kredi Hesaplama" sayfalarına GERÇEK ZAMANLI banka
 * oranı KARŞILAŞTIRMA LİSTESİ ekler — price-proxy'nin yeni
 * `type=bank-rates` ucu üzerinden (mobildeki BankRateService /
 * teklifimgelsin.com ile AYNI kaynak, bkz. index.ts getBankRates()).
 *
 * ÖNEMLİ TASARIM KARARI (kural: "aynı iş için ikinci bir sistem
 * kurma"): bu dosya kendi başına bağımsız bir amortisman/IRR
 * hesaplayıcısı YENİDEN kurmaz. Bunun yerine her banka satırındaki
 * "Aktar" butonu, app-varliklar.js'teki MEVCUT (ve zaten doğru/
 * çalışan) Hesaplayıcı/Kredi Bilgileri formlarını seçilen bankanın
 * gerçek oranı ve vadesiyle doldurup mevcut hesapla butonunu tetikler
 * — böylece tüm ödeme planı/YMO/stopaj mantığı TEK bir yerde kalır.
 * Listedeki "tahmini" sütun yalnızca hızlı bir önizlemedir ve AYNI
 * formülleri (annuityPayment / basit vade faizi) kullanır.
 *
 * Mevduat oranları YILLIK, kredi oranları ise kaynağın Türkiye'deki
 * ilan geleneğine uygun olarak AYLIKTIR (offer.isMonthlyRate bunu
 * yansıtır — mobildeki AYNI kaynağın AYNI yorumu, bkz.
 * interest_credit_calculator_screen.dart üstündeki not).
 *
 * DÜRÜSTLÜK NOTU: Listede gösterilen mevduat "Tahmini Kazanç"/"Vade
 * Sonu Bakiye" değerleri BRÜTTÜR (stopaj dahil değildir) — bu,
 * mobildeki AYNI ekranın kod yorumunda da açıkça belirtilen bir
 * sınırlamadır (kaynak sitede bankaya/hesap türüne özel stopaj bilgisi
 * yok). Kesin net tutar için kullanıcı "Aktar" ile Hesaplayıcı'ya
 * geçip kendi stopaj oranını girer.
 * ================================================================== */

// Mobildeki _presetTerms [32, 46, 55, 92, 181] ile AYNI + kullanıcının
// açıkça istediği 12 aylık (365 gün) nokta WEB'E ÖZEL eklendi (mobilde
// yok — kaynak site tek bir yıllık oran aralığı verdiği için vade
// arttıkça sonucu orantılı şekilde etkiler, ekstra risk taşımaz).
const BANK_DEPOSIT_TERM_PRESETS = [
  { days: 32, label: '32 gün' },
  { days: 46, label: '46 gün' },
  { days: 55, label: '55 gün' },
  { days: 92, label: '3 ay' },
  { days: 181, label: '6 ay' },
  { days: 365, label: '12 ay' }
];

// Mobildeki LoanType enum'unda SADECE ihtiyac/tasit/konut var —
// "Ticari Kredi" ne mobilde ne de teklifimgelsin.com kaynağında
// mevcut olduğundan, uydurma bir veri kaynağıyla eklenmedi.
const LOAN_INSTALLMENT_PRESETS = {
  ihtiyac: [3, 6, 9, 12, 18, 24, 36],
  tasit: [6, 12, 24, 36, 48],
  konut: [36, 60, 84, 120]
};

// Mobildeki _bddkMaxInstallments() ile BİREBİR AYNI (BDDK azami vade
// kademeleri, kredi türüne ve tutara göre).
function bddkMaxInstallments(loanType, principal) {
  if (!(principal > 0)) return null;
  if (loanType === 'ihtiyac') {
    if (principal <= 125000) return 36;
    if (principal <= 250000) return 24;
    return 12;
  }
  if (loanType === 'tasit') {
    if (principal <= 400000) return 48;
    if (principal <= 800000) return 36;
    if (principal <= 1200000) return 24;
    return 12;
  }
  if (loanType === 'konut') return 120;
  return null;
}

async function fetchBankRates(product) {
  const result = await cachedFetch(`bank-rates:${product}`, 30 * 60 * 1000, () =>
    fetchPriceProxy(`type=bank-rates&product=${encodeURIComponent(product)}`));
  return result.offers || [];
}

function bankAverageRate(offer) {
  return (Number(offer.minRate) + Number(offer.maxRate)) / 2;
}

function bankRateRangeText(offer) {
  const min = offer.minRate, max = offer.maxRate;
  if (Math.abs(min - max) < 0.005) return `%${fmtPercent(min, 2)}`;
  return `%${fmtPercent(min, 1)}–${fmtPercent(max, 1)}`;
}

function bankAmountRangeText(offer) {
  if (offer.minAmount == null && offer.maxAmount == null) return null;
  const min = offer.minAmount != null ? fmtTL(offer.minAmount) : '—';
  const max = offer.maxAmount != null ? fmtTL(offer.maxAmount) : '—';
  return `Tutar: ${min} – ${max}`;
}

// DÜZELTME (2026-09, hata raporu #11: "Ödeme Planını Göster çalışmıyor"):
// Canlı testte hesaplama mantığının kendisi (alanları doldurup
// #calcLoanBtn/#calcDepositBtn'i tetiklemesi) DOĞRU çalıştığı doğrulandı
// — sonuç her zaman hesaplanıyor. Kullanıcının "çalışmıyor" izlenimi,
// büyük olasılıkla sonuç kartının (Sonuç bölümü) ekranın altında,
// görünür alanın dışında kalması ve herhangi bir görsel geri bildirim
// olmamasıydı (özellikle mobilde). Bu yüzden: (1) kaydırma 'center'a
// çevrildi (kart tam ortalanır, sadece üstü değil), (2) kısa bir
// vurgulama (highlight) animasyonu eklendi, (3) kullanıcıya açık bir
// onay mesajı gösterilir — böylece işlemin gerçekleştiği ASLA gözden
// kaçmaz.
function scrollToCard(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash-highlight');
  // reflow zorlayarak animasyonun tekrar tetiklenmesini sağla
  void el.offsetWidth;
  el.classList.add('flash-highlight');
  setTimeout(() => el.classList.remove('flash-highlight'), 1600);
}

/* ------------------------------------------------------------------
 * MEVDUAT — Banka Oranları Karşılaştırma
 * ------------------------------------------------------------------ */
let depositBankOffers = [];
let depositBankTermDays = 92;

async function loadDepositBankRates() {
  const listEl = document.getElementById('depositBankList');
  if (!listEl) return;
  listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Yükleniyor…</div>`;
  try {
    depositBankOffers = await fetchBankRates('deposit');
    if (depositBankOffers.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka verisi şu anda alınamadı. Tekrar deneyin.</div>`;
      return;
    }
    renderDepositBankList();
  } catch (e) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka oranları şu anda alınamadı: ${escapeHtml(e.message)}</div>`;
  }
}

function renderDepositBankTermChips() {
  const wrap = document.getElementById('depositBankTermChips');
  if (!wrap) return;
  wrap.innerHTML = BANK_DEPOSIT_TERM_PRESETS.map(t => `
    <div class="filter-chip${t.days === depositBankTermDays ? ' active' : ''}" data-days="${t.days}">${escapeHtml(t.label)}</div>
  `).join('');
  wrap.querySelectorAll('[data-days]').forEach(chip => {
    chip.addEventListener('click', () => {
      depositBankTermDays = parseInt(chip.dataset.days, 10);
      wrap.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderDepositBankList();
    });
  });
}

function renderDepositBankList() {
  const listEl = document.getElementById('depositBankList');
  if (!listEl) return;
  const principal = parseFloat(document.getElementById('depositBankPrincipal').value) || 100000;
  if (depositBankOffers.length === 0) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka verisi şu anda alınamadı.</div>`;
    return;
  }
  const sorted = [...depositBankOffers].sort((a, b) => bankAverageRate(b) - bankAverageRate(a));
  listEl.innerHTML = sorted.map((offer, idx) => {
    const rate = bankAverageRate(offer);
    // Basit vade faizi — mevcut Hesaplayıcı kartındaki (calcDepositBtn)
    // AYNI formül: brüt kazanç = anapara × oran × (gün/365).
    const grossEarning = principal * (rate / 100) * (depositBankTermDays / 365);
    const maturityBalance = principal + grossEarning;
    const amountRange = bankAmountRangeText(offer);
    return `
      <div class="bank-offer-row">
        <div class="bank-logo-cell">${bankLogoImg(offer, 28)}</div>
        <div>
          <div class="bank-name">${escapeHtml(offer.bankName)}</div>
          <div class="bank-sub">${amountRange ? escapeHtml(amountRange) : 'Tutar bilgisi yok'}</div>
        </div>
        <div>
          <div class="bank-name">${bankRateRangeText(offer)}</div>
          <div class="bank-sub">yıllık</div>
        </div>
        <div>
          <div class="bank-name">${fmtTL(grossEarning)}</div>
          <div class="bank-sub">tahmini kazanç (brüt)</div>
        </div>
        <button type="button" class="bank-offer-select" data-deposit-idx="${idx}">Hesaplayıcıya Aktar</button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('[data-deposit-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = sorted[parseInt(btn.dataset.depositIdx, 10)];
      const rate = bankAverageRate(offer);
      const today = new Date();
      const maturity = new Date(today.getTime() + depositBankTermDays * 86400000);
      const toInputDate = d => d.toISOString().slice(0, 10);
      document.getElementById('calcDepositPrincipal').value = principal;
      document.getElementById('calcDepositRate').value = rate.toFixed(2);
      document.getElementById('calcDepositStart').value = toInputDate(today);
      document.getElementById('calcDepositMaturity').value = toInputDate(maturity);
      document.getElementById('calcDepositBtn').click();
      scrollToCard(document.getElementById('calcDepositResults'));
      showMsg('Hesaplayıcıya aktarıldı — sonuç aşağıda görüntüleniyor.', 'success');
    });
  });
}

/* ------------------------------------------------------------------
 * KREDİ — Banka Oranları Karşılaştırma
 * ------------------------------------------------------------------ */
let creditBankOffers = [];
let creditBankInstallmentMonths = 12;

function creditBankLoanType() {
  const el = document.getElementById('creditBankType');
  return el ? el.value : 'ihtiyac';
}

async function loadCreditBankRates() {
  const listEl = document.getElementById('creditBankList');
  if (!listEl) return;
  listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Yükleniyor…</div>`;
  try {
    creditBankOffers = await fetchBankRates(creditBankLoanType());
    if (creditBankOffers.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka verisi şu anda alınamadı. Tekrar deneyin.</div>`;
      return;
    }
    renderCreditBankInstallmentChips();
    renderCreditBankList();
  } catch (e) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka oranları şu anda alınamadı: ${escapeHtml(e.message)}</div>`;
  }
}

function applyCreditBddkRule() {
  const noticeEl = document.getElementById('creditBankBddkNotice');
  const principal = parseFloat(document.getElementById('creditBankAmount').value) || 0;
  const maxAllowed = bddkMaxInstallments(creditBankLoanType(), principal);
  if (maxAllowed != null && creditBankInstallmentMonths > maxAllowed) {
    const previous = creditBankInstallmentMonths;
    creditBankInstallmentMonths = maxAllowed;
    if (noticeEl) {
      noticeEl.style.display = '';
      noticeEl.textContent = `BDDK düzenlemesi gereği ${fmtTL(principal)} tutarındaki bir kredi en fazla ${maxAllowed} ay vadeli olabiliyor. Taksit sayısı ${previous} aydan ${maxAllowed} aya otomatik güncellendi.`;
    }
    return true;
  }
  if (noticeEl) noticeEl.style.display = 'none';
  return false;
}

function renderCreditBankInstallmentChips() {
  const wrap = document.getElementById('creditBankInstallmentChips');
  if (!wrap) return;
  const presets = LOAN_INSTALLMENT_PRESETS[creditBankLoanType()] || LOAN_INSTALLMENT_PRESETS.ihtiyac;
  if (!presets.includes(creditBankInstallmentMonths)) {
    creditBankInstallmentMonths = presets[Math.floor(presets.length / 2)];
  }
  applyCreditBddkRule();
  wrap.innerHTML = presets.map(m => `
    <div class="filter-chip${m === creditBankInstallmentMonths ? ' active' : ''}" data-months="${m}">${m} ay</div>
  `).join('');
  wrap.querySelectorAll('[data-months]').forEach(chip => {
    chip.addEventListener('click', () => {
      creditBankInstallmentMonths = parseInt(chip.dataset.months, 10);
      if (applyCreditBddkRule()) {
        renderCreditBankInstallmentChips();
      } else {
        wrap.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
      renderCreditBankList();
    });
  });
}

function renderCreditBankList() {
  const listEl = document.getElementById('creditBankList');
  if (!listEl) return;
  const principal = parseFloat(document.getElementById('creditBankAmount').value) || 0;
  const months = creditBankInstallmentMonths;
  if (creditBankOffers.length === 0) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Güncel banka verisi şu anda alınamadı.</div>`;
    return;
  }
  // Bankaların ilan ettiği tutar/vade aralığının dışında kalan teklifler
  // gösterilmez (mobildeki _visibleOffers filtresiyle AYNI mantık).
  const filtered = creditBankOffers.filter(o => {
    const termDays = months * 30;
    if (principal > 0 && o.minAmount != null && principal < o.minAmount) return false;
    if (principal > 0 && o.maxAmount != null && principal > o.maxAmount) return false;
    if (o.minTermDays != null && termDays < o.minTermDays) return false;
    if (o.maxTermDays != null && termDays > o.maxTermDays) return false;
    return true;
  });
  const sorted = filtered.sort((a, b) => bankAverageRate(a) - bankAverageRate(b));
  if (sorted.length === 0) {
    listEl.innerHTML = `<div class="empty" style="padding:14px 0;">Girdiğiniz tutar veya taksit sayısına uygun banka bulunamadı. Farklı bir tutar ya da taksit deneyin.</div>`;
    return;
  }
  listEl.innerHTML = sorted.map((offer, idx) => {
    const monthlyRate = bankAverageRate(offer) / 100;
    // Hızlı önizleme taksiti: MEVCUT annuityPayment() (app-varliklar.js,
    // saf anüite formülü) — ayrı bir hesap motoru YOK, aynı fonksiyon.
    const quickInstallment = (principal > 0 && months > 0)
      ? annuityPayment(principal, monthlyRate, months) : null;
    const amountRange = bankAmountRangeText(offer);
    return `
      <div class="bank-offer-row">
        <div class="bank-logo-cell">${bankLogoImg(offer, 28)}</div>
        <div>
          <div class="bank-name">${escapeHtml(offer.bankName)}</div>
          <div class="bank-sub">${amountRange ? escapeHtml(amountRange) : 'Tutar bilgisi yok'}</div>
        </div>
        <div>
          <div class="bank-name">${bankRateRangeText(offer)}</div>
          <div class="bank-sub">aylık</div>
        </div>
        <div>
          <div class="bank-name">${quickInstallment != null ? fmtTL(quickInstallment) : '—'}</div>
          <div class="bank-sub">yaklaşık taksit (vergiler hariç)</div>
        </div>
        <button type="button" class="bank-offer-select" data-credit-idx="${idx}">Ödeme Planını Göster</button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('[data-credit-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = sorted[parseInt(btn.dataset.creditIdx, 10)];
      const monthlyRatePct = bankAverageRate(offer);
      document.getElementById('loanAmount').value = principal;
      // Manuel form YILLIK oran bekliyor (annualRate/12/100 iç
      // hesabıyla); banka kaynağı AYLIK oran verdiği için ×12 ile
      // geri yıllığa çevrilir — kural: mobildeki gerçek AYLIK oranı
      // olduğu gibi kullan, yalnızca mevcut formun beklediği birime
      // dönüştür.
      document.getElementById('loanRate').value = (monthlyRatePct * 12).toFixed(2);
      document.getElementById('loanTerm').value = months;
      document.getElementById('loanType').value = creditBankLoanType();
      document.getElementById('calcLoanBtn').click();
      scrollToCard(document.getElementById('loanResults'));
      showMsg('Ödeme planı hesaplandı — sonuç aşağıda görüntüleniyor.', 'success');
    });
  });
}

/* ------------------------------------------------------------------
 * OLAY BAĞLAMA + SAYFA YÜKLEYİCİLERİNE KAYIT
 * ------------------------------------------------------------------ */
function initInterestBankSections() {
  renderDepositBankTermChips();
  document.getElementById('depositBankRefreshBtn')?.addEventListener('click', loadDepositBankRates);
  document.getElementById('depositBankPrincipal')?.addEventListener('input', debounce(renderDepositBankList, 300));

  document.getElementById('creditBankRefreshBtn')?.addEventListener('click', loadCreditBankRates);
  document.getElementById('creditBankAmount')?.addEventListener('input', debounce(() => {
    applyCreditBddkRule();
    renderCreditBankInstallmentChips();
    renderCreditBankList();
  }, 300));
  document.getElementById('creditBankType')?.addEventListener('change', () => {
    creditBankInstallmentMonths = LOAN_INSTALLMENT_PRESETS[creditBankLoanType()][0];
    loadCreditBankRates();
  });
}
initInterestBankSections();

// app-core.js'teki pageLoaders kaydı tek fonksiyonludur (registerPageLoader
// aynı id'yle tekrar çağrılırsa ÖNCEKİ fonksiyonu SİLER). "Faiz" ve
// "Kredi Hesaplama" sayfaları zaten app-varliklar.js tarafından
// (loadDepositHoldings / kredi sayfasının kendi bir yükleyicisi yok, o
// yalnızca statik form) kayıtlı olduğundan, burada MEVCUT kaydı ALIP
// SARMALIYORUZ (wrap) — böylece hem eski davranış hem de yeni banka
// listesi çalışır; hiçbir mevcut kayıt kaybolmaz.
const _existingFaizLoader = typeof pageLoaders !== 'undefined' ? pageLoaders['faiz'] : null;
registerPageLoader('faiz', async () => {
  if (typeof _existingFaizLoader === 'function') await _existingFaizLoader();
  await loadDepositBankRates();
});

const _existingKrediLoader = typeof pageLoaders !== 'undefined' ? pageLoaders['kredi'] : null;
registerPageLoader('kredi', async () => {
  if (typeof _existingKrediLoader === 'function') await _existingKrediLoader();
  await loadCreditBankRates();
});
