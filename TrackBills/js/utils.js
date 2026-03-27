/* ─────────────────────────────────────────────
   TAGIHKU — js/utils.js
   Fungsi pembantu: format angka/tanggal, badge,
   toast notification, sync status indicator.
   ───────────────────────────────────────────── */
'use strict';

/* ── FORMAT ── */
const fmtRp = n => {
  const v = parseInt(n) || 0;
  return v >= 1000000
    ? 'Rp ' + (v / 1e6).toFixed(1).replace('.0', '') + 'jt'
    : 'Rp ' + v.toLocaleString('id-ID');
};

const fmtRpFull = n => 'Rp ' + (parseInt(n) || 0).toLocaleString('id-ID');

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

/* ── TRANSAKSI HELPERS ── */
const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

const isOD = t =>
  t.status !== 'lunas' && t.jatuh_tempo && t.jatuh_tempo != 0 && daysSince(t.tanggal) > t.jatuh_tempo;

const getK = id => S.konsumens.find(k => k.id === id) || { nama: '(Terhapus)', emoji: '❓' };

const jtDate = t => {
  if (!t.jatuh_tempo || t.jatuh_tempo == 0) return null;
  const d = new Date(t.tanggal);
  d.setDate(d.getDate() + parseInt(t.jatuh_tempo));
  return d.toISOString().slice(0, 10);
};

const badge = t => {
  if (isOD(t)) return '<span class="badge badge-overdue">🔴 Overdue</span>';
  return {
    belum:   '<span class="badge badge-belum">⏳ Belum Ditagih</span>',
    ditagih: '<span class="badge badge-ditagih">📤 Sudah Ditagih</span>',
    lunas:   '<span class="badge badge-lunas">✅ Lunas</span>',
  }[t.status] || '';
};

const iconBg = (s, ov) => ov
  ? 'background:rgba(239,68,68,.15)'
  : ({ belum: 'background:rgba(245,158,11,.15)', ditagih: 'background:rgba(79,142,247,.15)', lunas: 'background:rgba(34,197,94,.15)' }[s] || 'background:rgba(245,158,11,.15)');

const statEm = (s, ov) => ov ? '🔴' : ({ belum: '🟡', ditagih: '🔵', lunas: '🟢' }[s] || '🟡');

/* ── TOAST ── */
let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── SYNC STATUS ── */
function setSyncStatus(s) {
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-txt');
  if (!dot) return;
  const map = {
    live:    ['var(--green)', 'Live'],
    syncing: ['var(--amber)', 'Sync...'],
    error:   ['var(--red)',   'Offline'],
  };
  dot.style.background = map[s][0];
  txt.textContent      = map[s][1];
}
