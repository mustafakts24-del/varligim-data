/* ==================================================================
 * app-profil.js — Profil / Kişisel Bilgiler sayfası (2026-09-11)
 *
 * Mobil uygulamadaki profile_screen.dart'ın "Kişisel Bilgiler" kartıyla
 * AYNI mantık, web'e taşındı ("mobilde yaptığımız değişiklikleri web
 * için de yapalım" — kullanıcı talebi):
 *
 *  - Ad Soyad ve Telefon, hesabın Supabase auth user_metadata'sına
 *    ('full_name' / 'phone_number') kaydedilir — böylece çıkış/giriş
 *    arasında kaybolmaz (mobildeki auth.updateUser ile AYNI alanlar).
 *  - Telefon kaydedilirken mobildeki AYNI RPC (`is_phone_number_taken`)
 *    ile benzersizlik kontrolü yapılır.
 *  - E-posta HER ZAMAN doğrudan Supabase oturumundan okunur; elle
 *    girilmez, UYDURULMAZ, düzenlenemez.
 *  - Yerel önbellek (bu cihazdaki tarayıcı localStorage — mobildeki
 *    Hive `profileBox`'ın web karşılığı): varligim_profile_name /
 *    varligim_profile_phone. Çıkışta temizlenir (bkz. app-core.js
 *    içindeki signOutBtn handler) — kişisel bilgiler bir sonraki
 *    kullanıcıya/misafire sızmaz.
 *
 * DÜRÜSTLÜK NOTU: hiçbir isim/telefon/e-posta UYDURULMAZ. Hesapta ve
 * yerel önbellekte karşılığı yoksa alan boş bırakılır.
 * ================================================================== */

const PROFILE_NAME_KEY = 'varligim_profile_name';
const PROFILE_PHONE_KEY = 'varligim_profile_phone';

function _titleCaseNameWeb(input) {
  if (!input) return '';
  return input
    .trim()
    .split(/\s+/)
    .map(w => (w.length ? w[0].toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr') : w))
    .join(' ');
}

/* ------------------------------------------------------------------
 * SIDEBAR — Profil adı ve Üyelik rozeti, oturum her değiştiğinde
 * app-guest.js'teki handleSessionChange() tarafından çağrılır.
 * ------------------------------------------------------------------ */
function refreshSidebarProfileFooter(user) {
  const nameEl = document.getElementById('sidebarProfileName');
  if (nameEl) {
    let cachedName = '';
    try {
      cachedName = (localStorage.getItem(PROFILE_NAME_KEY) || '').trim();
    } catch (e) {}
    const accountName =
      user && user.user_metadata && user.user_metadata.full_name
        ? String(user.user_metadata.full_name).trim()
        : '';
    const name = cachedName || accountName;
    nameEl.textContent = name ? _titleCaseNameWeb(name) : 'Profil';
  }

  // Üyelik rozeti: gerçek bir genel üyelik/paket sistemi bu turda HENÜZ
  // KURULMADI (mobildeki membership_screen.dart / profile_screen.dart
  // _currentMembershipTierLabel() ile AYNI dürüstlük notu — AI Teknik
  // Analiz'in kendi Premium/deneme sistemiyle KARIŞTIRILMAZ, o ayrı bir
  // kavramdır). Bu yüzden burada da sabit 'Ücretsiz' gösterilir; sahte
  // bir plan adı UYDURULMAZ.
  const tierEl = document.getElementById('sidebarMembershipTier');
  if (tierEl) tierEl.textContent = 'Ücretsiz';
}
window.refreshSidebarProfileFooter = refreshSidebarProfileFooter;

/* ------------------------------------------------------------------
 * KİŞİSEL BİLGİLER SAYFASI
 * ------------------------------------------------------------------ */
function _profileMsg(text, kind) {
  const el = document.getElementById('profileMsg');
  if (!el) return;
  el.classList.remove('error', 'success');
  if (!text) {
    el.textContent = '';
    return;
  }
  el.textContent = text;
  el.classList.add(kind === 'error' ? 'error' : 'success');
}

async function loadProfilePage() {
  _profileMsg(null);
  const nameInput = document.getElementById('profileNameInput');
  const emailInput = document.getElementById('profileEmailInput');
  const phoneInput = document.getElementById('profilePhoneInput');
  if (!nameInput || !emailInput || !phoneInput) return;

  const { data } = await supa.auth.getSession();
  const user = data && data.session ? data.session.user : null;

  let cachedName = '';
  let cachedPhone = '';
  try {
    cachedName = localStorage.getItem(PROFILE_NAME_KEY) || '';
    cachedPhone = localStorage.getItem(PROFILE_PHONE_KEY) || '';
  } catch (e) {}

  // Yerel önbellek boşsa, hesabın kendi meta verisindeki GERÇEK isim/
  // telefon geri yüklenir (mobildeki AYNI kural — bkz. profile_screen.dart
  // _loadProfile()). Hiçbir şey UYDURULMAZ; hesapta da yoksa boş kalır.
  if (!cachedName.trim() && user && user.user_metadata && user.user_metadata.full_name) {
    cachedName = String(user.user_metadata.full_name).trim();
    try { localStorage.setItem(PROFILE_NAME_KEY, cachedName); } catch (e) {}
  }
  if (!cachedPhone.trim() && user && user.user_metadata && user.user_metadata.phone_number) {
    cachedPhone = String(user.user_metadata.phone_number).trim();
    try { localStorage.setItem(PROFILE_PHONE_KEY, cachedPhone); } catch (e) {}
  }

  nameInput.value = cachedName;
  emailInput.value = (user && user.email) || '';
  phoneInput.value = cachedPhone;
}
registerPageLoader('profil', loadProfilePage);

async function saveProfile() {
  const btn = document.getElementById('profileSaveBtn');
  const nameInput = document.getElementById('profileNameInput');
  const phoneInput = document.getElementById('profilePhoneInput');
  if (!btn || !nameInput || !phoneInput) return;

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Kaydediliyor…';
  _profileMsg(null);

  try {
    const { data } = await supa.auth.getSession();
    const user = data && data.session ? data.session.user : null;

    if (phone && user) {
      // Mobildeki AYNI RPC / AYNI kural: aynı telefon numarasıyla 2.
      // hesap açılmaya/kaydedilmeye çalışılırsa uyarı verilir.
      try {
        const { data: taken, error: rpcError } = await supa.rpc('is_phone_number_taken', {
          p_phone: phone,
          p_exclude_user_id: user.id,
        });
        if (!rpcError && taken === true) {
          _profileMsg('Bu telefon numarası zaten kullanılıyor.', 'error');
          btn.disabled = false;
          btn.textContent = originalText;
          return;
        }
      } catch (e) {
        // RPC henüz kurulmamışsa (migration çalıştırılmamışsa) kaydetmeyi
        // engellemiyoruz — mobildeki AYNI, sessiz-geç-yaklaşımı.
      }
    }

    try {
      localStorage.setItem(PROFILE_NAME_KEY, name);
      localStorage.setItem(PROFILE_PHONE_KEY, phone);
    } catch (e) {}

    // Hesap meta verisine de yazılır ki çıkış/giriş arasında kaybolmasın
    // (mobildeki auth.updateUser ile AYNI alanlar).
    try {
      await supa.auth.updateUser({ data: { full_name: name, phone_number: phone } });
    } catch (e) {
      console.error('Profil hesaba kaydedilemedi:', e);
    }

    if (user && typeof refreshSidebarProfileFooter === 'function') {
      refreshSidebarProfileFooter(user);
    }

    _profileMsg('Profil kaydedildi.', 'success');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
document.getElementById('profileSaveBtn')?.addEventListener('click', saveProfile);

/* ------------------------------------------------------------------
 * SIDEBAR BUTON TIKLAMALARI
 * ------------------------------------------------------------------ */
document.getElementById('sidebarProfileBtn')?.addEventListener('click', () => showPage('profil'));
