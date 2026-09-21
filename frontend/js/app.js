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
      title: 'Student Clustering (K-Means)',
      sub: 'Hasil K-Means Clustering (k=4): pemetaan kelompok mahasiswa berdasarkan kedekatan jarak Euclidean ke 4 centroid.'
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
    const keys = Object.keys(FACULTIES);
    let d;
    if (key === 'all') {
      const total = keys.reduce((a, k) => a + FACULTIES[k].n, 0);
      const wavg = fn => keys.reduce((a, k) => a + FACULTIES[k].n * fn(FACULTIES[k]), 0) / total;
      d = {
        key,
        name: 'seluruh kampus',
        n: total,
        scores: {},
        profile: [0, 1, 2, 3].map(i => wavg(f => f.profile[i])),
        topicW: TOPICS.map((_, i) => wavg(f => f.topicW[i]))
      };
      DIMS.forEach(m => { d.scores[m.key] = Math.round(wavg(f => f[m.key])); });
    } else {
      const f = FACULTIES[key];
      d = {
        key,
        name: 'Fakultas ' + f.name,
        n: f.n,
        scores: {},
        profile: f.profile.slice(),
        topicW: f.topicW.slice()
      };
      DIMS.forEach(m => { d.scores[m.key] = f[m.key]; });
    }
    d.trend = {};
    DIMS.forEach(m => {
      d.trend[m.key] = TREND_OFFSETS[m.key].map(o => clamp(d.scores[m.key] + o));
    });
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
      const dt = (delta > 0 ? '+' : '−') + Math.abs(delta) + ' poin';
      return `
        <article class="kpi" tabindex="0" style="--c:${m.color}">
          <div class="kpi__top">
            <span class="kpi__label">${m.label}</span>
            <span class="pill pill--${lv.c}">${lv.t}</span>
          </div>
          <div class="kpi__main">
            <div class="kpi__ring">${Charts.ring(v, m.color)}<b class="kpi__num" data-count="${v}">${v}</b></div>
            <div class="kpi__side">${Charts.spark(tr, m.color, 90, 40)}</div>
          </div>
          <span class="delta delta--${better ? 'good' : 'bad'}">${dt} sejak Maret</span>
          <p class="kpi__about">${m.about}</p>
        </article>`;
    }).join('');
  }

  function renderTrend() {
    const toggles = $('#trendToggles'), chart = $('#trendChart');
    if (!toggles || !chart) return;
    toggles.innerHTML = DIMS.map(m => `
      <button type="button" class="seg__btn" aria-pressed="${state.trend.has(m.key)}" data-trend="${m.key}">
        <i style="background:${m.color}"></i>${m.short}
      </button>`).join('');
    Charts.line(chart, {
      labels: MONTHS,
      series: DIMS.map(m => ({
        name: m.short,
        color: m.color,
        values: D.trend[m.key],
        visible: state.trend.has(m.key)
      }))
    });
  }

  function makeInsights() {
    const out = [];
    const worst = DIMS.map(m => ({ m, n: need(m, D.scores[m.key]) })).sort((a, b) => b.n - a.n)[0].m;
    const wl = level(worst, D.scores[worst.key]);
    out.push({
      tone: wl.c === 'good' ? 'good' : wl.c,
      title: `${worst.short} paling perlu perhatian`,
      text: `Dengan skor ${D.scores[worst.key]} (${wl.t.toLowerCase()}), indikator ini menunjukkan urgensi dukungan terbesar di antara empat indikator.`,
      act: { view: 'reco' },
      label: 'Lihat program terkait'
    });

    const pi = D.profile.indexOf(Math.max(...D.profile));
    const pct = Math.round(D.profile[pi]);
    out.push({
      tone: 'info',
      title: `${PROFILES[pi].short} jadi profil terbesar`,
      text: `${pct}% mahasiswa (sekitar ${nf.format(Math.round(D.n * pct / 100))} orang) terpetakan ke ${PROFILES[pi].name}.`,
      act: { view: 'profile', profile: pi },
      label: 'Lihat detail profil'
    });

    const ti = D.topics.map(t => ({ t, v: t.w * t.sent[2] })).sort((a, b) => b.v - a.v)[0].t;
    out.push({
      tone: 'warn',
      title: `${ti.name} paling banyak dikeluhkan`,
      text: `${Math.round(ti.w)}% komentar membahas topik ini, dan ${ti.sent[2]}% di antaranya bernada negatif.`,
      act: { view: 'voice', topic: ti.i },
      label: 'Baca suara mahasiswa'
    });

    if (state.fac === 'all') {
      const ks = Object.keys(FACULTIES).sort((a, b) => FACULTIES[b].pressure - FACULTIES[a].pressure);
      const f = FACULTIES[ks[0]];
      out.push({
        tone: 'bad',
        title: `Tekanan akademik tertinggi ada di ${f.name}`,
        text: `Skor ${f.pressure}, ${f.pressure - ALL.scores.pressure} poin di atas rata-rata kampus (${ALL.scores.pressure}).`,
        act: { fac: ks[0] },
        label: `Fokus ke ${f.name}`
      });
    }
    return out;
  }

  function renderInsights() {
    const list = $('#insights');
    if (!list) return;
    const ins = makeInsights();
    list.innerHTML = ins.map((item, i) => `
      <li class="ins ins--${item.tone}">
        <span class="ins__dot" aria-hidden="true"></span>
        <div>
          <h5>${item.title}</h5>
          <p>${item.text}</p>
          <button type="button" class="link" data-ins="${i}">${item.label} →</button>
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
    const items = Object.entries(FACULTIES).map(([k, f]) => ({ k, name: f.name, v: f[m.key] }))
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
      const pct = Math.round(D.profile[i]);
      const n = Math.round(D.n * pct / 100);
      const sel = state.profile === i;
      return `
        <button type="button" class="pcard ${sel ? 'is-sel' : ''}" data-profile="${i}" style="--c:${p.color}">
          <div class="pcard__header">
            <span class="pcard__badge">Klaster ${p.cluster}</span>
            <span class="pcard__pct">${pct}<small>%</small></span>
          </div>
          <h4>${p.name}</h4>
          <span class="pcard__n">± ${nf.format(n)} mahasiswa</span>
          <span class="pcard__bar"><i style="width:${pct}%"></i></span>
        </button>`;
    }).join('');

    const p = CLUSTERS[state.profile];
    const detail = $('#profileDetail');
    if (detail) {
      detail.style.setProperty('--c', p.color);
      detail.innerHTML = `
        <div class="pd__head">
          <span class="pd__sw"></span>
          <div>
            <h4>${p.name}</h4>
            <span class="pd__centroid-tag">Titik Centroid (C${p.cluster}) · PCA: [${p.pca.x}, ${p.pca.y}]</span>
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
            return `
              <div class="mean">
                <span>${dm.short}</span>
                <span class="mean__track"><i style="width:${val}%;background:${dm.color}"></i></span>
                <b>${val}</b>
              </div>`;
          }).join('')}
        </div>
        <p class="pd__need"><strong>Kebutuhan intervensi:</strong> ${p.need}</p>
        <button type="button" class="btn btn--outline btn--sm" data-recoprofile="${state.profile}">
          Lihat program intervensi untuk klaster ini →
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
          <li class="quote quote--${q.s}">
            <p>“${q.x}”</p>
            <span><i></i>${TOPICS[q.t].name} · ${q.s === 'pos' ? 'Positif' : q.s === 'neg' ? 'Negatif' : 'Netral'}</span>
          </li>`).join('');
      }
    }
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

    const t = e.target.closest('button, a');
    if (!t) return;

    if (t.dataset.view) {
      e.preventDefault();
      return setView(t.dataset.view);
    }

    if (t.dataset.ins !== undefined) {
      const ins = makeInsights()[+t.dataset.ins];
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

  // Populate Dropdown Fakultas
  const facSel = $('#fFaculty');
  if (facSel) {
    facSel.innerHTML = `<option value="all">Seluruh kampus</option>` +
      Object.keys(FACULTIES).map(k => `<option value="${k}">Fakultas ${FACULTIES[k].name}</option>`).join('');
    facSel.addEventListener('change', e => setFaculty(e.target.value));
  }

  /* ---------------------------------------------------------
     Inisialisasi
     --------------------------------------------------------- */
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
})();
