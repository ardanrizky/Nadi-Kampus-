/* =========================================================
   NadiKampus — Logika Dashboard Analytics
   ========================================================= */
(() => {
  const $  = (s, r = document) => r.querySelector(s);
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
    const donutEl = $('#donut'), legendEl = $('#sentLegend');
    if (donutEl && legendEl) {
      const parts = [
        { key: 'pos', label: 'Positif', value: D.sentiment[0], color: '#059669' },
        { key: 'neu', label: 'Netral',  value: D.sentiment[1], color: '#7E92A2' },
        { key: 'neg', label: 'Negatif', value: D.sentiment[2], color: '#E0664A' }
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
          <b>${Math.round(p.value)}%</b>
        </button>`).join('');

      // Sinkronisasi angka kartu ringkasan sentimen
      const totalNEl = $('#sentTotalN');
      const negValEl = $('#sentNegVal');
      const posNeuValEl = $('#sentPosNeuVal');
      if (totalNEl) totalNEl.textContent = D.n || 149;
      if (negValEl) negValEl.textContent = `${Math.round(D.sentiment[2])}%`;
      if (posNeuValEl) posNeuValEl.textContent = `${Math.round(D.sentiment[0] + D.sentiment[1])}%`;
    }

    const topicsBox = $('#topics');
    if (topicsBox) {
      topicsBox.innerHTML = D.topics.map(t => {
        const sel = state.topic === t.i;
        return `
          <button type="button" class="topic ${sel ? 'is-sel' : ''}" data-topic="${t.i}">
            <div class="topic__row">
              <span class="topic__name">${t.name}</span>
              <b>${Math.round(t.w)}%</b>
            </div>
            <div class="topic__track">
              <i style="width:${t.sent[0]}%;background:#059669"></i>
              <i style="width:${t.sent[1]}%;background:#B6C2CE"></i>
              <i style="width:${t.sent[2]}%;background:#E0664A"></i>
            </div>
          </button>`;
      }).join('') + `
        <div class="topics__legend">
          <i style="background:#059669"></i> Positif
          <i style="background:#B6C2CE"></i> Netral
          <i style="background:#E0664A"></i> Negatif
        </div>`;
    }

    // Filter sentimen komentar
    const sentFilter = $('#sentFilter');
    if (sentFilter) {
      sentFilter.innerHTML = [
        ['all', 'Semua'],
        ['pos', 'Positif'],
        ['neu', 'Netral'],
        ['neg', 'Negatif']
      ].map(([k, l]) => `
        <button type="button" class="seg__btn" aria-pressed="${state.sent === k}" data-sent="${k}">
          ${l}
        </button>`).join('');
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
        return true;
      });
      if (filtered.length === 0) {
        qList.innerHTML = `<li class="empty">Tidak ada komentar untuk kombinasi filter ini.</li>`;
      } else {
        qList.innerHTML = filtered.map(q => `
          <li class="quote ${q.isNew ? 'quote--new' : ''}">
            ${q.isNew ? `<span class="quote__new-tag">✨ Curhat Baru (Anonim${q.prodi ? ' · ' + q.prodi : ''}${q.sem ? ' · Sem ' + q.sem : ''})</span>` : ''}
            <p>“${q.x}”</p>
            <div class="quote__meta">
              <span class="quote__topic">${TOPICS[q.t].name}</span>
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
      ['tugas','deadline','ujian','praktikum','tubes','kuliah','jadwal','kelas','materi','begadang','dosen','wali','bimbingan','skripsi','revisi','feedback','wifi','fasilitas','ruang','lab','gedung','perpustakaan','toilet','parkir','parkiran','server','lemot','antrean','kantin','layanan'],
      ['magang','karier','cv','kerja','portofolio','interview','loker','alumni','industri','profesi','masa depan'],
      ['ukt','biaya','uang','finansial','bayar','kos','makan','beasiswa','keringanan','mahal','spp','ekonomi'],
      ['teman','sendirian','kesepian','sosial','rantau','asrama','isolasi','berteman','ngobrol','relasi','asing','ukm','organisasi','kegiatan','bem','hima','lomba','acara','komunitas','kepanitiaan'],
      ['stres','stress','cemas','tidur','istirahat','lelah','capek','overthinking','konseling','psikolog','dukungan','semangat','tenang','burnout']
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
      const pr = prioScore >= 45 ? 'Tinggi' : prioScore >= 30 ? 'Sedang' : 'Rendah';
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

    const opts = [['all', 'Semua profil'], ...profileList.map((p, i) => [String(i), p.short || `Profil ${i+1}`])];
    
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
      const targetProfiles = r.profiles 
        ? r.profiles.map(i => (profileList[i] ? profileList[i].short : `P${i+1}`)).join(', ')
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
    const prodiSource = window.PRODIS || window.FACULTIES || {};
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

    // Estimasi jumlah mahasiswa
    const p1Count = Math.round((p1Pct / 100) * totalStudents);
    const p2Count = Math.round((p2Pct / 100) * totalStudents);
    const p3Count = Math.max(0, totalStudents - p1Count - p2Count);

    // Top 3 keluhan teratas berdasarkan bobot
    const sortedTopics = [...(currData.topics || [])].sort((a, b) => b.w - a.w);

    // Rekomendasi Rows
    const rowsHtml = filteredList.map((item, idx) => {
      const { r, m, t, pr } = item;
      const targetProfiles = r.profiles ? r.profiles.map(i => PROFILES[i] ? PROFILES[i].short : `P${i + 1}`).join(', ') : 'Semua Profil';
      const prioClass = pr === 'Tinggi' ? 'prio-tinggi' : pr === 'Sedang' ? 'prio-sedang' : 'prio-rendah';

      return `
        <tr>
          <td style="text-align:center; font-weight:700; color:#000;">${idx + 1}</td>
          <td style="font-weight:600; font-size:11.5px; color:#0F172A; white-space:nowrap;">
            <span class="doc-badge-pill ${prioClass}">Prioritas ${pr}</span>
          </td>
          <td>
            <strong style="color:#000000; display:block; margin-bottom:3px; font-size:12.5px; font-weight:700;">${r.title}</strong>
            <span style="color:#334155; font-size:11.5px; line-height:1.45; display:block;">${r.desc}</span>
          </td>
          <td><span style="font-weight:700; color:#000000; font-size:11.5px;">${targetProfiles}</span></td>
          <td style="font-size:11.5px; color:#334155;">
            ${m ? m.short : 'Metrik'}: <b>${currData.scores[m ? m.key : 'wellbeing']}</b><br/>
            Topik: <em>${t.name}</em> (${t.sent ? t.sent[2] : 0}% negatif)
          </td>
          <td style="font-size:11.5px; color:#1E293B;">
            <b>${r.owner}</b><br/>
            <span style="color:#475569; font-size:10.5px;">Durasi: ${r.duration} • Usaha: ${r.effort}</span>
          </td>
          <td style="color:#000000; font-weight:600; font-size:11.5px;">${r.kpi}</td>
        </tr>
      `;
    }).join('');

    // Dimensi Rows dengan Visual Meter Bar
    const dimsHtml = DIMS.map(m => {
      const val = currData.scores[m.key];
      const lvl = level(m, val);
      const campAvg = ALL.scores[m.key];
      const diff = val - campAvg;
      const diffHtml = isAllCampus ? '' : `
        <td style="text-align:center; font-size:11.5px; font-weight:700; color:${diff >= 0 ? '#0D9488' : '#E11D48'};">
          ${diff > 0 ? '+' + diff : diff} poin ${diff > 0 ? '▲' : diff < 0 ? '▼' : '='}
        </td>
      `;

      let meterColor = '#0D9488';
      if (val < 60) meterColor = '#E11D48';
      else if (val < 70) meterColor = '#D97706';

      let interp = '';
      if (m.key === 'wellbeing') {
        interp = val >= 70 ? 'Suasana emosi dan kesehatan mental mahasiswa tergolong kondusif.' : 'Sebagian mahasiswa mengalami kelelahan mental, perlu ruang konseling yang terbuka.';
      } else if (m.key === 'pressure') {
        interp = val >= 70 ? 'Daya tahan mahasiswa menghadapi tugas perkuliahan tergolong kuat.' : 'Mahasiswa merasa terbebani oleh deadline tugas praktikum dan jadwal ujian yang bertumpuk.';
      } else if (m.key === 'social') {
        interp = val >= 75 ? 'Hubungan pertemanan sebaya dan komunikasi dengan dosen pembimbing terjalin sangat erat.' : 'Sebagian responden merasa kurang terhubung dengan komunitas kampus.';
      } else {
        interp = val >= 70 ? 'Aspirasi dan portofolio persiapan magang industri sudah mulai terbangun.' : 'Tingginya kecemasan terhadap ketersediaan lowongan magang dan prospek kerja setelah lulus.';
      }

      return `
        <tr>
          <td>
            <strong style="color:#000; font-size:12px;">${m.label}</strong>
            <div style="color:#475569; font-size:11px; margin-top:2px;">${m.about}</div>
          </td>
          <td style="width:18%; vertical-align:middle;">
            <div style="display:flex; justify-content:space-between; font-weight:800; font-size:13px; color:#0F172A;">
              <span>${val}/100</span>
              <span style="font-size:10.5px; font-weight:600; color:#475569;">${lvl.t}</span>
            </div>
            <div class="doc-meter-bg">
              <div class="doc-meter-fill" style="width:${Math.min(100, Math.max(0, val))}%; background:${meterColor};"></div>
            </div>
          </td>
          <td><span class="doc-status-badge doc-status--${lvl.c}">${lvl.t}</span></td>
          ${diffHtml}
          <td style="font-size:11.5px; color:#1E293B; line-height:1.45;">${interp}</td>
        </tr>
      `;
    }).join('');

    // Topik NLP Rows
    const topicsHtml = sortedTopics.map((t, idx) => {
      const m = dim(t.metric);
      const negRate = t.sent ? t.sent[2] : 0;
      const kw = (t.keywords || []).slice(0, 4).join(', ');
      return `
        <tr>
          <td style="text-align:center; font-weight:700; color:#000;">${idx + 1}</td>
          <td>
            <strong style="color:#000000; font-size:12px;">${t.name}</strong>
          </td>
          <td style="text-align:center; font-weight:700; color:#0F172A;">${t.w}%</td>
          <td style="text-align:center; font-weight:700; color:${negRate >= 60 ? '#E11D48' : '#D97706'};">${negRate}% Negatif</td>
          <td style="font-size:11.5px; color:#334155;">${m ? m.short : '-'}</td>
          <td style="font-size:11px; color:#475569; font-style:italic;">${kw}</td>
        </tr>
      `;
    }).join('');

    // Bagian Distribusi Prodi
    let prodiSectionHtml = '';
    if (isAllCampus) {
      const prodiEntries = Object.entries(prodiSource).map(([k, f]) => ({
        k,
        name: f.name,
        n: f.n,
        wb: f.wellbeing,
        pr: f.pressure,
        cr: f.career,
        sc: f.social,
        vulPct: (f.profile && f.profile[0] !== undefined) ? f.profile[0] : 0
      })).sort((a, b) => b.vulPct - a.vulPct);

      // Top 3 paling rentan dan Top 3 paling kondusif
      const topVulnerable = prodiEntries.slice(0, 3);
      const topStable = [...prodiEntries].sort((a, b) => b.wb - a.wb).slice(0, 3);

      const prodiRowsHtml = prodiEntries.map((p, idx) => `
        <tr>
          <td style="text-align:center; font-weight:700; color:#000;">${idx + 1}</td>
          <td style="font-weight:600; color:#0F172A; font-size:12px;">${p.name}</td>
          <td style="text-align:center; font-weight:700;">${p.n}</td>
          <td style="text-align:center; font-weight:600; color:${p.wb >= 65 ? '#0D9488' : '#E11D48'};">${p.wb}</td>
          <td style="text-align:center; font-weight:600; color:${p.pr >= 65 ? '#0D9488' : '#E11D48'};">${p.pr}</td>
          <td style="text-align:center; font-weight:600;">${p.cr}</td>
          <td style="text-align:center; font-weight:800; color:${p.vulPct >= 45 ? '#E11D48' : '#0F172A'};">
            ${p.vulPct}%
          </td>
        </tr>
      `).join('');

      prodiSectionHtml = `
        <div class="doc-section">
          <h4 class="doc-section-title">4. Pemetaan Program Studi di Kampus PENS</h4>
          
          <!-- Highlight 2 Kotak Cepat: Siapa yang butuh bantuan vs Siapa yang stabil -->
          <div class="doc-highlight-grid">
            <div class="doc-hl-card doc-hl-card--warn">
              <div class="doc-hl-card__title" style="color:#B45309;">
                <span>⚠️ 3 Program Studi Perlu Pendampingan Khusus</span>
              </div>
              <ul class="doc-hl-card__list">
                ${topVulnerable.map(x => `<li><b>${x.name}</b> (${x.vulPct}% mahasiswa rentan, skor tugas: ${x.pr}/100)</li>`).join('')}
              </ul>
            </div>
            <div class="doc-hl-card doc-hl-card--good">
              <div class="doc-hl-card__title" style="color:#15803D;">
                <span>✅ 3 Program Studi Paling Kondusif &amp; Sejahtera</span>
              </div>
              <ul class="doc-hl-card__list">
                ${topStable.map(x => `<li><b>${x.name}</b> (Kesejahteraan: ${x.wb}/100, Dukungan sosial: ${x.sc}/100)</li>`).join('')}
              </ul>
            </div>
          </div>

          <p class="doc-section-p" style="margin-top:12px;">
            Berikut tabel rincian lengkap 18 program studi se-PENS (diurutkan dari konsentrasi kelompok rentan tertinggi):
          </p>
          <div class="doc-table-wrapper">
            <table class="doc-table">
              <thead>
                <tr>
                  <th style="width:4%; text-align:center;">No</th>
                  <th style="width:34%;">Program Studi</th>
                  <th style="width:10%; text-align:center;">Responden</th>
                  <th style="width:13%; text-align:center;">Wellbeing</th>
                  <th style="width:13%; text-align:center;">Ketahanan</th>
                  <th style="width:12%; text-align:center;">Karier</th>
                  <th style="width:14%; text-align:center;">% Rentan (P1)</th>
                </tr>
              </thead>
              <tbody>
                ${prodiRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      const campAvgWb = ALL.scores.wellbeing;
      const campAvgPr = ALL.scores.pressure;
      const campAvgCr = ALL.scores.career;
      const campAvgSc = ALL.scores.social;

      prodiSectionHtml = `
        <div class="doc-section">
          <h4 class="doc-section-title">4. Komparasi Kondisi Prodi Terhadap Rata-Rata Kampus</h4>
          <p class="doc-section-p">
            Berikut posisi pencapaian <b>${scopeLabel}</b> (N = ${totalStudents} responden) jika dibandingkan dengan nilai rata-rata 18 prodi di lingkungan PENS:
          </p>
          <div class="doc-table-wrapper">
            <table class="doc-table">
              <thead>
                <tr>
                  <th style="width:28%;">Indikator Analisis</th>
                  <th style="width:20%; text-align:center;">Skor Prodi Ini</th>
                  <th style="width:22%; text-align:center;">Rata-rata Kampus</th>
                  <th style="width:30%;">Analisis Komparatif</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Kesejahteraan Mental (Wellbeing)</b></td>
                  <td style="text-align:center; font-weight:800; font-size:13px;">${currData.scores.wellbeing}</td>
                  <td style="text-align:center; font-weight:600;">${campAvgWb}</td>
                  <td style="font-size:11.5px; color:${currData.scores.wellbeing >= campAvgWb ? '#0D9488' : '#E11D48'};">
                    ${currData.scores.wellbeing >= campAvgWb ? `+${currData.scores.wellbeing - campAvgWb} poin di atas rata-rata kampus (Kondusif)` : `${currData.scores.wellbeing - campAvgWb} poin di bawah rata-rata kampus (Perlu Perhatian)`}
                  </td>
                </tr>
                <tr>
                  <td><b>Ketahanan Akademik (Resilience)</b></td>
                  <td style="text-align:center; font-weight:800; font-size:13px;">${currData.scores.pressure}</td>
                  <td style="text-align:center; font-weight:600;">${campAvgPr}</td>
                  <td style="font-size:11.5px; color:${currData.scores.pressure >= campAvgPr ? '#0D9488' : '#E11D48'};">
                    ${currData.scores.pressure >= campAvgPr ? `+${currData.scores.pressure - campAvgPr} poin di atas rata-rata kampus` : `${currData.scores.pressure - campAvgPr} poin di bawah rata-rata kampus`}
                  </td>
                </tr>
                <tr>
                  <td><b>Dukungan Sosial (Support)</b></td>
                  <td style="text-align:center; font-weight:800; font-size:13px;">${currData.scores.social}</td>
                  <td style="text-align:center; font-weight:600;">${campAvgSc}</td>
                  <td style="font-size:11.5px; color:${currData.scores.social >= campAvgSc ? '#0D9488' : '#E11D48'};">
                    ${currData.scores.social >= campAvgSc ? `+${currData.scores.social - campAvgSc} poin di atas rata-rata kampus` : `${currData.scores.social - campAvgSc} poin di bawah rata-rata kampus`}
                  </td>
                </tr>
                <tr>
                  <td><b>Kesiapan Karier &amp; Magang</b></td>
                  <td style="text-align:center; font-weight:800; font-size:13px;">${currData.scores.career}</td>
                  <td style="text-align:center; font-weight:600;">${campAvgCr}</td>
                  <td style="font-size:11.5px; color:${currData.scores.career >= campAvgCr ? '#0D9488' : '#E11D48'};">
                    ${currData.scores.career >= campAvgCr ? `+${currData.scores.career - campAvgCr} poin di atas rata-rata kampus` : `${currData.scores.career - campAvgCr} poin di bawah rata-rata kampus`}
                  </td>
                </tr>
                <tr>
                  <td><b>Persentase Mahasiswa Rentan (Profil 1)</b></td>
                  <td style="text-align:center; font-weight:800; font-size:13px; color:#E11D48;">${p1Pct.toFixed(1)}%</td>
                  <td style="text-align:center; font-weight:600;">${ALL.profile[0].toFixed(1)}%</td>
                  <td style="font-size:11.5px;">
                    ${p1Pct > ALL.profile[0] ? 'Konsentrasi kerentanan lebih tinggi dari rata-rata kampus, memerlukan supervisi dosen wali ekstra.' : 'Lebih rendah dari rata-rata kampus, iklim adaptasi tergolong kondusif.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <!-- HEADER LAPORAN EKSEKUTIF RESMI PENS -->
      <div class="doc-header">
        <div class="doc-header__left">
          <img src="img/logo_mark.png" alt="Logo NadiKampus" class="doc-header__logo" />
          <div class="doc-header__title">
            <h2>POLITEKNIK ELEKTRONIKA NEGERI SURABAYA</h2>
            <h3>UNIT ANALITIKA DATA KEMAHASISWAAN (NADIKAMPUS)</h3>
            <p>LAPORAN ANALITIKA KESEHATAN MENTAL &amp; KESIAPAN AKADEMIK MAHASISWA</p>
          </div>
        </div>
        <div class="doc-header__meta">
          <div>Periode: <b>Semester Genap 2025/2026</b></div>
          <div>Tanggal Rilis: <b>${dateFormatted}</b></div>
          <div>Cakupan Data: <b>${scopeLabel}</b></div>
          <div>Metode: <b>LPA-GMM (k=3) &amp; NLP Sentimen</b></div>
        </div>
      </div>

      <!-- KOTAK INTISARI UTAMA (QUICK TAKEAWAY UNTUK ORANG AWAM) -->
      <div class="doc-takeaway-box">
        <div class="doc-takeaway-box__head">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Intisari Laporan (Kesimpulan Cepat Eksekutif)</span>
        </div>
        <p class="doc-takeaway-box__desc">
          Secara keseluruhan, iklim solidaritas sosial mahasiswa PENS terjalin sangat baik (skor <b>${currData.scores.social}/100</b>). Namun, evaluasi mendeteksi <b>${p1Pct.toFixed(1)}% mahasiswa (estimasi ~${p1Count} orang)</b> berada dalam <b>Kelompok Rentan (Profil 1)</b> karena mengalami kelelahan mental akibat penumpukan tugas praktikum dan jadwal evaluasi yang berdekatan.
        </p>
        <ul class="doc-takeaway-box__points">
          <li><b>Isu Paling Banyak Dikeluhkan:</b> Penumpukan deadline tugas &amp; ujian (${negPct}% keluhan mahasiswa bernada negatif).</li>
          <li><b>Kebutuhan Utama:</b> Harmonisasi kalender tugas antar dosen, bimbingan dosen wali yang proaktif, dan klinik persiapan magang/karier.</li>
          <li><b>Kekuatan Mahasiswa:</b> Dukungan teman sebaya dan komunikasi dengan pembimbing berjalan optimal.</li>
        </ul>
      </div>

      <!-- RINGKASAN METRIK KUNCI -->
      <div class="doc-exec-grid doc-exec-grid--4">
        <div class="doc-exec-card">
          <div class="doc-exec-card__num">${totalStudents} Mhs</div>
          <div class="doc-exec-card__lbl">Sampel Responden</div>
        </div>
        <div class="doc-exec-card">
          <div class="doc-exec-card__num" style="color:#E11D48 !important;">${p1Pct.toFixed(1)}%</div>
          <div class="doc-exec-card__lbl">Kelompok Rentan (Profil 1)</div>
        </div>
        <div class="doc-exec-card">
          <div class="doc-exec-card__num" style="color:#0D9488 !important;">${currData.scores.wellbeing}/100</div>
          <div class="doc-exec-card__lbl">Kesejahteraan Mental</div>
        </div>
        <div class="doc-exec-card">
          <div class="doc-exec-card__num" style="color:#4F46E5 !important;">${currData.scores.pressure}/100</div>
          <div class="doc-exec-card__lbl">Ketahanan Perkuliahan</div>
        </div>
      </div>

      <!-- 1. PETA 3 KELOMPOK MAHASISWA -->
      <div class="doc-section">
        <h4 class="doc-section-title">1. Bagaimana Kondisi Mahasiswa Kita? (3 Profil Mahasiswa)</h4>
        <p class="doc-section-p">
          Berdasarkan pola adaptasi dan data survei, seluruh mahasiswa terbagi ke dalam 3 kelompok profil:
        </p>

        <!-- Visual Bar Proporsi Berwarna -->
        <div class="doc-ratio-bar">
          <div class="doc-ratio-bar__seg--p1" style="width:${p1Pct}%;" title="Kelompok Rentan">${p1Pct.toFixed(1)}% Rentan</div>
          <div class="doc-ratio-bar__seg--p2" style="width:${p2Pct}%;" title="Kelompok Moderat">${p2Pct.toFixed(1)}% Moderat</div>
          <div class="doc-ratio-bar__seg--p3" style="width:${p3Pct}%;" title="Kelompok Unggul">${p3Pct.toFixed(1)}% Unggul</div>
        </div>

        <!-- 3 Kartu Profil Ramah Awam -->
        <div class="doc-profile-cards">
          <div class="doc-pcard doc-pcard--p1">
            <div class="doc-pcard__title" style="color:#E11D48;">🔴 Profil 1: Kelompok Rentan</div>
            <div class="doc-pcard__pct" style="color:#E11D48;">${p1Pct.toFixed(1)}% <span style="font-size:12px; font-weight:600; color:#475569;">(~${p1Count} mhs)</span></div>
            <p class="doc-pcard__desc">
              <b>Karakteristik:</b> Beban mental paling berat (skor 56/100) dan gampang stres menghadapi ritme perkuliahan.<br/>
              <b>Bantuan Prioritas:</b> Pendampingan rutin dosen wali, konseling psikologis, dan penjadwalan tugas yang manusiawi.
            </p>
          </div>
          <div class="doc-pcard doc-pcard--p2">
            <div class="doc-pcard__title" style="color:#4F46E5;">🟣 Profil 2: Kelompok Moderat</div>
            <div class="doc-pcard__pct" style="color:#4F46E5;">${p2Pct.toFixed(1)}% <span style="font-size:12px; font-weight:600; color:#475569;">(~${p2Count} mhs)</span></div>
            <p class="doc-pcard__desc">
              <b>Karakteristik:</b> Kondisi stabil (skor 75/100) dan mampu mengelola kuliah dengan teratur.<br/>
              <b>Bantuan Prioritas:</b> Klinik persiapan portofolio magang, pelatihan sertifikasi, dan manajemen waktu.
            </p>
          </div>
          <div class="doc-pcard doc-pcard--p3">
            <div class="doc-pcard__title" style="color:#0D9488;">🟢 Profil 3: Kelompok Unggul</div>
            <div class="doc-pcard__pct" style="color:#0D9488;">${p3Pct.toFixed(1)}% <span style="font-size:12px; font-weight:600; color:#475569;">(~${p3Count} mhs)</span></div>
            <p class="doc-pcard__desc">
              <b>Karakteristik:</b> Daya tahan akademik prima (skor 92/100), relasi sosial optimal, dan sangat siap kerja.<br/>
              <b>Pemberdayaan:</b> Dijadikan duta kampus / <i>peer mentor</i> untuk mendampingi mahasiswa lain.
            </p>
          </div>
        </div>
      </div>

      <!-- 2. EVALUASI 4 PILAR KESEJAHTERAAN -->
      <div class="doc-section">
        <h4 class="doc-section-title">2. Evaluasi 4 Dimensi Kunci Kesejahteraan Mahasiswa</h4>
        <div class="doc-table-wrapper">
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width:28%;">Pilar Pengukuran</th>
                <th style="width:18%;">Skor &amp; Tingkat</th>
                <th style="width:14%;">Status</th>
                ${isAllCampus ? '' : '<th style="width:15%; text-align:center;">vs Rata-rata Kampus</th>'}
                <th>Interpretasi Kondisi Lapangan</th>
              </tr>
            </thead>
            <tbody>
              ${dimsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. SUARA MAHASISWA & KELUHAN TERBANYAK -->
      <div class="doc-section">
        <h4 class="doc-section-title">3. Apa Saja yang Dikeluhkan Mahasiswa? (Analisis Suara NLP)</h4>
        <p class="doc-section-p">
          Dari seluruh aspirasi dan feedback terbuka mahasiswa, sentimen terbagi: 
          <b>Positif: ${posPct}%</b> • 
          <b>Netral: ${netPct}%</b> • 
          <b style="color:#E11D48;">Keluhan/Negatif: ${negPct}%</b>.
        </p>

        <!-- 3 Isu Terbanyak Card Highlight -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px;">
          <div style="background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; font-weight:800; color:#E11D48; text-transform:uppercase;">1. Isu Paling Kritis</div>
            <div style="font-weight:700; font-size:12px; color:#0F172A; margin:3px 0;">${sortedTopics[0]?.name || 'Beban Tugas & Ujian'}</div>
            <div style="font-size:11px; color:#475569; line-height:1.4;">Keluhan negatif: <b>${sortedTopics[0]?.sent ? sortedTopics[0].sent[2] : 75}%</b>.<br/>Fokus: Deadline menumpuk bersamaan, kurang tidur, dan revisi berulang.</div>
          </div>
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; font-weight:800; color:#D97706; text-transform:uppercase;">2. Isu Karier</div>
            <div style="font-weight:700; font-size:12px; color:#0F172A; margin:3px 0;">${sortedTopics[1]?.name || 'Kecemasan Magang & Karier'}</div>
            <div style="font-size:11px; color:#475569; line-height:1.4;">Keluhan negatif: <b>${sortedTopics[1]?.sent ? sortedTopics[1].sent[2] : 64}%</b>.<br/>Fokus: Bingung menyusun portofolio magang dan kekhawatiran prospek kerja.</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">3. Finansial &amp; Fasilitas</div>
            <div style="font-weight:700; font-size:12px; color:#0F172A; margin:3px 0;">${sortedTopics[2]?.name || 'Biaya Kuliah & Keuangan'}</div>
            <div style="font-size:11px; color:#475569; line-height:1.4;">Keluhan negatif: <b>${sortedTopics[2]?.sent ? sortedTopics[2].sent[2] : 70}%</b>.<br/>Fokus: Beban biaya alat praktikum, uang kos, dan skema keringanan UKT.</div>
          </div>
        </div>

        <div class="doc-table-wrapper">
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width:4%; text-align:center;">No</th>
                <th style="width:26%;">Topik Aspirasi</th>
                <th style="width:13%; text-align:center;">Bobot Bahasan</th>
                <th style="width:17%; text-align:center;">Sentimen Negatif</th>
                <th style="width:16%;">Dimensi Terdampak</th>
                <th>Kata Kunci Dominan Responden</th>
              </tr>
            </thead>
            <tbody>
              ${topicsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. PEMETAAN PROGRAM STUDI -->
      ${prodiSectionHtml}

      <!-- 5. LANGKAH NYATA YANG HARUS DILAKUKAN (ACTION PLAN) -->
      <div class="doc-section">
        <h4 class="doc-section-title">${isSelection ? '5. Rencana Program Intervensi Terpilih (Action Plan)' : '5. Langkah Nyata &amp; Rekomendasi Program Berbasis Data'}</h4>
        <p class="doc-section-p">
          Berikut tindakan konkret yang diprioritaskan untuk segera dilaksanakan unit jurusan dan kemahasiswaan:
        </p>
        <div class="doc-table-wrapper">
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width:4%; text-align:center;">No</th>
                <th style="width:12%;">Prioritas</th>
                <th style="width:25%;">Program Intervensi</th>
                <th style="width:15%;">Sasaran Mahasiswa</th>
                <th style="width:16%;">Dasar Masalah Data</th>
                <th style="width:15%;">Unit PIC &amp; Durasi</th>
                <th style="width:13%;">Indikator KPI</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER LAPORAN RESMI -->
      <div class="doc-footer-note">
        <p style="margin:0 0 4px 0; font-weight:700; color:#334155; font-size:11px;">Sistem Analitika Kemahasiswaan NadiKampus • Politeknik Elektronika Negeri Surabaya</p>
        <p style="margin:0; font-size:10.5px; color:#64748B;">Laporan ini digenerate secara otomatis berdasarkan data kuesioner empiris responden dan pemodelan statistik LPA-GMM (k=3) serta NLP sentimen. Sah digunakan sebagai rujukan akademik perumusan kebijakan pendampingan kemahasiswaan preventif.</p>
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
              toast('✨ Ada aspirasi mahasiswa baru masuk secara real-time!');
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
