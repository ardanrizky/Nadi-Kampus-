/* =========================================================
   NadiKampus — Logika Dashboard Analytics
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nf = new Intl.NumberFormat('id-ID');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = v => Math.max(0, Math.min(100, v));
  const dim = key => DIMS.find(m => m.key === key);
  const CLUSTERS = window.CLUSTERS || window.PROFILES || [];
  const CLUSTER_POINTS = window.CLUSTER_POINTS || [];

  /* ---------------------------------------------------------
     Supabase Client & Konfigurasi Cloud Database
     --------------------------------------------------------- */
  const SUPABASE_URL = 'https://xmabdgvmsljwzrffwvng.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww';
  let supabaseClient = null;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      console.log('[NadiKampus] Supabase terhubung ke:', SUPABASE_URL);
    } catch (e) {
      console.warn('[NadiKampus] Gagal inisialisasi Supabase:', e);
    }
  }

  const VIEW_META = {
    executive: {
      title: 'Executive Dashboard',
      sub: 'Ringkasan indikator wellbeing dan permasalahan mahasiswa untuk pengambil kebijakan.'
    },
    profile: {
      title: 'Student Profiling',
      sub: 'Pemetaan 3 profil mahasiswa berdasarkan tingkat kesejahteraan dan kondisi akademik.'
    },
    voice: {
      title: 'Student Voice',
      sub: 'Analisis komentar terbuka: sentimen, topik dominan, dan representasi suara mahasiswa.'
    },
    reco: {
      title: 'Recommendation Program',
      sub: 'Rekomendasi program intervensi untuk mendukung kesejahteraan dan akademik mahasiswa.'
    }
  };

  const state = {
    view: 'executive',
    fac: 'all',
    selectedKPI: null,
    trend: new Set(DIMS.map(m => m.key)),
    cmp: 'wellbeing',
    profile: 0,
    topic: null,
    sent: 'all',
    source: 'all',
    recoProfile: 'all',
    plan: new Set()
  };

  /* ---------------------------------------------------------
     Data Turunan
     --------------------------------------------------------- */
  function compute(key) {
    const prodiSource = window.PRODIS || window.FACULTIES || {};
    const keys = Object.keys(prodiSource);
    let d;
    if (key === 'all') {
      const total = keys.reduce((a, k) => a + prodiSource[k].n, 0);
      const wavg = fn => keys.reduce((a, k) => a + prodiSource[k].n * fn(prodiSource[k]), 0) / total;
      d = {
        key,
        name: 'seluruh kampus',
        n: total,
        scores: {},
        profile: (window.CLUSTERS || [0, 1, 2]).map((_, i) => wavg(f => (f.profile && f.profile[i] !== undefined ? f.profile[i] : 0))),
        topicW: TOPICS.map((_, i) => wavg(f => f.topicW[i])),
        trend: {}
      };
      DIMS.forEach(m => {
        d.scores[m.key] = Math.round(wavg(f => f[m.key]));
        // Agregasi rata-rata riil berbobot per jenjang semester (Sem 1, Sem 3, Sem 5, Sem 7)
        d.trend[m.key] = [0, 1, 2, 3].map(idx => {
          return Math.round(wavg(f => (f.trend && f.trend[m.key] && f.trend[m.key][idx] !== undefined ? f.trend[m.key][idx] : f[m.key])));
        });
      });
    } else {
      const f = prodiSource[key];
      d = {
        key,
        name: 'Prodi ' + f.name,
        n: f.n,
        scores: {},
        profile: f.profile.slice(),
        topicW: f.topicW.slice(),
        trend: {}
      };
      DIMS.forEach(m => {
        d.scores[m.key] = f[m.key];
        d.trend[m.key] = (f.trend && f.trend[m.key])
          ? f.trend[m.key].slice()
          : [f[m.key], f[m.key], f[m.key], f[m.key]];
      });
    }
    d.topics = TOPICS.map((t, i) => ({ ...t, i, w: d.topicW[i] }));
    d.sentiment = [0, 1, 2].map(j => d.topics.reduce((a, t) => a + t.w * t.sent[j], 0) / 100);
    return d;
  }

  function level(m, v) {
    if (m.good === 'high') {
      if (v >= 75) return { t: 'Sangat baik', c: 'good' };
      if (v >= 65) return { t: 'Baik', c: 'good' };
      if (v >= 55) return { t: 'Perlu perhatian', c: 'warn' };
      return { t: 'Rentan', c: 'bad' };
    }
    if (v >= 80) return { t: 'Sangat tinggi', c: 'bad' };
    if (v >= 70) return { t: 'Tinggi', c: 'bad' };
    if (v >= 60) return { t: 'Sedang', c: 'warn' };
    return { t: 'Rendah', c: 'good' };
  }
  const need = (m, v) => (m.good === 'high' ? 100 - v : v);

  let D = compute('all');
  const ALL = compute('all');

  /* ---------------------------------------------------------
     Animasi Bantu
     --------------------------------------------------------- */
  function countUp(el) {
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 800;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function animateRings(root) {
    if (!root) return;
    $$('.ring__val', root).forEach(c => {
      c.style.transition = 'none';
      c.style.strokeDashoffset = c.getAttribute('stroke-dasharray');
      void c.getBoundingClientRect();
      c.style.transition = '';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        c.style.strokeDashoffset = c.dataset.target;
      }));
    });
    $$('[data-count]', root).forEach(countUp);
  }

  /* ---------------------------------------------------------
     1. EXECUTIVE DASHBOARD
     --------------------------------------------------------- */
  function renderKPIs() {
    const kpisEl = $('#kpis');
    if (!kpisEl) return;
    kpisEl.innerHTML = DIMS.map(m => {
      const v = D.scores[m.key], lv = level(m, v), tr = D.trend[m.key];
      const rawLikert = (v / 20).toFixed(2);
      const isSelected = state.selectedKPI === m.key;
      return `
        <article class="kpi ${isSelected ? 'is-selected' : ''}" data-kpi="${m.key}" tabindex="0" role="button" aria-pressed="${isSelected}" style="--c:${m.color}" title="Klik untuk fokus &amp; melihat rincian riwayat per semester">
          <div class="kpi__top">
            <span class="kpi__label">${m.label}</span>
            <span class="pill pill--${lv.c}">${lv.t}</span>
          </div>
          <div class="kpi__main">
            <div class="kpi__ring">${Charts.ring(v, m.color, 96, 10, m.label)}<b class="kpi__num" data-count="${v}">${v}</b></div>
          </div>
          <div class="kpi__foot">
            <span class="delta delta--good" style="color:var(--text-2); font-weight:600;">Skor: <b>${rawLikert} / 5.00</b> Likert</span>
            <span class="kpi__action-hint">${isSelected ? 'Fokus Aktif' : 'Lihat Rincian'}</span>
          </div>
          <p class="kpi__about">${m.about}</p>
          ${isSelected ? `
            <div class="kpi__expanded" aria-label="Rincian skor antar jenjang semester">
              <div class="kpi__expanded-header">
                <span>Skor Antar Semester:</span>
                <span class="kpi__benchmark">${m.good === 'high' ? 'Target: &ge; 65' : 'Target: &le; 50'}</span>
              </div>
              <div class="kpi__mo-chips">
                ${MONTHS.map((mo, idx) => `
                  <div class="kpi__chip">
                    <span class="kpi__chip-mo">${mo}</span>
                    <strong class="kpi__chip-val">${tr[idx]}</strong>
                  </div>
                `).join('')}
              </div>
              <p class="kpi__hint-msg">Grafik di samping telah difokuskan pada indikator <strong>${m.label}</strong>.</p>
            </div>
          ` : ''}
        </article>`;
    }).join('');
    animateRings(kpisEl);
  }

  function renderTrend() {
    const toggles = $('#trendToggles'), chart = $('#trendChart'), footer = $('#trendFooter');
    if (!toggles || !chart) return;
    toggles.innerHTML = DIMS.map(m => `
      <button type="button" class="seg__btn" aria-pressed="${state.trend.has(m.key)}" data-trend="${m.key}">
        <i style="background:${m.color}"></i>${m.short}
      </button>`).join('');

    Charts.line(chart, {
      labels: MONTHS,
      height: 280,
      series: DIMS.map(m => ({
        name: m.short,
        color: m.color,
        values: D.trend[m.key],
        visible: state.trend.has(m.key)
      }))
    });

    if (footer) {
      const scopeName = state.fac === 'all' ? 'seluruh kampus' : D.name;

      footer.innerHTML = `
        <div class="trend-stats-strip">
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Fase Beban Tertinggi</span>
            <strong class="trend-stat-card__val" style="color: #E11D48;">Semester 3 (60 Poin)</strong>
            <span class="trend-stat-card__sub">Beban Praktikum &amp; Teori Padat</span>
          </div>
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Dukungan Sosial Kuat</span>
            <strong class="trend-stat-card__val" style="color: #4F46E5;">Sem 1 &amp; Sem 5 (82 Poin)</strong>
            <span class="trend-stat-card__sub">Solidaritas Angkatan Tinggi</span>
          </div>
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Kesiapan Karier Optimal</span>
            <strong class="trend-stat-card__val" style="color: #D97706;">Semester 5 (71 Poin)</strong>
            <span class="trend-stat-card__sub">Fase Persiapan Magang Industri</span>
          </div>
        </div>
        <div class="trend-summary-note">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Dinamika antar tingkat (${scopeName}): Tekanan psikososial paling dirasakan oleh mahasiswa Semester 3, sedangkan kesiapan karier mencapai puncaknya di Semester 5 menjelang magang industri.</span>
        </div>`;
    }
  }

  function makeInsights() {
    const out = [];
    const worst = DIMS.map(m => ({ m, n: need(m, D.scores[m.key]) })).sort((a, b) => b.n - a.n)[0].m;
    const wl = level(worst, D.scores[worst.key]);
    out.push({
      tone: wl.c === 'good' ? 'good' : wl.c,
      category: 'Prioritas Utama',
      badgeClass: 'ins-badge--urgent',
      title: `${worst.short} paling perlu perhatian`,
      text: `Dengan skor ${D.scores[worst.key]} (${wl.t.toLowerCase()}), indikator ini menunjukkan urgensi dukungan terbesar di antara empat indikator.`,
      act: { view: 'reco' },
      label: 'Lihat program terkait'
    });

    const pi = D.profile.indexOf(Math.max(...D.profile));
    const pct = Math.round(D.profile[pi]);
    out.push({
      tone: 'info',
      category: 'Sebaran Profil',
      badgeClass: 'ins-badge--info',
      title: `${PROFILES[pi].short} jadi profil terbesar`,
      text: `${pct}% mahasiswa (sekitar ${nf.format(Math.round(D.n * pct / 100))} orang) terpetakan ke ${PROFILES[pi].name}.`,
      act: { view: 'profile', profile: pi },
      label: 'Lihat detail profil'
    });

    const ti = D.topics.map(t => ({ t, v: t.w * t.sent[2] })).sort((a, b) => b.v - a.v)[0].t;
    out.push({
      tone: 'warn',
      category: 'Suara Terbanyak',
      badgeClass: 'ins-badge--warn',
      title: `${ti.name} paling banyak dikeluhkan`,
      text: `${Math.round(ti.w)}% komentar membahas topik ini, dan ${ti.sent[2]}% di antaranya bernada negatif.`,
      act: { view: 'voice', topic: ti.i },
      label: 'Baca suara mahasiswa'
    });

    if (state.fac === 'all') {
      const prodiSource = window.PRODIS || window.FACULTIES || {};
      const ks = Object.keys(prodiSource).sort((a, b) => prodiSource[a].pressure - prodiSource[b].pressure);
      const f = prodiSource[ks[0]];
      const diff = ALL.scores.pressure - f.pressure;
      out.push({
        tone: 'bad',
        category: 'Fokus Prodi',
        badgeClass: 'ins-badge--prodi',
        title: `Ketahanan akademik terendah di ${f.name}`,
        text: `Skor ${f.pressure}, ${Math.abs(diff)} poin di bawah rata-rata kampus (${ALL.scores.pressure}).`,
        act: { fac: ks[0] },
        label: `Fokus ke Prodi ${f.name}`
      });
    }
    return out;
  }

  function renderInsights() {
    const list = $('#insights');
    if (!list) return;
    const ins = makeInsights();
    list.innerHTML = ins.map((item, i) => `
      <li class="ins-card ins-card--${item.tone}">
        <div class="ins-card__header">
          <div class="ins-card__title-row">
            <h5 class="ins-card__title">${item.title}</h5>
          </div>
          <span class="ins-badge ${item.badgeClass}">${item.category}</span>
        </div>
        <p class="ins-card__text">${item.text}</p>
        <div class="ins-card__footer">
          <button type="button" class="ins-card__action" data-ins="${i}">
            <span>${item.label}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </li>`).join('');
  }

  function renderCompare() {
    const seg = $('#cmpMetric'), box = $('#fbars');
    if (!seg || !box) return;
    seg.innerHTML = DIMS.map(m => `
      <button type="button" class="seg__btn" aria-pressed="${state.cmp === m.key}" data-cmp="${m.key}">
        <i style="background:${m.color}"></i>${m.short}
      </button>`).join('');

    const m = dim(state.cmp);
    const avg = ALL.scores[m.key];
    const prodiSource = window.PRODIS || window.FACULTIES || {};
    const items = Object.entries(prodiSource).map(([k, f]) => ({ k, name: f.name, v: f[m.key] }))
      .sort((a, b) => (m.good === 'high' ? b.v - a.v : a.v - b.v));

    box.innerHTML = items.map(it => {
      const isSel = state.fac === it.k;
      return `
        <button type="button" class="fbar ${isSel ? 'is-sel' : ''}" data-fac="${it.k}" style="--c:${m.color}">
          <span class="fbar__name">${it.name}</span>
          <span class="fbar__track">
            <i style="width:${it.v}%"></i>
            <u style="left:${avg}%" title="Rata-rata kampus: ${avg}"></u>
          </span>
          <b class="fbar__val">${it.v}</b>
        </button>`;
    }).join('') + `
      <div class="fbars__legend">
        <u aria-hidden="true"></u> Garis penanda = rata-rata seluruh kampus (${avg})
      </div>`;
  }

  /* ---------------------------------------------------------
     2. STUDENT CLUSTERING ANALYSIS (K-MEANS)
     --------------------------------------------------------- */
  function renderProfile() {
    const cards = $('#profiles');
    if (!cards) return;
    cards.innerHTML = CLUSTERS.map((p, i) => {
      const pct = Math.round(D.profile[i] !== undefined ? D.profile[i] : p.pct);
      const n = Math.round(D.n * pct / 100);
      const sel = state.profile === i;
      return `
        <button type="button" class="pcard ${sel ? 'is-sel' : ''}" data-profile="${i}" style="--c:${p.color}">
          <div class="pcard__header">
            <span class="pcard__badge">Profil ${p.cluster}</span>
            <span class="pcard__pct">${pct}<small>%</small></span>
          </div>
          <h4>${p.name}</h4>
          <span class="pcard__n">± ${nf.format(n)} mahasiswa (${p.count || Math.round(149 * pct / 100)} sampel riil)</span>
          <span class="pcard__bar"><i style="width:${pct}%"></i></span>
        </button>`;
    }).join('');

    const p = CLUSTERS[state.profile] || CLUSTERS[0];
    const detail = $('#profileDetail');
    if (detail) {
      detail.style.setProperty('--c', p.color);
      detail.innerHTML = `
        <div class="pd__nav-bar">
          <div class="pd__nav-title">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Pilih Profil untuk Dibedah:</span>
          </div>
          <div class="pd__tabs" role="tablist" aria-label="Pilih Profil Klaster">
            ${CLUSTERS.map((cl, idx) => {
        const isSel = state.profile === idx;
        return `
                <button type="button" class="pd__tab ${isSel ? 'is-active' : ''}" data-profile="${idx}" style="--tc:${cl.color}">
                  <span class="pd__tab-dot"></span>
                  <strong class="pd__tab-label">P${cl.cluster}</strong>
                  <span class="pd__tab-name">${cl.short}</span>
                  <span class="pd__tab-pct">${cl.pct}%</span>
                </button>`;
      }).join('')}
          </div>
          <div class="pd__nav-pager">
            <button type="button" class="pd__pager-btn" data-profile="${(state.profile - 1 + CLUSTERS.length) % CLUSTERS.length}" title="Profil Sebelumnya" aria-label="Profil Sebelumnya">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span class="pd__pager-idx">P${p.cluster} (${state.profile + 1}/${CLUSTERS.length})</span>
            <button type="button" class="pd__pager-btn" data-profile="${(state.profile + 1) % CLUSTERS.length}" title="Profil Berikutnya" aria-label="Profil Berikutnya">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>

        <div class="pd__head">
          <span class="pd__sw"></span>
          <div>
            <h4>${p.name}</h4>
            <span class="pd__centroid-tag">Titik Centroid (P${p.cluster}) · PCA: [${p.pca.x}, ${p.pca.y}] · Sampel Riil: ${p.count || 0} Mahasiswa (${p.pct || 0}%)</span>
          </div>
        </div>
        <p class="pd__desc">${p.desc}</p>
        <ul class="pd__traits">
          ${p.traits.map(t => `<li>${t}</li>`).join('')}
        </ul>
        <div class="pd__means">
          <h5 class="pd__means-title">Nilai Centroid pada 4 Dimensi Utama:</h5>
          ${DIMS.map(dm => {
        const val = p.means[dm.key];
        const raw = p.rawMeans ? p.rawMeans[dm.key] : (val / 20).toFixed(2);
        return `
              <div class="mean">
                <span>${dm.short}</span>
                <span class="mean__track"><i style="width:${val}%;background:${dm.color}"></i></span>
                <b>${val} <small style="font-size:11px;font-weight:normal;color:#64748B">(Likert: ${raw})</small></b>
              </div>`;
      }).join('')}
        </div>
        <p class="pd__need"><strong>Kebutuhan intervensi:</strong> ${p.need}</p>
        <button type="button" class="btn btn--outline btn--sm" data-recoprofile="${state.profile}">
          Lihat program intervensi untuk profil ini →
        </button>`;
    }

    // 1. Render Scatter Plot 2D Mahasiswa & Centroid
    const scatterEl = $('#clusterScatterChart');
    if (scatterEl && typeof Charts.clusterScatter === 'function') {
      const activePoints = (window.CLUSTER_POINTS && window.CLUSTER_POINTS.length > 0) ? window.CLUSTER_POINTS : CLUSTER_POINTS;
      const activeClusters = (window.CLUSTERS && window.CLUSTERS.length > 0) ? window.CLUSTERS : CLUSTERS;
      Charts.clusterScatter(scatterEl, activePoints, activeClusters, state.profile, i => {
        state.profile = i;
        renderProfile();
      });
    }

    // 2. Render Pola Skor Centroid Multi-Dimensi
    const prChart = $('#profileChart');
    if (prChart) {
      Charts.profileLines(prChart, CLUSTERS, DIMS, state.profile, i => {
        state.profile = i;
        renderProfile();
      });
    }

    // 3. Update catatan indikasi klaster dinamis sesuai profil yang diklik
    const clusterNoteEl = $('#clusterInsightNote');
    const badgeEl = $('#scatterTotalBadge');
    if (clusterNoteEl) {
      if (state.profile === null) {
        clusterNoteEl.style.borderLeftColor = '#475569';
        clusterNoteEl.style.background = 'rgba(71, 85, 105, 0.05)';
        clusterNoteEl.innerHTML = `<b>Indikasi Keseluruhan (Semua Mahasiswa):</b> Menampilkan seluruh sebaran responden. Terbagi jelas dalam 3 zona: <b style="color:#E11D48">P1 Rentan</b> (kiri-bawah), <b style="color:#6366F1">P2 Moderat</b> (tengah), dan <b style="color:#0D9488">P3 Unggul</b> (kanan-atas).`;
        if (badgeEl) badgeEl.textContent = `${D.n || 151} Data Riil Mahasiswa`;
      } else if (state.profile === 0) {
        clusterNoteEl.style.borderLeftColor = '#E11D48';
        clusterNoteEl.style.background = 'rgba(225, 29, 72, 0.05)';
        clusterNoteEl.innerHTML = `<b>Indikasi Klaster (P1 Rentan - 46%):</b> Titik terkonsentrasi di area skor rendah (&lt;60) pada sumbu Kesejahteraan &amp; Akademik &rarr; <b>Sasaran utama prioritas bantuan konseling psikologis &amp; harmonisasi jadwal tugas</b>.`;
        if (badgeEl) badgeEl.textContent = `${CLUSTERS[0].count || 71} Mahasiswa (P1 Rentan)`;
      } else if (state.profile === 1) {
        clusterNoteEl.style.borderLeftColor = '#6366F1';
        clusterNoteEl.style.background = 'rgba(99, 102, 241, 0.05)';
        clusterNoteEl.innerHTML = `<b>Indikasi Klaster (P2 Moderat - 41%):</b> Titik stabil di zona adaptasi sedang (skor 60–80) &rarr; <b>Memerlukan klinik persiapan magang &amp; sertifikasi industri agar tidak merosot ke kelompok rentan</b>.`;
        if (badgeEl) badgeEl.textContent = `${CLUSTERS[1].count || 61} Mahasiswa (P2 Moderat)`;
      } else if (state.profile === 2) {
        clusterNoteEl.style.borderLeftColor = '#0D9488';
        clusterNoteEl.style.background = 'rgba(13, 148, 136, 0.05)';
        clusterNoteEl.innerHTML = `<b>Indikasi Klaster (P3 Unggul - 13%):</b> Titik berada di kuadran performa tertinggi (&gt;80) &rarr; <b>Potensial diberdayakan sebagai Peer Mentor bagi P1 dan delegasi kompetisi/hibah kampus</b>.`;
        if (badgeEl) badgeEl.textContent = `${CLUSTERS[2].count || 19} Mahasiswa (P3 Unggul)`;
      }
    }
  }

  /* ---------------------------------------------------------
     3. STUDENT VOICE (NLP)
     --------------------------------------------------------- */
  function renderVoice() {
    const curSource = state.source || 'all';
    const voiceStats = (window.VOICE_STATS_BY_SOURCE && window.VOICE_STATS_BY_SOURCE[curSource]) || {
      n: 5204,
      sentiment: [12.6, 55.7, 31.7],
      topics: [
        { weight: 67.9, sent: [5.3, 69.2, 25.4] },
        { weight: 13.9, sent: [20.8, 30.6, 48.6] },
        { weight: 9.5, sent: [14.0, 23.9, 62.1] },
        { weight: 4.2, sent: [78.7, 8.3, 13.0] },
        { weight: 1.7, sent: [4.6, 54.6, 40.9] }
      ]
    };

    // Subtitle label dinamis
    const subLabel = curSource === 'all' 
      ? `${nf.format(voiceStats.n)} data riil gabungan (Tele + GForm)`
      : (curSource === 'gform' ? `${nf.format(voiceStats.n)} respon survei GForm` : `${nf.format(voiceStats.n)} pesan Menfess Telegram`);
    const voiceSubEl = $('#voiceSourceSub');
    if (voiceSubEl) voiceSubEl.textContent = subLabel;

    // Filter sumber di Donut Card & Quotes Card (Tersinkronisasi)
    const sourceFilters = [$('#voiceSourceFilter'), $('#sourceFilter')];
    sourceFilters.forEach(el => {
      if (!el) return;
      el.innerHTML = [
        ['all', `Semua (${curSource === 'all' ? voiceStats.n : '5.2k'})`],
        ['gform', 'GForm (553)'],
        ['telegram', 'Menfess Tele (4.6k)']
      ].map(([k, l]) => `
        <button type="button" class="seg__btn" aria-pressed="${curSource === k}" data-source="${k}">
          ${l}
        </button>`).join('');
    });

    const donutEl = $('#donut'), legendEl = $('#sentLegend');
    if (donutEl && legendEl) {
      const parts = [
        { key: 'pos', label: 'Positif', value: voiceStats.sentiment[0], color: '#059669' },
        { key: 'neu', label: 'Netral', value: voiceStats.sentiment[1], color: '#7E92A2' },
        { key: 'neg', label: 'Negatif', value: voiceStats.sentiment[2], color: '#E0664A' }
      ];
      Charts.donut(donutEl, parts, {
        active: state.sent,
        onPick: k => {
          state.sent = state.sent === k ? 'all' : k;
          renderVoice();
        }
      });
      legendEl.innerHTML = parts.map(p => `
        <button type="button" class="lg ${state.sent === p.key ? 'is-on' : ''}" data-sent="${p.key}">
          <i style="background:${p.color}"></i>
          <span>${p.label}</span>
          <b>${p.value.toFixed(1)}%</b>
        </button>`).join('');

      // Sinkronisasi angka barometer sentimen mahasiswa
      const totalNEl = $('#sentTotalN');
      const negValEl = $('#sentNegVal');
      const posNeuValEl = $('#sentPosNeuVal');
      if (totalNEl) totalNEl.textContent = nf.format(voiceStats.n);
      if (negValEl) negValEl.textContent = `${Math.round(voiceStats.sentiment[2])}%`;
      if (posNeuValEl) posNeuValEl.textContent = `${Math.round(voiceStats.sentiment[0] + voiceStats.sentiment[1])}%`;
    }

    const topicsBox = $('#topics');
    if (topicsBox) {
      topicsBox.innerHTML = TOPICS.map((t, idx) => {
        const sel = state.topic === idx;
        const topicSourceStat = (voiceStats.topics && voiceStats.topics[idx]) || { weight: 20, sent: t.sent };
        const w = topicSourceStat.weight;
        const sent = topicSourceStat.sent;
        return `
          <button type="button" class="topic ${sel ? 'is-sel' : ''}" data-topic="${idx}">
            <div class="topic__row">
              <span class="topic__name">${t.name}</span>
              <b>${w}%</b>
            </div>
            <div class="topic__track">
              <i style="width:${sent[0]}%;background:#059669" title="Positif: ${sent[0]}%"></i>
              <i style="width:${sent[1]}%;background:#B6C2CE" title="Netral: ${sent[1]}%"></i>
              <i style="width:${sent[2]}%;background:#E0664A" title="Negatif: ${sent[2]}%"></i>
            </div>
          </button>`;
      }).join('') + `
        <div class="topics__legend">
          <i style="background:#059669"></i> Positif
          <i style="background:#B6C2CE"></i> Netral
          <i style="background:#E0664A"></i> Negatif
        </div>`;
    }

    // Keywords
    const kwBox = $('#keywords');
    if (kwBox) {
      const activeTopic = state.topic !== null ? TOPICS[state.topic] : null;
      const kws = activeTopic ? activeTopic.keywords : TOPICS.flatMap(t => t.keywords).slice(0, 8);
      kwBox.innerHTML = `
        <span class="kw__lab">Kata kunci dominan:</span>` +
        kws.map(k => `<span class="kw__chip">#${k}</span>`).join('') +
        (activeTopic ? ` <button type="button" class="link" data-topic="none">Tampilkan semua topik</button>` : '');
    }

    // Quotes list
    const qList = $('#quotes');
    if (qList) {
      const filtered = QUOTES.filter(q => {
        if (state.topic !== null && q.t !== state.topic) return false;
        if (state.sent !== 'all' && q.s !== state.sent) return false;
        if (state.source && state.source !== 'all' && (q.source || 'gform') !== state.source) return false;
        return true;
      });
      const quotesSubEl = $('#quotesSub');
      if (quotesSubEl) {
        const srcText = curSource === 'all' ? '30 GForm + 30 Menfess Tele' : (curSource === 'gform' ? 'Kuesioner GForm' : 'Menfess Telegram');
        quotesSubEl.textContent = `Menampilkan ${filtered.length} komentar terpilih (${srcText})`;
      }
      if (filtered.length === 0) {
        qList.innerHTML = `<li class="empty">Tidak ada komentar untuk kombinasi filter ini.</li>`;
      } else {
        qList.innerHTML = filtered.map(q => `
          <li class="quote ${q.isNew ? 'quote--new' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="quote__src-badge quote__src-badge--${q.source || 'gform'}">
                ${q.source === 'telegram' ? 'Menfess Telegram' : 'Kuesioner GForm'}
              </span>
              ${q.isNew ? `<span class="quote__new-tag">Curhat Baru (Anonim${q.prodi ? ' · ' + q.prodi : ''}${q.sem ? ' · Sem ' + q.sem : ''})</span>` : ''}
            </div>
            <p>“${q.x}”</p>
            <div class="quote__meta">
              <span class="quote__topic">${TOPICS[q.t] ? TOPICS[q.t].name : 'Umum'}</span>
              <span class="quote__bullet">•</span>
              <span class="quote__sent quote__sent--${q.s}">${q.s === 'pos' ? 'Positif' : q.s === 'neg' ? 'Negatif' : 'Netral'}</span>
            </div>
          </li>`).join('');
      }
    }
  }

  /* ---------------------------------------------------------
     NLP Classifier & Kotak Curhat Mahasiswa
     --------------------------------------------------------- */
  function analyzeVoiceNLP(text) {
    const lower = text.toLowerCase();

    // Klasifikasi topik berdasarkan frekuensi kata kunci
    const extraTopicLexicons = [
      ['tugas', 'deadline', 'ujian', 'praktikum', 'tubes', 'kuliah', 'jadwal', 'kelas', 'materi', 'begadang', 'dosen', 'wali', 'bimbingan', 'skripsi', 'revisi', 'feedback', 'wifi', 'fasilitas', 'ruang', 'lab', 'gedung', 'perpustakaan', 'toilet', 'parkir', 'parkiran', 'server', 'lemot', 'antrean', 'kantin', 'layanan'],
      ['magang', 'karier', 'cv', 'kerja', 'portofolio', 'interview', 'loker', 'alumni', 'industri', 'profesi', 'masa depan'],
      ['ukt', 'biaya', 'uang', 'finansial', 'bayar', 'kos', 'makan', 'beasiswa', 'keringanan', 'mahal', 'spp', 'ekonomi'],
      ['teman', 'sendirian', 'kesepian', 'sosial', 'rantau', 'asrama', 'isolasi', 'berteman', 'ngobrol', 'relasi', 'asing', 'ukm', 'organisasi', 'kegiatan', 'bem', 'hima', 'lomba', 'acara', 'komunitas', 'kepanitiaan'],
      ['stres', 'stress', 'cemas', 'tidur', 'istirahat', 'lelah', 'capek', 'overthinking', 'konseling', 'psikolog', 'dukungan', 'semangat', 'tenang', 'burnout']
    ];

    const topicScores = TOPICS.map((topic, i) => {
      let score = 0;
      topic.keywords.forEach(kw => {
        if (lower.includes(kw.toLowerCase())) score += 2.5;
      });
      if (extraTopicLexicons[i]) {
        extraTopicLexicons[i].forEach(kw => {
          if (lower.includes(kw)) score += 1.5;
        });
      }
      return { topicIndex: i, score };
    });

    topicScores.sort((a, b) => b.score - a.score);
    const bestTopic = topicScores[0].score > 0 ? topicScores[0].topicIndex : 0;

    // Klasifikasi sentimen
    const negWords = [
      'sulit', 'berat', 'stres', 'stress', 'capek', 'lelah', 'kecewa', 'kurang', 'buruk', 'putus',
      'tidak', 'belum', 'lambat', 'bingung', 'panik', 'mahal', 'sendiri', 'kesepian',
      'terlambat', 'rusak', 'susah', 'takut', 'cemas', 'masalah', 'keluhan', 'keluh', 'parah',
      'begadang', 'drop', 'menumpuk', 'tabrakan', 'bentrok', 'padat', 'pusing', 'down', 'overthinking',
      'sempit', 'brobok', 'jelek'
    ];
    const posWords = [
      'bagus', 'senang', 'membantu', 'nyaman', 'terbantu', 'puas', 'mantap', 'baik', 'ramah',
      'jelas', 'semangat', 'seru', 'solusi', 'tenang', 'apresiasi', 'terima kasih', 'keren', 'positif'
    ];

    let negCount = 0, posCount = 0;
    negWords.forEach(w => { if (lower.includes(w)) negCount++; });
    posWords.forEach(w => { if (lower.includes(w)) posCount++; });

    let sentiment = 'neu';
    if (negCount > posCount) sentiment = 'neg';
    else if (posCount > negCount) sentiment = 'pos';
    else if (negCount === 0 && posCount === 0) sentiment = 'neu';

    return { topicIndex: bestTopic, sentiment };
  }
  const OLD_TO_NEW_TOPIC = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0, 5: 0, 6: 3 };
  function topicFromRow(d) {
    const byName = TOPICS.findIndex(t => t.name === d.topic_name);
    if (byName >= 0) return byName;
    const m = OLD_TO_NEW_TOPIC[d.topic_index];
    return m !== undefined ? m : 0;
  }

  function initVoiceForm() {
    const form = $('#voiceForm');
    const input = $('#voiceInput');
    const prodiSel = $('#voiceProdi');
    const semSel = $('#voiceSemester');
    if (!form || !input) return;

    if (prodiSel) {
      const prodiSource = window.PRODIS || window.FACULTIES || {};
      prodiSel.innerHTML = Object.keys(prodiSource).map(k => `<option value="${k}">${prodiSource[k].name}</option>`).join('');
    }

    // Tombol contoh keluhan cepat
    $$('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.curhat;
        if (text) {
          input.value = text;
          input.focus();
        }
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const nlp = analyzeVoiceNLP(text);
      const prodiKey = prodiSel ? prodiSel.value : 'ti';
      const prodiSource = window.PRODIS || window.FACULTIES || {};
      const prodiName = prodiSource[prodiKey] ? prodiSource[prodiKey].name : 'Teknik Informatika';
      const semVal = semSel ? semSel.value : '5';

      // Masukkan curhat baru ke QUOTES
      const newQuote = {
        t: nlp.topicIndex,
        s: nlp.sentiment,
        x: text,
        isNew: true,
        prodi: prodiName,
        sem: semVal,
        time: 'Baru saja'
      };
      QUOTES.unshift(newQuote);

      // Mutasi bobot topik & sentimen pada D secara realtime
      if (D && D.topics && D.topics[nlp.topicIndex]) {
        const top = D.topics[nlp.topicIndex];
        top.w = Math.min(100, top.w + 0.8);
        const sIdx = nlp.sentiment === 'pos' ? 0 : nlp.sentiment === 'neu' ? 1 : 2;
        top.sent[sIdx] = Math.min(100, top.sent[sIdx] + 2);
        D.sentiment = [0, 1, 2].map(j => D.topics.reduce((a, t) => a + t.w * t.sent[j], 0) / 100);
      }

      // Reset form
      input.value = '';

      // Tampilkan filter ke 'all' agar komentar baru langsung tampak
      state.sent = 'all';
      state.topic = null;
      renderVoice();

      const sentEmoji = nlp.sentiment === 'pos' ? 'Positif ' : nlp.sentiment === 'neg' ? 'Keluhan / Kritis' : 'Netral';

      // Simpan permanen ke Supabase Cloud Database
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.from('student_voice').insert([{
            text: text,
            topic_index: nlp.topicIndex,
            topic_name: TOPICS[nlp.topicIndex].name,
            sentiment: nlp.sentiment,
            prodi: prodiName,
            semester: parseInt(semVal, 10) || 5
          }]);
          if (error) {
            console.error('[Supabase Error]:', error);
            toast(`Aspirasi diterima! NLP deteksi: Topik "${TOPICS[nlp.topicIndex].name}"`);
          } else {
            console.log('[Supabase Success]: Aspirasi mahasiswa tersimpan permanen di Supabase.');
            toast(`Aspirasi diterima & tersimpan ke Cloud! Topik: "${TOPICS[nlp.topicIndex].name}" · Sentimen: ${sentEmoji}`);
          }
        } catch (err) {
          console.error('[Supabase Exception]:', err);
          toast(`Aspirasi diterima! Topik: "${TOPICS[nlp.topicIndex].name}"`);
        }
      } else {
        toast(`Aspirasi diterima! Topik: "${TOPICS[nlp.topicIndex].name}" · Sentimen: ${sentEmoji}`);
      }

      // Scroll ke komentar baru dan flash highlight
      setTimeout(() => {
        const firstQuote = $('#quotes li.quote');
        if (firstQuote) {
          firstQuote.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          firstQuote.classList.add('flash');
          setTimeout(() => firstQuote.classList.remove('flash'), 1800);
        }
      }, 100);
    });
  }

  /* ---------------------------------------------------------
     4. RECOMMENDATION PROGRAM
     --------------------------------------------------------- */
  function rankRecos(targetData = D) {
    return RECOS.map(r => {
      const m = dim(r.metric);
      const base = (targetData.topics && targetData.topics[r.t]) || TOPICS[r.t] || { name: '', sent: [0, 0, 0] };
      const t = { ...base, sent: base.sent || [0, 0, 0], w: base.w ?? 15 };
      const tw = t.w || 15;
      const prioScore = need(m, targetData.scores[m.key]) * 0.6 + (t.sent[2] * tw / 100) * 0.4;
      const pr = prioScore >= 25 ? 'Tinggi' : prioScore >= 18 ? 'Sedang' : 'Rendah';
      return { r, prioScore, pr, m, t: { ...t, w: tw } };
    }).sort((a, b) => b.prioScore - a.prioScore);
  }

  function renderReco() {
    const fBox = $('#recoFilter'), rBox = $('#recos');
    if (!fBox || !rBox) return;

    // Safe fallback jika PROFILES / CLUSTERS belum terdefinisi
    const profileList = window.PROFILES || window.CLUSTERS || [
      { short: 'P1 Rentan' },
      { short: 'P2 Moderat' },
      { short: 'P3 Unggul' }
    ];

    const opts = [['all', 'Semua profil'], ...profileList.map((p, i) => [String(i), p.short || `Profil ${i + 1}`])];

    fBox.innerHTML = opts.map(([k, l]) => `
      <button type="button" class="seg__btn" aria-pressed="${state.recoProfile === k}" data-recofilter="${k}">
        ${l}
      </button>`).join('');

    const ranked = rankRecos().filter(x => {
      if (state.recoProfile === 'all') return true;
      return x.r.profiles && x.r.profiles.includes(+state.recoProfile);
    });

    if (!ranked || ranked.length === 0) {
      rBox.innerHTML = `<div class="p-4 text-center text-slate-500">Tidak ada program rekomendasi untuk profil ini.</div>`;
      return;
    }

    rBox.innerHTML = ranked.map(x => {
      const { r, m, t } = x;
      const on = state.plan.has(r.id);
      const targetProfiles = (r.profiles && r.profiles.length)
        ? r.profiles.filter(i => profileList[i]).map(i => profileList[i].short).join(', ')
        : 'Semua Profil';

      return `
        <article class="reco reco--${x.pr.toLowerCase()}">
          <div class="reco__top">
            <span class="prio prio--${x.pr.toLowerCase()}">Prioritas ${x.pr}</span>
            <span class="reco__for">${targetProfiles}</span>
          </div>
          <h4>${r.title}</h4>
          <p>${r.desc}</p>
          <p class="reco__why"><b>Dasar data:</b> ${m ? m.short : 'Indikator'} ${D.scores[m ? m.key : 'wellbeing']} · ${Math.round(t.w)}% komentar membahas ${t.name ? t.name.toLowerCase() : 'topik'} (${t.sent ? t.sent[2] : 0}% negatif)</p>
          <dl class="reco__meta">
            <div><dt>Penanggung jawab</dt><dd>${r.owner}</dd></div>
            <div><dt>Durasi</dt><dd>${r.duration}</dd></div>
            <div><dt>Tingkat usaha</dt><dd>${r.effort}</dd></div>
            <div><dt>Indikator keberhasilan</dt><dd>${r.kpi}</dd></div>
          </dl>
          <button type="button" class="btn ${on ? 'btn--em' : 'btn--outline'} btn--sm" data-plan="${r.id}" aria-pressed="${on}">
            ${on ? '✓ Masuk rencana' : '+ Masukkan ke rencana'}
          </button>
        </article>`;
    }).join('');
    updateTray();
  }

  function updateTray() {
    const tray = $('#tray'), trayCount = $('#trayCount');
    if (!tray || !trayCount) return;
    const n = state.plan.size;
    tray.hidden = n === 0;
    trayCount.textContent = `${n} program dipilih`;
  }

  function planText() {
    const lines = RECOS.filter(r => state.plan.has(r.id)).map((r, i) =>
      `${i + 1}. ${r.title} (${r.owner}, ${r.duration}). Indikator keberhasilan: ${r.kpi}.`);
    return `Rencana Program Dukungan Mahasiswa — ${D.name}\n` + lines.join('\n');
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2400);
  }
  window.nkToast = toast;

  /* ---------------------------------------------------------
     Laporan Rekomendasi Eksekutif Kampus (A4 PDF & Cetak)
     --------------------------------------------------------- */
  function generateRecoReportHtml(selectedIds = null, targetFacKey = null) {
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const activeFac = targetFacKey || state.fac || 'all';
    const currData = compute(activeFac);
    const isSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
    const rankedList = rankRecos(currData);
    const filteredList = isSelection
      ? rankedList.filter(x => selectedIds.includes(x.r.id))
      : rankedList;

    const totalStudents = currData.n || 0;
    const isAllCampus = activeFac === 'all';
    const scopeLabel = isAllCampus
      ? 'Seluruh Kampus PENS (18 Program Studi)'
      : (currData.name.startsWith('Prodi') ? currData.name : `Prodi ${currData.name}`);

    const p1Pct = Number(currData.profile && currData.profile[0] !== undefined ? currData.profile[0] : 0);
    const p2Pct = Number(currData.profile && currData.profile[1] !== undefined ? currData.profile[1] : 0);
    const p3Pct = Number(currData.profile && currData.profile[2] !== undefined ? currData.profile[2] : 0);

    const posPct = Math.round(currData.sentiment ? currData.sentiment[0] : 0);
    const netPct = Math.round(currData.sentiment ? currData.sentiment[1] : 0);
    const negPct = Math.round(currData.sentiment ? currData.sentiment[2] : 0);

    const p1Count = Math.round((p1Pct / 100) * totalStudents);
    const p2Count = Math.round((p2Pct / 100) * totalStudents);
    const p3Count = Math.max(0, totalStudents - p1Count - p2Count);

    const sortedTopics = [...(currData.topics || [])].sort((a, b) => b.w - a.w);

    const avgScore = Math.round(
      (currData.scores.wellbeing + currData.scores.pressure + currData.scores.social + currData.scores.career) / 4
    );
    const compositeStatus = avgScore >= 75 ? 'Sangat Baik' : avgScore >= 65 ? 'Baik' : avgScore >= 55 ? 'Cukup (Perlu Perhatian)' : 'Rentan';

    // 1. Rows Dimensi Pemeriksaan (Tabel 1)
    const dimRows = [
      {
        cat: 'A. ASPEK PSIKOSOSIAL & KESEJAHTERAAN',
        items: [
          {
            name: '1. Kesejahteraan Psikologis (Wellbeing Index)',
            desc: 'Kondisi kesehatan mental, kepuasan hidup, stabilitas emosi, dan ketenangan psikologis mahasiswa selama perkuliahan.',
            val: currData.scores.wellbeing,
            status: currData.scores.wellbeing >= 75 ? 'Sangat Baik' : currData.scores.wellbeing >= 65 ? 'Baik' : currData.scores.wellbeing >= 55 ? 'Cukup' : 'Kurang / Rentan'
          },
          {
            name: '2. Dukungan Sosial & Lingkungan (Social Support)',
            desc: 'Keterikatan relasi positif dengan rekan sebaya, keterbukaan komunikasi dosen wali, dan ketersediaan sistem pendukung kampus.',
            val: currData.scores.social,
            status: currData.scores.social >= 75 ? 'Sangat Baik' : currData.scores.social >= 65 ? 'Baik' : currData.scores.social >= 55 ? 'Cukup' : 'Kurang / Rentan'
          }
        ]
      },
      {
        cat: 'B. ASPEK KETAHANAN AKADEMIK & KESIAPAN KARIER',
        items: [
          {
            name: '3. Ketahanan Akademik (Academic Resilience)',
            desc: 'Kemampuan mengelola stres tugas, praktikum, ujian, manajemen waktu belajar, dan adaptasi terhadap beban kurikulum.',
            val: currData.scores.pressure,
            status: currData.scores.pressure >= 75 ? 'Sangat Baik' : currData.scores.pressure >= 65 ? 'Baik' : currData.scores.pressure >= 55 ? 'Cukup' : 'Kurang / Rentan'
          },
          {
            name: '4. Kesiapan Karier & Magang (Career Readiness)',
            desc: 'Kejelasan orientasi profesi, kematangan portofolio kompetensi vokasi, dan kesiapan mental menghadapi dunia magang/kerja.',
            val: currData.scores.career,
            status: currData.scores.career >= 75 ? 'Sangat Baik' : currData.scores.career >= 65 ? 'Baik' : currData.scores.career >= 55 ? 'Cukup' : 'Kurang / Rentan'
          }
        ]
      }
    ];

    let dimsTableHtml = '';
    dimRows.forEach(g => {
      dimsTableHtml += `
        <tr style="background:#F1F5F9; font-weight:700;">
          <td colspan="4" style="padding:6px 10px; font-size:11px; border:1px solid #000; text-transform:uppercase; letter-spacing:0.5px;">${g.cat}</td>
        </tr>
      `;
      g.items.forEach(it => {
        dimsTableHtml += `
          <tr>
            <td style="padding:8px 10px; border:1px solid #000; font-weight:700; font-size:11.5px; width:30%;">${it.name}</td>
            <td style="padding:8px 10px; border:1px solid #000; font-size:11px; color:#222; width:46%;">${it.desc}</td>
            <td style="padding:8px 10px; border:1px solid #000; text-align:center; font-weight:800; font-size:12px; width:10%;">${it.val}</td>
            <td style="padding:8px 10px; border:1px solid #000; text-align:center; font-weight:600; font-size:11px; width:14%;">${it.status}</td>
          </tr>
        `;
      });
    });

    // 2. Rows Rekomendasi Program (Tabel 4)
    const recosTableHtml = filteredList.map((item, idx) => {
      const { r, m, t, pr } = item;
      const targetProfiles = (r.profiles && r.profiles.length)
        ? r.profiles.filter(i => PROFILES[i]).map(i => PROFILES[i].short).join(', ')
        : 'Semua Profil';
      return `
        <tr>
          <td style="padding:7px 8px; border:1px solid #000; text-align:center; font-weight:700; font-size:11px;">${idx + 1}</td>
          <td style="padding:7px 8px; border:1px solid #000; font-weight:700; font-size:11px; text-align:center;">${pr}</td>
          <td style="padding:7px 8px; border:1px solid #000; font-size:11px;">
            <div style="font-weight:700; font-size:11.5px; margin-bottom:2px;">${r.title}</div>
            <div style="color:#333; line-height:1.4;">${r.desc}</div>
          </td>
          <td style="padding:7px 8px; border:1px solid #000; font-size:11px; text-align:center;">${targetProfiles}</td>
          <td style="padding:7px 8px; border:1px solid #000; font-size:10.5px; color:#222;">
            ${m ? m.short : 'Indikator'}: <b>${currData.scores[m ? m.key : 'wellbeing']}</b><br/>
            Topik: <em>${t.name}</em> (${t.sent ? t.sent[2] : 0}% keluhan)
          </td>
          <td style="padding:7px 8px; border:1px solid #000; font-size:10.5px;">
            <b>${r.owner}</b><br/>
            <span>Durasi: ${r.duration}</span>
          </td>
          <td style="padding:7px 8px; border:1px solid #000; font-size:10.5px;">${r.kpi}</td>
        </tr>
      `;
    }).join('');

    // 3. Rows Topik NLP Aspirasi (Tabel 3)
    const topicsTableHtml = sortedTopics.map((t, idx) => {
      const negRate = t.sent ? t.sent[2] : 0;
      let issueDesc = '';
      if (t.i === 0) issueDesc = 'Penumpukan deadline tugas praktikum, jadwal ujian berdekatan, kelelahan fisik/mental.';
      else if (t.i === 1) issueDesc = 'Ketidakpastian informasi magang industri, persiapan portofolio CV, kecemasan prospek kerja.';
      else if (t.i === 2) issueDesc = 'Beban biaya operasional kuliah, perlengkapan praktikum, transparansi informasi banding UKT.';
      else if (t.i === 3) issueDesc = 'Adaptasi pertemanan mahasiswa rantau, dinamika kerja kelompok, dukungan lingkungan sebaya.';
      else issueDesc = 'Kebutuhan konseling psikologis terstruktur, manajemen stres, dan ruang istirahat yang kondusif.';

      return `
        <tr>
          <td style="padding:6px 8px; border:1px solid #000; text-align:center; font-weight:700; font-size:11px;">${idx + 1}</td>
          <td style="padding:6px 8px; border:1px solid #000; font-weight:700; font-size:11px;">${t.name}</td>
          <td style="padding:6px 8px; border:1px solid #000; text-align:center; font-weight:700; font-size:11px;">${Math.round(t.w)}%</td>
          <td style="padding:6px 8px; border:1px solid #000; text-align:center; font-size:11px;">${negRate}% Negatif</td>
          <td style="padding:6px 8px; border:1px solid #000; font-size:11px; color:#222;">${issueDesc}</td>
        </tr>
      `;
    }).join('');

    return `
      <!-- KOP RESMI LAPORAN PEMERIKSAAN (STANDAR FORMAL PSIKOLOGIS & KAMPUS) -->
      <div style="display:flex; justify-content:flex-start; align-items:center; margin-bottom:14px; border-bottom:2px solid #000; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="img/logo_mark.png" alt="Logo NadiKampus" style="height:44px; width:auto; object-fit:contain;" />
          <div>
            <div style="font-size:13.5px; font-weight:800; color:#000; letter-spacing:0.3px;">POLITEKNIK ELEKTRONIKA NEGERI SURABAYA</div>
            <div style="font-size:11px; font-weight:700; color:#222;">PUSAT ANALITIKA PSIKOSOSIAL &amp; PEMBINAAN KEMAHASISWAAN (NADIKAMPUS)</div>
            <div style="font-size:10px; color:#444;">Jl. Raya ITS, Sukolilo, Surabaya 60111 • Email: nadikampus@pens.ac.id</div>
          </div>
        </div>
      </div>

      <!-- JUDUL LAPORAN RESMI (CENTERED) -->
      <div style="text-align:center; margin:16px 0 20px;">
        <h2 style="font-size:15px; font-weight:800; text-transform:uppercase; margin:0; letter-spacing:0.5px;">
          LAPORAN PEMERIKSAAN KONDISI PSIKOSOSIAL &amp; AKADEMIK MAHASISWA
        </h2>
      </div>

      <!-- TABEL IDENTITAS & METADATA PEMERIKSAAN (4 KOLOM FORMAL TANPA TITIK DUA) -->
      <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px; border:1px solid #000;">
        <tr>
          <td style="width:20%; font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">CAKUPAN DATA</td>
          <td style="width:30%; padding:6px 8px; border:1px solid #000;">${scopeLabel}</td>
          <td style="width:20%; font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">TANGGAL ASESMEN</td>
          <td style="width:30%; padding:6px 8px; border:1px solid #000;">${dateFormatted}</td>
        </tr>
        <tr>
          <td style="font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">PERIODE SURVEI</td>
          <td style="padding:6px 8px; border:1px solid #000;">Semester Genap 2025/2026</td>
          <td style="font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">JUMLAH SAMPEL</td>
          <td style="padding:6px 8px; border:1px solid #000;">${totalStudents} Responden Aktif</td>
        </tr>
        <tr>
          <td style="font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">METODE ASESMEN</td>
          <td style="padding:6px 8px; border:1px solid #000;">LPA-GMM (k=3) &amp; Sentimen Korpus</td>
          <td style="font-weight:700; padding:6px 8px; border:1px solid #000; background:#F8FAFC;">SIFAT DOKUMEN</td>
          <td style="padding:6px 8px; border:1px solid #000;">Dokumen Resmi Internal</td>
        </tr>
      </table>

      <!-- I. RINGKASAN EKSEKUTIF -->
      <div style="margin-bottom:18px;">
        <div style="font-weight:800; font-size:12px; text-transform:uppercase; margin-bottom:6px; border-bottom:1px solid #000; padding-bottom:3px;">
          I. RINGKASAN HASIL ASESMEN
        </div>
        <p style="font-size:11px; line-height:1.6; text-align:justify; margin:0 0 6px;">
          Berdasarkan hasil asesmen empiris, kondisi psikososial mahasiswa secara makro berada pada kategori <b>${compositeStatus}</b> dengan rata-rata komposit <b>${avgScore}/100</b>. Kestabilan relasi sosial mahasiswa terjalin kuat (skor <b>${currData.scores.social}/100</b>), namun teridentifikasi kerentanan signifikan pada ketahanan menghadapi penumpukan tugas akademik (skor <b>${currData.scores.pressure}/100</b>). Sebanyak <b>${p1Pct.toFixed(1)}% mahasiswa (estimasi ~${p1Count} orang)</b> terpetakan ke dalam <b>Profil 1 (Kelompok Rentan)</b> yang membutuhkan intervensi preventif terstruktur dari program studi dan unit kemahasiswaan.
        </p>
      </div>

      <!-- II. TABEL PEMERIKSAAN 4 DIMENSI UTAMA (PERSIS SEPERTI GAMBAR CONTOH REFERENSI) -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:800; font-size:12px; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:3px;">
          II. PEMERIKSAAN INDIKATOR PSIKOSOSIAL &amp; KESIAPAN AKADEMIK (4 DIMENSI)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
          <thead>
            <tr style="background:#E2E8F0; text-align:center;">
              <th style="padding:8px; border:1px solid #000; width:30%; font-weight:800;">ASPEK PENGUKURAN</th>
              <th style="padding:8px; border:1px solid #000; width:46%; font-weight:800;">DESKRIPSI INDIKATOR PENGUKURAN</th>
              <th style="padding:8px; border:1px solid #000; width:10%; font-weight:800;">NILAI</th>
              <th style="padding:8px; border:1px solid #000; width:14%; font-weight:800;">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            ${dimsTableHtml}
            <tr style="background:#E2E8F0; font-weight:800;">
              <td colspan="2" style="padding:7px 10px; border:1px solid #000; text-align:right;">SKOR RATA-RATA KOMPOSIT MAHASISWA :</td>
              <td style="padding:7px 10px; border:1px solid #000; text-align:center; font-size:12px;">${avgScore}</td>
              <td style="padding:7px 10px; border:1px solid #000; text-align:center; font-size:11px;">${compositeStatus}</td>
            </tr>
          </tbody>
        </table>
        <!-- Keterangan Nilai Kotak Sederhana -->
        <div style="border:1px solid #000; padding:6px 10px; font-size:10px; margin-top:6px; background:#FAFAFA;">
          <b>Pedoman Interpretasi Skor:</b> 75 – 100 (Sangat Baik); 65 – 74 (Baik); 55 – 64 (Cukup / Perlu Perhatian); &lt; 55 (Rentan / Perlu Penanganan Segera)
        </div>
      </div>

      <!-- III. TABEL KLASIFIKASI PROFIL MAHASISWA (LPA-GMM k=3) -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:800; font-size:12px; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:3px;">
          III. KLASIFIKASI KELOMPOK MAHASISWA (HASIL LATENT PROFILE ANALYSIS GMM k=3)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
          <thead>
            <tr style="background:#E2E8F0; text-align:center;">
              <th style="padding:8px; border:1px solid #000; width:22%; font-weight:800;">PROFIL MAHASISWA</th>
              <th style="padding:8px; border:1px solid #000; width:12%; font-weight:800;">PROPORSI</th>
              <th style="padding:8px; border:1px solid #000; width:14%; font-weight:800;">ESTIMASI</th>
              <th style="padding:8px; border:1px solid #000; width:26%; font-weight:800;">KARAKTERISTIK INDIKATOR</th>
              <th style="padding:8px; border:1px solid #000; width:26%; font-weight:800;">FOKUS INTERVENSI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px; border:1px solid #000; font-weight:700;">Profil 1: Kelompok Rentan</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center; font-weight:700;">${p1Pct.toFixed(1)}%</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center;">~${p1Count} Mahasiswa</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Skor kesejahteraan &amp; ketahanan akademik rendah (&lt;60). Rentan mengalami burnout dan kelelahan mental.</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Layanan konseling psikologis 48 jam, koordinasi kalender tugas antar dosen, posko advokasi UKT.</td>
            </tr>
            <tr>
              <td style="padding:8px 10px; border:1px solid #000; font-weight:700;">Profil 2: Kelompok Moderat</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center; font-weight:700;">${p2Pct.toFixed(1)}%</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center;">~${p2Count} Mahasiswa</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Kondisi psikososial adaptif (skor 60–80). Mampu mengikuti kuliah namun memerlukan bimbingan karier terarah.</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Klinik penulisan portofolio magang, bimbingan berkala dosen wali, pelatihan manajemen waktu praktikum.</td>
            </tr>
            <tr>
              <td style="padding:8px 10px; border:1px solid #000; font-weight:700;">Profil 3: Kelompok Unggul</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center; font-weight:700;">${p3Pct.toFixed(1)}%</td>
              <td style="padding:8px 10px; border:1px solid #000; text-align:center;">~${p3Count} Mahasiswa</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Resiliensi akademik dan psikososial prima (skor &gt;80). Kesiapan karier dan jejaring pertemanan sangat kuat.</td>
              <td style="padding:8px 10px; border:1px solid #000; font-size:10.5px; line-height:1.4;">Pemberdayaan sebagai asisten praktikum / peer mentor sebaya, bursa kerja magang industri unggulan.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- IV. TABEL ANALISIS ASPIRASI & KELUHAN (NLP STUDENT VOICE) -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:800; font-size:12px; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:3px;">
          IV. ANALISIS TOPIK KELUHAN &amp; SUARA MAHASISWA (NLP STUDENT VOICE)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
          <thead>
            <tr style="background:#E2E8F0; text-align:center;">
              <th style="padding:7px; border:1px solid #000; width:5%; font-weight:800;">NO</th>
              <th style="padding:7px; border:1px solid #000; width:25%; font-weight:800;">TOPIK PERMASALAHAN</th>
              <th style="padding:7px; border:1px solid #000; width:14%; font-weight:800;">BOBOT ISU</th>
              <th style="padding:7px; border:1px solid #000; width:16%; font-weight:800;">SENTIMEN KELUHAN</th>
              <th style="padding:7px; border:1px solid #000; width:40%; font-weight:800;">SUBSTANSI KENDALA YANG DIKELUHKAN</th>
            </tr>
          </thead>
          <tbody>
            ${topicsTableHtml}
          </tbody>
        </table>
      </div>

      <!-- V. TABEL REKOMENDASI TINDAKAN (ACTION PLAN) -->
      <div style="margin-bottom:22px;">
        <div style="font-weight:800; font-size:12px; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:3px;">
          V. REKOMENDASI PROGRAM INTERVENSI BERBASIS DATA (ACTION PLAN)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
          <thead>
            <tr style="background:#E2E8F0; text-align:center;">
              <th style="padding:7px; border:1px solid #000; width:4%; font-weight:800;">NO</th>
              <th style="padding:7px; border:1px solid #000; width:11%; font-weight:800;">PRIORITAS</th>
              <th style="padding:7px; border:1px solid #000; width:25%; font-weight:800;">PROGRAM INTERVENSI</th>
              <th style="padding:7px; border:1px solid #000; width:13%; font-weight:800;">SASARAN</th>
              <th style="padding:7px; border:1px solid #000; width:16%; font-weight:800;">DASAR MASALAH (DATA)</th>
              <th style="padding:7px; border:1px solid #000; width:16%; font-weight:800;">UNIT PIC &amp; DURASI</th>
              <th style="padding:7px; border:1px solid #000; width:15%; font-weight:800;">TARGET INDIKATOR (KPI)</th>
            </tr>
          </thead>
          <tbody>
            ${recosTableHtml}
          </tbody>
        </table>
      </div>

      <!-- TANDA TANGAN PENGESAHAN DOKUMEN RESMI (STANDAR KEDINASAN / AKADEMIK) -->
      <div style="margin-top:24px; display:flex; justify-content:space-between; page-break-inside:avoid; font-size:11px;">
        <div style="width:40%; text-align:center;">
          <div>Mengetahui,</div>
          <div style="font-weight:700;">Koordinator Unit Analitika Data Kemahasiswaan</div>
          <div style="height:55px;"></div>
          <div style="font-weight:800; text-decoration:underline;">Ir. Mohammad Roni, S.Kom., M.Kom.</div>
          <div>NIP. 19820512 200812 1 003</div>
        </div>
        <div style="width:40%; text-align:center;">
          <div>Surabaya, ${dateFormatted}</div>
          <div style="font-weight:700;">Wakil Direktur Bidang Kemahasiswaan</div>
          <div style="height:55px;"></div>
          <div style="font-weight:800; text-decoration:underline;">Dr. Tri Budi Santoso, S.T., M.T.</div>
          <div>NIP. 19710328 199903 1 002</div>
        </div>
      </div>

      <!-- FOOTER NOTE -->
      <div style="margin-top:20px; border-top:1px solid #777; padding-top:4px; font-size:9.5px; color:#555; text-align:center;">
        Dokumen ini diterbitkan secara otomatis oleh Sistem NadiKampus • Politeknik Elektronika Negeri Surabaya • Sah untuk rujukan kebijakan institusional
      </div>
    `;
  }

  function updateModalReport(facKey) {
    const container = $('#recoReportPrintArea');
    const modal = $('#recoReportModal');
    if (container && modal) {
      modal._currentFac = facKey;
      container.innerHTML = generateRecoReportHtml(modal._selectedIds || null, facKey);
    }
  }

  function openRecoReportModal(selectedIds = null, targetFacKey = null) {
    const modal = $('#recoReportModal');
    const container = $('#recoReportPrintArea');
    if (!modal || !container) {
      window.print();
      return;
    }

    const facKey = targetFacKey || state.fac || 'all';
    modal._selectedIds = selectedIds;
    modal._currentFac = facKey;

    // Sinkronisasi opsi dropdown cakupan prodi di dalam modal
    const modalFilter = $('#modalReportProdiFilter');
    if (modalFilter) {
      const prodiSource = window.PRODIS || window.FACULTIES || {};
      if (modalFilter.options.length === 0) {
        modalFilter.innerHTML = `<option value="all">Seluruh Kampus (18 Prodi PENS)</option>` +
          Object.keys(prodiSource).map(k => `<option value="${k}">Prodi ${prodiSource[k].name}</option>`).join('');
        modalFilter.addEventListener('change', e => {
          updateModalReport(e.target.value);
        });
      }
      modalFilter.value = facKey;
    }

    container.innerHTML = generateRecoReportHtml(selectedIds, facKey);
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('drawer-locked');
  }

  function closeRecoReportModal() {
    const modal = $('#recoReportModal');
    if (modal) {
      modal.hidden = true;
      modal.classList.remove('is-open');
      document.body.classList.remove('drawer-locked');
    }
  }

  /* ---------------------------------------------------------
     Navigasi View & Switcher
     --------------------------------------------------------- */
  function setView(v) {
    state.view = v;

    // Update nav items
    $$('.app-nav__item, .tab').forEach(t => {
      const on = t.dataset.view === v;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });

    // Update views
    $$('.view').forEach(el => {
      const on = el.id === 'view-' + v;
      el.hidden = !on;
      el.classList.toggle('is-active', on);
    });

    // Update header
    const info = VIEW_META[v];
    if (info) {
      const h = $('#viewHeading'), sub = $('#viewSubtitle');
      if (h) h.textContent = info.title;
      if (sub) sub.textContent = info.sub;
    }

    // Re-render target view components
    if (v === 'executive') {
      animateRings($('#view-executive'));
      renderTrend();
    }
    if (v === 'profile') {
      renderProfile();
    }
    if (v === 'voice') {
      renderVoice();
    }
    if (v === 'reco') {
      renderReco();
    }

    // Scroll top in app main
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function setFaculty(key, silent) {
    state.fac = key;
    const facSelect = $('#fFaculty');
    if (facSelect) facSelect.value = key;
    D = compute(key);
    const scope = key === 'all' ? 'seluruh kampus' : D.name;
    ['exScope', 'prScope', 'vcScope', 'rcScope'].forEach(id => {
      const el = $('#' + id);
      if (el) el.textContent = scope;
    });

    const sideWb = $('#sideWbScore');
    if (sideWb) sideWb.textContent = D.scores.wellbeing;

    renderKPIs();
    renderTrend();
    renderInsights();
    renderCompare();
    renderProfile();
    renderVoice();
    renderReco();

    if (state.view === 'executive') animateRings($('#view-executive'));
    if (!silent) toast(key === 'all' ? 'Menampilkan seluruh kampus' : `Menampilkan ${D.name}`);
  }

  function runAct(act) {
    if (act.fac) setFaculty(act.fac);
    if (act.recoProfile !== undefined) state.recoProfile = String(act.recoProfile);
    if (act.profile !== undefined) state.profile = act.profile;
    if (act.topic !== undefined) state.topic = act.topic;
    if (act.view) setView(act.view);
  }

  /* ---------------------------------------------------------
     Event Listeners
     --------------------------------------------------------- */
  document.addEventListener('click', e => {
    // Toggle Collapse Sidebar
    const btnToggle = e.target.closest('#btnToggleSidebar');
    if (btnToggle) {
      const sidebar = $('#appSidebar');
      if (sidebar) sidebar.classList.toggle('is-collapsed');
      return;
    }

    // EKG Card interaction
    const ekgCard = e.target.closest('#campusEkgCard');
    if (ekgCard) {
      setView('executive');
      const ins = $('#insight');
      if (ins) {
        ins.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ins.classList.add('flash');
        setTimeout(() => ins.classList.remove('flash'), 1500);
      }
      toast(`Status Kampus: Wellbeing Index ${D.scores.wellbeing}/100`);
      return;
    }

    // Klik Kartu KPI untuk fokus / detail riwayat bulanan
    const kpiCard = e.target.closest('.kpi');
    if (kpiCard && !e.target.closest('button, a')) {
      const k = kpiCard.dataset.kpi;
      if (state.selectedKPI === k) {
        state.selectedKPI = null;
        state.trend = new Set(DIMS.map(m => m.key));
        toast('Menampilkan riwayat seluruh indikator');
      } else {
        state.selectedKPI = k;
        state.trend = new Set([k]);
        const m = dim(k);
        toast(`Fokus indikator: ${m ? m.label : k}`);
      }
      renderKPIs();
      renderTrend();
      return;
    }

    const t = e.target.closest('button, a');
    if (!t) return;

    if (t.dataset.view) {
      e.preventDefault();
      return setView(t.dataset.view);
    }

    const insBtn = e.target.closest('[data-ins]');
    if (insBtn) {
      const ins = makeInsights()[+insBtn.dataset.ins];
      if (ins && ins.act) return runAct(ins.act);
    }

    if (t.dataset.trend) {
      const k = t.dataset.trend;
      if (state.trend.has(k)) {
        if (state.trend.size > 1) state.trend.delete(k);
      } else {
        state.trend.add(k);
      }
      return renderTrend();
    }

    if (t.dataset.cmp) {
      state.cmp = t.dataset.cmp;
      return renderCompare();
    }

    if (t.dataset.fac) {
      return setFaculty(state.fac === t.dataset.fac ? 'all' : t.dataset.fac);
    }

    if (t.dataset.profile) {
      state.profile = +t.dataset.profile;
      return renderProfile();
    }

    if (t.dataset.recoprofile) {
      return runAct({ recoProfile: t.dataset.recoprofile, view: 'reco' });
    }

    if (t.dataset.source) {
      state.source = t.dataset.source;
      return renderVoice();
    }

    if (t.dataset.sent) {
      state.sent = state.sent === t.dataset.sent && t.classList.contains('lg') ? 'all' : t.dataset.sent;
      return renderVoice();
    }

    if (t.dataset.topic) {
      state.topic = t.dataset.topic === 'none' || state.topic === +t.dataset.topic ? null : +t.dataset.topic;
      return renderVoice();
    }

    if (t.dataset.recofilter) {
      state.recoProfile = t.dataset.recofilter;
      return renderReco();
    }

    if (t.dataset.plan) {
      const id = t.dataset.plan;
      state.plan.has(id) ? state.plan.delete(id) : state.plan.add(id);
      return renderReco();
    }

    if (t.id === 'trayClear') {
      state.plan.clear();
      return renderReco();
    }

    // Tombol Cetak / Unduh Dokumen Rekomendasi Resmi
    if (t.id === 'btnPrintReport' || t.closest('#btnPrintReport') || t.id === 'btnDownloadRecoPdf' || t.closest('#btnDownloadRecoPdf')) {
      e.preventDefault();
      openRecoReportModal(null);
    }

    // Unduh Rencana Terpilih Saja (dari Tray)
    if (t.id === 'trayDownloadPdf' || t.closest('#trayDownloadPdf')) {
      e.preventDefault();
      if (state.plan.size === 0) {
        toast('Pilih minimal 1 program sebelum mengunduh rencana');
      } else {
        openRecoReportModal(Array.from(state.plan));
      }
    }

    // Aksi di dalam Modal Pratinjau Dokumen
    if (t.id === 'btnPrintModalContent' || t.closest('#btnPrintModalContent')) {
      e.preventDefault();
      window.print();
    }

    if (t.id === 'btnCloseReportModal' || t.closest('#btnCloseReportModal') || t.id === 'btnCloseReportModalTop' || t.closest('#btnCloseReportModalTop') || t.id === 'recoReportModal') {
      e.preventDefault();
      closeRecoReportModal();
    }
  });

  // Tutup modal dengan tombol Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeRecoReportModal();
    }
  });

  // Navigasi panah pada sidebar
  const navContainer = $('.app-nav') || $('.tabs');
  if (navContainer) {
    navContainer.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const tabs = $$('.app-nav__item, .tab', navContainer);
      const i = tabs.findIndex(t => t.classList.contains('is-active'));
      const n = (i + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + tabs.length) % tabs.length;
      tabs[n].focus();
      setView(tabs[n].dataset.view);
    });
  }

  // Keyboard accessibility for KPI cards
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('kpi')) {
      e.preventDefault();
      e.target.click();
    }
  });

  // Populate Dropdown Program Studi
  const facSel = $('#fFaculty');
  if (facSel) {
    const prodiSource = window.PRODIS || window.FACULTIES || {};
    facSel.innerHTML = `<option value="all">Seluruh Program Studi (Kampus)</option>` +
      Object.keys(prodiSource).map(k => `<option value="${k}">Prodi ${prodiSource[k].name}</option>`).join('');
    facSel.addEventListener('change', e => setFaculty(e.target.value));
  }

  /* ---------------------------------------------------------
     Inisialisasi
     --------------------------------------------------------- */
  initVoiceForm();
  setFaculty('all', true);

  // Check initial hash (e.g. #profile, #voice, #reco, #insight)
  const hash = window.location.hash.replace('#', '');
  if (['executive', 'profile', 'voice', 'reco'].includes(hash)) {
    setView(hash);
  } else {
    setView('executive');
  }

  if (hash === 'insight') {
    setTimeout(() => {
      const insEl = $('#insight');
      if (insEl) insEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  }

  /* ---------------------------------------------------------
     Sinkronisasi Asinkron dengan Live FastAPI Backend & Supabase
     --------------------------------------------------------- */
  async function loadSupabaseVoice() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from('student_voice')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('[Supabase] Gagal memuat suara mahasiswa, menggunakan fallback data.js:', error);
        return;
      }

      // HANYA GANTI DATA JIKA SUPABASE BENAR-BENAR MEMILIKI ISI (DATA > 0)
      if (data && data.length > 0) {
        // Ambil komentar lokal yang bertanda isNew (yang dikirim user saat sesi berlangsung)
        const localNewQuotes = QUOTES.filter(q => q.isNew);

        QUOTES.length = 0; // Kosongkan array lama

        // Masukkan data baru dari Supabase
        data.forEach(d => {
          QUOTES.push({
            t: d.topic_index,
            s: d.sentiment,
            x: d.text,
            isNew: false,
            prodi: d.prodi || 'Anonim',
            sem: d.semester ? String(d.semester) : '',
            time: new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
          });
        });

        // Gabungkan kembali komentar yang baru saja diketik user
        QUOTES.unshift(...localNewQuotes);

        if (state.view === 'voice') renderVoice();
        console.log(`[Supabase] Berhasil memuat ${data.length} suara mahasiswa dari database cloud.`);
      } else {
        console.log('[Supabase] Tabel student_voice di cloud masih kosong. Menggunakan data fallback lokal dari data.js.');
      }
    } catch (err) {
      console.warn('[Supabase] Error fetch, menggunakan data lokal:', err);
    }
  }

  function initSupabaseRealtime() {
    if (!supabaseClient) return;
    try {
      supabaseClient
        .channel('student_voice_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_voice' }, payload => {
          const d = payload.new;
          if (d && !QUOTES.some(q => q.x === d.text)) {
            QUOTES.unshift({
              t: d.topic_index,
              s: d.sentiment,
              x: d.text,
              isNew: true,
              prodi: d.prodi || 'Anonim',
              sem: d.semester ? String(d.semester) : '',
              time: 'Baru saja'
            });
            if (state.view === 'voice') {
              renderVoice();
              toast('Ada aspirasi mahasiswa baru masuk secara real-time!');
            }
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[Supabase] Realtime error:', err);
    }
  }

  async function syncWithLiveAPI() {
    try {
      const res = await fetch('/api/v1/respondents');
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        const totalN = json.data.length;
        console.log(`[NadiKampus Live API] Terhubung ke Backend: ${totalN} responden aktif (${json.source}).`);

        // 1. Perbarui titik-titik koordinat scatter plot 2D
        window.CLUSTER_POINTS = json.data.map(r => ({
          id: r.id,
          cluster: (r.profile || 1) - 1,
          x: r.pca_x,
          y: r.pca_y,
          prodi: r.prodi,
          wb: Math.round((r.scores?.wellbeing || 0) * 20),
          acd: Math.round((r.scores?.academic || 0) * 20),
          soc: Math.round((r.scores?.social || 0) * 20),
          car: Math.round((r.scores?.career || 0) * 20)
        }));

        // 2. Hitung ulang sebaran 3 profil secara dinamis
        const pCounts = { 1: 0, 2: 0, 3: 0 };
        json.data.forEach(r => {
          const p = r.profile || 1;
          pCounts[p] = (pCounts[p] || 0) + 1;
        });

        if (window.CLUSTERS && window.CLUSTERS.length === 3) {
          window.CLUSTERS.forEach((c, idx) => {
            const pid = c.cluster || (idx + 1);
            const cnt = pCounts[pid] || 0;
            c.count = cnt;
            c.pct = totalN > 0 ? Number(((cnt / totalN) * 100).toFixed(1)) : 0;
          });
        }

        // 3. Perbarui seluruh label angka responden di dashboard
        const liveIndicator = $('.ekg-state');
        if (liveIndicator) {
          const srcLbl = json.source === 'google_sheet_appscript' ? 'GSheets Live' : 'Database Live';
          liveIndicator.innerHTML = `Status: <b style="color: #0D9488;">${srcLbl}</b>`;
        }
        const liveCount = $('.ekg-n');
        if (liveCount) {
          liveCount.textContent = `${totalN} Responden`;
        }
        const lpaTotalEl = $('#lpaTotalN');
        if (lpaTotalEl) {
          lpaTotalEl.textContent = `${totalN} Responden`;
        }
        const scatterBadgeEl = $('#scatterTotalBadge');
        if (scatterBadgeEl) {
          scatterBadgeEl.textContent = `${totalN} Data Riil Mahasiswa`;
        }
        const sentTotalEl = $('#sentTotalN');
        if (sentTotalEl) {
          sentTotalEl.textContent = `${totalN}`;
        }

        // 4. Update data total kampus
        D.n = totalN;

        // 5. Render ulang view aktif agar visualisasi langsung menyegarkan diri
        if (state.view === 'profile') renderProfile();
        else if (state.view === 'executive') renderKPIs();
      }
    } catch (e) {
      // Offline / Static File mode: data.js bekerja sebagai fallback provider tanpa error
    }
  }

  window.addEventListener('nk_theme_change', () => {
    if (state.view === 'profile') renderProfile();
    else if (state.view === 'voice') renderVoice();
    else if (state.view === 'trend') renderTrend();
    else if (state.view === 'overview') renderOverview();
  });

  loadSupabaseVoice();
  initSupabaseRealtime();
  syncWithLiveAPI();

  // Sinkronisasi otomatis setiap 60 detik jika halaman terbuka
  setInterval(syncWithLiveAPI, 60000);
})();
