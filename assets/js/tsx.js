/* Ingenia — historique animé de l'indice composé S&P/TSX (page Services).
   Données : assets/data/tsx.json, actualisé automatiquement chaque jour ouvrable (GitHub Actions).
   Repli : copie intégrée à la page (#tsx-data) si le fichier ne peut pas être lu. */
(function () {
  'use strict';
  var fig = document.querySelector('[data-tsx]'); if (!fig) return;
  var canvas = fig.querySelector('canvas'), ctx = canvas.getContext && canvas.getContext('2d'); if (!ctx) return;
  var tip = fig.querySelector('.tsx__tip');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = { forest: '#002E1C', growth: '#78C042', teal: '#6BBFE1', tealInk: '#085A75', ink3: '#4A5C53', line: '#DDE5E0' };
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  var nf = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var EVENTS = [['1987-10', 'Krach de 1987'], ['2002-09', 'Bulle techno'], ['2009-02', 'Crise de 2008'], ['2020-03', 'Pandémie']];

  var D = null, vals = [], labels = [], W = 0, H = 0, dpr = 1, geo = null;

  function setData(d) {
    D = d; vals = d.clotures.slice();
    var p = d.debut.split('-'), a = +p[0], m = +p[1] - 1;
    labels = vals.map(function (_, i) { var mm = (m + i) % 12, aa = a + Math.floor((m + i) / 12); return { a: aa, m: mm, key: aa + '-' + String(mm + 1).padStart(2, '0') }; });
    var last = vals[vals.length - 1], first = vals[0];
    var dl = d.derniere && d.derniere.date ? d.derniere.date.split('-') : null;
    setText('[data-tsx-val]', nf.format(last));
    setText('[data-tsx-date]', 'points · ' + (dl ? (+dl[2]) + ' ' + MOIS[+dl[1] - 1] + ' ' + dl[0] : MOIS[labels[labels.length - 1].m] + ' ' + labels[labels.length - 1].a));
    setText('[data-tsx-mult]', '×' + (last / first).toLocaleString('fr-CA', { maximumFractionDigits: 1 }) + ' depuis ' + labels[0].a);
    setText('[data-tsx-span]', labels[0].a + ' à ' + labels[labels.length - 1].a);
    var alt = fig.querySelector('[data-tsx-alt]');
    if (alt) alt.textContent = 'Indice composé S&P/TSX de ' + labels[0].a + ' à ' + labels[labels.length - 1].a + ' : de ' + nf.format(first) + ' à ' + nf.format(last) + ' points, malgré le krach de 1987, l’éclatement de la bulle techno, la crise de 2008 et la pandémie de 2020.';
    resize();
  }
  function setText(sel, t) { var el = fig.querySelector(sel); if (el) el.textContent = t; }

  function resize() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!vals.length) return;
    var max = Math.max.apply(null, vals), step = max > 30000 ? 10000 : 5000, top = Math.ceil(max * 1.08 / step) * step;
    var L = 44, R = 36, T = 30, B = 28;
    geo = { L: L, R: R, T: T, B: B, top: top, step: step,
      x: function (i) { return L + (W - L - R) * i / (vals.length - 1); },
      y: function (v) { return T + (H - T - B) * (1 - v / top); } };
    if (!running) draw(performance.now());
  }

  /* ---------- Dessin ---------- */
  var start = null, introDur = reduce ? 0 : 4200, tiles = [], hover = null, running = false, visible = false;
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function draw(now) {
    if (!geo) return;
    ctx.clearRect(0, 0, W, H);
    var g = geo, n = vals.length, t = start ? (now - start) / 1000 : 0;
    var prog = introDur ? Math.min(1, (now - (start || now)) / introDur) : 1, head = ease(prog) * (n - 1);
    /* grille et carreaux techniques */
    var cell = 24; ctx.lineWidth = 1;
    for (var gx = g.L; gx <= W - g.R + 0.5; gx += cell) { ctx.strokeStyle = rgba(C.teal, 0.07); ctx.beginPath(); ctx.moveTo(Math.round(gx) + .5, g.T); ctx.lineTo(Math.round(gx) + .5, H - g.B); ctx.stroke(); }
    if (!reduce && start && Math.random() < 0.025 && tiles.length < 5) tiles.push({ c: Math.floor(Math.random() * Math.floor((W - g.L - g.R) / cell - 1)), r: Math.floor(Math.random() * Math.floor((H - g.T - g.B) / cell - 1)), b: t });
    tiles = tiles.filter(function (p) { var a = t - p.b; if (a > 3.5) return false; ctx.fillStyle = rgba(C.teal, 0.12 * Math.sin(Math.PI * a / 3.5)); ctx.fillRect(g.L + p.c * cell + 1, g.T + p.r * cell + 1, cell - 1, cell - 1); return true; });
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (var v = 0; v <= g.top; v += g.step) { var yy = Math.round(g.y(v)) + .5; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(g.L, yy); ctx.lineTo(W - g.R, yy); ctx.stroke(); ctx.fillStyle = C.ink3; ctx.textAlign = 'right'; ctx.fillText(v / 1000 + ' k', g.L - 8, yy); }
    var every = W < 480 ? 10 : 5; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    labels.forEach(function (l, i) { if (l.m === 0 && l.a % every === 0) { ctx.fillStyle = C.ink3; ctx.fillText(l.a, g.x(i), H - 8); } });

    /* courbe jusqu'à la tête */
    var hi = Math.floor(head), hf = head - hi, hx, hy;
    ctx.beginPath(); ctx.moveTo(g.x(0), g.y(vals[0]));
    for (var i = 1; i <= hi; i++) ctx.lineTo(g.x(i), g.y(vals[i]));
    if (hi < n - 1) { hx = g.x(hi + hf); hy = g.y(vals[hi] + (vals[hi + 1] - vals[hi]) * hf); ctx.lineTo(hx, hy); } else { hx = g.x(n - 1); hy = g.y(vals[n - 1]); }
    var path = new Path2D(); path.moveTo(g.x(0), g.y(vals[0])); for (var j = 1; j <= hi; j++) path.lineTo(g.x(j), g.y(vals[j])); path.lineTo(hx, hy);
    var area = new Path2D(path); area.lineTo(hx, g.y(0)); area.lineTo(g.x(0), g.y(0)); area.closePath();
    var gr = ctx.createLinearGradient(0, g.T, 0, H - g.B); gr.addColorStop(0, rgba(C.growth, 0.26)); gr.addColorStop(1, rgba(C.growth, 0));
    ctx.fillStyle = gr; ctx.fill(area);
    ctx.strokeStyle = C.forest; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke(path);

    /* événements marquants, révélés au passage de la tête */
    ctx.font = '600 11.5px "Plus Jakarta Sans", system-ui, sans-serif';
    EVENTS.forEach(function (e, k) {
      var idx = -1; for (var q = 0; q < labels.length; q++) if (labels[q].key === e[0]) { idx = q; break; }
      if (idx < 0 || idx > head) return;
      var a = Math.min(1, (head - idx) / 12), ex = g.x(idx), ey = g.y(vals[idx]);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.teal; ctx.stroke();
      ctx.fillStyle = C.tealInk; ctx.textAlign = k === 0 ? 'left' : 'center'; ctx.fillText(e[1], ex + (k === 0 ? -6 : 0), k === 0 ? ey - 14 : ey + 22); ctx.globalAlpha = 1;
    });

    /* curseur de lecture : suit la souris, sinon glisse lentement le long de l'historique */
    if (prog >= 1 && !reduce || hover !== null) {
      var ci = hover !== null ? hover : (0.5 - 0.5 * Math.cos((t - introDur / 1000) * 2 * Math.PI / 26)) * (n - 1);
      var c0 = Math.floor(ci), c1 = Math.min(n - 1, c0 + 1), cf = ci - c0, cv = vals[c0] + (vals[c1] - vals[c0]) * cf, cx = g.x(ci), cy = g.y(cv);
      ctx.strokeStyle = rgba(C.teal, 0.6); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(cx, g.T); ctx.lineTo(cx, H - g.B); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.forest; ctx.stroke();
      var lb = labels[Math.round(ci)];
      if (tip) { tip.hidden = false; tip.textContent = MOIS[lb.m] + ' ' + lb.a + ' · ' + nf.format(vals[Math.round(ci)]) + ' pts'; var tw = tip.offsetWidth; tip.style.transform = 'translate(' + Math.max(0, Math.min(W - tw, cx - tw / 2)) + 'px,' + Math.max(0, cy - 46) + 'px)'; }
    } else if (tip) tip.hidden = true;

    /* tête de la courbe : la flèche Ingenia, avec une onde turquoise */
    var pulse = reduce ? 0 : (t % 2.4) / 2.4;
    ctx.beginPath(); ctx.arc(hx, hy, 6 + pulse * 16, 0, Math.PI * 2); ctx.strokeStyle = rgba(C.teal, 0.55 * (1 - pulse)); ctx.lineWidth = 1.5; ctx.stroke();
    if (window.IngeniaArrow) window.IngeniaArrow(ctx, hx, hy, 34);

    /* compteur pendant l'intro */
    if (prog < 1) { setText('[data-tsx-val]', nf.format(vals[Math.min(n - 1, Math.round(head))])); }
    else if (!fig._final) { fig._final = true; setData(D); }
  }
  function loop(now) { if (!running) return; draw(now); requestAnimationFrame(loop); }
  function play() { if (reduce || running || !visible || document.hidden || !geo) return; running = true; if (!start) start = performance.now(); requestAnimationFrame(loop); }
  function pause() { running = false; }

  /* Survol / toucher : lecture d'un mois précis */
  function pick(e) {
    if (!geo) return; var r = canvas.getBoundingClientRect(), px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    hover = Math.max(0, Math.min(vals.length - 1, (px - geo.L) / (W - geo.L - geo.R) * (vals.length - 1)));
    if (!running) draw(performance.now());
  }
  canvas.addEventListener('pointermove', pick); canvas.addEventListener('pointerdown', pick);
  canvas.addEventListener('pointerleave', function () { hover = null; if (!running) draw(performance.now()); });

  /* Données : fichier à jour, sinon copie intégrée */
  var embedded = null; try { embedded = JSON.parse(document.getElementById('tsx-data').textContent); } catch (e) { }
  function boot(d) { setData(d); if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? play() : pause(); }, { threshold: 0.25 }).observe(fig); else { visible = true; play(); } if (reduce) draw(performance.now()); }
  var url = 'assets/data/tsx.json?v=' + new Date().toISOString().slice(0, 10);
  (window.fetch && location.protocol !== 'file:' ? fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }) : Promise.reject())
    .then(function (d) { if (!d || !d.clotures || d.clotures.length < 100) throw 0; if (embedded && embedded.clotures.length > d.clotures.length) d = embedded; boot(d); })
    .catch(function () { if (embedded) boot(embedded); });
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(canvas); else window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
})();
