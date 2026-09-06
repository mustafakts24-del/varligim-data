/* ==================================================================
 * app-ai-analiz.js — AI Teknik Analiz (YENİ, 2026-09)
 *
 * Kullanıcı isteği: "Mevcut Varlığım uygulamasına kapsamlı bir Yapay
 * Zekâ Teknik Analiz Sistemi eklemek istiyorum... Web + Android + iOS
 * tek sistem olarak geliştir." İnceleme sonucu web tarafının (bu dosya
 * dahil tüm portfoy.html ekosistemi) Flutter Web DEĞİL, ayrı bir
 * vanilla-JS site olduğu netleşti (bkz. proje dokümanları/rapor); bu
 * doğrultuda kullanıcıyla netleştirilip ONAYLANAN karar: web tarafı,
 * projenin BUGÜNE KADARKİ tüm diğer özelliklerinde olduğu gibi, mobildeki
 * (Flutter/Dart) AI Teknik Analiz mantığıyla AYNI davranışı JS ile ayrı
 * ayrı uygular; ikisi de AYNI Supabase backend'ini (aynı
 * `ai-chart-analysis` Edge Function'ı, aynı `ai_chart_analyses` tablosu)
 * kullanır.
 *
 * Mimari: Web → Supabase Edge Function (ai-chart-analysis) → Anthropic
 * Claude (vision) → yapılandırılmış JSON → Web. AI API anahtarı YALNIZCA
 * Edge Function secret'ı olarak saklanır, bu dosyada veya tarayıcıda
 * KESİNLİKLE bulunmaz (kural 24).
 *
 * price-proxy'den farklı olarak bu Edge Function kimlik doğrulaması
 * gerektirir — çağrılarda kullanıcının kendi Supabase oturum JWT'si
 * (anon key DEĞİL) Authorization header'ında gönderilir; böylece her
 * kullanıcı yalnızca kendi analiz geçmişini görür (RLS, bkz.
 * ai-chart-analysis-schema.sql).
 * ================================================================== */

const AI_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chart-analysis`;
// Kural 22 (performans): AI'ya göndermeden önce görüntü boyutlandırılır/
// optimize edilir — hem yükleme hızını artırır hem gereksiz maliyeti
// önler. 1600px uzun kenar, ekran görüntüsü grafiklerinde metin/mum
// detayının okunabilirliğini korumak için yeterli.
const AI_MAX_IMAGE_DIMENSION = 1600;
const AI_JPEG_QUALITY = 0.85;

const AI_QUICK_QUESTIONS = [
  'Şu an alınır mı?',
  'En güçlü destek neresi?',
  'En güçlü direnç neresi?',
  'Direnç kırılırsa ne olur?',
  'Destek kırılırsa ne olur?',
  'MACD ne söylüyor?',
  'Trend ne zaman bozulur?',
  'Riskli bölge neresi?',
];

let aiCurrentImageBase64 = null;
let aiCurrentMimeType = null;
let aiCurrentAnalysisId = null;
let aiChatMessages = [];
let aiPageWired = false;

// ============================================================
// Supabase Edge Function çağrısı (kullanıcının kendi oturumuyla)
// ============================================================
async function aiGetAuthToken() {
  try {
    const { data } = await supa.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

async function aiCallFunction(body) {
  const token = await aiGetAuthToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  let res;
  try {
    res = await fetch(AI_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('AI analiz servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'AI analiz servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.');
  }
  return data;
}

// ============================================================
// Görüntü seçme, boyutlandırma, önizleme
// ============================================================
function aiShowMsg(text, type) {
  const el = document.getElementById('aiUploadMsg');
  if (!el) return;
  if (!text) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.textContent = text;
  el.className = 'ai-msg ' + (type === 'error' ? 'error' : 'success');
  el.style.display = 'block';
}

function aiResizeAndEncode(file) {
  return new Promise((resolve, reject) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      reject(new Error('Desteklenmeyen dosya formatı. PNG, JPG/JPEG veya WEBP kullanın.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görüntü açılamadı. Lütfen geçerli bir görüntü dosyası seçin.'));
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        const longSide = Math.max(width, height);
        if (longSide > AI_MAX_IMAGE_DIMENSION) {
          const scale = AI_MAX_IMAGE_DIMENSION / longSide;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Şeffaflık gerektirebilecek PNG'ler PNG olarak kalır; diğerleri
        // daha küçük boyut için JPEG'e sıkıştırılır.
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outType, AI_JPEG_QUALITY);
        const base64 = (dataUrl.split(',')[1]) || '';
        if (!base64) { reject(new Error('Görüntü işlenemedi.')); return; }
        resolve({ base64, mimeType: outType, dataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function aiHandleFile(file) {
  if (!file) return;
  aiShowMsg('', null);
  try {
    const { base64, mimeType, dataUrl } = await aiResizeAndEncode(file);
    aiCurrentImageBase64 = base64;
    aiCurrentMimeType = mimeType;
    aiCurrentAnalysisId = null;
    aiChatMessages = [];
    const previewImg = document.getElementById('aiPreviewImg');
    if (previewImg) previewImg.src = dataUrl;
    const previewWrap = document.getElementById('aiPreviewWrap');
    const uploadZone = document.getElementById('aiUploadZone');
    if (previewWrap) previewWrap.style.display = 'block';
    if (uploadZone) uploadZone.style.display = 'none';
    const resultWrap = document.getElementById('aiResultWrap');
    const resultEmpty = document.getElementById('aiResultEmpty');
    if (resultWrap) { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
    if (resultEmpty) resultEmpty.style.display = '';
  } catch (e) {
    aiShowMsg(e.message || 'Görüntü işlenemedi.', 'error');
  }
}

function aiResetToUpload() {
  aiCurrentImageBase64 = null;
  aiCurrentMimeType = null;
  aiCurrentAnalysisId = null;
  aiChatMessages = [];
  const fileInput = document.getElementById('aiFileInput');
  if (fileInput) fileInput.value = '';
  const noteInput = document.getElementById('aiNoteInput');
  if (noteInput) noteInput.value = '';
  const previewWrap = document.getElementById('aiPreviewWrap');
  const uploadZone = document.getElementById('aiUploadZone');
  if (previewWrap) previewWrap.style.display = 'none';
  if (uploadZone) uploadZone.style.display = '';
  const resultWrap = document.getElementById('aiResultWrap');
  const resultEmpty = document.getElementById('aiResultEmpty');
  if (resultWrap) { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
  if (resultEmpty) resultEmpty.style.display = '';
  aiShowMsg('', null);
}

// ============================================================
// Analiz Et
// ============================================================
async function aiRunAnalysis() {
  if (!aiCurrentImageBase64) return;
  const btn = document.getElementById('aiAnalyzeBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = 'Analiz ediliyor…'; }
  aiShowMsg('', null);
  try {
    const noteInput = document.getElementById('aiNoteInput');
    const note = noteInput ? noteInput.value.trim() : '';
    const result = await aiCallFunction({
      action: 'analyze',
      imageBase64: aiCurrentImageBase64,
      mimeType: aiCurrentMimeType,
      note,
    });
    aiCurrentAnalysisId = result.id;
    aiChatMessages = [];
    aiRenderAnalysis(result.analysis);
    if (result.cached) {
      aiShowMsg('Bu görüntü daha önce analiz edilmişti — kayıtlı sonuç gösteriliyor.', 'success');
    }
    aiLoadHistory();
  } catch (e) {
    aiShowMsg(e.message || 'AI analiz servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="msr">smart_toy</span> ANALİZ ET'; }
  }
}

// ============================================================
// Sonuç render (istemci tarafı yapılandırılmış JSON → HTML)
// ============================================================
function aiTrendInfo(v) {
  const map = {
    bullish: { label: 'Yükseliş', chip: 'pos' },
    bearish: { label: 'Düşüş', chip: 'neg' },
    sideways: { label: 'Yatay', chip: 'neu' },
    unclear: { label: 'Belirsiz', chip: 'neu' },
  };
  return map[v] || map.unclear;
}

function aiStrengthLabel(v) {
  const map = { strong: 'Güçlü', moderate: 'Orta', weak: 'Zayıf', unclear: 'Belirsiz' };
  return map[v] || '—';
}

function aiStatusInfo(status) {
  const map = {
    suitable: { emoji: '🟢', label: 'ALIM İÇİN UYGUN', chip: 'pos' },
    wait: { emoji: '🟡', label: 'BEKLEMEK DAHA SAĞLIKLI', chip: 'warn' },
    risky: { emoji: '🔴', label: 'ŞU ANDA ALIM RİSKLİ', chip: 'neg' },
  };
  return map[status] || { emoji: '—', label: 'Belirlenemedi', chip: 'neu' };
}

function aiLevelListHtml(levels, kind) {
  if (!Array.isArray(levels) || levels.length === 0) {
    return `<div class="empty" style="padding:10px 0;">Görüntüde net bir ${kind === 'support' ? 'destek' : 'direnç'} seviyesi tespit edilemedi.</div>`;
  }
  return `<table class="kv-table">${levels.map(l => `
    <tr>
      <td>${escapeHtml(l.label || (kind === 'support' ? 'Destek' : 'Direnç'))} <span class="chip neu" style="margin-left:6px;">${l.strength === 'strong' ? 'Güçlü' : 'Orta'}</span></td>
      <td>${l.price != null ? fmtNumber(l.price) : '—'}</td>
    </tr>`).join('')}</table>`;
}

function aiZoneListHtml(zones, chipClass) {
  if (!Array.isArray(zones) || zones.length === 0) {
    return `<div class="empty" style="padding:10px 0;">Görüntüden net bir bölge belirlenemedi.</div>`;
  }
  return zones.map(z => `
    <div class="ai-zone-card ${chipClass}">
      <div class="ai-zone-range">${z.range_low != null ? fmtNumber(z.range_low) : '—'} – ${z.range_high != null ? fmtNumber(z.range_high) : '—'}</div>
      <div class="ai-zone-rationale">${escapeHtml(z.rationale || '')}</div>
    </div>`).join('');
}

function aiIndicatorHtml(label, ind) {
  if (!ind || !ind.visible) {
    return `<div class="ai-indicator-row"><div class="ai-indicator-label">${label}</div><div class="ai-indicator-text empty-note">${label} grafikte bulunmadığından analiz edilemedi.</div></div>`;
  }
  return `<div class="ai-indicator-row"><div class="ai-indicator-label">${label}</div><div class="ai-indicator-text">${escapeHtml(ind.analysis || '—')}</div></div>`;
}

function aiScoreBarHtml(label, value) {
  const v = Number.isFinite(Number(value)) ? Number(value) : 0;
  const pct = Math.max(0, Math.min(100, (v / 10) * 100));
  const color = v >= 7 ? 'var(--positive)' : v >= 4 ? 'var(--warning, #f0a020)' : 'var(--negative)';
  return `
    <div class="ai-score-row">
      <div class="ai-score-label">${escapeHtml(label)}</div>
      <div class="ai-score-bar"><div class="ai-score-fill" style="width:${pct}%; background:${color};"></div></div>
      <div class="ai-score-value">${fmtDecimal(v, 1)}/10</div>
    </div>`;
}

function aiScenarioCardHtml(title, chipClass, s) {
  if (!s) return '';
  return `
    <div class="ai-scenario-card ${chipClass}">
      <div class="ai-scenario-title">${title}</div>
      <div class="ai-scenario-row"><b>Tetikleyici:</b> ${escapeHtml(s.trigger || '—')}</div>
      <div class="ai-scenario-row"><b>Teknik şart:</b> ${escapeHtml(s.condition || '—')}</div>
      <div class="ai-scenario-row"><b>Olası yön:</b> ${escapeHtml(s.direction || '—')}</div>
      <div class="ai-scenario-row"><b>Risk:</b> ${escapeHtml(s.risk || '—')}</div>
    </div>`;
}

function aiRenderAnalysis(analysis) {
  const resultEmpty = document.getElementById('aiResultEmpty');
  const resultWrap = document.getElementById('aiResultWrap');
  if (!resultWrap) return;
  if (resultEmpty) resultEmpty.style.display = 'none';

  const asset = analysis.asset || {};
  const trend = analysis.trend || {};
  const ts = analysis.technical_score || {};
  const status = aiStatusInfo(analysis.buy_assessment && analysis.buy_assessment.status);
  const strategy = analysis.strategy || {};
  const limitations = Array.isArray(analysis.limitations) ? analysis.limitations : [];

  resultWrap.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-size:17px; font-weight:800;">${escapeHtml(asset.symbol || asset.name || 'Sembol tespit edilemedi')}</div>
          ${asset.name && asset.symbol ? `<div class="sub" style="color:var(--text-muted); font-size:12.5px;">${escapeHtml(asset.name)}</div>` : ''}
          ${asset.detection_note ? `<div style="font-size:11.5px; color:var(--text-faint); margin-top:4px;">${escapeHtml(asset.detection_note)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div class="chip neu">Analiz Güveni: %${fmtNumber(analysis.confidence)}</div>
          ${asset.detected_price != null ? `<div style="margin-top:6px; font-weight:700;">${fmtNumber(asset.detected_price)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="card ai-buy-assessment ${status.chip}">
      <div style="font-size:15px; font-weight:800;">${status.emoji} ${status.label}</div>
      <div style="margin-top:6px; font-size:13.5px;">${escapeHtml((analysis.buy_assessment && analysis.buy_assessment.reason) || '')}</div>
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">Trend</div>
      <div class="stat-mini-grid">
        <div class="stat-mini"><div class="lbl">Ana Trend</div><div class="val"><span class="chip ${aiTrendInfo(trend.primary).chip}">${aiTrendInfo(trend.primary).label}</span></div></div>
        <div class="stat-mini"><div class="lbl">Orta Vadeli</div><div class="val"><span class="chip ${aiTrendInfo(trend.medium_term).chip}">${aiTrendInfo(trend.medium_term).label}</span></div></div>
        <div class="stat-mini"><div class="lbl">Kısa Vadeli</div><div class="val"><span class="chip ${aiTrendInfo(trend.short_term).chip}">${aiTrendInfo(trend.short_term).label}</span></div></div>
        <div class="stat-mini"><div class="lbl">Trend Gücü</div><div class="val">${aiStrengthLabel(trend.strength)}</div></div>
      </div>
      ${trend.structure_note ? `<p style="font-size:13px; margin-top:10px;">${escapeHtml(trend.structure_note)}</p>` : ''}
      ${trend.reversal_signal ? `<p style="font-size:13px; color:var(--warning, #f0a020); margin-top:4px;"><b>Dönüş sinyali:</b> ${escapeHtml(trend.reversal_signal)}</p>` : ''}
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">🎯 Destek / Direnç</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div><div style="font-weight:700; font-size:12.5px; color:var(--positive); margin-bottom:6px;">DESTEK</div>${aiLevelListHtml(analysis.support_levels, 'support')}</div>
        <div><div style="font-weight:700; font-size:12.5px; color:var(--negative); margin-bottom:6px;">DİRENÇ</div>${aiLevelListHtml(analysis.resistance_levels, 'resistance')}</div>
      </div>
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">🟢 Alım Bölgeleri</div>
      ${aiZoneListHtml(analysis.buy_zones, 'pos')}
      <div class="detail-section-title">🔴 Satış / Kâr Alma Bölgeleri</div>
      ${aiZoneListHtml(analysis.sell_zones, 'neg')}
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">Göstergeler</div>
      ${aiIndicatorHtml('MACD', analysis.indicators && analysis.indicators.macd)}
      ${aiIndicatorHtml('RSI', analysis.indicators && analysis.indicators.rsi)}
      ${aiIndicatorHtml('SMA', analysis.indicators && analysis.indicators.sma)}
      ${aiIndicatorHtml('EMA', analysis.indicators && analysis.indicators.ema)}
      ${aiIndicatorHtml('Hacim', analysis.indicators && analysis.indicators.volume)}
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">🤖 AI Teknik Skor</div>
      ${aiScoreBarHtml('Trend', ts.trend)}
      ${aiScoreBarHtml('Momentum', ts.momentum)}
      ${aiScoreBarHtml('Hacim', ts.volume)}
      ${aiScoreBarHtml('MACD', ts.macd)}
      ${aiScoreBarHtml('Destek', ts.support)}
      ${aiScoreBarHtml('Risk', ts.risk)}
      <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:800;">GENEL SKOR</div>
        <div style="font-weight:800; font-size:16px;">${fmtDecimal(ts.overall, 1)}/10</div>
      </div>
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">Olası Senaryolar</div>
      ${aiScenarioCardHtml('🟢 Yükseliş Senaryosu', 'pos', analysis.scenarios && analysis.scenarios.bullish)}
      ${aiScenarioCardHtml('🟡 Yatay Senaryo', 'warn', analysis.scenarios && analysis.scenarios.neutral)}
      ${aiScenarioCardHtml('🔴 Düşüş Senaryosu', 'neg', analysis.scenarios && analysis.scenarios.bearish)}
    </div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">Kısa / Orta / Uzun Vade</div>
      <table class="kv-table">
        <tr><td>Kısa Vade (1-7 gün)</td><td style="text-align:left; font-weight:400;">${escapeHtml(strategy.short_term || '—')}</td></tr>
        <tr><td>Orta Vade (1-8 hafta)</td><td style="text-align:left; font-weight:400;">${escapeHtml(strategy.medium_term || '—')}</td></tr>
        <tr><td>Uzun Vade (3-12 ay)</td><td style="text-align:left; font-weight:400;">${escapeHtml(strategy.long_term || '—')}</td></tr>
      </table>
      ${strategy.long_term_data_sufficient === false ? `<p style="font-size:12px; color:var(--text-faint); margin-top:8px;">Not: Grafikteki veri uzun vadeli bir görüş için yeterli olmayabilir.</p>` : ''}
    </div>

    ${limitations.length > 0 ? `
    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">Bilinen Sınırlamalar</div>
      <ul style="margin:0; padding-left:18px; font-size:13px;">
        ${limitations.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div class="card ai-disclaimer">⚠️ ${escapeHtml(analysis.disclaimer || 'Bu analiz yalnızca teknik grafik verilerine dayalı bir değerlendirmedir. Yatırım tavsiyesi değildir. Finansal piyasalarda zarar etme riski vardır.')}</div>

    <div class="card">
      <div class="detail-section-title" style="margin-top:0;">💬 AI ile Sohbet</div>
      <div class="chip-row" id="aiChatChips">
        ${AI_QUICK_QUESTIONS.map(q => `<div class="filter-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</div>`).join('')}
      </div>
      <div id="aiChatMessages" class="ai-chat-messages"></div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <input type="text" id="aiChatInput" class="full" placeholder="Bir soru sorun…" style="flex:1;">
        <button class="btn primary" id="aiChatSendBtn" type="button">Gönder</button>
      </div>
    </div>
  `;
  resultWrap.style.display = 'block';

  resultWrap.querySelectorAll('#aiChatChips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => aiSendChat(chip.dataset.q));
  });
  const sendBtn = document.getElementById('aiChatSendBtn');
  const chatInput = document.getElementById('aiChatInput');
  if (sendBtn) sendBtn.addEventListener('click', () => {
    const v = chatInput ? chatInput.value.trim() : '';
    if (v) aiSendChat(v);
  });
  if (chatInput) chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = chatInput.value.trim();
      if (v) aiSendChat(v);
    }
  });

  aiRenderChatMessages();
}

// ============================================================
// Sohbet
// ============================================================
function aiRenderChatMessages() {
  const el = document.getElementById('aiChatMessages');
  if (!el) return;
  if (aiChatMessages.length === 0) {
    el.innerHTML = `<div class="empty" style="padding:10px 0;">Henüz bir soru sormadınız. Yukarıdaki hazır sorulardan birini seçebilir veya kendi sorunuzu yazabilirsiniz.</div>`;
    return;
  }
  el.innerHTML = aiChatMessages.map((m, i) => `
    <div class="ai-chat-bubble ${m.role === 'user' ? 'user' : 'assistant'}${m.loading ? ' loading' : ''}" data-idx="${i}">
      ${escapeHtml(m.content)}
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

async function aiSendChat(message) {
  message = (message || '').trim();
  if (!message || !aiCurrentAnalysisId) return;
  const chatInput = document.getElementById('aiChatInput');
  if (chatInput) chatInput.value = '';

  aiChatMessages.push({ role: 'user', content: message });
  aiChatMessages.push({ role: 'assistant', content: 'Yanıt hazırlanıyor…', loading: true });
  aiRenderChatMessages();

  try {
    const result = await aiCallFunction({ action: 'chat', analysisId: aiCurrentAnalysisId, message });
    const last = aiChatMessages[aiChatMessages.length - 1];
    if (last && last.loading) { last.content = result.reply; delete last.loading; }
    aiRenderChatMessages();
  } catch (e) {
    const last = aiChatMessages[aiChatMessages.length - 1];
    if (last && last.loading) {
      last.content = e.message || 'AI analiz servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.';
      delete last.loading;
    }
    aiRenderChatMessages();
  }
}

// ============================================================
// Analiz Geçmişi
// ============================================================
function aiTrendChipHtml(trend) {
  const info = aiTrendInfo(trend);
  return `<span class="chip ${info.chip}">${info.label}</span>`;
}

async function aiLoadHistory() {
  const el = document.getElementById('aiHistoryList');
  if (!el) return;
  try {
    const result = await aiCallFunction({ action: 'history' });
    const items = result.items || [];
    if (items.length === 0) {
      el.innerHTML = '<div class="empty">Henüz bir analiz yapılmadı.</div>';
      return;
    }
    el.innerHTML = items.map(it => `
      <div class="ai-history-item" data-id="${escapeHtml(it.id)}">
        <div>
          <div style="font-weight:700;">${escapeHtml(it.assetSymbol || it.assetName || 'Bilinmeyen')}</div>
          <div style="font-size:11.5px; color:var(--text-faint);">${it.createdAt ? new Date(it.createdAt).toLocaleDateString('tr-TR') : ''}</div>
        </div>
        <div>${it.trend ? aiTrendChipHtml(it.trend) : ''}</div>
      </div>`).join('');
    el.querySelectorAll('.ai-history-item').forEach(row => {
      row.addEventListener('click', () => aiOpenHistoryItem(row.dataset.id));
    });
  } catch (e) {
    el.innerHTML = '<div class="empty">Analiz geçmişi yüklenemedi.</div>';
  }
}

async function aiOpenHistoryItem(id) {
  aiShowMsg('', null);
  try {
    const result = await aiCallFunction({ action: 'get', id });
    aiCurrentAnalysisId = result.id;
    aiCurrentImageBase64 = null; // geçmişten açılan bir analiz yeniden AI'a gönderilmez

    const previewImg = document.getElementById('aiPreviewImg');
    const previewWrap = document.getElementById('aiPreviewWrap');
    const uploadZone = document.getElementById('aiUploadZone');
    if (result.imageUrl && previewImg) {
      previewImg.src = result.imageUrl;
      if (previewWrap) previewWrap.style.display = 'block';
      if (uploadZone) uploadZone.style.display = 'none';
    }
    const analyzeBtn = document.getElementById('aiAnalyzeBtn');
    if (analyzeBtn) analyzeBtn.style.display = 'none'; // kayıtlı analiz zaten var, tekrar analiz gerekmiyor

    aiChatMessages = Array.isArray(result.chatHistory)
      ? result.chatHistory.map(m => ({ role: m.role, content: m.content }))
      : [];
    aiRenderAnalysis(result.analysis);
  } catch (e) {
    aiShowMsg(e.message || 'Analiz açılamadı.', 'error');
  }
}

// ============================================================
// Sayfa kurulumu (yükleme alanı, drag&drop, yapıştırma)
// ============================================================
function aiWirePageOnce() {
  if (aiPageWired) return;
  aiPageWired = true;

  const uploadZone = document.getElementById('aiUploadZone');
  const fileInput = document.getElementById('aiFileInput');
  const changeBtn = document.getElementById('aiChangeImageBtn');
  const analyzeBtn = document.getElementById('aiAnalyzeBtn');

  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) aiHandleFile(file);
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) aiHandleFile(file);
    });
  }
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      const analyzeBtnEl = document.getElementById('aiAnalyzeBtn');
      if (analyzeBtnEl) analyzeBtnEl.style.display = '';
      aiResetToUpload();
    });
  }
  if (analyzeBtn) analyzeBtn.addEventListener('click', aiRunAnalysis);

  // Web/Desktop: Ctrl+V ile grafik yapıştırma (kural 4/21) — yalnızca
  // bu sayfa aktifken devreye girer, diğer sayfalardaki (ör. metin
  // alanlarına) normal yapıştırma davranışını ETKİLEMEZ.
  document.addEventListener('paste', (e) => {
    const page = document.getElementById('page-aianaliz');
    if (!page || !page.classList.contains('active')) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { aiHandleFile(file); e.preventDefault(); }
        break;
      }
    }
  });
}

function loadAiAnalizPage() {
  aiWirePageOnce();
  aiLoadHistory();
}

registerPageLoader('aianaliz', loadAiAnalizPage);
