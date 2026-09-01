/* ==================================================================
 * app-varliklar.js
 * "Varlıklar" alt menüsündeki HESAPLAMA ARAÇLARI: Faiz (mevduat
 * hesaplayıcı + kullanıcının kendi mevduat kayıtları) ve Kredi
 * Hesaplama (saf hesaplayıcı, Supabase'e kayıt yazmaz).
 *
 * FAZ 7 (2026-09) ile bu dosya küçültüldü: Emtia/Hisse/Fon/Kripto/VİOP
 * PİYASA gezinme sayfalara taşındı (app-piyasa-*.js), kullanıcının
 * KENDİ bu türden varlıkları ise "Varlığım" menüsüne taşındı
 * (app-varligim.js) — mobildeki VARLIKLAR (piyasa) ≠ VARLIĞIM (kendi
 * portföyüm) ayrımıyla birebir eşleşsin diye. Faiz sayfası, mobilde de
 * hem hesaplayıcı hem "kendi mevduatların" ikili amacını taşıdığı için
 * burada aynı şekilde bırakıldı.
 * ================================================================== */

/* ==================================================================
 * FAİZ — Mevduat hesaplayıcı + mevcut mevduat kayıtları
 * ================================================================== */
async function loadDepositHoldings() {
  const { data, error } = await supa
    .from('deposit_holdings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tbody = document.getElementById('depositBody');
  const emptyState = document.getElementById('depositEmptyState');
  if (!tbody || !emptyState) return;
  tbody.innerHTML = '';
  if (error) {
    showMsg('Mevduat verileri yüklenemedi: ' + error.message, 'error');
    return;
  }
  if (!data || data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const row of data) {
    const tr = document.createElement('tr');
    const maturityText = row.maturity_date ? new Date(row.maturity_date).toLocaleDateString('tr-TR') : '—';
    const rateText = row.annual_rate == null ? '—' : `%${fmtNumber(row.annual_rate)}`;
    const currentValue = depositCurrentValue(row);
    tr.innerHTML = `
      <td><div class="sym">${escapeHtml(row.bank_name || 'Mevduat')}</div></td>
      <td class="num">${fmtTL(row.principal)}</td>
      <td class="num">${rateText}</td>
      <td class="num">${escapeHtml(maturityText)}</td>
      <td class="num">${fmtTL(currentValue)}</td>
      <td class="num">
        <button type="button" class="del deposit-delete" data-id="${escapeHtml(row.id || '')}" title="Sil">✕</button>
      </td>`;
    tr.querySelector('.deposit-delete').addEventListener('click', () => deleteDepositHolding(row.id));
    tbody.appendChild(tr);
  }
}

async function deleteDepositHolding(id) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !id) return;
  const { error } = await supa
    .from('deposit_holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);
  if (error) {
    showMsg('Mevduat silinemedi: ' + error.message, 'error');
    return;
  }
  await loadDepositHoldings();
}

document.getElementById('addDepositBtn').addEventListener('click', async () => {
  hideMsg();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const bankName = document.getElementById('newDepositBankName').value.trim();
  const principal = parseFloat(document.getElementById('newDepositPrincipal').value);
  const annualRate = parseFloat(document.getElementById('newDepositAnnualRate').value);
  const withholdingRateRaw = document.getElementById('newDepositWithholdingRate').value.trim();
  const withholdingRate = withholdingRateRaw === '' ? 0 : parseFloat(withholdingRateRaw);
  const startDateRaw = document.getElementById('newDepositStartDate').value;
  const maturityDateRaw = document.getElementById('newDepositMaturityDate').value;
  if (!bankName || isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 ||
      isNaN(withholdingRate) || withholdingRate < 0 || !startDateRaw || !maturityDateRaw) {
    showMsg('Lütfen mevduat bilgilerini eksiksiz ve geçerli şekilde gir.', 'error');
    return;
  }
  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const startDate = new Date(`${startDateRaw}T12:00:00`).toISOString();
  const maturityDate = new Date(`${maturityDateRaw}T12:00:00`).toISOString();
  const { error } = await supa.from('deposit_holdings').upsert({
    id, user_id: user.id, bank_name: bankName, principal, annual_rate: annualRate,
    withholding_rate: withholdingRate, start_date: startDate, maturity_date: maturityDate, deleted_at: null
  }, { onConflict: 'user_id,id' });
  if (error) {
    showMsg('Mevduat eklenemedi: ' + error.message, 'error');
    return;
  }
  ['newDepositBankName', 'newDepositPrincipal', 'newDepositAnnualRate',
    'newDepositWithholdingRate', 'newDepositStartDate', 'newDepositMaturityDate']
    .forEach(id => document.getElementById(id).value = '');
  await loadDepositHoldings();
});

document.getElementById('calcDepositBtn').addEventListener('click', () => {
  const resultsEl = document.getElementById('calcDepositResults');
  const principal = parseFloat(document.getElementById('calcDepositPrincipal').value);
  const annualRate = parseFloat(document.getElementById('calcDepositRate').value);
  const withholdingRate = parseFloat(document.getElementById('calcDepositWithholding').value) || 0;
  const startRaw = document.getElementById('calcDepositStart').value;
  const maturityRaw = document.getElementById('calcDepositMaturity').value;
  if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 || !startRaw || !maturityRaw) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Lütfen tüm alanları geçerli şekilde doldur.</div>`;
    return;
  }
  const startMs = new Date(`${startRaw}T12:00:00`).getTime();
  const maturityMs = new Date(`${maturityRaw}T12:00:00`).getTime();
  let totalDays = Math.round((maturityMs - startMs) / 86400000);
  if (!Number.isFinite(totalDays) || totalDays < 1) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Vade tarihi, başlangıç tarihinden sonra olmalı.</div>`;
    return;
  }
  const grossInterest = principal * (annualRate / 100) * (totalDays / 365);
  const tax = grossInterest * (withholdingRate / 100);
  const netInterest = grossInterest - tax;
  const maturityAmount = principal + netInterest;
  resultsEl.innerHTML = `
    <div class="calc-result-row"><span class="lbl">Vade (gün)</span><span class="val">${totalDays}</span></div>
    <div class="calc-result-row"><span class="lbl">Brüt faiz</span><span class="val">${fmtTL(grossInterest)}</span></div>
    <div class="calc-result-row"><span class="lbl">Stopaj kesintisi</span><span class="val pl-neg">-${fmtTL(tax)}</span></div>
    <div class="calc-result-row"><span class="lbl">Net faiz kazancı</span><span class="val pl-pos">+${fmtTL(netInterest)}</span></div>
    <div class="calc-result-row"><span class="lbl">Vade sonu eline geçecek</span><span class="val">${fmtTL(maturityAmount)}</span></div>
  `;
});

/* ==================================================================
 * KREDİ HESAPLAMA — saf hesaplayıcı (Supabase'e kayıt YOK)
 * Anüite formülü: A = P × [i(1+i)^n] / [(1+i)^n − 1]
 * KKDF ve BSMV, aylık faiz oranına eklenerek "efektif" bir aylık
 * orana dönüştürülür; taksit bu efektif oran ile sabit hesaplanır.
 * Yıllık Maliyet Oranı (YMO), tahsis ücreti de dahil edilerek aylık
 * iç verim oranından (IRR) türetilir.
 *
 * FAZ 7 notu: bu hesap web tarafında zaten mobildeki DOĞRU
 * (Detay sayfası) formülle birebir aynıydı — web'de mobildeki
 * "Hızlı Kart" hatası hiç yoktu. Mobil/web YÖNTEM tutarlılığı için
 * IRR çözücü burada da mobille aynı NEWTON-RAPHSON yöntemine
 * çevrildi (öncesinde bisection kullanılıyordu; ikisi de aynı doğru
 * sonuca yakınsıyordu, bu kozmetik bir uyum değişikliği).
 * ================================================================== */
const LOAN_TAX_RATES = {
  ihtiyac: { kkdf: 0.15, bsmv: 0.05 },
  tasit: { kkdf: 0.15, bsmv: 0.05 },
  konut: { kkdf: 0, bsmv: 0 }
};

function annuityPayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * (monthlyRate * factor) / (factor - 1);
}

/**
 * Aylık iç verim oranını (IRR) Newton-Raphson yöntemiyle çözer.
 * Mobildeki interest_credit_calculator_screen.dart'ın Detay
 * sayfasındaki YMO hesaplamasıyla aynı yöntem: f(rate) = PV(rate) -
 * netProceeds, f'(rate) türevi, 60 iterasyon, 1e-9 yakınsama toleransı.
 */
function solveMonthlyIrr(netProceeds, payment, months) {
  function f(rate) {
    let pv = 0;
    for (let t = 1; t <= months; t++) pv += payment / Math.pow(1 + rate, t);
    return pv - netProceeds;
  }
  function fPrime(rate) {
    let d = 0;
    for (let t = 1; t <= months; t++) d += (-t * payment) / Math.pow(1 + rate, t + 1);
    return d;
  }
  let rate = 0.02; // başlangıç tahmini: aylık %2
  for (let iter = 0; iter < 60; iter++) {
    const fx = f(rate);
    const fpx = fPrime(rate);
    if (!Number.isFinite(fx) || !Number.isFinite(fpx) || Math.abs(fpx) < 1e-12) break;
    let next = rate - fx / fpx;
    if (!Number.isFinite(next) || next <= -0.999) { next = rate / 2; }
    if (Math.abs(next - rate) < 1e-9) { rate = next; break; }
    rate = next;
  }
  return rate;
}

let lastLoanSchedule = [];
let loanScheduleExpanded = false;

function renderLoanSchedule() {
  const tbody = document.getElementById('loanScheduleBody');
  const rows = loanScheduleExpanded ? lastLoanSchedule : lastLoanSchedule.slice(0, 12);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="num">${r.n}</td>
      <td class="num">${fmtTL(r.payment)}</td>
      <td class="num">${fmtTL(r.principalPart)}</td>
      <td class="num">${fmtTL(r.interestTaxPart)}</td>
      <td class="num">${fmtTL(r.remaining)}</td>
    </tr>
  `).join('');
  const toggleBtn = document.getElementById('toggleLoanScheduleBtn');
  if (lastLoanSchedule.length > 12) {
    toggleBtn.style.display = '';
    toggleBtn.textContent = loanScheduleExpanded ? 'Sadece ilk 12 ayı göster' : 'Tümünü göster';
  } else {
    toggleBtn.style.display = 'none';
  }
}

document.getElementById('toggleLoanScheduleBtn').addEventListener('click', () => {
  loanScheduleExpanded = !loanScheduleExpanded;
  renderLoanSchedule();
});

document.getElementById('calcLoanBtn').addEventListener('click', () => {
  const resultsEl = document.getElementById('loanResults');
  const scheduleCard = document.getElementById('loanScheduleCard');
  const principal = parseFloat(document.getElementById('loanAmount').value);
  const annualRate = parseFloat(document.getElementById('loanRate').value);
  const months = parseInt(document.getElementById('loanTerm').value, 10);
  const loanType = document.getElementById('loanType').value;
  const feeRate = parseFloat(document.getElementById('loanFeeRate').value) || 0;

  if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 ||
      isNaN(months) || months < 1) {
    resultsEl.innerHTML = `<div class="placeholder-box"><span class="msr">error</span>Lütfen tüm alanları geçerli şekilde doldur.</div>`;
    scheduleCard.style.display = 'none';
    return;
  }

  const taxRates = LOAN_TAX_RATES[loanType] || LOAN_TAX_RATES.ihtiyac;
  const nominalMonthlyRate = annualRate / 12 / 100;
  const effectiveMonthlyRate = nominalMonthlyRate * (1 + taxRates.kkdf + taxRates.bsmv);
  const payment = annuityPayment(principal, effectiveMonthlyRate, months);

  let remaining = principal;
  const schedule = [];
  for (let n = 1; n <= months; n++) {
    const interestTaxPart = remaining * effectiveMonthlyRate;
    let principalPart = payment - interestTaxPart;
    if (n === months) principalPart = remaining; // yuvarlama farkını son taksitte kapat
    remaining = Math.max(0, remaining - principalPart);
    schedule.push({ n, payment, principalPart, interestTaxPart, remaining });
  }
  lastLoanSchedule = schedule;
  loanScheduleExpanded = false;

  const totalRepayment = payment * months;
  const totalInterestTax = totalRepayment - principal;
  const allocationFee = principal * (feeRate / 100);
  const netProceeds = principal - allocationFee;
  const monthlyIrr = solveMonthlyIrr(netProceeds, payment, months);
  const annualCostRate = (Math.pow(1 + monthlyIrr, 12) - 1) * 100;

  resultsEl.innerHTML = `
    <div class="calc-result-row"><span class="lbl">Aylık taksit tutarı</span><span class="val">${fmtTL(payment)}</span></div>
    <div class="calc-result-row"><span class="lbl">Toplam geri ödeme</span><span class="val">${fmtTL(totalRepayment)}</span></div>
    <div class="calc-result-row"><span class="lbl">Toplam faiz + vergi</span><span class="val pl-neg">${fmtTL(totalInterestTax)}</span></div>
    <div class="calc-result-row"><span class="lbl">Tahsis ücreti (yaklaşık)</span><span class="val">${fmtTL(allocationFee)}</span></div>
    <div class="calc-result-row"><span class="lbl">Yıllık Maliyet Oranı (YMO)</span><span class="val">%${annualCostRate.toFixed(2)}</span></div>
  `;
  scheduleCard.style.display = '';
  renderLoanSchedule();
});

/* ==================================================================
 * SAYFA YÜKLEYİCİSİ
 * ================================================================== */
registerPageLoader('faiz', loadDepositHoldings);
