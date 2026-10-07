/* =========================================================
   NadiKampus — grafik SVG ringan (tanpa library eksternal)
   ========================================================= */
const NS = 'http://www.w3.org/2000/svg';

const Charts = (() => {
  const svgEl = (name, attrs = {}, parent) => {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ---------- Ring (gauge melingkar) ---------- */
  function ring(value, color, size = 92, stroke = 10, label = '') {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return `
      <svg class="ring ring--interactive" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label ? label + ': ' : ''}${value} dari 100">
        <title>${label ? label + ': ' : ''}${value}/100 poin</title>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="${stroke}"/>
        <circle class="ring__val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}"
          stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"
          data-target="${c * (1 - value / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>`;
  }

  /* ---------- Sparkline Interaktif ---------- */
  function spark(values, color, w = 110, h = 42, months = ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu']) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [
      5 + ((w - 10) * i) / (values.length - 1),
      h - 6 - ((v - min) / span) * (h - 14)
    ]);
    const line = pts.map(p => p.join(',')).join(' ');
    const area = `5,${h} ${line} ${w - 5},${h}`;

    // Interactive monthly dot markers with instant hover telemetry
    const dots = pts.map((p, i) => {
      const m = months[i] || `Bulan ${i + 1}`;
      const v = values[i];
      const delta = i > 0 ? (v - values[i - 1] >= 0 ? `+${v - values[i - 1]}` : `${v - values[i - 1]}`) : '0';
      return `
        <g class="spark-node" tabindex="0" data-month="${m}" data-val="${v}" data-delta="${delta}" data-color="${color}">
          <circle cx="${p[0]}" cy="${p[1]}" r="10" fill="transparent" class="spark-hit"/>
          <line x1="${p[0]}" y1="0" x2="${p[0]}" y2="${h}" stroke="${color}" stroke-width="1" stroke-dasharray="2 2" class="spark-guide" opacity="0"/>
          <circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#FFFFFF" stroke="${color}" stroke-width="2.2" class="spark-dot"/>
        </g>`;
    }).join('');

    return `
      <svg class="spark spark--interactive" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Tren 6 bulan">
        <polygon points="${area}" fill="${color}" opacity=".15"/>
        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>`;
  }

  /* ---------- Line chart interaktif ---------- */
  function line(el, { labels, series, height = 270, yMin, yMax }) {
    el.innerHTML = '';
    const W = 640, H = height;
    const pad = { l: 38, r: 16, t: 16, b: 28 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    const vis = series.filter(s => s.visible !== false);
    const pool = (vis.length ? vis : series).flatMap(s => s.values);
    const lo = yMin ?? Math.max(0, Math.floor((Math.min(...pool) - 8) / 10) * 10);
    const hi = yMax ?? Math.min(100, Math.ceil((Math.max(...pool) + 6) / 10) * 10);
    const x = i => pad.l + (iw * i) / (labels.length - 1);
    const y = v => pad.t + ih * (1 - (v - lo) / (hi - lo));

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lc', role: 'img',
      'aria-label': 'Grafik tren indikator' }, el);

    // Helper: calculate smooth cubic spline path
    function getSpline(pts) {
      if (pts.length < 2) return '';
      if (pts.length === 2) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
        const cp1x = p1[0] + (p2[0] - p0[0]) / 5.5;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 5.5;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 5.5;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 5.5;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    }

    // Grid lines & labels
    const step = hi - lo > 50 ? 20 : 10;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'lc__grid' }, svg);
      const t = svgEl('text', { x: pad.l - 8, y: y(v) + 4, class: 'lc__tick', 'text-anchor': 'end' }, svg);
      t.textContent = v;
    }
    labels.forEach((l, i) => {
      const t = svgEl('text', { x: x(i), y: H - 8, class: 'lc__tick lc__tick--x', 'text-anchor': 'middle' }, svg);
      t.textContent = l;
    });

    // Render pure clean smooth spline curves (no shadow / no area fill)
    series.forEach((s, sIdx) => {
      if (s.visible === false) return;
      const pts = s.values.map((v, i) => [x(i), y(v)]);
      const spline = getSpline(pts);

      // Main curved stroke line (clean without background fill/shadow)
      svgEl('path', { d: spline, fill: 'none', stroke: s.color, 'stroke-width': 3, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', class: 'lc__path' }, svg);

      // Points (default bersih tanpa bulatan, muncul dinamis saat hover interaktif)
      pts.forEach((pt, i) => {
        svgEl('circle', { cx: pt[0].toFixed(1), cy: pt[1].toFixed(1), r: 5, fill: '#FFFFFF',
          stroke: s.color, 'stroke-width': 2.6, opacity: 0, class: 'lc__pt', 'data-idx': i, 'data-series': s.name }, svg);
      });
    });

    // Crosshair guide line
    const cross = svgEl('line', { y1: pad.t, y2: H - pad.b, class: 'lc__cross', opacity: 0 }, svg);
    const tip = document.createElement('div');
    tip.className = 'tip tip--enhanced';
    tip.hidden = true;
    el.appendChild(tip);

    const overlay = svgEl('rect', { x: pad.l, y: pad.t, width: iw, height: ih, fill: 'transparent', class: 'lc__overlay' }, svg);
    const move = e => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - pad.l) / iw) * (labels.length - 1))));
      const currentX = x(i);
      cross.setAttribute('x1', currentX); cross.setAttribute('x2', currentX); cross.setAttribute('opacity', 1);

      // Highlight active points at month index i secara interaktif
      svg.querySelectorAll('.lc__pt').forEach(pt => {
        if (+pt.dataset.idx === i) {
          pt.setAttribute('r', '5.5');
          pt.setAttribute('stroke-width', '2.8');
          pt.setAttribute('opacity', '1');
          pt.classList.add('is-active');
        } else {
          pt.setAttribute('opacity', '0');
          pt.classList.remove('is-active');
        }
      });

      tip.hidden = false;
      tip.innerHTML = `
        <div class="tip__head">
          <span class="tip__month">${labels[i]} 2026</span>
        </div>
        <div class="tip__rows">
          ${vis.map(s => {
            const v = s.values[i];
            const prev = i > 0 ? s.values[i - 1] : v;
            const diff = v - prev;
            const diffHtml = i > 0
              ? `<span class="tip__diff ${diff >= 0 ? 'tip__diff--up' : 'tip__diff--down'}">${diff >= 0 ? '+' + diff : diff}</span>`
              : '';
            return `
              <div class="tip__row">
                <i class="tip__dot" style="background:${s.color}"></i>
                <span class="tip__name">${s.name}</span>
                <b class="tip__val">${v}</b>
                ${diffHtml}
              </div>`;
          }).join('')}
        </div>`;

      const left = (currentX / W) * rect.width;
      tip.style.left = Math.min(Math.max(left, 90), rect.width - 90) + 'px';
    };

    overlay.addEventListener('mousemove', move);
    overlay.addEventListener('mouseleave', () => {
      cross.setAttribute('opacity', 0);
      tip.hidden = true;
      svg.querySelectorAll('.lc__pt').forEach(pt => {
        pt.setAttribute('opacity', '0');
        pt.classList.remove('is-active');
      });
    });
  }

  /* ---------- Donut interaktif ---------- */
  function donut(el, parts, { onPick, active } = {}) {
    const size = 200, r = 74, sw = 26, c = 2 * Math.PI * r;
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    let acc = 0;
    const segs = parts.map(p => {
      const len = (p.value / total) * c;
      const seg = `<circle class="dn__seg ${active === p.key ? 'is-on' : ''}" data-key="${p.key}" cx="100" cy="100" r="${r}"
        fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${Math.max(len - 3, 0)} ${c - Math.max(len - 3, 0)}"
        stroke-dashoffset="${-acc}" transform="rotate(-90 100 100)" tabindex="0" role="button"
        aria-label="${p.label} ${Math.round(p.value)} persen"/>`;
      acc += len;
      return seg;
    }).join('');
    el.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="dn">${segs}</svg>
      <div class="dn__center"><b id="dnVal">${Math.round(parts[0].value)}%</b><span id="dnLab">${parts[0].label}</span></div>`;
    const val = el.querySelector('#dnVal'), lab = el.querySelector('#dnLab');
    const show = p => { val.textContent = Math.round(p.value) + '%'; lab.textContent = p.label; };
    el.querySelectorAll('.dn__seg').forEach(seg => {
      const p = parts.find(q => q.key === seg.dataset.key);
      seg.addEventListener('mouseenter', () => show(p));
      seg.addEventListener('focus', () => show(p));
      seg.addEventListener('click', () => onPick && onPick(p.key));
      seg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(p.key); } });
    });
    el.addEventListener('mouseleave', () => show(parts[0]));
  }

  /* ---------- Pola skor profil (4 indikator x 4 profil) ---------- */
  function profileLines(el, profiles, dims, selected, onPick) {
    el.innerHTML = '';
    const W = 640, H = 300, pad = { l: 38, r: 22, t: 16, b: 40 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = i => pad.l + (iw * i) / (dims.length - 1);
    const y = v => pad.t + ih * (1 - v / 100);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lc', role: 'img',
      'aria-label': 'Pola skor tiap profil pada empat indikator' }, el);

    [0, 25, 50, 75, 100].forEach(v => {
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'lc__grid' }, svg);
      const t = svgEl('text', { x: pad.l - 8, y: y(v) + 4, class: 'lc__tick', 'text-anchor': 'end' }, svg);
      t.textContent = v;
    });
    dims.forEach((d, i) => {
      svgEl('line', { x1: x(i), x2: x(i), y1: pad.t, y2: H - pad.b, class: 'lc__grid lc__grid--v' }, svg);
      const t = svgEl('text', { x: x(i), y: H - 16, class: 'lc__tick lc__tick--x', 'text-anchor': i === 0 ? 'start' : i === dims.length - 1 ? 'end' : 'middle' }, svg);
      t.textContent = d.short;
    });

    const order = profiles.map((_, i) => i).sort((a, b) => (a === selected) - (b === selected));
    order.forEach(pi => {
      const p = profiles[pi], on = pi === selected;
      const g = svgEl('g', { class: 'pl ' + (on ? 'is-on' : 'is-off'), tabindex: 0, role: 'button',
        'aria-label': p.name }, svg);
      const d = dims.map((dm, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.means[dm.key])}`).join(' ');
      svgEl('path', { d, fill: 'none', stroke: p.color, 'stroke-width': on ? 4 : 2.5, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', pathLength: 1, class: 'lc__path' }, g);
      dims.forEach((dm, i) => {
        svgEl('circle', { cx: x(i), cy: y(p.means[dm.key]), r: on ? 5.5 : 3.5, fill: '#fff', stroke: p.color, 'stroke-width': 2.5 }, g);
        if (on) {
          const t = svgEl('text', { x: x(i), y: y(p.means[dm.key]) - 12, class: 'pl__val', 'text-anchor': 'middle', fill: p.color }, g);
          t.textContent = p.means[dm.key];
        }
      });
      g.addEventListener('click', () => onPick(pi));
      g.addEventListener('keydown', e => { if (e.key === 'Enter') onPick(pi); });
    });
  }

  /* ---------- Sebaran 119 Responden per 5 Profil Mahasiswa (Beeswarm Strip Plot) ---------- */
  function clusterScatter(el, points, clusters, activeCluster, onPick) {
    el.innerHTML = '';
    const W = 640, H = 320;
    const pad = { l: 44, r: 16, t: 32, b: 38 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    const y = v => pad.t + ih * (1 - Math.max(0, Math.min(100, v)) / 100);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'lc lc--scatter',
      role: 'img',
      'aria-label': 'Visualisasi sebaran 119 responden pada 5 profil mahasiswa'
    }, el);

    // Grid garis horizontal & label skor
    [25, 50, 75, 100].forEach(v => {
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'lc__grid' }, svg);
      const t = svgEl('text', { x: pad.l - 8, y: y(v) + 4, class: 'lc__tick', 'text-anchor': 'end' }, svg);
      t.textContent = v;
    });

    const colW = iw / clusters.length;
    const ptsGroup = svgEl('g', { class: 'sc__pts' }, svg);

    // Render 5 Kolom Profil (Lanes)
    clusters.forEach((c, i) => {
      const colX = pad.l + i * colW;
      const colCenter = colX + colW / 2;
      const isSel = activeCluster === i;

      // 1. Jalur kolom (Lane backdrop)
      const lane = svgEl('rect', {
        x: colX + 3,
        y: pad.t,
        width: colW - 6,
        height: ih,
        rx: 10,
        fill: c.color,
        opacity: isSel ? 0.12 : 0.035,
        stroke: isSel ? c.color : 'transparent',
        'stroke-width': 1.5,
        class: 'sc__lane',
        style: 'cursor: pointer;'
      }, svg);
      lane.addEventListener('click', () => onPick(i));

      // 2. Badge Header Profil di bagian atas kolom
      const headG = svgEl('g', { style: 'cursor: pointer;' }, svg);
      headG.addEventListener('click', () => onPick(i));
      svgEl('rect', {
        x: colCenter - 36,
        y: pad.t - 24,
        width: 72,
        height: 20,
        rx: 10,
        fill: isSel ? c.color : '#F8FAFC',
        stroke: isSel ? c.color : '#CBD5E1',
        'stroke-width': 1
      }, headG);
      const headTxt = svgEl('text', {
        x: colCenter,
        y: pad.t - 10,
        'text-anchor': 'middle',
        'font-size': '10.5px',
        'font-weight': '700',
        fill: isSel ? '#FFFFFF' : '#334155'
      }, headG);
      headTxt.textContent = `P${c.cluster} (${c.count} Mhs)`;

      // 3. Garis Indikator Rata-rata Centroid (Wellbeing Score)
      const avgScore = c.means ? c.means.wellbeing : 60;
      const avgY = y(avgScore);
      svgEl('line', {
        x1: colX + 8,
        x2: colX + colW - 8,
        y1: avgY,
        y2: avgY,
        stroke: c.color,
        'stroke-width': isSel ? 2.5 : 1.8,
        'stroke-dasharray': isSel ? 'none' : '3 3',
        opacity: isSel ? 0.95 : 0.65
      }, svg);

      // Label kecil skor rata-rata
      const dotCentroid = svgEl('circle', {
        cx: colCenter,
        cy: avgY,
        r: isSel ? 5.5 : 4,
        fill: '#FFFFFF',
        stroke: c.color,
        'stroke-width': 2.2,
        style: 'cursor: pointer;'
      }, svg);
      dotCentroid.addEventListener('click', () => onPick(i));

      // 4. Label Bawah Kolom (Nama Pendek Profil)
      const botLbl = svgEl('text', {
        x: colCenter,
        y: H - 12,
        'text-anchor': 'middle',
        'font-size': '11px',
        'font-weight': isSel ? '800' : '600',
        fill: isSel ? c.color : '#64748B',
        style: 'cursor: pointer;'
      }, svg);
      botLbl.textContent = c.short ? c.short.split('(')[0].trim() : `Profil ${c.cluster}`;
      botLbl.addEventListener('click', () => onPick(i));

      // 5. Sebaran 119 Responden (Titik-titik Mahasiswa dengan Symmetrical Jitter)
      const cPts = points.filter(p => p.cluster === i);
      cPts.forEach(pt => {
        let hash = 0;
        for (let k = 0; k < pt.id.length; k++) hash = (hash * 31 + pt.id.charCodeAt(k)) & 0xff;
        const maxJitter = (colW / 2) - 14;
        const jx = ((hash % 100) / 50 - 1) * maxJitter;
        const dotX = colCenter + jx;
        const dotY = y(pt.wb);

        svgEl('circle', {
          cx: dotX.toFixed(1),
          cy: dotY.toFixed(1),
          r: isSel ? 4.8 : 3.5,
          fill: c.color,
          stroke: '#FFFFFF',
          'stroke-width': 1.4,
          opacity: isSel ? 0.95 : 0.35,
          class: 'sc__dot',
          'data-id': pt.id,
          'data-cl': c.name,
          'data-prodi': pt.prodi || 'PENS',
          'data-wb': pt.wb,
          'data-acd': pt.acd,
          'data-soc': pt.soc,
          'data-car': pt.car
        }, ptsGroup);
      });
    });

    // Tooltip interaktif saat mengarahkan kursor ke responden
    const tip = document.createElement('div');
    tip.className = 'tip tip--scatter';
    tip.hidden = true;
    el.appendChild(tip);

    ptsGroup.addEventListener('mouseover', e => {
      const dot = e.target.closest('.sc__dot');
      if (!dot) return;
      const rect = svg.getBoundingClientRect();
      const ptX = +dot.getAttribute('cx'), ptY = +dot.getAttribute('cy');
      const px = (ptX / W) * rect.width, py = (ptY / H) * rect.height;

      tip.hidden = false;
      tip.innerHTML = `
        <b style="color:#fff;font-size:12.5px;">Responden: ${dot.dataset.id}</b>
        <span style="color:#94A3B8;font-size:11px;">Program Studi: ${dot.dataset.prodi}</span>
        <span style="color:#38BDF8;font-weight:600;font-size:11.5px;margin-top:2px">${dot.dataset.cl}</span>
        <div style="font-size:11px;color:#CBD5E1;margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15)">
          Wellbeing: <b>${dot.dataset.wb}</b> | Tekanan: <b>${dot.dataset.acd}</b><br>
          Sosial: <b>${dot.dataset.soc}</b> | Karier: <b>${dot.dataset.car}</b>
        </div>
      `;
      tip.style.left = px + 'px';
      tip.style.top = (py - 58) + 'px';
    });

    ptsGroup.addEventListener('mouseleave', () => { tip.hidden = true; });
  }

  return { ring, spark, line, donut, profileLines, clusterScatter };
})();

