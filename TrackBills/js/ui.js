/* ─────────────────────────────────────────────
   TAGIHKU — js/ui.js
   Manajemen UI: screen, navigasi, bottom sheet,
   upload foto, toggle password.
   ───────────────────────────────────────────── */
'use strict';

/* ── SCREEN ── */
function showScreen(s) {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display    = s === 'auth' ? 'flex' : 'none';
  document.getElementById('app').classList.toggle('visible', s === 'app');
}

/* ── PASSWORD TOGGLE ── */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type        = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁️';
}

/* ── NAVIGASI HALAMAN ── */
function showPage(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
  document.getElementById('page-' + n).classList.add('active');
  document.getElementById('nav-'  + n).classList.add('active');
  document.getElementById('fab').style.display = n === 'profil' ? 'none' : 'flex';
  ({ home: renderHome, tagihan: renderTagihan, konsumen: renderKonsumen, profil: renderProfil })[n]?.();
}

/* ── BOTTOM SHEETS ── */
function openSheet(id) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(id).classList.add('open');

  if (id === 'add-trx-sheet') {
    popKSel();
    document.getElementById('trx-tanggal').value = new Date().toISOString().slice(0, 10);
  }
  if (id === 'edit-profile-sheet') {
    document.getElementById('profile-input-name').value = S.profile.name || '';
    document.getElementById('profile-input-role').value = S.profile.role || '';
  }
}

function closeAllSheets() {
  document.getElementById('overlay').classList.remove('open');
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));

  // Reset form tambah transaksi
  S.photoData = null;
  const ppc = document.getElementById('photo-preview-container');
  const pua = document.getElementById('photo-upload-area');
  const tf  = document.getElementById('trx-foto');
  if (ppc) ppc.style.display = 'none';
  if (pua) pua.style.display = 'block';
  if (tf)  tf.value = '';
  ['trx-item', 'trx-nominal', 'trx-catatan'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const tc = document.getElementById('trx-konsumen'); if (tc) tc.value = '';
}

/* ── PHOTO UPLOAD ── */
function handlePhotoUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX    = 800;
      let w = img.width, h = img.height;
      if (w > MAX) { h = h * MAX / w; w = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      S.photoData = canvas.toDataURL('image/jpeg', 0.75);
      document.getElementById('photo-preview-img').src = S.photoData;
      document.getElementById('photo-preview-container').style.display = 'block';
      document.getElementById('photo-upload-area').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  S.photoData = null;
  document.getElementById('photo-preview-container').style.display = 'none';
  document.getElementById('photo-upload-area').style.display = 'block';
  document.getElementById('trx-foto').value = '';
}

/* ── KONSUMEN SELECT (dropdown di form tambah) ── */
function popKSel() {
  const sel = document.getElementById('trx-konsumen');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Pilih Konsumen --</option>';
  S.konsumens.forEach(k => {
    const o = document.createElement('option');
    o.value = k.id; o.textContent = (k.emoji || '👤') + ' ' + k.nama;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

/* ── EXPORT CSV ── */
function exportData() {
  if (S.transactions.length === 0) { showToast('Belum ada data', 'error'); return; }
  const hdr  = ['Tanggal','Item','Konsumen','Nominal','Status','Jatuh Tempo','Catatan','Tgl Tagih','Tgl Lunas'];
  const rows = S.transactions.map(t => {
    const k = getK(t.konsumen_id);
    return [
      t.tanggal, `"${t.item}"`, `"${k.nama}"`, t.nominal,
      isOD(t) ? 'OVERDUE' : t.status,
      t.jatuh_tempo == 0 ? '-' : t.jatuh_tempo + 'hari',
      `"${t.catatan || ''}"`,
      t.tagih_date ? fmtDate(t.tagih_date) : '-',
      t.lunas_date ? fmtDate(t.lunas_date) : '-',
    ].join(',');
  });
  const csv  = [hdr.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `tagihku_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('📊 CSV diekspor!', 'success');
}

/* ── CEK OVERDUE ── */
function checkOverdue() {
  const ov = S.transactions.filter(t => isOD(t));
  if (ov.length === 0) { showToast('🎉 Tidak ada tagihan overdue!', 'success'); return; }
  showToast(`🔴 ${ov.length} tagihan overdue!`, 'error');
  showPage('tagihan'); setFilter('overdue');
}
