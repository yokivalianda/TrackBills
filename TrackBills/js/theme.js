/* ─────────────────────────────────────────────
   TAGIHKU — js/theme.js
   Manajemen tema light / dark.
   Tema disimpan di localStorage agar persisten.
   ───────────────────────────────────────────── */
'use strict';

function initTheme() {
  applyTheme(localStorage.getItem('tagihku-theme') || 'dark');
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle('light', isLight);
  localStorage.setItem('tagihku-theme', theme);

  // Update meta theme-color (status bar di mobile)
  const mc = document.querySelector('meta[name="theme-color"]');
  if (mc) mc.content = isLight ? '#f0f4ff' : '#0f1117';

  // Update tombol di topbar
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';

  // Update label di halaman profil
  const pi = document.getElementById('profil-theme-icon');
  const pl = document.getElementById('profil-theme-label');
  if (pi) pi.textContent = isLight ? '☀️' : '🌙';
  if (pl) pl.textContent = isLight ? 'Mode Terang Aktif' : 'Mode Gelap Aktif';
}

function toggleTheme() {
  const cur  = localStorage.getItem('tagihku-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(next === 'light' ? '☀️ Mode terang aktif' : '🌙 Mode gelap aktif', 'success');
}
