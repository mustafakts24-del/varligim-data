/* ==================================================================
 * app-valuation.js — "Akıllı Değerleme" (FAZ 3-6, web)
 *
 * Mobil `lib/services/valuation_service.dart` ile AYNI backend'i
 * (aynı `asset-valuation` Edge Function, aynı tablolar) kullanır —
 * mobil ve web arasında mantık/veri TAMAMEN paylaşılır. Çağrı deseni,
 * bu dosyanın `app-ai-analiz.js`'teki AYNI kimlik doğrulama desenini
 * (kullanıcının oturum JWT'si, `Authorization: Bearer <token>`)
 * izlemesiyle kurulmuştur.
 *
 * Mimari not (bkz. Edge Function'daki aynı not): karşılaştırma verisi
 * havuzu yalnızca sunucu tarafında (service_role ile) okunur ve
 * istemciye YALNIZCA toplu/istatistiksel sonuç döner — başka bir
 * kullanıcının tek satırı bu istemciye asla ulaşmaz.
 *
 * Kullanım: Araç/Gayrimenkul tablosundaki "Akıllı Değerleme" butonuna
 * tıklanınca `valOpenModal(...)` çağrılır — mevcut ortak "Detay
 * Modalı" (app-core.js: openDetailModal/closeDetailModal) yeniden
 * kullanılır, yeni bir modal bileşeni İCAT EDİLMEZ.
 * ================================================================== */

const VALUATION_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/asset-valuation`;

async function valGetAuthToken() {
  try {
    const { data } = await supa.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

async function valCallFunction(body) {
  const token = await valGetAuthToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  let res;
  try {
    res = await fetch(VALUATION_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('Değerleme servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'Değerleme servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data;
}

function valQualityLabel(q) {
  if (q === 'high') return 'Yüksek güven';
  if (q === 'medium') return 'Orta güven';
  return 'Düşük güven — az karşılaştırma verisi';
}
function valQualityColor(q) {
  if (q === 'high') return '#1DBE82';
  if (q === 'medium') return '#F5A524';
  return '#93A6CC';
}
function valTimeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

/* ------------------------------------------------------------------
 * Modal açma / içerik render
 * ------------------------------------------------------------------ */
async function valOpenModal(assetType, assetId, titleText, subText) {
  openDetailModal(
    `${escapeHtml(titleText)}<span class="sub">${escapeHtml(subText)}</span>`,
    `<div id="valModalBody" style="min-height:120px;"><div class="empty">Yükleniyor...</div></div>`
  );
  await valLoadAndRender(assetType, assetId, false);
}

async function valLoadAndRender(assetType, assetId, forceRefresh) {
  const bodyEl = document.getElementById('valModalBody');
  if (!bodyEl) return; // Modal kapatılmış olabilir.
  bodyEl.innerHTML = '<div class="empty">Yükleniyor...</div>';
  try {
    const data = await valCallFunction({ action: 'estimate', assetType, assetId, forceRefresh: !!forceRefresh });
    if (!document.getElementById('valModalBody')) return; // Kullanıcı modalı kapattı.
    bodyEl.innerHTML = valRenderResult(data);
    const refreshBtn = document.getElementById('valRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => valLoadAndRender(assetType, assetId, true));
    const addBtn = document.getElementById('valAddComparableBtn');
    if (addBtn) addBtn.addEventListener('click', () => valShowAddComparableForm(assetType, assetId));
    if (!data.insufficientData) {
      valLoadHistoryChart(assetId);
    }
  } catch (e) {
    if (!document.getElementById('valModalBody')) return;
    bodyEl.innerHTML = `
      <div class="empty">${escapeHtml(e.message || 'Değerleme yüklenemedi.')}</div>
      <button class="btn outline small" id="valRetryBtn" type="button" style="margin-top:10px;">Tekrar dene</button>`;
    const retryBtn = document.getElementById('valRetryBtn');
    if (retryBtn) retryBtn.addEventListener('click', () => valLoadAndRender(assetType, assetId, forceRefresh));
  }
}

function valRenderResult(data) {
  if (data.insufficientData) {
    return `
      <div style="font-size:13px; color:var(--text-muted); line-height:1.5;">${escapeHtml(data.message || 'Bu varlık için karşılaştırılabilir veri bulunamadı.')}</div>
      <button class="btn outline" id="valAddComparableBtn" type="button" style="margin-top:12px;">
        <span class="msr" style="font-size:16px; vertical-align:-3px;">add</span> Karşılaştırma Fiyatı Ekle
      </button>`;
  }

  const v = data.valuation || {};
  const qColor = valQualityColor(v.valuation_quality);
  const marketValueHtml = v.market_value != null ? fmtTL(v.market_value) : '—';

  let rangeHtml = '';
  if (v.estimated_min != null && v.estimated_max != null) {
    rangeHtml = `<div style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">Aralık: ${fmtTL(v.estimated_min)} – ${fmtTL(v.estimated_max)}</div>`;
  }
  let quickSaleHtml = '';
  if (v.quick_sale_value != null) {
    quickSaleHtml = `<div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">Hızlı satış değeri: ${fmtTL(v.quick_sale_value)}</div>`;
  }

  let returnsHtml = '';
  const r = data.returns;
  if (r && typeof r.nominalReturnPct === 'number') {
    returnsHtml = `
      <div style="border-top:1px solid var(--border); margin-top:12px; padding-top:12px;">
        <div style="font-weight:600; font-size:13px; margin-bottom:4px;">Değeriniz ne kadar değişti?</div>
        <div style="font-size:12.5px; color:var(--text-muted);">Nominal getiri: %${r.nominalReturnPct.toFixed(1)}${r.realReturnPct != null ? `   •   Reel getiri: %${r.realReturnPct.toFixed(1)}` : ''}</div>
        ${r.note ? `<div style="font-size:11px; color:var(--text-muted); margin-top:3px;">${escapeHtml(r.note)}</div>` : ''}
      </div>`;
  }
  const kfeHtml = data.kfeNote ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${escapeHtml(data.kfeNote)}</div>` : '';

  return `
    <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
      <div style="font-size:22px; font-weight:700;">${marketValueHtml}</div>
      <div style="font-size:12px; color:var(--text-muted);">tahmini piyasa değeri</div>
    </div>
    ${rangeHtml}
    ${quickSaleHtml}
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
      <span style="padding:5px 10px; border-radius:999px; font-size:11.5px; font-weight:600; background:${qColor}22; color:${qColor};">${valQualityLabel(v.valuation_quality)} · %${v.confidence_score ?? 0}</span>
      <span style="padding:5px 10px; border-radius:999px; font-size:11.5px; background:var(--border);">${v.used_count ?? 0} karşılaştırma</span>
    </div>
    <div style="font-size:11.5px; color:var(--text-muted); margin-top:8px;">Son değerleme: ${valTimeAgo(v.valuation_date)}${data.fromCache ? ' (önbellekten)' : ''}</div>
    ${returnsHtml}
    ${kfeHtml}
    <div style="font-size:10.5px; color:var(--text-muted); font-style:italic; margin-top:10px;">Bu, Varlığım kullanıcı verilerine dayanan istatistiksel bir tahmindir; resmi bir ekspertiz/appraisal değildir.</div>
    <div id="valHistoryChartWrap" style="margin-top:14px;"><div class="empty" style="font-size:12.5px;">Grafik yükleniyor...</div></div>
    <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
      <button class="btn outline small" id="valAddComparableBtn" type="button">Karşılaştırma Ekle</button>
      <button class="btn outline small" id="valRefreshBtn" type="button">Güncelle</button>
    </div>`;
}

async function valLoadHistoryChart(assetId) {
  const chartWrap = document.getElementById('valHistoryChartWrap');
  if (!chartWrap) return;
  try {
    const data = await valCallFunction({ action: 'history', assetId, limit: 12 });
    if (!document.getElementById('valHistoryChartWrap')) return;
    const items = data.items || [];
    if (items.length < 2) {
      chartWrap.innerHTML = '<div class="empty" style="font-size:12.5px;">Değerleme geçmişi birikince burada bir grafik görünecek.</div>';
      return;
    }
    chartWrap.innerHTML = '<canvas id="detailChartValuation" height="90"></canvas>';
    const labels = items.map(it => new Date(it.valuation_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }));
    const values = items.map(it => Number(it.market_value) || 0);
    renderLineChart('detailChartValuation', labels, values, { color: '#7047EB', showXAxis: true });
  } catch (e) {
    if (document.getElementById('valHistoryChartWrap')) {
      chartWrap.innerHTML = '';
    }
  }
}

/* ------------------------------------------------------------------
 * Manuel karşılaştırma (emsal) ekleme formu
 * ------------------------------------------------------------------ */
function valShowAddComparableForm(assetType, assetId) {
  const bodyEl = document.getElementById('valModalBody');
  if (!bodyEl) return;
  const isVehicle = assetType === 'vehicle';
  bodyEl.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr; gap:10px;">
      <div class="section-title" style="margin:0;">Karşılaştırma Fiyatı Ekle</div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:-4px;">
        Başka bir ilan sitesinde gördüğün benzer bir ${isVehicle ? 'aracın' : 'gayrimenkulün'} fiyatını ekleyerek tahmini iyileştirebilirsin.
      </div>
      <input id="valCompKey" type="text" autocomplete="off" placeholder="${isVehicle ? 'Marka ve Model (örn. Volkswagen Golf)' : 'Şehir ve İlçe (örn. İstanbul Kadıköy)'}" />
      <input id="valCompYearArea" type="number" placeholder="${isVehicle ? 'Model Yılı' : 'Net m²'}" />
      <input id="valCompRegion" type="text" autocomplete="off" placeholder="Bölge (isteğe bağlı)" />
      <input id="valCompPrice" type="text" inputmode="decimal" class="amt-grouped" placeholder="Fiyat (₺)" />
      <input id="valCompNotes" type="text" autocomplete="off" placeholder="Not (isteğe bağlı — ilan linki vb.)" />
      <div id="valCompError" style="font-size:12.5px; color:var(--negative); display:none;"></div>
      <button class="btn primary full" id="valCompSaveBtn" type="button">Ekle</button>
      <button class="btn outline full" id="valCompCancelBtn" type="button">İptal</button>
    </div>`;
  document.querySelectorAll('#valModalBody .amt-grouped').forEach(attachGroupedAmountFormatter);
  document.getElementById('valCompCancelBtn').addEventListener('click', () => valLoadAndRender(assetType, assetId, false));
  document.getElementById('valCompSaveBtn').addEventListener('click', async () => {
    const errEl = document.getElementById('valCompError');
    const key = document.getElementById('valCompKey').value.trim();
    const price = parseGroupedAmount(document.getElementById('valCompPrice').value);
    if (!key) {
      errEl.textContent = isVehicle ? 'Marka ve modeli gir.' : 'Şehir ve ilçeyi gir.';
      errEl.style.display = '';
      return;
    }
    if (isNaN(price) || price <= 0) {
      errEl.textContent = 'Geçerli bir fiyat gir.';
      errEl.style.display = '';
      return;
    }
    const yearAreaRaw = document.getElementById('valCompYearArea').value.trim();
    const payload = {
      action: 'submit_comparable',
      assetType,
      brandModelKey: key,
      region: document.getElementById('valCompRegion').value.trim() || null,
      price,
      notes: document.getElementById('valCompNotes').value.trim() || null,
    };
    if (isVehicle && yearAreaRaw) payload.year = parseInt(yearAreaRaw, 10);
    if (!isVehicle && yearAreaRaw) payload.areaM2 = parseFloat(yearAreaRaw);
    try {
      await valCallFunction(payload);
      await valLoadAndRender(assetType, assetId, true);
    } catch (e) {
      errEl.textContent = e.message || 'Karşılaştırma eklenemedi.';
      errEl.style.display = '';
    }
  });
}
