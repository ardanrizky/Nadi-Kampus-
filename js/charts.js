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
  function ring(value, color, size = 92, stroke = 10) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return `
      <svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E4EEE9" stroke-width="${stroke}"/>
        <circle class="ring__val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}"
          stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"
          data-target="${c * (1 - value / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>`;
  }

  /* ---------- Sparkline ---------- */
  function spark(values, color, w = 96, h = 30) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [
      (w * i) / (values.length - 1),
      h - 4 - ((v - min) / span) * (h - 8)
    ]);
    const line = pts.map(p => p.join(',')).join(' ');
    const area = `0,${h} ${line} ${w},${h}`;
    const last = pts[pts.length - 1];
    return `
      <svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
        <polygon points="${area}" fill="${color}" opacity=".12"/>
        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/>
      </svg>`;
  }

  /* ---------- Line chart interaktif ---------- */
  function line(el, { labels, series, height = 270, yMin, yMax }) {
    el.innerHTML = '';
    const W = 640, H = height;
    const pad = { l: 38, r: 16, t: 14, b: 28 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    const vis = series.filter(s => s.visible !== false);
    const pool = (vis.length ? vis : series).flatMap(s => s.values);
    const lo = yMin ?? Math.max(0, Math.floor((Math.min(...pool) - 8) / 10) * 10);
    const hi = yMax ?? Math.min(100, Math.ceil((Math.max(...pool) + 6) / 10) * 10);
    const x = i => pad.l + (iw * i) / (labels.length - 1);
    const y = v => pad.t + ih * (1 - (v - lo) / (hi - lo));

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lc', role: 'img',
      'aria-label': 'Grafik tren indikator' }, el);

    // grid
    const step = hi - lo > 50 ? 20 : 10;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'lc__grid' }, svg);
      const t = svgEl('text', { x: pad.l - 8, y: y(v) + 4, class: 'lc__tick', 'text-anchor': 'end' }, svg);
      t.textContent = v;
    }
    labels.forEach((l, i) => {
      const t = svgEl('text', { x: x(i), y: H - 8, class: 'lc__tick', 'text-anchor': 'middle' }, svg);
      t.textContent = l;
    });

    // garis
    series.forEach(s => {
      if (s.visible === false) return;
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
      svgEl('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 3, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', pathLength: 1, class: 'lc__path' }, svg);
      s.values.forEach((v, i) => svgEl('circle', { cx: x(i), cy: y(v), r: 3.5, fill: '#fff',
        stroke: s.color, 'stroke-width': 2, class: 'lc__pt' }, svg));
    });

    // crosshair + tooltip
    const cross = svgEl('line', { y1: pad.t, y2: H - pad.b, class: 'lc__cross', opacity: 0 }, svg);
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    el.appendChild(tip);

    const overlay = svgEl('rect', { x: pad.l, y: pad.t, width: iw, height: ih, fill: 'transparent' }, svg);
    const move = e => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - pad.l) / iw) * (labels.length - 1))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
      tip.hidden = false;
      tip.innerHTML = `<b>${labels[i]}</b>` + vis.map(s =>
        `<span><i style="background:${s.color}"></i>${s.name}<em>${s.values[i]}</em></span>`).join('');
      const left = (x(i) / W) * rect.width;
      tip.style.left = Math.min(Math.max(left, 70), rect.width - 70) + 'px';
    };
    overlay.addEventListener('mousemove', move);
    overlay.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); tip.hidden = true; });
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

  /* ---------- K-Means 2D Scatter Plot Sebaran Mahasiswa & Centroid ---------- */
  function clusterScatter(el, points, clusters, activeCluster, onPick) {
    el.innerHTML = '';
    const W = 640, H = 320;
    const pad = { l: 42, r: 24, t: 20, b: 36 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    // Koordinat domain PCA [-4.5, 4.5] ke rentang pixel SVG
    const xRange = [-4.6, 4.6], yRange = [-4.0, 3.8];
    const mapX = x => pad.l + ((x - xRange[0]) / (xRange[1] - xRange[0])) * iw;
    const mapY = y => pad.t + ih * (1 - (y - yRange[0]) / (yRange[1] - yRange[0]));

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'lc lc--scatter',
      role: 'img',
      'aria-label': 'Visualisasi sebaran mahasiswa dan centroid K-Means'
    }, el);

    // Defs untuk glow & efek
    const defs = svgEl('defs', {}, svg);

    // Grid halus & sumbu utama PCA
    [-3, -1.5, 0, 1.5, 3].forEach(val => {
      svgEl('line', { x1: mapX(val), x2: mapX(val), y1: pad.t, y2: H - pad.b, class: val === 0 ? 'sc__axis' : 'lc__grid' }, svg);
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: mapY(val), y2: mapY(val), class: val === 0 ? 'sc__axis' : 'lc__grid' }, svg);
    });

    // Label Sumbu
    const lblX = svgEl('text', { x: W / 2, y: H - 8, class: 'lc__tick lc__tick--x', 'text-anchor': 'middle' }, svg);
    lblX.textContent = 'Komponen Utama 1 (Beban Akademik & Kesejahteraan) →';

    const lblY = svgEl('text', { x: 12, y: H / 2, class: 'lc__tick lc__tick--x', 'text-anchor': 'middle', transform: `rotate(-90 12 ${H / 2})` }, svg);
    lblY.textContent = 'Komponen Utama 2 (Kesiapan & Jejaring) →';

    // Area bayangan cluster lembut (soft cluster halo)
    clusters.forEach((c, i) => {
      const cx = mapX(c.pca.x), cy = mapY(c.pca.y);
      const isSel = i === activeCluster;
      svgEl('ellipse', {
        cx, cy, rx: isSel ? 74 : 60, ry: isSel ? 56 : 46,
        fill: c.color,
        opacity: isSel ? 0.14 : 0.05,
        class: 'sc__hull'
      }, svg);
    });

    // Titik-titik Mahasiswa (Survey Respondents)
    const ptsGroup = svgEl('g', { class: 'sc__pts' }, svg);
    points.forEach(pt => {
      const c = clusters[pt.cluster];
      const isSel = activeCluster === null || pt.cluster === activeCluster;
      const dot = svgEl('circle', {
        cx: mapX(pt.x),
        cy: mapY(pt.y),
        r: isSel ? 4 : 3,
        fill: c.color,
        opacity: isSel ? 0.8 : 0.18,
        class: 'sc__dot',
        'data-id': pt.id,
        'data-cl': c.name,
        'data-fac': pt.fac
      }, ptsGroup);
    });

    // Centroid K-Means (Pusat Klaster)
    clusters.forEach((c, i) => {
      const cx = mapX(c.pca.x), cy = mapY(c.pca.y);
      const isSel = i === activeCluster;

      const cg = svgEl('g', {
        class: 'sc__centroid ' + (isSel ? 'is-active' : ''),
        role: 'button',
        tabindex: 0,
        'aria-label': `Centroid ${c.name}`
      }, svg);

      // Lingkaran luar berdenyut
      svgEl('circle', { cx, cy, r: isSel ? 16 : 13, fill: 'none', stroke: c.color, 'stroke-width': 2, opacity: 0.6, class: 'sc__centroid-ring' }, cg);
      // Lingkaran isi
      svgEl('circle', { cx, cy, r: isSel ? 9 : 7.5, fill: c.color, stroke: '#fff', 'stroke-width': 2.5 }, cg);
      
      // Ikon Centroid badge label
      const bg = svgEl('rect', { x: cx + 11, y: cy - 18, width: 30, height: 18, rx: 6, fill: '#0F1F3D', opacity: 0.9 }, cg);
      const txt = svgEl('text', { x: cx + 26, y: cy - 5, class: 'sc__centroid-lbl', 'text-anchor': 'middle', fill: '#fff' }, cg);
      txt.textContent = `C${c.cluster}`;

      cg.addEventListener('click', () => onPick(i));
      cg.addEventListener('keydown', e => { if (e.key === 'Enter') onPick(i); });
    });

    // Tooltip interaktif
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
        <b>Responden: ${dot.dataset.id}</b>
        <span>Fakultas: ${dot.dataset.fac.charAt(0).toUpperCase() + dot.dataset.fac.slice(1)}</span>
        <span>${dot.dataset.cl}</span>
      `;
      tip.style.left = px + 'px';
      tip.style.top = (py - 48) + 'px';
    });

    ptsGroup.addEventListener('mouseleave', () => { tip.hidden = true; });
  }

  return { ring, spark, line, donut, profileLines, clusterScatter };
})();

