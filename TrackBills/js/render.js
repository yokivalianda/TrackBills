/* ─────────────────────────────────────────────
   TAGIHKU — js/render.js
   Semua fungsi render: home, tagihan, konsumen,
   profil, detail transaksi, detail konsumen.
   ───────────────────────────────────────────── */
'use strict';

/* ── RENDER ALL ── */
function renderAll() {
  renderHome(); renderTagihan(); renderKonsumen(); renderProfil();
}

/* ── RENDER: HOME ── */
function renderHome() {
  const now = new Date();
  let tp = 0, ot = 0, bt = 0, lt = 0, tc = 0, oc = 0, bc = 0, lc = 0;

  S.transactions.forEach(t => {
    if (t.status === 'lunas') {
      const d = new Date(t.lunas_date || t.tanggal);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) { lt += parseInt(t.nominal) || 0; lc++; }
    } else {
      tp += parseInt(t.nominal) || 0; tc++;
      if (isOD(t))           { ot += parseInt(t.nominal) || 0; oc++; }
      if (t.status === 'belum') { bt += parseInt(t.nominal) || 0; bc++; }
    }
  });

  document.getElementById('stat-total').textContent        = fmtRp(tp);
  document.getElementById('stat-total-count').textContent  = tc + ' transaksi aktif';
  document.getElementById('stat-overdue').textContent      = fmtRp(ot);
  document.getElementById('stat-overdue-count').textContent= oc + ' tagihan';
  document.getElementById('stat-belum').textContent        = fmtRp(bt);
  document.getElementById('stat-belum-count').textContent  = bc + ' item';
  document.getElementById('stat-lunas').textContent        = fmtRp(lt);
  document.getElementById('stat-lunas-count').textContent  = lc + ' transaksi';
  document.getElementById('user-name-display').textContent = (S.profile.name || 'Marketing').split(' ')[0];

  const ovs = S.transactions.filter(t => isOD(t));
  document.getElementById('overdue-alerts').innerHTML = ovs.length > 0
    ? `<div class="alert alert-overdue">🔴 <strong>${ovs.length} tagihan overdue!</strong> Total ${fmtRp(ot)} perlu segera ditagih.</div>`
    : '';

  const recent = S.transactions.slice(0, 5);
  document.getElementById('recent-list').innerHTML = recent.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Belum ada transaksi</div><div class="empty-desc">Tap tombol + untuk catat pengeluaran pertamamu</div></div>`
    : recent.map(renderTrxItem).join('');
}

/* ── RENDER: TAGIHAN ── */
function setFilter(f) {
  S.filter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === f));
  renderTagihan();
}

function renderTagihan() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const f = S.filter;
  const filtered = S.transactions.filter(t => {
    const k  = getK(t.konsumen_id);
    const ov = isOD(t);
    return (
      (!q || t.item.toLowerCase().includes(q) || k.nama.toLowerCase().includes(q)) &&
      (f === 'all'
        || (f === 'belum'   && t.status === 'belum'   && !ov)
        || (f === 'ditagih' && t.status === 'ditagih' && !ov)
        || (f === 'lunas'   && t.status === 'lunas')
        || (f === 'overdue' && ov))
    );
  });

  document.getElementById('tagihan-list').innerHTML = filtered.length === 0
    ? `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Tidak ada tagihan</div><div class="empty-desc">Coba ubah filter atau kata pencarian</div></div>`
    : filtered.map(renderTrxItem).join('');
}

/* ── RENDER: ITEM TRANSAKSI (shared) ── */
function renderTrxItem(t) {
  const k  = getK(t.konsumen_id);
  const ov = isOD(t);
  return `
    <div class="trx-item" onclick="openDetailTrx('${t.id}')">
      <div class="trx-icon" style="${iconBg(t.status, ov)}">${k.emoji || statEm(t.status, ov)}</div>
      <div class="trx-info">
        <div class="trx-title">${t.item}</div>
        <div class="trx-sub">${k.nama} · ${fmtDate(t.tanggal)}</div>
      </div>
      <div class="trx-right">
        <div class="trx-amount" style="${ov ? 'color:var(--red)' : ''}">${fmtRp(t.nominal)}</div>
        <div style="margin-top:2px">${badge(t)}</div>
      </div>
    </div>`;
}

/* ── RENDER: DETAIL TRANSAKSI ── */
function openDetailTrx(id) {
  const t  = S.transactions.find(x => x.id === id); if (!t) return;
  const k  = getK(t.konsumen_id);
  const ov = isOD(t);
  const jd = jtDate(t);

  document.getElementById('detail-sheet-title').textContent = '📝 Detail Tagihan';
  document.getElementById('detail-trx-body').innerHTML = `
    <div class="detail-amount" style="color:${ov ? 'var(--red)' : 'var(--accent)'}">${fmtRpFull(t.nominal)}</div>
    <div style="text-align:center;margin-bottom:16px">${badge(t)}</div>
    <div class="detail-row"><span class="detail-label">Item</span><span class="detail-value">${t.item}</span></div>
    <div class="detail-row"><span class="detail-label">Konsumen</span><span class="detail-value">${k.emoji || '👤'} ${k.nama}</span></div>
    <div class="detail-row"><span class="detail-label">Tanggal Beli</span><span class="detail-value">${fmtDate(t.tanggal)}</span></div>
    <div class="detail-row"><span class="detail-label">Jatuh Tempo</span><span class="detail-value">${t.jatuh_tempo == 0 ? 'Tidak ada batas' : t.jatuh_tempo + ' hari' + (jd ? ' (' + fmtDate(jd) + ')' : '')}</span></div>
    ${t.catatan   ? `<div class="detail-row"><span class="detail-label">Catatan</span><span class="detail-value">${t.catatan}</span></div>` : ''}
    ${t.tagih_date? `<div class="detail-row"><span class="detail-label">Tgl Ditagih</span><span class="detail-value">${fmtDate(t.tagih_date)}</span></div>` : ''}
    ${t.lunas_date? `<div class="detail-row"><span class="detail-label">Tgl Lunas</span><span class="detail-value">${fmtDate(t.lunas_date)}</span></div>` : ''}
    ${ov ? `<div class="alert alert-overdue">🔴 Sudah ${daysSince(t.tanggal)} hari dari tanggal pembelian!</div>` : ''}
    ${t.foto ? `<img src="${t.foto}" style="width:100%;border-radius:10px;margin:12px 0" alt="Struk">` : ''}
    <div style="margin-top:16px">
      <div class="form-label" style="margin-bottom:8px">UPDATE STATUS</div>
      <div class="status-selector">
        <div class="status-opt ${t.status === 'belum'   ? 'active-belum'   : ''}" onclick="updateStatus('${id}','belum')">⏳<br>Belum Ditagih</div>
        <div class="status-opt ${t.status === 'ditagih' ? 'active-ditagih' : ''}" onclick="updateStatus('${id}','ditagih')">📤<br>Sudah Ditagih</div>
        <div class="status-opt ${t.status === 'lunas'   ? 'active-lunas'   : ''}" onclick="updateStatus('${id}','lunas')">✅<br>Lunas</div>
      </div>
    </div>
    ${k.telp ? `<button class="btn btn-outline" style="margin-top:8px" onclick="waReminder('${id}')">📱 Kirim WA Reminder</button>` : ''}
    <div class="btn-group" style="margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="openEditTrxForm('${id}')">✏️ Edit</button>
      <button class="btn btn-danger btn-sm"  onclick="deleteTrx('${id}')">🗑️ Hapus</button>
    </div>`;

  openSheet('detail-trx-sheet');
}

/* ── RENDER: KONSUMEN ── */
function kStats(id) {
  const ts   = S.transactions.filter(t => t.konsumen_id === id);
  const pend = ts.filter(t => t.status !== 'lunas');
  return {
    count:   ts.length,
    pending: pend.length,
    total:   pend.reduce((s, t) => s + (parseInt(t.nominal) || 0), 0),
    overdue: pend.filter(t => isOD(t)).length,
  };
}

function renderKonsumen() {
  const q = (document.getElementById('search-konsumen')?.value || '').toLowerCase();
  const filtered = S.konsumens
    .filter(k => !q || k.nama.toLowerCase().includes(q))
    .map(k => ({ ...k, st: kStats(k.id) }))
    .sort((a, b) => b.st.total - a.st.total);

  document.getElementById('konsumen-count-label').textContent = filtered.length + ' Konsumen';
  document.getElementById('konsumen-list').innerHTML = filtered.length === 0
    ? `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Belum ada konsumen</div><div class="empty-desc">Tambahkan konsumen sebelum mencatat transaksi</div></div>`
    : filtered.map(k => {
        const tot = S.transactions.filter(t => t.konsumen_id === k.id).length;
        const pct = k.st.total > 0 ? Math.min(100, (k.st.pending / Math.max(k.st.count, 1)) * 100) : 0;
        return `
          <div class="konsumen-card" onclick="openKonsumenDetail('${k.id}')">
            <div class="konsumen-avatar" style="background:${k.color || '#4f8ef7'}22;color:${k.color || '#4f8ef7'}">${k.emoji || '👤'}</div>
            <div class="konsumen-info">
              <div class="konsumen-name">${k.nama}</div>
              <div class="konsumen-detail">${tot} transaksi${k.catatan ? ' · ' + k.catatan : ''}</div>
              ${k.st.total > 0 ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${k.st.overdue > 0 ? 'var(--red)' : 'var(--amber)'}"></div></div>` : ''}
            </div>
            <div class="konsumen-amount">
              <div class="konsumen-total">${k.st.total > 0 ? fmtRp(k.st.total) : '–'}</div>
              <div class="konsumen-count">${k.st.overdue > 0 ? `<span style="color:var(--red)">${k.st.overdue} overdue</span>` : k.st.pending + ' pending'}</div>
            </div>
          </div>`;
      }).join('');
}

/* ── RENDER: DETAIL KONSUMEN ── */
function openKonsumenDetail(id) {
  const k  = getK(id);
  const st = kStats(id);
  const ts = S.transactions.filter(t => t.konsumen_id === id);

  document.getElementById('detail-sheet-title').textContent = `${k.emoji || '👤'} ${k.nama}`;

  const trxHtml = ts.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📭</div><div>Belum ada transaksi</div></div>`
    : ts.map(t => `
        <div class="trx-item" onclick="closeAllSheets();setTimeout(()=>openDetailTrx('${t.id}'),200)">
          <div class="trx-icon" style="${iconBg(t.status, isOD(t))}">${statEm(t.status, isOD(t))}</div>
          <div class="trx-info"><div class="trx-title">${t.item}</div><div class="trx-sub">${fmtDate(t.tanggal)}</div></div>
          <div class="trx-right"><div class="trx-amount">${fmtRp(t.nominal)}</div><div>${badge(t)}</div></div>
        </div>`).join('');

  document.getElementById('detail-trx-body').innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div class="stat-card amber" style="flex:1;padding:12px"><div class="stat-label">Piutang</div><div class="stat-value" style="font-size:18px">${fmtRp(st.total)}</div></div>
      <div class="stat-card ${st.overdue > 0 ? 'red' : 'green'}" style="flex:1;padding:12px"><div class="stat-label">Overdue</div><div class="stat-value" style="font-size:18px">${st.overdue}</div></div>
    </div>
    ${k.telp   ? `<div class="detail-row"><span class="detail-label">📱 Telepon</span><span class="detail-value">${k.telp}</span></div>` : ''}
    ${k.catatan? `<div class="detail-row"><span class="detail-label">📝 Catatan</span><span class="detail-value">${k.catatan}</span></div>` : ''}
    <div class="section-header" style="margin-top:16px"><div class="section-title">Riwayat (${ts.length})</div></div>
    ${trxHtml}
    <div class="btn-group" style="margin-top:12px">
      <button class="btn btn-primary btn-sm" onclick="openEditKonsumen('${id}')">✏️ Edit</button>
      <button class="btn btn-danger btn-sm"  onclick="deleteKonsumen('${id}')">🗑️ Hapus</button>
    </div>`;

  openSheet('detail-trx-sheet');
}

/* ── RENDER: PROFIL ── */
function renderProfil() {
  const n = S.profile.name || 'Marketing';
  const r = S.profile.role || 'Sales Marketing';
  document.getElementById('profile-name-display').textContent  = n;
  document.getElementById('profile-role-display').textContent  = r;
  document.getElementById('profile-avatar').textContent        = n.charAt(0).toUpperCase();
  document.getElementById('profile-email-display').textContent = S.user?.email || '';

  const st = {
    total: S.transactions.length,
    lunas: S.transactions.filter(t => t.status === 'lunas').length,
    nom:   S.transactions.filter(t => t.status !== 'lunas').reduce((s, t) => s + parseInt(t.nominal || 0), 0),
    k:     S.konsumens.length,
  };
  document.getElementById('profile-stats').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card accent"><div class="stat-label">Total Transaksi</div><div class="stat-value" style="font-size:26px">${st.total}</div></div>
      <div class="stat-card green"><div class="stat-label">Sudah Lunas</div><div class="stat-value" style="font-size:26px">${st.lunas}</div></div>
      <div class="stat-card amber"><div class="stat-label">Total Piutang</div><div class="stat-value" style="font-size:18px">${fmtRp(st.nom)}</div></div>
      <div class="stat-card"><div class="stat-label">Konsumen</div><div class="stat-value" style="font-size:26px">${st.k}</div></div>
    </div>`;

  // Sinkronkan label tema
  applyTheme(localStorage.getItem('tagihku-theme') || 'dark');
}
