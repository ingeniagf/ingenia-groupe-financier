/* Ingenia — moteurs de calcul des outils financiers (sans dépendance).
   Paramètres fiscaux 2026, résident du Québec. À mettre à jour chaque année (section FISCAL). */
(function (root) {
  'use strict';
  var FISCAL = {
    annee: 2026,
    fed: { paliers: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]],
           mpbMax: 16452, mpbMin: 14829, mpbDebut: 181440, mpbFin: 258482, tauxCredit: 0.14, abattementQc: 0.165 },
    qc:  { paliers: [[54345, 0.14], [108680, 0.19], [132245, 0.24], [Infinity, 0.2575]], montantBase: 18952, tauxCredit: 0.14 },
    inclusionGainCapital: 0.5
  };

  function impotPaliers(r, paliers) {
    var t = 0, bas = 0;
    for (var k = 0; k < paliers.length; k++) {
      var haut = paliers[k][0], taux = paliers[k][1];
      if (r > bas) t += (Math.min(r, haut) - bas) * taux;
      bas = haut;
    }
    return t;
  }
  function impotFederal(r) {
    var f = FISCAL.fed, mpb = f.mpbMax;
    if (r > f.mpbDebut) mpb = f.mpbMax - (f.mpbMax - f.mpbMin) * Math.min(1, (r - f.mpbDebut) / (f.mpbFin - f.mpbDebut));
    var base = Math.max(0, impotPaliers(r, f.paliers) - mpb * f.tauxCredit);
    return base * (1 - f.abattementQc);
  }
  function impotQuebec(r) {
    var q = FISCAL.qc;
    return Math.max(0, impotPaliers(r, q.paliers) - q.montantBase * q.tauxCredit);
  }
  function impot(revenu) {
    var r = Math.max(0, +revenu || 0), fe = impotFederal(r), qc = impotQuebec(r), tot = fe + qc;
    var marg = (impotFederal(r + 100) + impotQuebec(r + 100) - tot) / 100;
    return { revenu: r, federal: fe, quebec: qc, total: tot, net: r - tot, moyen: r ? tot / r : 0, marginal: marg,
             marginalGainCapital: marg * FISCAL.inclusionGainCapital };
  }
  function economieReer(revenu, cotisation) {
    var c = Math.min(Math.max(0, +cotisation || 0), Math.max(0, +revenu || 0));
    var avant = impot(revenu).total, apres = impot(revenu - c).total;
    return { economie: avant - apres, coutNet: c - (avant - apres), tauxEffectif: c ? (avant - apres) / c : 0 };
  }

  /* Épargne : cotisations en début de période, taux effectif par période, rendement après impôt si imposable.
     Les durées peuvent être fractionnaires (calcul par période) ; un an partiel produit une dernière ligne partielle. */
  function epargne(o) {
    var ppy = o.parAn || 12, r = (o.rendement || 0) * (1 - (o.imposable ? (o.tauxImpot || 0) : 0));
    var i = Math.pow(1 + r, 1 / ppy) - 1, b = +o.initial || 0, lignes = [{ annee: 0, cotisation: 0, interets: 0, solde: b }];
    var N = Math.min(Math.round((o.dureeAccumulation || 0) * ppy), 100 * ppy), Nc = Math.round((o.dureeCotisation || 0) * ppy), D = Math.round((o.delai || 0) * ppy);
    var totC = 0, totI = 0, cy = 0, iy = 0, cot = +o.cotisation || 0, idx = o.indexation || 0;
    for (var p = 0; p < N; p++) {
      var c = (p >= D && p < D + Nc) ? cot * Math.pow(1 + idx, Math.floor((p - D) / ppy)) : 0;
      var gain = (b + c) * i; b = b + c + gain; cy += c; iy += gain;
      if ((p + 1) % ppy === 0 || p === N - 1) {
        totC += cy; totI += iy;
        lignes.push({ annee: (p + 1) % ppy === 0 ? (p + 1) / ppy : Math.round((p + 1) / ppy * 10) / 10, cotisation: cy, interets: iy, solde: b });
        cy = 0; iy = 0;
      }
    }
    return { solde: b, totalCotisations: totC, totalInterets: totI, lignes: lignes };
  }

  /* Épargne — trouver l'inconnue : la valeur de « cible » qui permet d'atteindre « objectif ».
     Retourne { ok, valeur, params, note } ; valeur en $ (initial, cotisation), en années (durées) ou en décimal (rendement). */
  function resoudreEpargne(o, cible, objectif) {
    var ppy = o.parAn || 12, MAXP = 100 * ppy, obj = +objectif || 0;
    var P = function (ch) { return Object.assign({}, o, ch); };
    var solde = function (q) { return epargne(q).solde; };
    function bisect(f, lo, hi) { for (var k = 0; k < 80; k++) { var m = (lo + hi) / 2; if (f(m) < obj) lo = m; else hi = m; } return hi; }
    function plusPetit(f, maxK) { if (f(maxK) < obj) return -1; var lo = 0, hi = maxK; while (lo < hi) { var m = (lo + hi) >> 1; if (f(m) >= obj) hi = m; else lo = m + 1; } return lo; }
    var res;
    if (cible === 'initial' || cible === 'cotisation') {
      if (cible === 'cotisation' && !(o.dureeCotisation > 0)) return { ok: false, note: 'Indiquez une durée des cotisations pour calculer la cotisation requise.' };
      var f = function (x) { var ch = {}; ch[cible] = x; return solde(P(ch)); };
      if (f(0) >= obj) { var z = {}; z[cible] = 0; return { ok: true, valeur: 0, params: P(z), note: cible === 'initial' ? 'Vos cotisations suffisent à atteindre l’objectif.' : 'Votre montant actuel suffit à atteindre l’objectif.' }; }
      var hi = Math.max(1, obj); for (var t = 0; t < 40 && f(hi) < obj; t++) hi *= 2;
      if (f(hi) < obj) return { ok: false, note: 'Objectif hors d’atteinte avec ces paramètres.' };
      var v = bisect(f, 0, hi), ch2 = {}; ch2[cible] = v; return { ok: true, valeur: v, params: P(ch2) };
    }
    if (cible === 'rendement') {
      var g = function (x) { return solde(P({ rendement: x })); };
      if (g(0) >= obj) return { ok: true, valeur: 0, params: P({ rendement: 0 }), note: 'Aucun rendement n’est nécessaire : vos dépôts suffisent.' };
      if (g(0.5) < obj) return { ok: false, note: 'Objectif hors d’atteinte, même avec un rendement de 50 % par année.' };
      res = bisect(g, 0, 0.5); return { ok: true, valeur: res, params: P({ rendement: res }) };
    }
    if (cible === 'dureeCotisation') {
      var A = Math.round((o.dureeAccumulation || 0) * ppy);
      var q = function (k) { return P({ dureeCotisation: k / ppy, dureeAccumulation: Math.max(A, k) / ppy }); };
      var k = plusPetit(function (k) { return solde(q(k)); }, MAXP);
      if (k < 0) return { ok: false, note: 'Objectif hors d’atteinte en 100 ans de cotisations.' };
      return { ok: true, valeur: k / ppy, params: q(k), note: k === 0 ? 'Votre montant actuel suffit, sans cotisation.' : (k > A ? 'L’accumulation est prolongée pour couvrir toute la période de cotisation.' : '') };
    }
    if (cible === 'dureeAccumulation') {
      var Cn = Math.round((o.dureeCotisation || 0) * ppy);
      var q2 = function (n) { return P({ dureeAccumulation: n / ppy, dureeCotisation: Math.min(Cn, n) / ppy }); };
      var n = plusPetit(function (n) { return solde(q2(n)); }, MAXP);
      if (n < 0) return { ok: false, note: 'Objectif hors d’atteinte en 100 ans.' };
      return { ok: true, valeur: n / ppy, params: q2(n), note: n === 0 ? 'Votre montant actuel atteint déjà l’objectif.' : (n < Cn ? 'L’objectif est atteint avant la fin des cotisations prévues.' : '') };
    }
    return { ok: true, valeur: solde(o), params: o };
  }
  function reportInvestissement(o) {
    var sans = epargne({ initial: o.initial, cotisation: o.cotisation, parAn: o.parAn, indexation: o.indexation, dureeCotisation: o.duree, dureeAccumulation: o.duree, rendement: o.rendement, imposable: o.imposable, tauxImpot: o.tauxImpot });
    var base = { initial: o.initial, parAn: o.parAn, indexation: o.indexation, dureeCotisation: o.duree - o.report, dureeAccumulation: o.duree, rendement: o.rendement, imposable: o.imposable, tauxImpot: o.tauxImpot, delai: o.report };
    var avec = epargne(Object.assign({ cotisation: o.cotisation }, base));
    var lo = 0, hi = Math.max(1, o.cotisation) * 50;
    for (var k = 0; k < 80; k++) { var m = (lo + hi) / 2; if (epargne(Object.assign({ cotisation: m }, base)).solde < sans.solde) lo = m; else hi = m; }
    var necessaire = (lo + hi) / 2;
    var cout = epargne(Object.assign({ cotisation: necessaire }, base)).totalCotisations - sans.totalCotisations;
    return { sans: sans, avec: avec, cotisationNecessaire: necessaire, cout: cout };
  }
  /* Emprunt : hypothèque à capitalisation semestrielle (norme canadienne), autres prêts au taux nominal par période */
  function emprunt(o) {
    var ppy = o.parAn || 12, n = Math.round(o.duree * ppy), r = o.taux || 0;
    var i = o.type === 'hypotheque' ? Math.pow(1 + r / 2, 2 / ppy) - 1 : r / ppy;
    var pmt = i ? o.montant * i / (1 - Math.pow(1 + i, -n)) : o.montant / n;
    var b = o.montant, lignes = [{ annee: 0, interets: 0, capital: 0, solde: b }], totI = 0, iy = 0, cy = 0;
    for (var k = 1; k <= n; k++) {
      var int = b * i, cap = Math.min(pmt - int, b); b -= cap; iy += int; cy += cap; totI += int;
      if (k % ppy === 0 || k === n) { lignes.push({ annee: Math.ceil(k / ppy), interets: iy, capital: cy, solde: Math.max(0, b) }); iy = 0; cy = 0; }
    }
    return { paiement: pmt, totalInterets: totI, totalPaye: pmt * n, nbPaiements: n, lignes: lignes };
  }
  function inflation(o) {
    var ecart = o.anneeCible - o.anneeReference, f = Math.pow(1 + (o.taux || 0), ecart);
    var lignes = [], sens = ecart >= 0 ? 1 : -1;
    for (var y = 0; y <= Math.abs(ecart); y++) lignes.push({ annee: o.anneeReference + sens * y, valeur: o.montant * Math.pow(1 + o.taux, sens * y) });
    return { valeur: o.montant * f, facteur: f, lignes: lignes };
  }

  root.IngeniaCalc = { FISCAL: FISCAL, impot: impot, economieReer: economieReer, epargne: epargne,
    resoudreEpargne: resoudreEpargne, reportInvestissement: reportInvestissement, emprunt: emprunt, inflation: inflation };
})(typeof window !== 'undefined' ? window : globalThis);
