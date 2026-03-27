/* ─────────────────────────────────────────────
   TAGIHKU — js/db.js
   Semua operasi database: fetch, realtime,
   CRUD transaksi, konsumen, dan profil.
   ───────────────────────────────────────────── */
'use strict';

/* ── FETCH SEMUA DATA ──────────────────────────
   Hard timeout 8 detik via Promise.race().
   Ini adalah fix utama bug loading stuck:
   fetchAll() DIJAMIN selesai dalam 8 detik
   meskipun Supabase lambat/hang.
   ─────────────────────────────────────────── */
async function fetchAll() {
  setSyncStatus('syncing');

  const TIMEOUT_MS = 8000;

  const fetchData = async () => Promise.all([
    sb.from('konsumens').select('*').order('created_at', { ascending: false }),
    sb.from('transactions').select('*').order('created_at', { ascending: false }),
    sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(),
  ]);

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('FETCH_TIMEOUT')), TIMEOUT_MS)
  );

  try {
    const [r1, r2, r3] = await Promise.race([fetchData(), timeout]);
    S.konsumens    = r1.data || [];
    S.transactions = r2.data || [];
    S.profile      = r3.data || { name: 'Marketing', role: 'Sales Marketing' };
    setSyncStatus('live');
    renderAll();
  } catch (e) {
    setSyncStatus('error');
    console.error('[Tagihku] fetchAll:', e.message);
    renderAll(); // tetap render dengan data kosong
  }
}

/* ── REALTIME SUBSCRIPTION ── */
function subscribeRT() {
  sb.channel('rt-' + S.user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: 'user_id=eq.' + S.user.id }, p => {
      if      (p.eventType === 'INSERT') { if (!S.transactions.find(t => t.id === p.new.id)) S.transactions.unshift(p.new); }
      else if (p.eventType === 'UPDATE') { const i = S.transactions.findIndex(t => t.id === p.new.id); if (i !== -1) S.transactions[i] = p.new; }
      else if (p.eventType === 'DELETE') { S.transactions = S.transactions.filter(t => t.id !== p.old.id); }
      renderHome(); renderTagihan();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'konsumens', filter: 'user_id=eq.' + S.user.id }, p => {
      if      (p.eventType === 'INSERT') { if (!S.konsumens.find(k => k.id === p.new.id)) S.konsumens.unshift(p.new); }
      else if (p.eventType === 'UPDATE') { const i = S.konsumens.findIndex(k => k.id === p.new.id); if (i !== -1) S.konsumens[i] = p.new; }
      else if (p.eventType === 'DELETE') { S.konsumens = S.konsumens.filter(k => k.id !== p.old.id); }
      renderKonsumen();
    })
    .subscribe();
}

/* ── TRANSAKSI: TAMBAH ── */
async function saveTrx() {
  const kid  = document.getElementById('trx-konsumen').value;
  const item = document.getElementById('trx-item').value.trim();
  const nom  = parseInt(document.getElementById('trx-nominal').value);
  const tgl  = document.getElementById('trx-tanggal').value;
  if (!kid)         { showToast('Pilih konsumen dulu!', 'error'); return; }
  if (!item)        { showToast('Isi nama item!', 'error'); return; }
  if (!nom || nom <= 0) { showToast('Isi nominal!', 'error'); return; }
  if (!tgl)         { showToast('Isi tanggal!', 'error'); return; }

  const btn = document.getElementById('btn-save-trx');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; btn.disabled = true;

  const { data, error } = await sb.from('transactions').insert({
    user_id: S.user.id, konsumen_id: kid, item, nominal: nom, tanggal: tgl,
    jatuh_tempo: parseInt(document.getElementById('trx-jatuh-tempo').value),
    catatan: document.getElementById('trx-catatan').value.trim(),
    foto: S.photoData, status: 'belum',
  }).select().single();

  btn.innerHTML = '💾 Simpan Transaksi'; btn.disabled = false;
  if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }

  S.transactions.unshift(data);
  closeAllSheets(); renderHome();
  showToast('✅ Transaksi disimpan!', 'success');
}

/* ── TRANSAKSI: UPDATE STATUS ── */
async function updateStatus(id, ns) {
  const upd = { status: ns };
  if (ns === 'ditagih') upd.tagih_date = new Date().toISOString();
  if (ns === 'lunas')   upd.lunas_date = new Date().toISOString();

  const { error } = await sb.from('transactions').update(upd).eq('id', id);
  if (error) { showToast('Gagal update', 'error'); return; }

  const i = S.transactions.findIndex(t => t.id === id);
  if (i !== -1) Object.assign(S.transactions[i], upd);
  openDetailTrx(id); renderHome(); renderTagihan();
  showToast('Status diperbarui!', 'success');
}

/* ── TRANSAKSI: EDIT ── */
function openEditTrxForm(id) {
  const t = S.transactions.find(x => x.id === id); if (!t) return;

  document.getElementById('et-id').value      = id;
  document.getElementById('et-item').value    = t.item || '';
  document.getElementById('et-nominal').value = t.nominal || '';
  document.getElementById('et-tanggal').value = t.tanggal || '';
  document.getElementById('et-catatan').value = t.catatan || '';

  const sel = document.getElementById('et-konsumen');
  sel.innerHTML = '<option value="">-- Pilih Konsumen --</option>';
  S.konsumens.forEach(k => {
    const o = document.createElement('option');
    o.value = k.id; o.textContent = (k.emoji || '👤') + ' ' + k.nama;
    sel.appendChild(o);
  });
  sel.value = t.konsumen_id || '';
  document.getElementById('et-jatuh-tempo').value = String(t.jatuh_tempo || 14);

  closeAllSheets();
  setTimeout(() => openSheet('edit-trx-sheet'), 200);
}

async function updateTrx() {
  const id   = document.getElementById('et-id').value;
  const kid  = document.getElementById('et-konsumen').value;
  const item = document.getElementById('et-item').value.trim();
  const nom  = parseInt(document.getElementById('et-nominal').value);
  const tgl  = document.getElementById('et-tanggal').value;
  if (!kid)         { showToast('Pilih konsumen dulu!', 'error'); return; }
  if (!item)        { showToast('Isi nama item!', 'error'); return; }
  if (!nom || nom <= 0) { showToast('Isi nominal!', 'error'); return; }
  if (!tgl)         { showToast('Isi tanggal!', 'error'); return; }

  const btn = document.getElementById('btn-update-trx');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; btn.disabled = true;

  const upd = {
    konsumen_id: kid, item, nominal: nom, tanggal: tgl,
    jatuh_tempo: parseInt(document.getElementById('et-jatuh-tempo').value),
    catatan: document.getElementById('et-catatan').value.trim(),
  };
  const { error } = await sb.from('transactions').update(upd).eq('id', id);
  btn.innerHTML = '💾 Simpan Perubahan'; btn.disabled = false;
  if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }

  const i = S.transactions.findIndex(t => t.id === id);
  if (i !== -1) Object.assign(S.transactions[i], upd);
  closeAllSheets(); renderHome(); renderTagihan();
  showToast('✅ Transaksi diperbarui!', 'success');
}

/* ── TRANSAKSI: HAPUS ── */
async function deleteTrx(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  const { error } = await sb.from('transactions').delete().eq('id', id);
  if (error) { showToast('Gagal hapus', 'error'); return; }
  S.transactions = S.transactions.filter(t => t.id !== id);
  closeAllSheets(); renderHome(); renderTagihan();
  showToast('Transaksi dihapus', 'success');
}

/* ── TRANSAKSI: WA REMINDER ── */
function waReminder(id) {
  const t = S.transactions.find(x => x.id === id); if (!t) return;
  const k = getK(t.konsumen_id);
  if (!k.telp) { showToast('Nomor telepon tidak ada', 'error'); return; }
  const msg = encodeURIComponent(
    `Halo ${k.nama}, saya ingin mengingatkan tagihan:\n\n` +
    `📋 Item: ${t.item}\n💰 Nominal: ${fmtRpFull(t.nominal)}\n📅 Tanggal: ${fmtDate(t.tanggal)}\n\n` +
    `Mohon konfirmasi pembayarannya ya. Terima kasih 🙏`
  );
  const ph = k.telp.replace(/[^0-9]/g, '').replace(/^0/, '62');
  window.open(`https://wa.me/${ph}?text=${msg}`, '_blank');
}

/* ── KONSUMEN: TAMBAH ── */
async function saveKonsumen() {
  const nama = document.getElementById('k-nama').value.trim();
  if (!nama) { showToast('Isi nama konsumen!', 'error'); return; }

  const btn = document.getElementById('btn-save-konsumen');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; btn.disabled = true;

  const { data, error } = await sb.from('konsumens').insert({
    user_id: S.user.id, nama,
    telp:    document.getElementById('k-telp').value.trim(),
    emoji:   document.getElementById('k-emoji').value.trim() || EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    catatan: document.getElementById('k-catatan').value.trim(),
    color:   COLORS[Math.floor(Math.random() * COLORS.length)],
  }).select().single();

  btn.innerHTML = '💾 Simpan Konsumen'; btn.disabled = false;
  if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }

  S.konsumens.unshift(data);
  closeAllSheets(); renderKonsumen(); popKSel();
  showToast('✅ Konsumen ditambahkan!', 'success');
  ['k-nama', 'k-telp', 'k-emoji', 'k-catatan'].forEach(id => document.getElementById(id).value = '');
}

/* ── KONSUMEN: EDIT ── */
function openEditKonsumen(id) {
  const k = S.konsumens.find(x => x.id === id); if (!k) return;
  document.getElementById('ek-id').value      = id;
  document.getElementById('ek-nama').value    = k.nama    || '';
  document.getElementById('ek-telp').value    = k.telp    || '';
  document.getElementById('ek-emoji').value   = k.emoji   || '';
  document.getElementById('ek-catatan').value = k.catatan || '';
  closeAllSheets();
  setTimeout(() => openSheet('edit-konsumen-sheet'), 200);
}

async function updateKonsumen() {
  const id   = document.getElementById('ek-id').value;
  const nama = document.getElementById('ek-nama').value.trim();
  if (!nama) { showToast('Isi nama konsumen!', 'error'); return; }

  const btn = document.getElementById('btn-update-konsumen');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; btn.disabled = true;

  const upd = {
    nama, telp: document.getElementById('ek-telp').value.trim(),
    emoji: document.getElementById('ek-emoji').value.trim(),
    catatan: document.getElementById('ek-catatan').value.trim(),
  };
  const { error } = await sb.from('konsumens').update(upd).eq('id', id);
  btn.innerHTML = '💾 Simpan Perubahan'; btn.disabled = false;
  if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }

  const i = S.konsumens.findIndex(k => k.id === id);
  if (i !== -1) Object.assign(S.konsumens[i], upd);
  closeAllSheets(); renderKonsumen();
  showToast('✅ Konsumen diperbarui!', 'success');
}

/* ── KONSUMEN: HAPUS ── */
async function deleteKonsumen(id) {
  const cnt = S.transactions.filter(t => t.konsumen_id === id).length;
  if (!confirm(cnt > 0 ? `Konsumen ini punya ${cnt} transaksi. Hapus semuanya?` : 'Hapus konsumen ini?')) return;

  const { error } = await sb.from('konsumens').delete().eq('id', id);
  if (error) { showToast('Gagal hapus', 'error'); return; }

  S.konsumens    = S.konsumens.filter(k => k.id !== id);
  S.transactions = S.transactions.filter(t => t.konsumen_id !== id);
  closeAllSheets(); renderKonsumen();
  showToast('Konsumen dihapus', 'success');
}

/* ── PROFIL: SIMPAN ── */
async function saveProfile() {
  const name = document.getElementById('profile-input-name').value.trim() || 'Marketing';
  const role = document.getElementById('profile-input-role').value.trim() || 'Sales Marketing';
  const { error } = await sb.from('profiles').upsert({ id: S.user.id, name, role });
  if (error) { showToast('Gagal simpan profil', 'error'); return; }
  S.profile = { name, role };
  closeAllSheets(); renderHome(); renderProfil();
  showToast('Profil disimpan!', 'success');
}
