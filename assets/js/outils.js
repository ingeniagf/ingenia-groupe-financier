/* Ingenia — interface des outils financiers : onglets, calcul en direct, graphiques SVG et tableaux */
(function () {
  'use strict';
  var C = window.IngeniaCalc; if (!C) return;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var money0 = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var pct = new Intl.NumberFormat('fr-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nb = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  function kfmt(v) { var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toLocaleString('fr-CA', { maximumFractionDigits: 1 }) + ' M$' : a >= 1e3 ? nb.format(v / 1e3) + ' k$' : nb.format(v) + ' $'; }
  var COL = { forest: '#002E1C', growth: '#78C042', teal: '#6BBFE1', tealInk: '#085A75', grid: '#E3EAE6', ink3: '#4A5C53' };

  /* ---------- Lecture du formulaire ---------- */
  function read(form) {
    var o = {};
    $$('input, select', form).forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.tagName === 'SELECT') o[el.name] = +el.value;
      else { var v = parseFloat(String(el.value).replace(',', '.')); o[el.name] = isFinite(v) ? v : 0; }
    });
    return o;
  }
  function out(sec, k, v) { var el = $('[data-out="' + k + '"]', sec); if (el) el.textContent = v; }

  /* ---------- Graphique SVG générique ---------- */
  function niceStep(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function chart(fig, cfg) {
    var W = Math.max(300, Math.round(fig.clientWidth || 640)), H = W < 480 ? 240 : 300, L = 58, R = 16, T = 16, B = 36, iw = W - L - R, ih = H - T - B;
    var n = cfg.x.length, maxV = 0, minV = 0;
    cfg.series.forEach(function (s) { s.values.forEach(function (v, i) { var tot = s.stack ? cfg.series.filter(function (z) { return z.stack; }).reduce(function (a, z) { return a + z.values[i]; }, 0) : v; maxV = Math.max(maxV, tot); minV = Math.min(minV, v); }); });
    if (cfg.yMax) maxV = Math.max(maxV, cfg.yMax);
    var step = niceStep((maxV * 1.04 - minV) / 5), top = minV + Math.ceil((maxV * 1.04 - minV) / step) * step, ticks = Math.round((top - minV) / step), y = function (v) { return T + ih - (v - minV) / (top - minV) * ih; };
    var bw = iw / n, x = function (i) { return L + bw * i + bw / 2; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + String(cfg.alt || 'Graphique des résultats').replace(/"/g, '&quot;') + '">';
    for (var g = 0; g <= ticks; g++) { var gv = minV + step * g, gy = y(gv); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + COL.grid + '"/><text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="ax" font-size="11" fill="#4A5C53" font-family="Plus Jakarta Sans, Helvetica, Arial, sans-serif">' + (cfg.yfmt || kfmt)(gv) + '</text>'; }
    var every = Math.max(1, Math.ceil(n / 10));
    cfg.x.forEach(function (lab, i) { if (i % every === 0 || (i === n - 1 && (n - 1) % every > every / 2)) s += '<text x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle" class="ax" font-size="11" fill="#4A5C53" font-family="Plus Jakarta Sans, Helvetica, Arial, sans-serif">' + lab + '</text>'; });
    var base = cfg.x.map(function () { return 0; });
    cfg.series.forEach(function (se) {
      if (se.type === 'bars') {
        var w = Math.max(2, Math.min(28, bw * 0.62));
        se.values.forEach(function (v, i) { var b0 = se.stack ? base[i] : 0, y1 = y(b0 + v), y0 = y(b0); s += '<rect x="' + (x(i) - w / 2) + '" y="' + Math.min(y1, y0) + '" width="' + w + '" height="' + Math.abs(y0 - y1) + '" rx="2" fill="' + se.color + '"/>'; if (se.stack) base[i] += v; });
      } else {
        var d = se.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
        if (se.type === 'area') s += '<path d="' + d + ' L' + x(n - 1) + ' ' + y(Math.max(0, minV)) + ' L' + x(0) + ' ' + y(Math.max(0, minV)) + ' Z" fill="' + se.color + '" opacity=".14"/>';
        s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.width || 2.5) + '"' + (se.dash ? ' stroke-dasharray="6 5"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>';
      }
    });
    if (cfg.marker) { var mx = L + (cfg.marker.x) * iw, my = y(cfg.marker.y); s += '<line x1="' + mx + '" x2="' + mx + '" y1="' + T + '" y2="' + (T + ih) + '" stroke="' + COL.teal + '" stroke-dasharray="3 4"/><circle cx="' + mx + '" cy="' + my + '" r="6" fill="#fff" stroke="' + COL.forest + '" stroke-width="2.5"/>'; }
    s += '</svg>';
    var leg = '<figcaption class="legend-inline">' + cfg.series.filter(function (z) { return z.label; }).map(function (z) { return '<span><i style="background:' + z.color + '"></i>' + z.label + '</span>'; }).join('') + '</figcaption>';
    fig.innerHTML = s + leg;
  }
  function table(sec, head, rows) {
    var w = $('.tool__table .table-wrap', sec); if (!w) return;
    w.innerHTML = '<table class="compare compare--num"><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i ? '<td>' + c + '</td>' : '<th scope="row">' + c + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function cumul(arr) { var t = 0; return arr.map(function (v) { t += v; return t; }); }

  /* ---------- Les six outils ---------- */
  var TOOLS = {
    epargne: function (sec, o) {
      var nonEnr = o.compte === 'ne', cible = o.cible || 'solde';
      sec.classList.toggle('show-cond', nonEnr);
      var objF = $('[data-field="objectif"]', sec); if (objF) objF.hidden = cible === 'solde';
      var restored = false;
      ['initial', 'cotisation', 'dureeCotisation', 'dureeAccumulation', 'rendement'].forEach(function (k) {
        var f = $('[data-field="' + k + '"]', sec); if (!f) return; var on = k === cible, inp = $('input', f);
        // la valeur saisie est mise de côté pendant que le champ est calculé, puis rétablie
        if (on && !inp.readOnly) inp.dataset.saisie = inp.value;
        if (!on && inp.readOnly) { if (inp.dataset.saisie != null) { inp.value = inp.dataset.saisie; restored = true; } }
        f.classList.toggle('is-solved', on); inp.readOnly = on;
      });
      if (restored && sec._run) { sec._run(); return; }
      var params = { initial: o.initial, cotisation: o.cotisation, parAn: o.parAn, indexation: o.indexation / 100, dureeCotisation: o.dureeCotisation,
        dureeAccumulation: Math.min(Math.max(o.dureeAccumulation, o.dureeCotisation), 100), rendement: o.rendement / 100, imposable: nonEnr, tauxImpot: o.tauxImpot / 100 };
      var sol = null, note = '';
      if (cible !== 'solde') {
        if (cible === 'dureeAccumulation' || cible === 'dureeCotisation') params.dureeAccumulation = Math.min(o.dureeAccumulation, 100);
        sol = C.resoudreEpargne(params, cible, o.objectif); note = sol.note || '';
        if (sol.ok) params = sol.params;
      }
      var r = C.epargne(params);
      var FREQ = { 52: 'semaine', 26: 'deux semaines', 12: 'mois', 4: 'trimestre', 1: 'an' };
      function duree(a) { var m = Math.ceil(a * 12 - 1e-6), an = Math.floor(m / 12), mo = m % 12;
        return an && mo ? an + ' an' + (an > 1 ? 's' : '') + ' et ' + mo + ' mois' : an ? an + ' an' + (an > 1 ? 's' : '') : mo + ' mois'; }
      var LAB = { solde: 'Solde accumulé', initial: 'Montant actuel requis', cotisation: 'Cotisation requise', dureeCotisation: 'Durée des cotisations requise', dureeAccumulation: 'Durée de l’accumulation requise', rendement: 'Taux de rendement annuel requis' };
      var mainDd = $('[data-out="main"]', sec); if (mainDd) mainDd.previousElementSibling.textContent = LAB[cible];
      var mainTxt;
      if (cible === 'solde') mainTxt = money0.format(r.solde);
      else if (!sol.ok) mainTxt = 'Hors d’atteinte';
      else {
        var v = sol.valeur, inp = $('[data-field="' + cible + '"] input', sec);
        mainTxt = cible === 'initial' ? money0.format(v) : cible === 'cotisation' ? money2.format(v) + ' / ' + FREQ[o.parAn] : cible === 'rendement' ? pct.format(Math.ceil(v * 10000) / 10000) : duree(v);
        if (inp) inp.value = cible === 'rendement' ? (Math.ceil(v * 10000) / 100).toFixed(2) : cible === 'initial' || cible === 'cotisation' ? (Math.ceil(v * 100) / 100).toFixed(2) : (Math.round(v * 100) / 100);
      }
      out(sec, 'main', mainTxt);
      var nt = $('[data-out="note"]', sec); if (nt) { nt.textContent = note; nt.hidden = !note; }
      var sres = $('[data-out="solde"]', sec); if (sres) sres.parentNode.hidden = cible === 'solde';
      out(sec, 'solde', money0.format(r.solde)); out(sec, 'cotise', money0.format(params.initial + r.totalCotisations)); out(sec, 'interets', money0.format(r.totalInterets));
      var L = r.lignes, capital = cumul(L.map(function (l) { return l.cotisation; })).map(function (v) { return v + params.initial; }), inter = cumul(L.map(function (l) { return l.interets; }));
      var series = [
        { type: 'bars', stack: true, values: capital, color: COL.forest, label: 'Capital investi' },
        { type: 'bars', stack: true, values: inter, color: COL.growth, label: 'Rendement accumulé' }];
      if (cible !== 'solde' && o.objectif > 0) series.push({ type: 'line', values: L.map(function () { return o.objectif; }), color: COL.tealInk, dash: true, width: 2, label: 'Solde visé' });
      chart($('[data-chart]', sec), { x: L.map(function (l) { return String(l.annee).replace('.', ','); }), series: series,
        alt: 'Solde accumulé de ' + money0.format(r.solde) + ' après ' + duree(L[L.length - 1].annee) });
      table(sec, ['Année', 'Cotisations', 'Rendement', 'Solde'], L.map(function (l) { return [String(l.annee).replace('.', ','), money0.format(l.cotisation), money0.format(l.interets), money0.format(l.solde)]; }));
    },
    'taux-impot': function (sec, o) {
      var r = C.impot(o.revenu);
      out(sec, 'total', money2.format(r.total)); out(sec, 'net', money2.format(r.net)); out(sec, 'moyen', pct.format(r.moyen)); out(sec, 'marginal', pct.format(r.marginal)); out(sec, 'gc', pct.format(r.marginalGainCapital));
      var maxR = Math.max(300000, Math.ceil(o.revenu * 1.2 / 50000) * 50000), xs = [], marg = [], moy = [];
      for (var v = 0; v <= maxR; v += maxR / 60) { var t = C.impot(v); xs.push(nb.format(v / 1000) + ' k'); marg.push(t.marginal * 100); moy.push(t.moyen * 100); }
      chart($('[data-chart]', sec), { x: xs, yMax: 55, yfmt: function (v) { return nb.format(v) + ' %'; }, series: [
        { type: 'line', values: marg, color: COL.forest, label: 'Taux marginal', width: 2.5 },
        { type: 'line', values: moy, color: COL.teal, label: 'Taux moyen', width: 2.5, dash: true }],
        marker: { x: Math.min(1, o.revenu / maxR), y: r.marginal * 100 }, alt: 'Taux marginal de ' + pct.format(r.marginal) + ' et taux moyen de ' + pct.format(r.moyen) });
      var rows = [], marks = [25000, 50000, 75000, 100000, 125000, 150000, 200000, 250000];
      if (marks.indexOf(o.revenu) < 0) marks.push(o.revenu);
      marks.sort(function (a, b) { return a - b; }).forEach(function (m) { var t = C.impot(m); rows.push([money0.format(m), money0.format(t.federal), money0.format(t.quebec), money0.format(t.total), pct.format(t.moyen), pct.format(t.marginal)]); });
      table(sec, ['Revenu', 'Fédéral', 'Québec', 'Total', 'Moyen', 'Marginal'], rows);
    },
    'epargne-reer': function (sec, o) {
      var r = C.economieReer(o.revenu, o.cotisation), avant = C.impot(o.revenu), apres = C.impot(o.revenu - Math.min(o.cotisation, o.revenu));
      out(sec, 'economie', money2.format(r.economie)); out(sec, 'cout', money2.format(r.coutNet)); out(sec, 'taux', pct.format(r.tauxEffectif));
      chart($('[data-chart]', sec), { x: ['Sans cotisation', 'Avec cotisation'], series: [
        { type: 'bars', stack: true, values: [apres.total, apres.total], color: COL.forest, label: 'Impôt payé' },
        { type: 'bars', stack: true, values: [r.economie, 0], color: COL.growth, label: 'Économie d’impôt' }],
        alt: 'Économie d’impôt de ' + money0.format(r.economie) });
      table(sec, ['', 'Revenu imposable', 'Impôt', 'Revenu après impôt'], [['Sans cotisation', money0.format(avant.revenu), money0.format(avant.total), money0.format(avant.net)], ['Avec cotisation', money0.format(apres.revenu), money0.format(apres.total), money0.format(apres.net)]]);
    },
    report: function (sec, o) {
      var rep = Math.min(o.report, Math.max(0, o.duree - 1));
      var r = C.reportInvestissement({ initial: o.initial, cotisation: o.cotisation, parAn: o.parAn, duree: Math.min(o.duree, 80), report: rep, rendement: o.rendement / 100 });
      out(sec, 'sans', money0.format(r.sans.solde)); out(sec, 'avec', money0.format(r.avec.solde)); out(sec, 'ecart', money0.format(r.sans.solde - r.avec.solde));
      out(sec, 'necessaire', money2.format(r.cotisationNecessaire) + ' au lieu de ' + money2.format(o.cotisation));
      chart($('[data-chart]', sec), { x: r.sans.lignes.map(function (l) { return l.annee; }), series: [
        { type: 'area', values: r.sans.lignes.map(function (l) { return l.solde; }), color: COL.forest, label: 'En commençant maintenant' },
        { type: 'line', values: r.avec.lignes.map(function (l) { return l.solde; }), color: COL.teal, dash: true, label: 'En reportant de ' + rep + ' an' + (rep > 1 ? 's' : '') }],
        alt: 'Écart de ' + money0.format(r.sans.solde - r.avec.solde) + ' à l’échéance' });
      table(sec, ['Année', 'Maintenant', 'Avec report', 'Écart'], r.sans.lignes.map(function (l, i) { var a = r.avec.lignes[i].solde; return [l.annee, money0.format(l.solde), money0.format(a), money0.format(l.solde - a)]; }));
    },
    emprunt: function (sec, o) {
      var r = C.emprunt({ montant: o.montant, duree: Math.max(o.duree, 0.1), taux: o.taux / 100, parAn: o.parAn, type: o.type });
      out(sec, 'paiement', money2.format(r.paiement)); out(sec, 'interets', money0.format(r.totalInterets)); out(sec, 'total', money0.format(r.totalPaye));
      var L = r.lignes;
      chart($('[data-chart]', sec), { x: L.map(function (l) { return l.annee; }), series: [
        { type: 'area', values: L.map(function (l) { return l.solde; }), color: COL.forest, label: 'Solde du prêt' },
        { type: 'line', values: cumul(L.map(function (l) { return l.interets; })), color: COL.teal, label: 'Intérêts cumulés' }],
        alt: 'Paiement de ' + money2.format(r.paiement) + ', intérêts totaux de ' + money0.format(r.totalInterets) });
      table(sec, ['Année', 'Intérêts', 'Capital remboursé', 'Solde'], L.slice(1).map(function (l) { return [l.annee, money0.format(l.interets), money0.format(l.capital), money0.format(l.solde)]; }));
    },
    inflation: function (sec, o) {
      var r = C.inflation({ montant: o.montant, anneeReference: Math.round(o.anneeReference), anneeCible: Math.round(o.anneeCible), taux: o.taux / 100 });
      out(sec, 'valeur', money2.format(r.valeur));
      var ch = r.valeur / (o.montant || 1) - 1; out(sec, 'ecart', (ch > 0 ? '+' : '') + pct.format(ch));
      var L = r.lignes.slice().sort(function (a, b) { return a.annee - b.annee; });
      chart($('[data-chart]', sec), { x: L.map(function (l) { return l.annee; }), series: [{ type: 'area', values: L.map(function (l) { return l.valeur; }), color: COL.forest, label: 'Valeur équivalente' }],
        alt: money0.format(o.montant) + ' de ' + Math.round(o.anneeReference) + ' équivalent à ' + money0.format(r.valeur) + ' de ' + Math.round(o.anneeCible) });
      table(sec, ['Année', 'Valeur équivalente'], L.map(function (l) { return [l.annee, money0.format(l.valeur)]; }));
    }
  };

  var secs = $$('.tool');
  secs.forEach(function (sec) {
    var f = $('.tool__form', sec), fn = TOOLS[sec.dataset.tool]; if (!f || !fn) return;
    var run = function () { try { fn(sec, read(f)); } catch (e) { /* valeurs incomplètes : on attend la saisie suivante */ } };
    f.addEventListener('input', run); f.addEventListener('change', run); run();
    sec._run = run;
  });

  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { secs.forEach(function (s) { if (!s.hidden && s._run) s._run(); }); }, 150); });

  /* ---------- Onglets (un outil visible à la fois, lien direct par #ancre) ---------- */
  var tabs = $$('[data-tab]');
  function show(id, focus) {
    if (!document.getElementById(id) || !$('.tool#' + CSS.escape(id))) id = secs[0].id;
    secs.forEach(function (s) { s.hidden = s.id !== id; if (!s.hidden && s._run) s._run(); });
    tabs.forEach(function (t) { var on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (focus) { var cur = $('[data-tab="' + id + '"]'); if (cur) cur.focus(); }
  }
  if (tabs.length) {
    document.documentElement.classList.add('tools-tabs');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function (e) { e.preventDefault(); history.replaceState(null, '', '#' + t.dataset.tab); show(t.dataset.tab); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { e.preventDefault(); var nx = tabs[(i + d + tabs.length) % tabs.length]; history.replaceState(null, '', '#' + nx.dataset.tab); show(nx.dataset.tab, true); }
      });
    });
    show(location.hash.slice(1));
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
  }
})();
