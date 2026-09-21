/* =========================================================
   NadiKampus — Landing Page Scripts
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';

  /* Hero: Animasi daun pada siluet SVG */
  (function leaves() {
    const g = $('#leaves');
    if (!g) return;
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const spots = [
      [190, 310], [176, 232], [230, 205], [280, 160], [336, 158],
      [352, 208], [384, 250], [300, 262], [214, 340], [287, 300],
      [262, 190], [330, 236], [205, 270], [245, 250]
    ];
    spots.forEach(([cx, cy], si) => {
      for (let k = 0; k < 5; k++) {
        const el = document.createElementNS(NS, 'ellipse');
        const x = cx + (rnd() - 0.5) * 42, y = cy + (rnd() - 0.5) * 42;
        el.setAttribute('cx', x.toFixed(1));
        el.setAttribute('cy', y.toFixed(1));
        el.setAttribute('rx', (5 + rnd() * 6).toFixed(1));
        el.setAttribute('ry', (3 + rnd() * 3).toFixed(1));
        el.setAttribute('transform', `rotate(${Math.round(rnd() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`);
        el.setAttribute('fill', rnd() > 0.35 ? '#ffffff' : '#065F46');
        el.setAttribute('opacity', (0.35 + rnd() * 0.4).toFixed(2));
        el.setAttribute('class', 'leaf');
        el.style.animationDelay = (0.6 + si * 0.07 + k * 0.03).toFixed(2) + 's';
        g.appendChild(el);
      }
    });
  })();

  /* Hero scroll progress & sticky navbar */
  const hero = $('.hero'), nav = $('#nav');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (hero) {
        const p = Math.max(0, Math.min(1, window.scrollY / (hero.offsetHeight * 0.85)));
        hero.style.setProperty('--p', p.toFixed(3));
      }
      if (nav) {
        nav.classList.toggle('is-stuck', window.scrollY > 12);
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
