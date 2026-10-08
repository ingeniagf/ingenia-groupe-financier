/* Ingenia — gestion du consentement aux témoins (Loi 25).
   Par défaut, aucun contenu tiers n'est chargé. Le choix est conservé 12 mois dans ce navigateur. */
(function () {
  'use strict';
  var CLE = 'ingenia-temoins', VERSION = 1, DUREE = 365 * 24 * 3600 * 1000;
  var bar = document.getElementById('temoins');
  var prefs = document.getElementById('temoins-prefs');
  var chkCartes = document.getElementById('pref-cartes');
  var btnPerso = bar && bar.querySelector('[data-temoins="perso"]');

  function lire() {
    try {
      var c = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (!c || c.v !== VERSION || (Date.now() - c.t) > DUREE) return null;
      return c;
    } catch (e) { return null; }
  }
  function ecrire(cartes) {
    var c = { v: VERSION, t: Date.now(), cartes: !!cartes };
    try { localStorage.setItem(CLE, JSON.stringify(c)); } catch (e) { }
    return c;
  }

  /* Cartes Google Maps : chargées seulement avec consentement */
  function appliquer(c) {
    var ok = !!(c && c.cartes);
    document.querySelectorAll('.map[data-map-src]').forEach(function (m) {
      var f = m.querySelector('iframe');
      if (ok && !f) {
        f = document.createElement('iframe');
        f.src = m.getAttribute('data-map-src');
        f.title = m.getAttribute('data-map-title') || 'Carte';
        f.loading = 'lazy';
        f.referrerPolicy = 'no-referrer-when-downgrade';
        m.appendChild(f); m.classList.add('is-on');
      } else if (!ok && f) {
        f.remove(); m.classList.remove('is-on');
      }
    });
  }

  function ouvrir(perso) {
    if (!bar) return;
    var c = lire();
    if (chkCartes) chkCartes.checked = !!(c && c.cartes);
    montrerPrefs(!!perso);
    bar.hidden = false;
  }
  function fermer() { if (bar) bar.hidden = true; }
  function montrerPrefs(on) {
    if (!prefs || !btnPerso) return;
    prefs.hidden = !on;
    btnPerso.setAttribute('aria-expanded', on ? 'true' : 'false');
    btnPerso.textContent = on ? 'Enregistrer mes choix' : 'Personnaliser';
  }
  function choisir(cartes) { appliquer(ecrire(cartes)); fermer(); }

  if (bar) {
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-temoins]'); if (!b) return;
      var a = b.getAttribute('data-temoins');
      if (a === 'accepter') choisir(true);
      else if (a === 'refuser') choisir(false);
      else if (a === 'perso') {
        if (prefs && !prefs.hidden) choisir(chkCartes && chkCartes.checked);
        else montrerPrefs(true);
      }
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-temoins-ouvrir]')) { e.preventDefault(); ouvrir(true); }
    if (e.target.closest('[data-map-activer]')) { e.preventDefault(); choisir(true); }
  });

  var c = lire();
  appliquer(c);
  if (!c) ouvrir(false);
})();
