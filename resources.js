/*!
 * Rightbrain resources — single source of truth renderer.
 * Reads resources.json and renders: the library index grid + featured slot + counts
 * + filter/search, and the "related" rows on article pages. Keep content in the JSON,
 * not in markup, so the index and articles never drift.
 *
 * Index page:   <div id="featuredHost">, <div id="resGrid">, .filter buttons, #resSearch, #resEmpty
 * Article page: <div class="grid-cards" data-related="slug-a,slug-b,slug-c">
 */
(function () {
  'use strict';

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    return parseInt(p[2], 10) + ' ' + (MONTHS[parseInt(p[1], 10) - 1] || '') + ' ' + p[0];
  }

  // per-category presentation (icon + label + read verb + which field is the meta line)
  var CATS = {
    blog:      { label: 'Blog',       icon: 'ri-article-line',    read: 'Read',       meta: function (i) { return fmtDate(i.date); } },
    usecase:   { label: 'Use case',   icon: 'ri-flashlight-line', read: 'View',       meta: function (i) { return i.tool || ''; } },
    casestudy: { label: 'Case study', icon: 'ri-line-chart-line', read: 'Read story', meta: function (i) { return i.customer || ''; } },
    guide:     { label: 'Guide',      icon: 'ri-book-open-line',  read: 'Read guide', meta: function (i) { return i.tool || ''; } }
  };
  function cat(i) { return CATS[i.category] || CATS.blog; }

  // one shared, cached fetch
  var _cache = null;
  function load() {
    if (!_cache) {
      _cache = fetch('resources.json')
        .then(function (r) { if (!r.ok) throw new Error('resources.json ' + r.status); return r.json(); })
        .then(function (d) { return (d && d.resources) || []; });
    }
    return _cache;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function catBadge(i) {
    var c = cat(i);
    var s = el('span', 'cat');
    var ic = el('i', c.icon + ' icon'); ic.setAttribute('aria-hidden', 'true');
    s.appendChild(ic); s.appendChild(document.createTextNode(' ' + c.label));
    return s;
  }
  function readCue(text) {
    var s = el('span', 'read'); s.appendChild(document.createTextNode(text + ' '));
    var ic = el('i', 'ri-arrow-right-line icon'); ic.setAttribute('aria-hidden', 'true');
    s.appendChild(ic); return s;
  }
  function keywords(i) {
    return [i.title, i.tool, i.customer, i.author && i.author.name].filter(Boolean).join(' ');
  }

  // grid card (matches .rcard markup). opts.read = false omits the hover "read" cue
  // (used by article "related" rows, whose .meta is a single line of text).
  function buildCard(i, opts) {
    opts = opts || {};
    var a = el('a', 'rcard'); a.href = i.href || '#';
    a.setAttribute('data-cat', i.category);
    a.setAttribute('data-title', keywords(i));
    a.appendChild(catBadge(i));
    a.appendChild(el('h3', null, i.title));
    a.appendChild(el('p', 'excerpt', i.excerpt));
    var meta = el('div', 'meta');
    meta.appendChild(el('span', 'date', cat(i).meta(i)));
    if (opts.read !== false) meta.appendChild(readCue(cat(i).read));
    a.appendChild(meta);
    return a;
  }

  // featured card (matches .fcard markup)
  function buildFeatured(i) {
    var a = el('a', 'fcard'); a.href = i.href || '#'; a.setAttribute('data-cat', i.category);
    var body = el('div', 'fcard-body');
    body.appendChild(catBadge(i));
    body.appendChild(el('h2', null, i.title));
    body.appendChild(el('p', 'excerpt', i.excerpt));
    a.appendChild(body);
    var fmeta = el('div', 'fmeta');
    var dl = document.createElement('dl');
    function pair(dt, dd) { if (!dd) return; dl.appendChild(el('dt', null, dt)); dl.appendChild(el('dd', null, dd)); }
    if (i.author) pair('Author', i.author.name + (i.author.role ? ', ' + i.author.role : ''));
    pair('Published', fmtDate(i.date));
    pair('Topic', i.topic);
    fmeta.appendChild(dl);
    fmeta.appendChild(readCue('Read article'));
    a.appendChild(fmeta);
    return a;
  }

  // ---- index page ----
  function renderIndex() {
    return load().then(function (items) {
      var sorted = items.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      var featured = sorted.filter(function (i) { return i.featured; })[0] || null;
      var rest = sorted.filter(function (i) { return i !== featured; });

      var fhost = document.getElementById('featuredHost');
      if (fhost && featured) fhost.appendChild(buildFeatured(featured));

      var grid = document.getElementById('resGrid');
      if (grid) rest.forEach(function (i) { grid.appendChild(buildCard(i)); });

      // counts (featured included)
      var counts = { all: items.length, blog: 0, usecase: 0, casestudy: 0, guide: 0 };
      items.forEach(function (i) { if (counts[i.category] != null) counts[i.category]++; });
      document.querySelectorAll('.filter .n').forEach(function (n) {
        var k = n.getAttribute('data-count'); if (counts[k] != null) n.textContent = counts[k];
      });

      wireFilterSearch();
    }).catch(function (e) {
      var grid = document.getElementById('resGrid');
      if (grid) grid.innerHTML = '<p style="color:var(--muted-foreground)">Could not load resources (' + e.message + '). Serve over http, not file://.</p>';
    });
  }

  function wireFilterSearch() {
    var grid = document.getElementById('resGrid');
    var cards = Array.prototype.slice.call(grid ? grid.querySelectorAll('.rcard') : []);
    var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    var search = document.getElementById('resSearch');
    var empty = document.getElementById('resEmpty');
    var featured = document.getElementById('featured');
    var active = 'all';

    function apply() {
      var q = (search && search.value ? search.value : '').trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var catOk = active === 'all' || card.getAttribute('data-cat') === active;
        var hay = ((card.getAttribute('data-title') || '') + ' ' + card.textContent).toLowerCase();
        var qOk = !q || hay.indexOf(q) !== -1;
        var show = catOk && qOk;
        card.style.display = show ? '' : 'none';
        if (show) shown++;
      });
      if (featured) featured.style.display = ((active === 'all' || active === 'blog') && !q) ? '' : 'none';
      if (empty) empty.classList.toggle('show', shown === 0);
    }
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        active = btn.getAttribute('data-filter');
        filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
    apply();
  }

  // ---- article pages: related rows ----
  function renderRelated(host) {
    host = typeof host === 'string' ? document.getElementById(host) : host;
    if (!host) return Promise.resolve();
    var slugs = (host.getAttribute('data-related') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return load().then(function (items) {
      var by = {}; items.forEach(function (i) { by[i.slug] = i; });
      slugs.forEach(function (slug) { if (by[slug]) host.appendChild(buildCard(by[slug], { read: false })); });
    }).catch(function () {});
  }

  window.RBResources = { load: load, renderIndex: renderIndex, renderRelated: renderRelated, buildCard: buildCard, buildFeatured: buildFeatured };
})();
