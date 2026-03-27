/* ─────────────────────────────────────────────
   TAGIHKU — js/auth.js
   Autentikasi: login, daftar, lupa password,
   logout, inisialisasi app saat startup.
   ───────────────────────────────────────────── */
'use strict';

/* ── STATE INIT ── */
let _appStarted = false;

/* ── STARTUP APP ──────────────────────────────
   Dipanggil setelah session user terdeteksi.
   fetchAll() sudah punya timeout 8 detik,
   sehingga showScreen('app') DIJAMIN dipanggil.
   ─────────────────────────────────────────── */
async function startApp(user) {
  if (_appStarted) return;
  _appStarted = true;
  S.user = user;

  document.getElementById('loading-screen').style.display = 'flex';
  document.getElementById('loading-text').textContent     = 'Memuat data...';
  document.getElementById('auth-screen').style.display   = 'none';
  document.getElementById('app').classList.remove('visible');

  // Tampilkan tombol "Kembali ke Login" setelah 4 detik kalau masih loading
  const _retryTimer = setTimeout(() => {
    const rb = document.getElementById('loading-retry');
    const lt = document.getElementById('loading-text');
    if (rb) rb.style.display = 'block';
    if (lt) lt.textContent   = 'Koneksi lambat...';
  }, 4000);

  await fetchAll();
  clearTimeout(_retryTimer);
  showScreen('app');
  subscribeRT();
}

/* ── RESET APP (saat logout) ── */
function resetApp() {
  _appStarted    = false;
  S.user         = null;
  S.transactions = [];
  S.konsumens    = [];
  S.profile      = { name: 'Marketing', role: 'Sales Marketing' };
  showScreen('auth');
}

/* ── FORCE RESET SESSION ──────────────────────
   Dipanggil dari tombol "Kembali ke Login" saat
   loading stuck. Hapus token lokal TANPA network
   call, lalu tampilkan halaman login.
   ─────────────────────────────────────────── */
async function forceResetSession() {
  const rb = document.getElementById('loading-retry');
  const lt = document.getElementById('loading-text');
  if (rb) rb.style.display = 'none';
  if (lt) lt.textContent   = 'Menghapus sesi...';

  try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}

  // Clear semua key Supabase dari localStorage secara manual
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.includes('supabase') || k.includes('sb-')) localStorage.removeItem(k);
    });
  } catch (_) {}

  _appStarted = false;
  showScreen('auth');
}

/* ── AUTH EVENT HANDLER ───────────────────────
   Hanya pakai onAuthStateChange, tidak ada
   getSession() terpisah → tidak ada double
   token refresh → tidak ada race condition.
   INITIAL_SESSION = titik masuk saat startup.
   ─────────────────────────────────────────── */
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION') {
    // Event pertama saat halaman load — selalu fire baik ada session maupun tidak
    if (session?.user) {
      await startApp(session.user);
    } else {
      showScreen('auth');
    }
    return;
  }

  if (event === 'SIGNED_IN' && !_appStarted) {
    await startApp(session.user);
    // Reset tombol form login setelah berhasil
    const bl = document.getElementById('btn-login');
    const br = document.getElementById('btn-register');
    if (bl) { bl.disabled = false; bl.textContent = 'Masuk'; }
    if (br) { br.disabled = false; br.textContent = 'Buat Akun'; }
    return;
  }

  if (event === 'SIGNED_OUT') {
    resetApp();
  }
});

/* ── FORM: TAB SWITCH ── */
function switchAuthTab(t) {
  ['login', 'register'].forEach(x => {
    document.getElementById('tab-' + x).classList.toggle('active', x === t);
    document.getElementById('form-' + x).style.display = x === t ? 'block' : 'none';
  });
}

/* ── FORM: LOGIN ── */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Isi email dan password!', 'error'); return; }

  const btn = document.getElementById('btn-login');
  btn.innerHTML = '<span class="spinner"></span> Masuk...'; btn.disabled = true;

  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    showToast(error.message.includes('Invalid') ? 'Email atau password salah!' : 'Login gagal: ' + error.message, 'error');
    btn.innerHTML = 'Masuk'; btn.disabled = false;
  }
}

/* ── FORM: DAFTAR ── */
async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  if (!name)          { showToast('Isi nama dulu!', 'error'); return; }
  if (!email)         { showToast('Isi email dulu!', 'error'); return; }
  if (pass.length < 6){ showToast('Password minimal 6 karakter!', 'error'); return; }

  const btn = document.getElementById('btn-register');
  btn.innerHTML = '<span class="spinner"></span> Mendaftar...'; btn.disabled = true;

  const { data, error } = await sb.auth.signUp({ email, password: pass });
  if (error) { showToast('Daftar gagal: ' + error.message, 'error'); btn.innerHTML = 'Buat Akun'; btn.disabled = false; return; }

  if (data.user) await sb.from('profiles').upsert({ id: data.user.id, name, role: 'Sales Marketing' });
  showToast('✅ Akun dibuat! Silakan login.', 'success');
  btn.innerHTML = 'Buat Akun'; btn.disabled = false;
  switchAuthTab('login');
  document.getElementById('login-email').value = email;
}

/* ── FORM: LUPA PASSWORD ── */
async function doForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showToast('Isi email dulu!', 'error'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('📧 Link reset dikirim ke email!', 'success');
}

/* ── LOGOUT ── */
async function doLogout() {
  if (!confirm('Yakin mau keluar?')) return;
  await sb.auth.signOut();
}
