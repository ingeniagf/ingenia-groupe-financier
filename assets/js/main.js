/* Ingenia Groupe Financier — interactions du site (sans dépendance) */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* En-tête : ombre discrète au défilement */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menu mobile */
  var toggle = $('.menu-toggle'), nav = $('#site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  /* Espace client : menu déroulant */
  var pBtn = $('.portal__btn'), pMenu = $('#portal-menu');
  if (pBtn && pMenu) {
    var pSet = function (open) { pBtn.setAttribute('aria-expanded', String(open)); pMenu.hidden = !open; };
    pBtn.addEventListener('click', function (e) { e.stopPropagation(); var open = pBtn.getAttribute('aria-expanded') !== 'true'; pSet(open); if (open) { var f = $('a', pMenu); if (f) f.focus(); } });
    document.addEventListener('click', function (e) { if (!pMenu.hidden && !pMenu.contains(e.target)) pSet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pMenu.hidden) { pSet(false); pBtn.focus(); } });
    pMenu.addEventListener('focusout', function (e) { if (!pMenu.contains(e.relatedTarget) && e.relatedTarget !== pBtn) pSet(false); });
  }

  /* Planche de l'accueil : longueur exacte du tracé pour l'animation */
  $$('.plan .curve').forEach(function (p) { if (p.getTotalLength) p.style.setProperty('--len', Math.ceil(p.getTotalLength())); });

  /* Apparition douce des éléments marqués data-reveal */
  var reveals = $$('[data-reveal]');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io0 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io0.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
      reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 90 + 'ms'; io0.observe(el); });
    } else { reveals.forEach(function (el) { el.classList.add('is-in'); }); }
  }

  /* Services : sous-navigation qui suit la section visible */
  var subLinks = $$('.subnav a');
  if (subLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    subLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          subLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
          var link = map[en.target.id];
          if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); var ul = link.closest('ul'); if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollTo({ left: link.offsetLeft - ul.clientWidth / 2 + link.offsetWidth / 2, behavior: 'smooth' }); }
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* Approche : progression du récit */
  var chapters = $$('.chapter'), rail = $('.story__progress');
  if (chapters.length && rail && 'IntersectionObserver' in window) {
    var links = $$('a', rail);
    var setStep = function (i) {
      links.forEach(function (a, k) { a.classList.toggle('is-active', k === i); a.classList.toggle('is-done', k < i); if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      rail.style.setProperty('--progress', (links.length > 1 ? (i / (links.length - 1)) * 100 : 0) + '%');
    };
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setStep(chapters.indexOf(en.target)); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    chapters.forEach(function (c) { io2.observe(c); });
    setStep(0);
  }

  /* Formulaire de prise de rendez-vous : courriel prérempli (aucun serveur requis) */
  var form = $('#rdv-form');
  /* Cellulaire obligatoire : 10 chiffres (format nord-américain), mis en forme « 418 555-1234 » */
  var tel = form && $('#telephone', form), telAide = form && $('#tel-aide', form);
  var telAideTexte = telAide ? telAide.textContent : '';
  function chiffresTel(v) { var d = (v || '').replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d; }
  function validerTel(montrer) {
    var d = chiffresTel(tel.value), msg = '';
    if (!d.length) msg = 'Indiquez votre numéro de cellulaire pour que nous puissions vous joindre.';
    else if (d.length !== 10) msg = 'Le numéro doit compter 10 chiffres, par exemple 418 555-1234.';
    tel.setCustomValidity(msg);
    if (montrer || !msg) {
      tel.classList.toggle('is-invalid', !!msg);
      tel.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (telAide) { telAide.textContent = msg || telAideTexte; telAide.classList.toggle('is-error', !!msg); }
    }
    return !msg;
  }
  if (tel) {
    tel.addEventListener('input', function () { validerTel(false); });
    tel.addEventListener('blur', function () {
      var d = chiffresTel(tel.value);
      if (d.length === 10) tel.value = d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6);
      if (tel.value) validerTel(true);
    });
  }
  if (form) {
    form.addEventListener('submit', function (e) {
      var status = $('.form-status', form);
      if (tel) validerTel(true);
      if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); return; }
      if (form.getAttribute('action')) return; // un service de formulaire est branché : envoi normal
      e.preventDefault();
      var d = new FormData(form), profil = d.get('profil') || '';
      var body = [
        'Prénom : ' + d.get('prenom'),
        'Nom : ' + d.get('nom'),
        'Courriel : ' + d.get('courriel'),
        'Cellulaire : ' + d.get('telephone'),
        'Profil : ' + profil,
        'Moment préféré : ' + (d.get('moment') || '—'),
        '',
        (d.get('message') || '')
      ].join('\n');
      var subject = 'Demande d’entretien — ' + d.get('prenom') + ' ' + d.get('nom');
      window.location.href = 'mailto:info@ingeniagf.ca?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (status) { status.textContent = 'Votre logiciel de courriel s’ouvre avec votre demande. Envoyez-la pour confirmer.'; status.classList.remove('is-error'); }
    });
  }

  /* Champs numériques : un clic sélectionne la valeur, la saisie la remplace */
  var isNum = function (el) { return el && el.tagName === 'INPUT' && (el.type === 'number' || el.inputMode === 'decimal'); };
  document.addEventListener('focusin', function (e) {
    var el = e.target; if (!isNum(el)) return;
    el._justFocused = true;
    setTimeout(function () { try { el.select(); } catch (err) { } }, 0);
  });
  /* Empêche le relâchement du clic d'annuler la sélection juste après la prise de focus */
  document.addEventListener('mouseup', function (e) { var el = e.target; if (isNum(el) && el._justFocused) { e.preventDefault(); el._justFocused = false; try { el.select(); } catch (err) { } } }, true);
  document.addEventListener('focusout', function (e) { if (isNum(e.target)) e.target._justFocused = false; });

  /* Année courante dans le pied de page */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* Flèche de la marque Ingenia, dessinée sur canevas (même tracé que le logo) */
window.IngeniaArrow = function (ctx, x, y, size, angle) {
  var path = window.Path2D ? new Path2D('M107 122.5 217 19.5H411V214L308.5 320V122.5Z') : null;
  if (!path) return;
  var k = size / 320;
  ctx.save();
  ctx.translate(x, y); if (angle) ctx.rotate(angle);
  ctx.scale(k, k); ctx.translate(-200, -215); /* la courbe entre dans la flèche par le bas, à gauche */
  var g = ctx.createLinearGradient(107, 320, 411, 19.5);
  g.addColorStop(0, '#60A749'); g.addColorStop(1, '#8CCB5A');
  ctx.fillStyle = g; ctx.fill(path);
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,46,28,.55)'; ctx.lineJoin = 'round'; ctx.stroke(path);
  ctx.restore();
};

/* Hero : visualisation animée sur canevas (grille, lignes de construction, série qui évolue doucement) */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-viz');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  var C = {
    forest: (css.getPropertyValue('--forest') || '#002E1C').trim(),
    growth: (css.getPropertyValue('--growth') || '#78C042').trim(),
    teal: (css.getPropertyValue('--teal') || '#6BBFE1').trim()
  };
  function rgba(hex, a) { var n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  var W = 0, H = 0, dpr = 1;
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) draw(performance.now());
  }

  /* Série : marche aléatoire à dérive positive, lissée (pseudo-aléatoire reproductible) */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var N = 26, vals = [], v = 100;
  function nextVal() { v = v * (1 + 0.009 + (rnd() - 0.45) * 0.05); return v; }
  for (var i = 0; i < N; i++) vals.push(nextVal());
  var bars = vals.map(function () { return 0.25 + rnd() * 0.75; });
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);

  /* Carreaux qui s'illuminent brièvement */
  var tiles = [];
  var STEP = 2600, start = performance.now(), last = start;

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var t = (now - start) / 1000;
    var cell = 28, drift = reduce ? 0 : (t * 4) % cell;

    /* Grille fine qui glisse lentement */
    ctx.lineWidth = 1;
    for (var x = -cell + drift, k = 0; x < W + cell; x += cell, k++) {
      ctx.strokeStyle = rgba(C.teal, (Math.round((x - drift) / cell) % 5 === 0) ? 0.22 : 0.10);
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); ctx.stroke();
    }
    for (var y = 0, j = 0; y < H + cell; y += cell, j++) {
      ctx.strokeStyle = rgba(C.teal, j % 5 === 0 ? 0.22 : 0.10);
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); ctx.stroke();
    }
    if (!reduce && rnd() < 0.03 && tiles.length < 7) tiles.push({ c: Math.floor(rnd() * (W / cell)), r: Math.floor(rnd() * (H / cell)), b: t });
    tiles = tiles.filter(function (p) {
      var a = t - p.b; if (a > 4) return false;
      ctx.fillStyle = rgba(C.teal, 0.14 * Math.sin(Math.PI * a / 4));
      ctx.fillRect(p.c * cell + drift + 1, p.r * cell + 1, cell - 1, cell - 1);
      return true;
    });

    /* Zone de tracé */
    var padL = W > 700 ? W * 0.24 : W * 0.06, padR = W * 0.08, top = H * 0.16, bot = H * 0.72;
    var frac = reduce ? 0 : Math.min((now - last) / STEP, 1);
    var ease = frac < .5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2;
    var stepX = (W - padL - padR) / (N - 2);
    var tlo = Math.min.apply(null, vals), thi = Math.max.apply(null, vals);
    lo += (tlo - lo) * 0.04; hi += (thi - hi) * 0.04;
    function px(i) { return padL + (i - ease) * stepX; }
    function py(val) { return bot - (val - lo) / ((hi - lo) || 1) * (bot - top); }

    /* Lignes de construction et cote */
    ctx.setLineDash([2, 5]); ctx.strokeStyle = rgba(C.teal, 0.55);
    ctx.beginPath(); ctx.moveTo(padL, top - 18); ctx.lineTo(W - padR * 0.4, top - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - padR, 0); ctx.lineTo(W - padR, H); ctx.stroke();
    ctx.setLineDash([]);
    var dimY = H * 0.86;
    ctx.strokeStyle = rgba(C.forest, 0.35);
    ctx.beginPath(); ctx.moveTo(padL, dimY); ctx.lineTo(W - padR, dimY); ctx.stroke();
    [padL, W - padR].forEach(function (xx) { ctx.beginPath(); ctx.moveTo(xx, dimY - 6); ctx.lineTo(xx, dimY + 6); ctx.stroke(); });
    for (var m = 0; m <= 10; m++) { var mx = padL + (W - padL - padR) * m / 10; ctx.beginPath(); ctx.moveTo(mx, dimY); ctx.lineTo(mx, dimY - (m % 5 ? 3 : 6)); ctx.stroke(); }

    /* Barres (volume) */
    ctx.fillStyle = rgba(C.growth, 0.28);
    for (var b = 0; b < N; b++) { var bx = px(b); if (bx < padL - 2 || bx > W - padR + 2) continue; var bh = bars[b] * (H * 0.09); ctx.fillRect(bx - 2, dimY - 10 - bh, 4, bh); }

    /* Courbe principale + aire */
    ctx.save(); ctx.beginPath(); ctx.rect(padL, 0, W - padL - padR, H); ctx.clip();
    var pts = vals.map(function (val, i2) { return [px(i2), py(val)]; });
    function path() {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var q = 0; q < pts.length - 1; q++) { var a = pts[q - 1] || pts[q], p0 = pts[q], p1 = pts[q + 1], d = pts[q + 2] || p1; ctx.bezierCurveTo(p0[0] + (p1[0] - a[0]) / 6, p0[1] + (p1[1] - a[1]) / 6, p1[0] - (d[0] - p0[0]) / 6, p1[1] - (d[1] - p0[1]) / 6, p1[0], p1[1]); }
    }
    var g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, rgba(C.growth, 0.22)); g.addColorStop(1, rgba(C.growth, 0));
    ctx.beginPath(); path(); ctx.lineTo(pts[pts.length - 1][0], bot); ctx.lineTo(pts[0][0], bot); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); path(); ctx.strokeStyle = C.forest; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
    /* Tendance lissée (moyenne mobile) en turquoise */
    ctx.beginPath();
    for (var s = 0; s < pts.length; s++) {
      var a0 = Math.max(0, s - 4), sum = 0; for (var z = a0; z <= s; z++) sum += vals[z];
      var yy = py(sum / (s - a0 + 1)); if (s === 0) ctx.moveTo(pts[s][0], yy); else ctx.lineTo(pts[s][0], yy);
    }
    ctx.setLineDash([6, 6]); ctx.strokeStyle = rgba(C.teal, 0.95); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    /* Ligne de lecture qui balaie et point courant */
    var sweep = reduce ? 0.72 : (Math.sin(t * 0.18) * 0.5 + 0.5) * 0.85 + 0.05;
    var sx = padL + (W - padL - padR) * sweep, idx = Math.min(pts.length - 2, Math.max(0, Math.floor((sx - pts[0][0]) / stepX)));
    var f = (sx - pts[idx][0]) / stepX, sy = pts[idx][1] + (pts[idx + 1][1] - pts[idx][1]) * Math.max(0, Math.min(1, f));
    ctx.strokeStyle = rgba(C.teal, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, top - 18); ctx.lineTo(sx, dimY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, sy); ctx.lineTo(W - padR, sy); ctx.strokeStyle = rgba(C.teal, 0.25); ctx.stroke();
    /* Point de tête de la courbe : la flèche de la marque, posée au bord droit du tracé */
    var hx = W - padR, hi2 = 0;
    while (hi2 < pts.length - 2 && pts[hi2 + 1][0] < hx) hi2++;
    var a0 = pts[hi2], a1 = pts[hi2 + 1], hf = Math.max(0, Math.min(1, (hx - a0[0]) / ((a1[0] - a0[0]) || 1))), hy = a0[1] + (a1[1] - a0[1]) * hf;
    var pulse = reduce ? 0 : (t % 2.4) / 2.4;
    ctx.beginPath(); ctx.arc(hx, hy, 6 + pulse * 16, 0, Math.PI * 2); ctx.strokeStyle = rgba(C.teal, 0.55 * (1 - pulse)); ctx.lineWidth = 1.5; ctx.stroke();
    window.IngeniaArrow(ctx, hx, hy, 40);

    if (!reduce && now - last >= STEP) { last = now; vals.shift(); vals.push(nextVal()); bars.shift(); bars.push(0.25 + rnd() * 0.75); }
  }

  var running = false, visible = true;
  function loop(now) { if (!running) return; draw(now); requestAnimationFrame(loop); }
  function play() { if (reduce || running || !visible || document.hidden) return; running = true; last = performance.now() - (last ? 0 : 0); requestAnimationFrame(loop); }
  function pause() { running = false; }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
  if (reduce) { draw(performance.now()); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? play() : pause(); }).observe(canvas);
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
  play();
})();
