/* Ingenia — export PDF des outils financiers (jsPDF chargé seulement au premier clic) */
(function () {
  'use strict';
  var COL = { forest: '#002E1C', growth: '#78C042', teal: '#6BBFE1', tealInk: '#085A75', ink: '#0E1F17', ink2: '#3D5047', ink3: '#4A5C53', line: '#DDE5E0', mist: '#F3F6F4', onForest: '#C9D8CF' };
  var DISCLAIMER = 'Résultats fournis à titre indicatif seulement. Les calculs d’impôt utilisent les paramètres fiscaux 2026 pour un résident du Québec et ne tiennent compte que du montant personnel de base. Les rendements ne sont pas garantis et les résultats ne constituent pas une recommandation.';
  var LEGAL = 'Ingenia Groupe Financier exerce ses activités sous la supervision de SFL Placements, cabinet de services financiers, et de SFL Gestion de patrimoine.';
  var CONTACT = 'Ingenia Groupe Financier · 825, boul. Lebourgneuf, bureau 500, Québec (Québec) G2J 0B9 · 418 627-4447, poste 273 · info@ingeniagf.ca · ingeniagf.ca';

  function clean(t) { return String(t == null ? '' : t).replace(/[  ]/g, ' ').replace(/\s+/g, function (m) { return m.indexOf(' ') >= 0 ? ' ' : ' '; }).trim(); }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function imageData(src, w, h, bg) {
    return new Promise(function (res, rej) {
      var img = new Image(); img.onload = function () {
        var c = document.createElement('canvas'); c.width = w || img.naturalWidth; c.height = h || img.naturalHeight;
        var x = c.getContext('2d'); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(img, 0, 0, c.width, c.height); res({ data: bg ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png'), w: c.width, h: c.height });
      }; img.onerror = rej; img.src = src;
    });
  }
  function svgImage(svg) {
    var vb = svg.viewBox.baseVal, k = 3, clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', vb.width * k); clone.setAttribute('height', vb.height * k);
    var src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    return imageData(src, vb.width * k, vb.height * k, '#FFFFFF').then(function (r) { r.ratio = vb.height / vb.width; return r; });
  }

  /* Ressources chargées par balises <script> : fonctionne en ligne comme en ouvrant le fichier localement */
  var assets = null;
  function prepare() {
    if (assets) return assets;
    assets = Promise.all([
      window.jspdf ? null : loadScript('assets/js/vendor/jspdf.umd.min.js'),
      window.IngeniaPdfAssets ? null : loadScript('assets/js/vendor/pdf-assets.js')
    ]).then(function () {
      var A = window.IngeniaPdfAssets;
      return { reg: A.reg, semi: A.semi, logo: { data: A.logo, w: A.logoW, h: A.logoH } };
    });
    assets.catch(function () { assets = null; });
    return assets;
  }

  function collect(sec) {
    var d = { key: sec.id, title: clean(sec.querySelector('h2').textContent), desc: clean((sec.querySelector('.tool__head div p') || {}).textContent), inputs: [], results: [], legend: [], head: [], rows: [] };
    Array.prototype.forEach.call(sec.querySelectorAll('.tool__form > .field, .tool__form > fieldset'), function (f) {
      if (f.hidden || (f.classList.contains('is-cond') && !sec.classList.contains('show-cond'))) return;
      if (f.tagName === 'FIELDSET') { var c = f.querySelector('input:checked'); d.inputs.push([clean(f.querySelector('legend').textContent), c ? clean(f.querySelector('label[for="' + c.id + '"]').textContent) : '']); return; }
      var el = f.querySelector('input, select'), lab = clean(f.querySelector('label').textContent) + (f.classList.contains('is-solved') ? ' (calculé)' : ''), v;
      if (el.tagName === 'SELECT') v = el.options[el.selectedIndex].text;
      else {
        var unit = clean((f.querySelector('.unit-input span') || {}).textContent), n = parseFloat(String(el.value).replace(',', '.')) || 0;
        v = unit === '$' ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }) : unit ? n.toLocaleString('fr-CA', { maximumFractionDigits: 2 }) + ' ' + unit : String(Math.round(n));
      }
      d.inputs.push([lab, clean(v)]);
    });
    Array.prototype.forEach.call(sec.querySelectorAll('.tool__res .res'), function (r) { if (r.hidden) return; d.results.push([clean(r.querySelector('dt').textContent), clean(r.querySelector('dd').textContent), r.classList.contains('res--main')]); });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-chart] .legend-inline span'), function (s) { d.legend.push([clean(s.textContent), s.querySelector('i').style.background]); });
    var t = sec.querySelector('.tool__table table');
    if (t) {
      d.head = Array.prototype.map.call(t.querySelectorAll('thead th'), function (th) { return clean(th.textContent); });
      d.rows = Array.prototype.map.call(t.querySelectorAll('tbody tr'), function (tr) { return Array.prototype.map.call(tr.children, function (c) { return clean(c.textContent); }); });
    }
    d.svg = sec.querySelector('[data-chart] svg');
    return d;
  }

  function build(a, d, chart) {
    var J = window.jspdf.jsPDF, doc = new J({ unit: 'pt', format: 'letter', compress: true }), W = 612, H = 792, M = 48, CW = W - 2 * M, FOOT = 92;
    doc.addFileToVFS('PJS-R.ttf', a.reg); doc.addFont('PJS-R.ttf', 'PJS', 'normal');
    doc.addFileToVFS('PJS-S.ttf', a.semi); doc.addFont('PJS-S.ttf', 'PJS', 'bold');
    doc.setProperties({ title: d.title + ' — Ingenia Groupe Financier', author: 'Ingenia Groupe Financier', subject: 'Outils financiers', creator: 'ingeniagf.ca' });
    function font(w, size, color) { doc.setFont('PJS', w === 'b' ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color || COL.ink); }
    var dateStr = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
    function header() {
      var lw = 118, lh = lw * a.logo.h / a.logo.w;
      doc.addImage(a.logo.data, 'PNG', M, 36, lw, lh, 'logo', 'FAST');
      font('b', 9, COL.tealInk); doc.text('Outils financiers', W - M, 48, { align: 'right' });
      font('r', 8.5, COL.ink3); doc.text('Préparé le ' + dateStr, W - M, 61, { align: 'right' });
      doc.setDrawColor(COL.growth); doc.setLineWidth(1.6); doc.line(M, 86, W - M, 86);
      return 116;
    }
    var y = header();
    function ensure(h) { if (y + h > H - FOOT) { doc.addPage(); y = header(); return true; } return false; }

    font('b', 22, COL.forest); doc.text(d.title, M, y); y += 18;
    font('r', 10.5, COL.ink3); var dl = doc.splitTextToSize(d.desc, CW); doc.text(dl, M, y + 4); y += dl.length * 14 + 18;

    /* Hypothèses (gauche) et résultats (droite) */
    var LX = M, LW = 244, RX = M + 268, RW = CW - 268, y0 = y;
    font('b', 9, COL.tealInk); doc.text('VOS HYPOTHÈSES', LX, y); doc.text('RÉSULTATS', RX, y);
    var ly = y + 10;
    d.inputs.forEach(function (p) {
      font('r', 9, COL.ink3); var lab = doc.splitTextToSize(p[0], LW - 100);
      doc.text(lab, LX, ly + 14); font('b', 10, COL.ink); doc.text(p[1], LX + LW, ly + 14, { align: 'right' });
      ly += Math.max(22, lab.length * 11 + 11); doc.setDrawColor(COL.line); doc.setLineWidth(0.6); doc.line(LX, ly, LX + LW, ly);
    });
    var ry = y + 10;
    d.results.forEach(function (r) {
      if (r[2]) {
        doc.setFillColor(COL.mist); doc.roundedRect(RX, ry, RW, 66, 6, 6, 'F');
        font('r', 9, COL.ink3); doc.text(r[0], RX + 14, ry + 22);
        var size = 24; font('b', size, COL.forest); while (doc.getTextWidth(r[1]) > RW - 28 && size > 14) { size -= 1; doc.setFontSize(size); }
        doc.text(r[1], RX + 14, ry + 50); ry += 74;
      } else {
        font('r', 9, COL.ink3); var lab = doc.splitTextToSize(r[0], RW - 120); doc.text(lab, RX, ry + 14);
        font('b', 10.5, COL.ink); var val = doc.splitTextToSize(r[1], 150); doc.text(val, RX + RW, ry + 14, { align: 'right' });
        ry += Math.max(22, Math.max(lab.length, val.length) * 12 + 10); doc.setDrawColor(COL.line); doc.setLineWidth(0.6); doc.line(RX, ry, RX + RW, ry);
      }
    });
    y = Math.max(ly, ry) + 28;

    /* Graphique */
    if (chart) {
      var ch = Math.min(200, CW * chart.ratio), cw = ch / chart.ratio;
      ensure(ch + 50);
      font('b', 9, COL.tealInk); doc.text('GRAPHIQUE', M, y); y += 10;
      doc.addImage(chart.data, 'JPEG', M, y, cw, ch); y += ch + 14;
      var lx = M; d.legend.forEach(function (l) { doc.setFillColor(l[1] || COL.forest); doc.roundedRect(lx, y - 7, 8, 8, 1.5, 1.5, 'F'); font('r', 9, COL.ink2); doc.text(l[0], lx + 13, y); lx += doc.getTextWidth(l[0]) + 34; });
      y += 28;
    }

    /* Tableau détaillé */
    if (d.rows.length) {
      var cols = d.head.length, first = Math.min(150, CW / cols * 1.1), rest = (CW - first) / (cols - 1), RH = 17;
      var colX = function (i) { return i === 0 ? M + 8 : M + first + rest * i - 8; };
      var thead = function () {
        doc.setFillColor(COL.forest); doc.rect(M, y, CW, RH + 3, 'F'); font('b', 8.5, '#FFFFFF');
        d.head.forEach(function (h, i) { doc.text(h, colX(i), y + 12.5, { align: i ? 'right' : 'left' }); }); y += RH + 3;
      };
      ensure(70); font('b', 9, COL.tealInk); doc.text('TABLEAU DÉTAILLÉ', M, y); y += 10; thead();
      d.rows.forEach(function (row, k) {
        if (ensure(RH)) thead();
        if (k % 2) { doc.setFillColor(COL.mist); doc.rect(M, y, CW, RH, 'F'); }
        font('r', 8.5, COL.ink); row.forEach(function (c, i) { doc.text(c, colX(i), y + 11.5, { align: i ? 'right' : 'left' }); }); y += RH;
      });
      y += 24;
    }

    /* Invitation */
    ensure(92);
    doc.setFillColor(COL.forest); doc.roundedRect(M, y, CW, 80, 8, 8, 'F');
    font('b', 13, '#FFFFFF'); doc.text('Allons plus loin, ensemble.', M + 20, y + 26);
    font('r', 9.5, COL.onForest); doc.text(doc.splitTextToSize('Ces résultats sont une estimation. Un premier entretien de 45 minutes, sans frais ni engagement, permet de les appliquer à votre situation réelle.', CW - 40), M + 20, y + 44);
    font('b', 9.5, COL.growth); doc.textWithLink('Réserver un entretien : ingeniagf.ca/contact.html', M + 20, y + 68, { url: 'https://ingeniagf.ca/contact.html#rdv' });

    /* Pied de page sur chaque page */
    var n = doc.getNumberOfPages();
    for (var p = 1; p <= n; p++) {
      doc.setPage(p); var fy = H - 76;
      doc.setDrawColor(COL.line); doc.setLineWidth(0.6); doc.line(M, fy, W - M, fy);
      font('r', 7, COL.ink3); var dis = doc.splitTextToSize(DISCLAIMER + ' ' + LEGAL, CW - 60); doc.text(dis, M, fy + 12);
      font('b', 7, COL.ink2); doc.text(CONTACT, M, fy + 14 + dis.length * 8.5 + 4, { maxWidth: CW - 60 });
      font('r', 7.5, COL.ink3); doc.text(p + ' / ' + n, W - M, fy + 12, { align: 'right' });
    }
    return doc;
  }

  function onClick(e) {
    var btn = e.currentTarget, sec = btn.closest('.tool'), label = btn.querySelector('span');
    var old = label.textContent; btn.disabled = true; label.textContent = 'Préparation du PDF…';
    var d = collect(sec);
    var chartP = d.svg ? svgImage(d.svg).catch(function () { return null; }) : null;
    Promise.all([prepare(), chartP]).then(function (r) {
      var doc = build(r[0], d, r[1]);
      doc.save('ingenia-' + d.key + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
      label.textContent = old;
    }).catch(function (err) {
      if (window.console) console.error(err);
      label.textContent = 'Réessayer';
    }).then(function () { btn.disabled = false; });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-pdf]'), function (b) { b.addEventListener('click', onClick); });
  /* Préchargement discret au survol pour un PDF quasi instantané */
  Array.prototype.forEach.call(document.querySelectorAll('[data-pdf]'), function (b) { b.addEventListener('pointerenter', function () { prepare(); }, { once: true }); });
})();
