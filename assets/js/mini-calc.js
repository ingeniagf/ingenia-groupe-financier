/* Ingenia — calculs rapides de la page Services : valeur économique (protection) et revenu de retraite */
(function () {
  'use strict';
  var money = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  var nb = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  function k(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('fr-CA', { maximumFractionDigits: 1 }) + ' M$' : nb.format(v / 1000) + ' k$'; }
  function read(form) {
    var o = {};
    Array.prototype.forEach.call(form.querySelectorAll('input'), function (el) {
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; return; }
      var v = parseFloat(String(el.value).replace(',', '.')); o[el.name] = isFinite(v) ? v : 0;
    });
    return o;
  }
  function out(box, key, v) { var el = box.querySelector('[data-out="' + key + '"]'); if (el) el.textContent = v; }

  /* Histogramme SVG : une barre par année, apparition en cascade */
  function bars(fig, values, labels, accentLast, alt) {
    var W = Math.max(280, Math.round(fig.clientWidth || 520)), H = 190, L = 46, R = 8, T = 10, B = 26;
    var n = values.length; if (!n) { fig.innerHTML = ''; return; }
    var max = Math.max.apply(null, values), step = Math.pow(10, Math.floor(Math.log10(max || 1))), top = Math.ceil(max * 1.05 / step) * step;
    if (top / step > 6) { step *= 2; top = Math.ceil(max * 1.05 / step) * step; }
    var bw = (W - L - R) / n, gap = Math.min(4, bw * 0.25), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + alt + '">';
    for (var g = 0; g <= top + 1e-6; g += step) { var gy = T + (H - T - B) * (1 - g / top); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="#DDE5E0"/><text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#4A5C53" font-family="Plus Jakarta Sans, sans-serif">' + k(g) + '</text>'; }
    var every = Math.max(1, Math.ceil(n / 8));
    values.forEach(function (v, i) {
      var h = (H - T - B) * v / top, x = L + i * bw + gap / 2, y = T + (H - T - B) - h, last = accentLast && i === n - 1;
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - gap).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (last ? '#78C042' : i % 2 ? '#0A3D28' : '#002E1C') + '" style="--i:' + i + '"/>';
      if (i % every === 0 || (i === n - 1 && (n - 1) % every > every / 2)) s += '<text x="' + (x + (bw - gap) / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#4A5C53" font-family="Plus Jakarta Sans, sans-serif">' + labels[i] + '</text>';
    });
    fig.innerHTML = s + '</svg>';
  }

  var CALCS = {
    vie: function (box, o) {
      var n = Math.max(0, Math.round(o.retraite - o.age)), g = o.croissance / 100, vals = [], labels = [], tot = 0;
      for (var i = 0; i < n; i++) { var v = o.salaire * Math.pow(1 + g, i); vals.push(v); labels.push(o.age + i); tot += v; }
      out(box, 'total', money.format(tot)); out(box, 'annees', n + ' an' + (n > 1 ? 's' : ''));
      out(box, 'dernier', n ? money.format(vals[n - 1]) : '—');
      bars(box.querySelector('[data-chart]'), vals, labels, true, 'Revenus annuels projetés de ' + o.age + ' à ' + (o.retraite - 1) + ' ans, pour un total de ' + money.format(tot));
    },
    retraite: function (box, o) {
      var esp = o.sexe === 'f' ? 96 : 94, avant = Math.max(0, o.retraite - o.age), i = o.inflation / 100;
      var auj = o.revenu * o.remplacement / 100, annuel = auj * Math.pow(1 + i, avant), duree = Math.max(0, esp - o.retraite), vals = [], labels = [], tot = 0;
      for (var y = 0; y < duree; y++) { var v = annuel * Math.pow(1 + i, y); vals.push(v); labels.push(o.retraite + y); tot += v; }
      out(box, 'annuel', money.format(annuel)); out(box, 'aujourdhui', money.format(auj) + ' / an');
      out(box, 'duree', duree + ' ans (jusqu’à ' + esp + ' ans)'); out(box, 'total', money.format(tot));
      bars(box.querySelector('[data-chart]'), vals, labels, false, 'Revenu annuel à financer de ' + o.retraite + ' à ' + esp + ' ans, pour un total de ' + money.format(tot));
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-mini]'), function (box) {
    var f = box.querySelector('form'), fn = CALCS[box.dataset.mini]; if (!f || !fn) return;
    var run = function () { try { fn(box, read(f)); } catch (e) { } };
    f.addEventListener('input', run); f.addEventListener('change', run); run();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(run, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en, ob) { if (en[0].isIntersecting) { box.classList.add('is-in'); ob.disconnect(); } }, { threshold: 0.3 }).observe(box);
    else box.classList.add('is-in');
  });
})();

/* Fiscalité : lecture interactive du taux marginal en glissant sur le graphique */
(function () {
  'use strict';
  var svg = document.querySelector('[data-marg]'); if (!svg || !window.IngeniaCalc) return;
  var d = svg.dataset, L = +d.l, R = +d.r, T = +d.t, B = +d.b, W = +d.w, H = +d.h, MAX = +d.max, TOP = +d.top;
  var iw = W - L - R, ih = H - T - B, cur = svg.querySelector('.mc'), v = svg.querySelector('.mc__v'), p = svg.querySelector('.mc__p');
  var lab = svg.querySelector('.mc__lab'), t1 = svg.querySelector('.mc__t1'), t2 = svg.querySelector('.mc__t2'), marks = svg.querySelectorAll('.mk');
  var money = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  var pct = function (x) { return (x * 100).toLocaleString('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; };
  function show(e) {
    var pt = svg.createSVGPoint(); pt.x = e.touches ? e.touches[0].clientX : e.clientX; pt.y = 0;
    var x = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
    x = Math.max(L, Math.min(L + iw, x));
    var rev = Math.round((x - L) / iw * MAX / 500) * 500, r = IngeniaCalc.impot(rev), m = r.marginal, y = T + ih * (1 - m / TOP);
    cur.style.display = ''; Array.prototype.forEach.call(marks, function (k) { k.style.opacity = '.25'; });
    v.setAttribute('x1', x); v.setAttribute('x2', x); p.setAttribute('cx', x); p.setAttribute('cy', y);
    t1.textContent = 'Revenu : ' + money.format(rev) + ' · ' + pct(m);
    t2.textContent = 'Chaque 1 000 $ au REER : ≈ ' + money.format(m * 1000) + ' d’économie';
    var bw = 196; try { bw = Math.ceil(Math.max(t1.getComputedTextLength(), t2.getComputedTextLength())) + 24; } catch (err) { }
    lab.querySelector('rect').setAttribute('width', bw);
    var lx = x + 12, ly = Math.max(T, y - 56);
    if (lx + bw > W - R) lx = x - 12 - bw;
    lx = Math.max(0, lx);
    lab.setAttribute('transform', 'translate(' + lx + ',' + ly + ')');
  }
  function hide() { cur.style.display = 'none'; Array.prototype.forEach.call(marks, function (k) { k.style.opacity = ''; }); }
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', hide);
})();
