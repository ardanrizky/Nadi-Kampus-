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

  const VIEW_META = {
    executive: {
      title: 'Executive Dashboard',
      sub: 'Ringkasan indikator wellbeing dan permasalahan mahasiswa untuk pengambil kebijakan.'
    },
    profile: {
      title: 'Student Profiling',
      sub: 'Pemetaan 5 profil mahasiswa berdasarkan tingkat kesejahteraan dan kondisi akademik.'
    },
    voice: {
      title: 'Student Voice (NLP)',
      sub: 'Analisis ribuan komentar terbuka: sentimen, topik dominan, dan representasi suara mahasiswa.'
    },
    reco: {
      title: 'Recommendation Program',
      sub: 'Katalog program intervensi terprioritas sesuai profil mahasiswa dan temuan suara kritis.'
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
        profile: (window.CLUSTERS || [0, 1, 2, 3, 4]).map((_, i) => wavg(f => (f.profile && f.profile[i] !== undefined ? f.profile[i] : 0))),
        topicW: TOPICS.map((_, i) => wavg(f => f.topicW[i])),
        trend: {}
      };
      DIMS.forEach(m => {
        d.scores[m.key] = Math.round(wavg(f => f[m.key]));
        // Aggregate genuine monthly weighted average across all 6 months
        d.trend[m.key] = [0, 1, 2, 3, 4, 5].map(idx => {
          return Math.round(wavg(f => (f.trend && f.trend[m.key] ? f.trend[m.key][idx] : f[m.key])));
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
          : [f[m.key], f[m.key], f[m.key], f[m.key], f[m.key], f[m.key]];
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
      const delta = v - tr[0];
      const better = m.good === 'high' ? delta > 0 : delta < 0;
      const dt = (delta > 0 ? "+" : (delta < 0 ? "-" : "")) + Math.abs(delta) + " poin";
      const isSelected = state.selectedKPI === m.key;
      return `
        <article class="kpi ${isSelected ? 'is-selected' : ''}" data-kpi="${m.key}" tabindex="0" role="button" aria-pressed="${isSelected}" style="--c:${m.color}" title="Klik untuk fokus & melihat rincian riwayat bulanan">
          <div class="kpi__top">
            <span class="kpi__label">${m.label}</span>
            <span class="pill pill--${lv.c}">${lv.t}</span>
          </div>
          <div class="kpi__main">
            <div class="kpi__ring">${Charts.ring(v, m.color, 96, 10, m.label)}<b class="kpi__num" data-count="${v}">${v}</b></div>
          </div>
          <div class="kpi__foot">
            <span class="delta delta--${better ? 'good' : 'bad'}">${dt} sejak Maret</span>
            <span class="kpi__action-hint">${isSelected ? 'Fokus Aktif' : 'Lihat Rincian'}</span>
          </div>
          <p class="kpi__about">${m.about}</p>
          ${isSelected ? `
            <div class="kpi__expanded" aria-label="Rincian riwayat 6 bulan">
              <div class="kpi__expanded-header">
                <span>Riwayat 6 Bulan:</span>
                <span class="kpi__benchmark">${m.good === 'high' ? 'Target: &ge; 65' : 'Target: &le; 50'}</span>
              </div>
              <div class="kpi__mo-chips">
                ${MONTHS.map((mo, idx) => `
                  <div class="kpi__chip ${idx === MONTHS.length - 1 ? 'is-curr' : ''}">
                    <span class="kpi__chip-mo">${mo}</span>
                    <strong class="kpi__chip-val">${tr[idx]}</strong>
                  </div>
                `).join('')}
              </div>
              <p class="kpi__hint-msg">Grafik tren 6 bulan di bawah telah difokuskan pada <strong>${m.label}</strong>.</p>
            </div>
          ` : ''}
        </article>`;
    }).join('');
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
      // Hitung metrik telemetri tren dinamis
      const pressVals = D.trend.pressure || [66, 68, 76, 75, 74, 73];
      const maxPress = Math.max(...pressVals);
      const maxMonthIdx = pressVals.indexOf(maxPress);
      const maxMonthName = MONTHS[maxMonthIdx] || 'Mei';

      const careerVals = D.trend.career || [55, 56, 58, 59, 61, 62];
      const careerDelta = careerVals[careerVals.length - 1] - careerVals[0];

      const wbVals = D.trend.wellbeing || [62, 63, 62, 63, 63, 64];
      const wbDelta = wbVals[wbVals.length - 1] - wbVals[0];

      const scopeName = state.fac === 'all' ? 'seluruh kampus' : D.name;

      footer.innerHTML = `
        <div class="trend-stats-strip">
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Puncak Beban</span>
            <strong class="trend-stat-card__val" style="color: #E11D48;">${maxMonthName} (${maxPress} Poin)</strong>
            <span class="trend-stat-card__sub">Periode UTS Kampus</span>
          </div>
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Kenaikan Tertinggi</span>
            <strong class="trend-stat-card__val" style="color: #D97706;">Karir (+${careerDelta} Poin)</strong>
            <span class="trend-stat-card__sub">Tren Positif Konsisten</span>
          </div>
          <div class="trend-stat-card">
            <span class="trend-stat-card__lbl">Kondisi Wellbeing</span>
            <strong class="trend-stat-card__val" style="color: #059669;">Stabil (${wbDelta >= 0 ? '+' + wbDelta : wbDelta} Poin)</strong>
            <span class="trend-stat-card__sub">Kondisi Relatif Terjaga</span>
          </div>
        </div>
        <div class="trend-summary-note">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Pola 6 bulan (${scopeName}): Tekanan akademik mencapai puncak saat evaluasi semester (${maxMonthName}), sementara Wellbeing dan Kesiapan Karir bergerak naik secara stabil.</span>
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
      const ks = Object.keys(prodiSource).sort((a, b) => prodiSource[b].pressure - prodiSource[a].pressure);
      const f = prodiSource[ks[0]];
      out.push({
        tone: 'bad',
        category: 'Fokus Prodi',
        badgeClass: 'ins-badge--prodi',
        title: `Tekanan akademik tertinggi di ${f.name}`,
        text: `Skor ${f.pressure}, ${f.pressure - ALL.scores.pressure} poin di atas rata-rata kampus (${ALL.scores.pressure}).`,
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
          <span class="pcard__n">± ${nf.format(n)} mahasiswa (${p.count || Math.round(119 * pct / 100)} sampel riil)</span>
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
            <span class="pd__pager-idx">P${p.cluster} (${state.profile + 1}/5)</span>
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
      Charts.clusterScatter(scatterEl, CLUSTER_POINTS, CLUSTERS, state.profile, i => {
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
          <li class="quote quote--${q.s} ${q.isNew ? 'quote--new' : ''}">
            ${q.isNew ? `<span class="quote__new-tag">✨ Curhat Baru (Anonim${q.prodi ? ' · ' + q.prodi : ''}${q.sem ? ' · Sem ' + q.sem : ''})</span>` : ''}
            <p>“${q.x}”</p>
            <span><i></i>${TOPICS[q.t].name} · ${q.s === 'pos' ? 'Positif' : q.s === 'neg' ? 'Negatif' : 'Netral'}</span>
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
      ['tugas', 'deadline', 'ujian', 'praktikum', 'tubes', 'kuliah', 'tidur', 'jadwal', 'kelas', 'materi', 'begadang', 'lelah', 'istirahat', 'capek'], // 0
      ['magang', 'karier', 'cv', 'kerja', 'portofolio', 'interview', 'loker', 'alumni', 'industri', 'profesi', 'masa depan'], // 1
      ['ukt', 'biaya', 'uang', 'finansial', 'bayar', 'kos', 'makan', 'beasiswa', 'keringanan', 'mahal', 'spp', 'ekonomi'], // 2
      ['teman', 'sendirian', 'kesepian', 'sosial', 'rantau', 'asrama', 'isolasi', 'berteman', 'ngobrol', 'relasi', 'asing'], // 3
      ['wifi', 'fasilitas', 'ruang', 'lab', 'gedung', 'perpustakaan', 'toilet', 'ac', 'parkir', 'layanan', 'antrean', 'server', 'lemot'], // 4
      ['dosen', 'wali', 'bimbingan', 'skripsi', 'konsultasi', 'pengajar', 'revisi', 'feedback', 'jurusan', 'prodi', 'dosen wali'], // 5
      ['ukm', 'organisasi', 'kegiatan', 'bem', 'hima', 'lomba', 'acara', 'komunitas', 'ekskul', 'kepanitiaan'] // 6
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
      'begadang', 'drop', 'menumpuk', 'tabrakan', 'bentrok', 'padat', 'pusing', 'down', 'overthinking'
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

    form.addEventListener('submit', e => {
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
      toast(`Aspirasi diterima! NLP deteksi: Topik "${TOPICS[nlp.topicIndex].name}" · Sentimen: ${sentEmoji}`);

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
  function rankRecos() {
    return RECOS.map(r => {
      const m = dim(r.metric);
      const t = TOPICS[r.t];
      const prioScore = need(m, D.scores[m.key]) * 0.6 + (t.sent[2] * t.w / 100) * 0.4;
      const pr = prioScore >= 45 ? 'Tinggi' : prioScore >= 30 ? 'Sedang' : 'Rendah';
      return { r, prioScore, pr, m, t };
    }).sort((a, b) => b.prioScore - a.prioScore);
  }

  function renderReco() {
    const fBox = $('#recoFilter'), rBox = $('#recos');
    if (!fBox || !rBox) return;

    const opts = [['all', 'Semua profil'], ...PROFILES.map((p, i) => [String(i), p.short])];
    fBox.innerHTML = opts.map(([k, l]) => `
      <button type="button" class="seg__btn" aria-pressed="${state.recoProfile === k}" data-recofilter="${k}">
        ${l}
      </button>`).join('');

    const ranked = rankRecos().filter(x => {
      if (state.recoProfile === 'all') return true;
      return x.r.profiles.includes(+state.recoProfile);
    });

    rBox.innerHTML = ranked.map(x => {
      const { r, m, t } = x;
      const on = state.plan.has(r.id);
      return `
        <article class="reco reco--${x.pr.toLowerCase()}">
          <div class="reco__top">
            <span class="prio prio--${x.pr.toLowerCase()}">Prioritas ${x.pr}</span>
            <span class="reco__for">${r.profiles.map(i => PROFILES[i].short).join(', ')}</span>
          </div>
          <h4>${r.title}</h4>
          <p>${r.desc}</p>
          <p class="reco__why"><b>Dasar data:</b> ${m.short} ${D.scores[m.key]} · ${Math.round(t.w)}% komentar membahas ${t.name.toLowerCase()} (${t.sent[2]}% negatif)</p>
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

    if (t.id === 'trayCopy') {
      const txt = planText();
      const done = () => toast('Ringkasan rencana disalin');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(done, done);
      } else {
        const ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        ta.remove(); done();
      }
    }

    if (t.id === 'btnPrintReport') {
      window.print();
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
     Sinkronisasi Asinkron dengan Live FastAPI Backend
     --------------------------------------------------------- */
  async function syncWithLiveAPI() {
    try {
      const res = await fetch('/api/v1/profiles');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.profiles && data.profiles.length === 5) {
        console.log('[NadiKampus Live API] Terhubung ke FastAPI Backend: 5 Profil LPA-GMM aktif.');
      }
    } catch (e) {
      // Offline / Static File mode: data.js bekerja sebagai fallback provider tanpa error
    }
  }
  syncWithLiveAPI();
})();
