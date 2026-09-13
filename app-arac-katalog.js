/* ==================================================================
 * app-arac-katalog.js — Varlığım Araç Kataloğu (YENİ, 2026-09-12)
 *
 * AI Araç Fiyat Sorgulama'nın "Kategori -> Marka -> Model -> Nesil/Kasa
 * -> Motor -> Versiyon" adım adım seçim akışını yönetir. Veri KAYNAĞI
 * Supabase'teki `vehicle_categories`/`vehicle_brands`/`vehicle_models`/
 * `vehicle_generations`/`vehicle_engines`/`vehicle_versions` tablolarıdır
 * (bkz. vehicle-catalog-schema.sql + vehicle-catalog-seed.sql). Bu
 * tablolar HERKESE (misafir dahil) okunabilir bir referans kataloğudur —
 * kişisel veri içermez.
 *
 * ÖNEMLİ — Sahibinden.com kullanım kuralı: Bu dosya, hiçbir sahibinden.com
 * adresine istek ATMAZ, hiçbir HTML kazımaz. Sahibinden yalnızca bu
 * kataloğun İÇERİĞİNİN (marka/model/nesil isimleri) elle hazırlanmasında
 * bir REFERANS olarak kullanıldı — bu dosya yalnızca KENDİ Supabase
 * veritabanımızı sorgular.
 *
 * LAZY LOADING (kullanıcı kuralı 36): hiçbir seviye, bir üst seviye
 * seçilmeden ÖNCEDEN yüklenmez. Her seviyenin sonucu, aynı oturumda
 * tekrar istenirse ağ isteği yapılmadan bellek önbelleğinden (Map)
 * döner.
 *
 * Dışa açılan tek global: window.VehicleCatalogPicker.mount(container, opts)
 *   opts.onComplete(selection) -> kullanıcı "Devam Et" dediğinde çağrılır.
 *     selection: {
 *       categoryId, categoryName,
 *       brandId, brandName,
 *       modelId, modelName,           // brandId/modelId null olabilir (serbest metin girildiyse)
 *       generationId, generationName, // opsiyonel adımlar atlanmışsa null
 *       engineId, engineName,
 *       versionId, versionName,
 *     }
 *   opts.onCancel() -> "Kategoriyi Değiştir" gibi bir geri dönüş için opsiyonel.
 * ================================================================== */
(function (global) {
  'use strict';

  // ============================================================
  // Türkçe normalize (arama) — Supabase'teki public.tr_normalize
  // fonksiyonuyla AYNI mantık (ç->c, ş->s, ğ->g, ı->i, ö->o, ü->u).
  // ============================================================
  function vkNormalize(s) {
    if (!s) return '';
    return String(s)
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================================
  // Bellek önbelleği (kullanıcı kuralı 36: "arama sonuçlarını cache'le")
  // ============================================================
  const vkCache = {
    categories: null,
    brands: new Map(),      // categoryId -> rows
    models: new Map(),      // brandId -> rows
    generations: new Map(), // modelId -> rows
    engines: new Map(),     // generationId -> rows
    versions: new Map(),    // engineId -> rows
  };

  async function vkFetchCategories() {
    if (vkCache.categories) return vkCache.categories;
    const { data, error } = await supa
      .from('vehicle_categories')
      .select('id,name,slug,icon')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Kategoriler yüklenemedi: ' + error.message);
    vkCache.categories = data || [];
    return vkCache.categories;
  }

  async function vkFetchBrands(categoryId) {
    if (vkCache.brands.has(categoryId)) return vkCache.brands.get(categoryId);
    const { data, error } = await supa
      .from('vehicle_brands')
      .select('id,name,subcategory,logo_url,needs_verification')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Markalar yüklenemedi: ' + error.message);
    vkCache.brands.set(categoryId, data || []);
    return data || [];
  }

  async function vkFetchModels(brandId) {
    if (vkCache.models.has(brandId)) return vkCache.models.get(brandId);
    const { data, error } = await supa
      .from('vehicle_models')
      .select('id,name,needs_verification')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Modeller yüklenemedi: ' + error.message);
    vkCache.models.set(brandId, data || []);
    return data || [];
  }

  async function vkFetchGenerations(modelId) {
    if (vkCache.generations.has(modelId)) return vkCache.generations.get(modelId);
    const { data, error } = await supa
      .from('vehicle_generations')
      .select('id,name,code,start_year,end_year,body_type,needs_verification')
      .eq('model_id', modelId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Nesil/kasa bilgisi yüklenemedi: ' + error.message);
    vkCache.generations.set(modelId, data || []);
    return data || [];
  }

  async function vkFetchEngines(generationId) {
    if (vkCache.engines.has(generationId)) return vkCache.engines.get(generationId);
    const { data, error } = await supa
      .from('vehicle_engines')
      .select('id,name,fuel_type,displacement_cc,power_hp,transmission,drivetrain,needs_verification')
      .eq('generation_id', generationId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Motor seçenekleri yüklenemedi: ' + error.message);
    vkCache.engines.set(generationId, data || []);
    return data || [];
  }

  async function vkFetchVersions(engineId) {
    if (vkCache.versions.has(engineId)) return vkCache.versions.get(engineId);
    const { data, error } = await supa
      .from('vehicle_versions')
      .select('id,name,trim_level,needs_verification')
      .eq('engine_id', engineId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error('Versiyon/paket bilgisi yüklenemedi: ' + error.message);
    vkCache.versions.set(engineId, data || []);
    return data || [];
  }

  // ============================================================
  // Kategori ızgarası renk vurgusu için hâlâ kullanılan yardımcı
  // (bkz. vkRenderCategoryGrid — kartın --vhc-color'ı).
  // ============================================================
  const VK_AVATAR_COLORS = ['#5B6EF5','#7047EB','#9B3FF0','#3984F6','#F0A020','#2AA9E0','#22D3EE','#E0507A','#3FAE6B'];
  function vkAvatarColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return VK_AVATAR_COLORS[h % VK_AVATAR_COLORS.length];
  }
  // YENİ (hata bildirimi, 2026-09-13, madde 3+4): marka baş harfi
  // rozeti KALDIRILDI — artık yalnızca GERÇEK, ağdan doğrulanmış marka
  // logosu (bkz. `vehicle_brands.logo_url`) varsa gösterilir; yoksa
  // hiçbir rozet/harf GÖSTERİLMEZ, sadece marka ismi görünür
  // (dürüstlük kuralı: sahte/uydurma bir görsel asla gösterilmez).
  // Logo yüklenemezse (bozuk/ulaşılamaz URL) `onerror` ile öğe DOM'dan
  // kaldırılır, yine hiçbir yer tutucu gösterilmez.
  function vkLogoHtml(url, name) {
    // Not: harici bir CSS dosyasına bağımlı kalınmadan, satır-içi
    // (inline) stil kullanılır — bu bileşenin diğer "vk-" sınıfları
    // gibi (bkz. vkAvatarHtml'in eski satır-içi stil yaklaşımı).
    return `<span class="vk-logo-wrap" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; margin-right:10px; border-radius:8px; background:#fff; border:1px solid rgba(0,0,0,0.08); overflow:hidden; flex-shrink:0;"><img class="vk-logo" src="${vkEsc(url)}" alt="${vkEsc(name || '')}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:4px; box-sizing:border-box;" onerror="this.parentElement.remove()"></span>`;
  }

  function vkEsc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  // ============================================================
  // Genel liste-adımı render'ı (marka/model/nesil/motor/versiyon
  // hepsi bu ortak bileşeni kullanır).
  // ============================================================
  function vkRenderListStep(root, opts) {
    // opts: { title, breadcrumb, items, renderRow(item), onSelect(item),
    //         onBack, freeTextFallback: { placeholder, onSubmit(text) } | null,
    //         emptyMessage }
    root.innerHTML = `
      <div class="vk-step">
        ${opts.breadcrumb ? `<div class="vk-breadcrumb">${opts.breadcrumb}</div>` : ''}
        <div class="vk-step-head">
          <button type="button" class="vk-back-btn" aria-label="Geri"><span class="msr">arrow_back</span></button>
          <div class="vk-step-title">${vkEsc(opts.title)}</div>
        </div>
        <div class="vk-search-wrap">
          <span class="msr vk-search-icon">search</span>
          <input type="text" class="vk-search-input" placeholder="${vkEsc(opts.searchPlaceholder || 'Ara')}">
        </div>
        <div class="vk-list"></div>
        ${opts.freeTextFallback ? `
          <div class="vk-freetext-fallback">
            <div class="vk-freetext-note"><span class="msr" style="font-size:15px; vertical-align:-3px;">info</span> ${vkEsc(opts.freeTextFallback.note || 'Listede yoksa elle yazabilirsin.')}</div>
            <div class="vk-freetext-row">
              <input type="text" class="vk-freetext-input" placeholder="${vkEsc(opts.freeTextFallback.placeholder)}">
              <button type="button" class="btn primary vk-freetext-submit">Devam Et</button>
            </div>
          </div>` : ''}
      </div>
    `;
    root.querySelector('.vk-back-btn').addEventListener('click', opts.onBack);
    const listEl = root.querySelector('.vk-list');
    const searchEl = root.querySelector('.vk-search-input');

    function draw(items) {
      if (!items.length) {
        listEl.innerHTML = `<div class="vk-empty">${vkEsc(opts.emptyMessage || 'Sonuç bulunamadı.')}</div>`;
        return;
      }
      // Not: bu satır düzeni (avatar/logo — isim — ok simgesi yan yana)
      // harici bir CSS dosyasına bağımlı kalınmadan doğrudan satır-içi
      // (inline) stil ile garanti edilir (bkz. vkLogoHtml'in kendi
      // notu) — dosyanın diğer görsel öğeleri (buton/kart vb.) genel
      // styles.css'teki paylaşılan sınıflardan (.card, .btn, .msr)
      // faydalanmaya devam eder.
      listEl.innerHTML = items.map((it, idx) => `
        <div class="vk-row" data-idx="${idx}" style="display:flex; align-items:center; gap:2px; padding:10px 6px; border-bottom:1px solid rgba(0,0,0,0.06); cursor:pointer;">
          ${it.logo_url ? vkLogoHtml(it.logo_url, it.name) : ''}
          <div class="vk-row-main" style="flex:1; min-width:0;">
            <div class="vk-row-name">${vkEsc(it.name)}${it.subcategory ? ` <span class="vk-row-tag">${vkEsc(it.subcategory)}</span>` : ''}</div>
            ${it._sub ? `<div class="vk-row-sub">${vkEsc(it._sub)}</div>` : ''}
          </div>
          <span class="msr vk-row-chevron" style="flex-shrink:0; opacity:0.45;">chevron_right</span>
        </div>
      `).join('');
      listEl.querySelectorAll('.vk-row').forEach((rowEl) => {
        rowEl.addEventListener('click', () => opts.onSelect(items[Number(rowEl.dataset.idx)]));
      });
    }

    draw(opts.items);
    searchEl.addEventListener('input', () => {
      const q = vkNormalize(searchEl.value);
      if (!q) { draw(opts.items); return; }
      draw(opts.items.filter((it) => vkNormalize(it.name).includes(q)));
    });

    if (opts.freeTextFallback) {
      const ftInput = root.querySelector('.vk-freetext-input');
      root.querySelector('.vk-freetext-submit').addEventListener('click', () => {
        const v = ftInput.value.trim();
        if (!v) return;
        opts.freeTextFallback.onSubmit(v);
      });
    }
  }

  function vkRenderCategoryGrid(root, categories, onSelect) {
    root.innerHTML = `
      <div class="vk-step">
        <div class="vk-step-title" style="margin-bottom:4px;">Araç Kategorisi Seç</div>
        <p style="color:var(--text-muted); font-size:12.5px; margin:0 0 14px;">Aracının kategorisini seç, sonra marka/model/nesil/motor adım adım kolayca seçilsin.</p>
        <div class="varliklar-hub-grid vk-category-grid">
          ${categories.map((c, idx) => `
            <div class="varliklar-hub-card vk-category-card" data-idx="${idx}" style="--vhc-color:${vkAvatarColor(c.name)};">
              <div class="vhc-icon"><span class="msr">${vkEsc(c.icon || 'directions_car')}</span></div>
              <div class="vhc-title">${vkEsc(c.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    root.querySelectorAll('.vk-category-card').forEach((el) => {
      el.addEventListener('click', () => onSelect(categories[Number(el.dataset.idx)]));
    });
  }

  // ============================================================
  // Ana state makinesi
  // ============================================================
  function mount(container, opts) {
    opts = opts || {};
    const sel = {
      categoryId: null, categoryName: null,
      brandId: null, brandName: null,
      modelId: null, modelName: null,
      generationId: null, generationName: null, generationBodyType: null,
      engineId: null, engineName: null,
      engineFuelType: null, engineTransmission: null, engineDrivetrain: null,
      engineDisplacementCc: null, enginePowerHp: null,
      versionId: null, versionName: null, versionTrimLevel: null,
    };

    function finish() {
      if (typeof opts.onComplete === 'function') opts.onComplete({ ...sel });
    }

    async function stepCategory() {
      container.innerHTML = `<div class="vk-loading">Kategoriler yükleniyor…</div>`;
      let categories;
      try { categories = await vkFetchCategories(); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      vkRenderCategoryGrid(container, categories, (c) => {
        sel.categoryId = c.id; sel.categoryName = c.name;
        stepBrand();
      });
    }

    async function stepBrand() {
      container.innerHTML = `<div class="vk-loading">Markalar yükleniyor…</div>`;
      let brands;
      try { brands = await vkFetchBrands(sel.categoryId); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      vkRenderListStep(container, {
        title: sel.categoryName,
        breadcrumb: `<span class="vk-crumb-cur">${vkEsc(sel.categoryName)}</span>`,
        items: brands,
        searchPlaceholder: 'Marka Ara',
        emptyMessage: 'Bu kategoride henüz marka eklenmedi.',
        onBack: stepCategory,
        onSelect: (b) => {
          sel.brandId = b.id; sel.brandName = b.name;
          stepModel();
        },
      });
    }

    async function stepModel() {
      container.innerHTML = `<div class="vk-loading">Modeller yükleniyor…</div>`;
      let models;
      try { models = await vkFetchModels(sel.brandId); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      vkRenderListStep(container, {
        title: sel.brandName,
        breadcrumb: `<span class="vk-crumb">${vkEsc(sel.categoryName)}</span> / <span class="vk-crumb-cur">${vkEsc(sel.brandName)}</span>`,
        items: models,
        searchPlaceholder: 'Model Ara',
        emptyMessage: 'Bu markanın modelleri henüz eklenmedi — aşağıdan elle yazabilirsin.',
        onBack: stepBrand,
        onSelect: (m) => {
          sel.modelId = m.id; sel.modelName = m.name;
          stepGeneration();
        },
        freeTextFallback: {
          placeholder: 'Model adı (elle yaz)',
          note: 'Aradığın model listede yoksa buraya elle yazabilirsin — nesil/motor/versiyon adımları bu durumda atlanır.',
          onSubmit: (text) => {
            sel.modelId = null; sel.modelName = text;
            sel.generationId = null; sel.generationName = null;
            sel.engineId = null; sel.engineName = null;
            sel.versionId = null; sel.versionName = null;
            finish();
          },
        },
      });
    }

    async function stepGeneration() {
      container.innerHTML = `<div class="vk-loading">Nesil/kasa bilgisi yükleniyor…</div>`;
      let gens;
      try { gens = await vkFetchGenerations(sel.modelId); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      if (!gens.length) {
        // Dürüstlük kuralı: nesil bilgisi yoksa UYDURULMAZ — kullanıcı
        // marka+model ile devam edebilir (kural 24: her seviye zorunlu değil).
        finish();
        return;
      }
      gens = gens.map((g) => ({ ...g, _sub: [g.code, [g.start_year, g.end_year || 'günümüz'].join('–'), g.body_type].filter(Boolean).join(' · ') }));
      vkRenderListStep(container, {
        title: `${sel.brandName} ${sel.modelName} — Nesil/Kasa`,
        breadcrumb: `<span class="vk-crumb">${vkEsc(sel.categoryName)} / ${vkEsc(sel.brandName)}</span> / <span class="vk-crumb-cur">${vkEsc(sel.modelName)}</span>`,
        items: gens,
        searchPlaceholder: 'Nesil/kasa ara (ör. G20)',
        emptyMessage: 'Nesil/Kasa bilgisi mevcut değil.',
        onBack: stepModel,
        onSelect: (g) => {
          sel.generationId = g.id; sel.generationName = g.name;
          sel.generationBodyType = g.body_type || null;
          stepEngine();
        },
      });
      // "Nesil/kasa bilgisi mevcut değil, atla" kısayolu:
      const step = container.querySelector('.vk-step');
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'vk-skip-btn';
      skip.textContent = 'Nesil/kasa bilgim yok, atla →';
      skip.addEventListener('click', finish);
      step.appendChild(skip);
    }

    async function stepEngine() {
      container.innerHTML = `<div class="vk-loading">Motor seçenekleri yükleniyor…</div>`;
      let engines;
      try { engines = await vkFetchEngines(sel.generationId); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      if (!engines.length) { finish(); return; }
      engines = engines.map((en) => ({
        ...en,
        _sub: [en.fuel_type, en.displacement_cc ? `${en.displacement_cc} cc` : null, en.power_hp ? `${en.power_hp} hp` : null, en.transmission].filter(Boolean).join(' · '),
      }));
      vkRenderListStep(container, {
        title: `${sel.modelName} ${sel.generationName} — Motor`,
        breadcrumb: `<span class="vk-crumb">${vkEsc(sel.categoryName)} / ${vkEsc(sel.brandName)} / ${vkEsc(sel.modelName)}</span> / <span class="vk-crumb-cur">${vkEsc(sel.generationName)}</span>`,
        items: engines,
        searchPlaceholder: 'Motor ara (ör. 320i)',
        emptyMessage: 'Bu nesil için motor bilgisi henüz eklenmedi.',
        onBack: stepGeneration,
        onSelect: (en) => {
          sel.engineId = en.id; sel.engineName = en.name;
          sel.engineFuelType = en.fuel_type || null;
          sel.engineTransmission = en.transmission || null;
          sel.engineDrivetrain = en.drivetrain || null;
          sel.engineDisplacementCc = en.displacement_cc || null;
          sel.enginePowerHp = en.power_hp || null;
          stepVersion();
        },
      });
      const step = container.querySelector('.vk-step');
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'vk-skip-btn';
      skip.textContent = 'Motor bilgim yok, atla →';
      skip.addEventListener('click', finish);
      step.appendChild(skip);
    }

    async function stepVersion() {
      container.innerHTML = `<div class="vk-loading">Versiyon/paket bilgisi yükleniyor…</div>`;
      let versions;
      try { versions = await vkFetchVersions(sel.engineId); }
      catch (e) { container.innerHTML = `<div class="vk-empty">${vkEsc(e.message)}</div>`; return; }
      if (!versions.length) { finish(); return; }
      vkRenderListStep(container, {
        title: `${sel.engineName} — Versiyon/Paket`,
        breadcrumb: `<span class="vk-crumb">${vkEsc(sel.categoryName)} / ${vkEsc(sel.brandName)} / ${vkEsc(sel.modelName)} / ${vkEsc(sel.generationName)}</span> / <span class="vk-crumb-cur">${vkEsc(sel.engineName)}</span>`,
        items: versions,
        searchPlaceholder: 'Versiyon ara (ör. M Sport)',
        emptyMessage: 'Versiyon/paket bilgisi henüz eklenmedi.',
        onBack: stepEngine,
        onSelect: (v) => {
          sel.versionId = v.id; sel.versionName = v.name;
          sel.versionTrimLevel = v.trim_level || null;
          finish();
        },
      });
      const step = container.querySelector('.vk-step');
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'vk-skip-btn';
      skip.textContent = 'Versiyon/paket bilgim yok, atla →';
      skip.addEventListener('click', finish);
      step.appendChild(skip);
    }

    stepCategory();

    return {
      reset: stepCategory,
      getSelection: () => ({ ...sel }),
    };
  }

  global.VehicleCatalogPicker = { mount, normalize: vkNormalize };
})(window);
