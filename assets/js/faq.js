/* FAQ : recherche instantanée et filtres par catégorie */
(function () {
  'use strict';
  var input = document.getElementById('faq-search');
  var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
  var empty = document.getElementById('faq-empty');
  var count = document.getElementById('faq-count');
  if (!input || !items.length) return;

  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  items.forEach(function (it) {
    var q = it.querySelector('summary .q');
    it._q = q.textContent; it._text = norm(it.textContent);
  });
  var active = 'toutes';

  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function highlight(it, term) {
    var q = it.querySelector('summary .q');
    if (!term) { q.textContent = it._q; return; }
    var src = it._q, n = norm(src), i = n.indexOf(term);
    q.innerHTML = i < 0 ? escapeHtml(src) : escapeHtml(src.slice(0, i)) + '<mark>' + escapeHtml(src.slice(i, i + term.length)) + '</mark>' + escapeHtml(src.slice(i + term.length));
  }
  function apply() {
    var term = norm(input.value.trim()), shown = 0;
    items.forEach(function (it) {
      var okCat = active === 'toutes' || it.dataset.cat === active;
      var okTerm = !term || it._text.indexOf(term) > -1;
      var ok = okCat && okTerm;
      it.hidden = !ok; if (ok) shown++;
      highlight(it, term);
      if (term && ok && it._text.indexOf(term) > -1 && norm(it._q).indexOf(term) < 0) it.open = true;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector('.faq-item:not([hidden])'); });
    empty.hidden = shown > 0;
    count.textContent = shown + (shown > 1 ? ' questions' : ' question');
  }
  input.addEventListener('input', apply);
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      active = b.dataset.filter;
      filters.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
  });
  apply();
})();
