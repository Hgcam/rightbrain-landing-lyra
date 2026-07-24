/* Rightbrain — self-hosted GDPR/ePrivacy consent manager (Lyra design system).
   ~4KB, no dependencies, no third-party JS. Replaces CookieYes.

   Non-essential trackers must NOT run until the user consents. Consumers gate
   themselves via the global API:

     window.rbConsent.get('functional')            -> boolean
     window.rbConsent.onChange(fn)                 -> fn(consent) now + on change
     window.rbConsent.open()                       -> open the preferences dialog

   Categories:
     necessary  — always on (theme prefs, consent record). No toggle.
     functional — Intercom chat + Calendly scheduler.
     analytics  — reserved for future traffic measurement (off by default).
     marketing  — reserved for future ads/remarketing (off by default).

   A 'rb:consent-change' DOM event is also dispatched on document. */
(function () {
  "use strict";

  var STORAGE_KEY = "rb-consent";
  var VERSION = 1;

  var CATEGORIES = [
    { key: "necessary",  locked: true,  title: "Strictly necessary",
      desc: "Required for the site to work — remembers your theme and this cookie choice. Always on." },
    { key: "functional", locked: false, title: "Functional",
      desc: "Powers the live chat (Intercom) and the booking scheduler (Calendly). Off means these stay disabled." },
    { key: "analytics",  locked: false, title: "Analytics",
      desc: "Lets us measure anonymous, aggregated traffic so we can improve the site. Not currently active." },
    { key: "marketing",  locked: false, title: "Marketing",
      desc: "Would allow ad-measurement or remarketing pixels. Not currently active." }
  ];

  // ---- state ---------------------------------------------------------------
  var consent = null;          // null until a choice is loaded/made
  var listeners = [];

  function defaults(all) {
    var o = { v: VERSION, ts: 0 };
    CATEGORIES.forEach(function (c) { o[c.key] = c.locked ? true : !!all; });
    return o;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.v !== VERSION) return null;   // schema changed -> re-ask
      o.necessary = true;
      return o;
    } catch (e) { return null; }
  }

  function save(o) {
    o.v = VERSION; o.ts = Date.now(); o.necessary = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch (e) {}
    consent = o;
    notify();
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(consent); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent("rb:consent-change", { detail: consent })); } catch (e) {}
  }

  // ---- public API ----------------------------------------------------------
  var api = {
    get: function (cat) { return !!(consent && consent[cat]); },
    granted: function (cat) { return !!(consent && consent[cat]); },
    all: function () { return consent ? JSON.parse(JSON.stringify(consent)) : null; },
    decided: function () { return !!consent; },
    onChange: function (fn) {
      if (typeof fn !== "function") return function () {};
      listeners.push(fn);
      if (consent) { try { fn(consent); } catch (e) {} }   // fire immediately if already decided
      return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
    },
    open: function () { openDialog(); },
    openSettings: function () { openDialog(); }
  };
  window.rbConsent = api;

  // ---- styles (Lyra tokens, with safe fallbacks) ---------------------------
  var css =
    '.rbc, .rbc *{box-sizing:border-box;}' +
    '.rbc{--rbc-bg:var(--card,#fff);--rbc-fg:var(--foreground,#1c1917);--rbc-mut:var(--muted-foreground,#78716c);' +
      '--rbc-bd:var(--border,#e7e5e4);--rbc-acc:var(--primary,#ea580c);--rbc-mono:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);}' +
    /* bottom banner */
    '.rbc-banner{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:var(--rbc-bg);color:var(--rbc-fg);' +
      'border-top:1px solid var(--rbc-bd);box-shadow:0 -12px 40px rgba(0,0,0,.12);padding:1.125rem 1.25rem calc(1.125rem + env(safe-area-inset-bottom));}' +
    '.rbc-banner-in{max-width:72rem;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.25rem;}' +
    '.rbc-copy{flex:1 1 22rem;min-width:0;}' +
    '.rbc-copy h2{font-family:var(--rbc-mono);font-size:.75rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;' +
      'color:var(--rbc-mut);margin:0 0 .35rem;}' +
    '.rbc-copy p{margin:0;font-size:.875rem;line-height:1.5;color:var(--rbc-fg);}' +
    '.rbc-copy a{color:var(--rbc-acc);text-decoration:underline;text-underline-offset:2px;}' +
    '.rbc-actions{display:flex;flex-wrap:wrap;gap:.625rem;align-items:center;}' +
    /* buttons */
    '.rbc-btn{display:inline-flex;align-items:center;justify-content:center;height:2.5rem;padding:0 1rem;cursor:pointer;' +
      'font-family:var(--rbc-mono);font-size:.8125rem;font-weight:600;line-height:1;letter-spacing:.01em;border:1px solid var(--rbc-bd);' +
      'background:transparent;color:var(--rbc-fg);transition:filter .15s ease,background .15s ease,border-color .15s ease;}' +
    '.rbc-btn:hover{border-color:var(--rbc-fg);}' +
    '.rbc-btn:focus-visible{outline:2px solid var(--rbc-acc);outline-offset:2px;}' +
    '.rbc-btn--primary{background:var(--rbc-acc);border-color:var(--rbc-acc);color:#fff;}' +
    '.rbc-btn--primary:hover{filter:brightness(1.06);border-color:var(--rbc-acc);}' +
    '.rbc-btn--ghost{border-color:transparent;color:var(--rbc-mut);padding:0 .5rem;}' +
    '.rbc-btn--ghost:hover{color:var(--rbc-fg);border-color:transparent;text-decoration:underline;text-underline-offset:3px;}' +
    /* modal */
    '.rbc-scrim{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;' +
      'padding:1.25rem;}' +
    '.rbc-modal{width:100%;max-width:34rem;max-height:calc(100vh - 2.5rem);overflow:auto;background:var(--rbc-bg);color:var(--rbc-fg);' +
      'border:1px solid var(--rbc-bd);box-shadow:0 24px 64px rgba(0,0,0,.28);}' +
    '.rbc-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.375rem 1.5rem 1rem;' +
      'border-bottom:1px solid var(--rbc-bd);}' +
    '.rbc-modal-head h2{margin:0;font-size:1.0625rem;font-weight:700;letter-spacing:-.01em;}' +
    '.rbc-modal-head p{margin:.35rem 0 0;font-size:.8125rem;line-height:1.5;color:var(--rbc-mut);}' +
    '.rbc-x{flex:none;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;' +
      'background:transparent;border:1px solid var(--rbc-bd);color:var(--rbc-fg);font-size:1.1rem;line-height:1;}' +
    '.rbc-x:hover{border-color:var(--rbc-fg);}' +
    '.rbc-list{padding:.5rem 1.5rem;}' +
    '.rbc-row{display:flex;gap:1rem;align-items:flex-start;padding:1rem 0;border-bottom:1px solid var(--rbc-bd);}' +
    '.rbc-row:last-child{border-bottom:0;}' +
    '.rbc-row-txt{flex:1 1 auto;min-width:0;}' +
    '.rbc-row-txt .t{display:flex;align-items:center;gap:.5rem;font-family:var(--rbc-mono);font-size:.8125rem;font-weight:600;}' +
    '.rbc-row-txt .d{margin:.3rem 0 0;font-size:.8125rem;line-height:1.5;color:var(--rbc-mut);}' +
    '.rbc-badge{font-family:var(--rbc-mono);font-size:.625rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;' +
      'color:var(--rbc-acc);border:1px solid var(--rbc-acc);padding:.1rem .35rem;}' +
    /* switch */
    '.rbc-sw{flex:none;position:relative;width:2.75rem;height:1.5rem;}' +
    '.rbc-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}' +
    '.rbc-sw .track{position:absolute;inset:0;background:var(--rbc-mut);opacity:.4;transition:background .15s ease,opacity .15s ease;}' +
    '.rbc-sw .thumb{position:absolute;top:3px;left:3px;width:1.125rem;height:1.125rem;background:#fff;transition:transform .15s ease;}' +
    '.rbc-sw input:checked ~ .track{background:var(--rbc-acc);opacity:1;}' +
    '.rbc-sw input:checked ~ .thumb{transform:translateX(1.25rem);}' +
    '.rbc-sw input:disabled{cursor:not-allowed;}' +
    '.rbc-sw input:disabled ~ .track{opacity:.7;background:var(--rbc-acc);}' +
    '.rbc-sw input:focus-visible ~ .track{outline:2px solid var(--rbc-acc);outline-offset:2px;}' +
    '.rbc-modal-foot{display:flex;flex-wrap:wrap;gap:.625rem;justify-content:flex-end;padding:1.125rem 1.5rem calc(1.375rem + env(safe-area-inset-bottom));' +
      'border-top:1px solid var(--rbc-bd);}' +
    /* footer "Cookie settings" trigger */
    '.rbc-open{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;' +
      'text-decoration:underline;text-underline-offset:2px;}' +
    '.rbc-open:hover{opacity:.8;}' +
    '@media (max-width:640px){.rbc-actions{width:100%;}.rbc-actions .rbc-btn{flex:1 1 auto;}.rbc-btn--ghost{flex:1 1 100%;}}' +
    '@media (prefers-reduced-motion:no-preference){.rbc-banner{animation:rbc-up .3s ease both;}@keyframes rbc-up{from{transform:translateY(100%)}to{transform:translateY(0)}}}';

  function injectStyle() {
    if (document.getElementById("rbc-style")) return;
    var s = document.createElement("style");
    s.id = "rbc-style";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- DOM helpers ---------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var bannerEl = null;
  function removeBanner() { if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl); bannerEl = null; }

  function showBanner() {
    injectStyle();
    if (bannerEl) return;
    bannerEl = el("div", "rbc rbc-banner");
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "Cookie consent");
    bannerEl.innerHTML =
      '<div class="rbc-banner-in">' +
        '<div class="rbc-copy">' +
          '<h2>Your privacy</h2>' +
          '<p>We use a few cookies to run live chat and scheduling, and (with your OK) to understand traffic. ' +
          'See our <a href="privacy-policy.html">Privacy Notice</a>.</p>' +
        '</div>' +
        '<div class="rbc-actions">' +
          '<button type="button" class="rbc-btn rbc-btn--ghost" data-act="prefs">Preferences</button>' +
          '<button type="button" class="rbc-btn" data-act="reject">Reject all</button>' +
          '<button type="button" class="rbc-btn rbc-btn--primary" data-act="accept">Accept all</button>' +
        '</div>' +
      '</div>';
    bannerEl.querySelector('[data-act="accept"]').addEventListener("click", function () { save(defaults(true)); removeBanner(); });
    bannerEl.querySelector('[data-act="reject"]').addEventListener("click", function () { save(defaults(false)); removeBanner(); });
    bannerEl.querySelector('[data-act="prefs"]').addEventListener("click", function () { openDialog(); });
    document.body.appendChild(bannerEl);
  }

  // ---- preferences dialog --------------------------------------------------
  var dialogEl = null, lastFocus = null;
  function closeDialog() {
    if (!dialogEl) return;
    dialogEl.parentNode && dialogEl.parentNode.removeChild(dialogEl);
    dialogEl = null;
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function onKey(e) { if (e.key === "Escape") closeDialog(); }

  function openDialog() {
    injectStyle();
    if (dialogEl) return;
    lastFocus = document.activeElement;
    var current = consent || defaults(false);

    var scrim = el("div", "rbc rbc-scrim");
    scrim.addEventListener("click", function (e) { if (e.target === scrim) closeDialog(); });

    var modal = el("div", "rbc-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "rbc-title");

    var head = el("div", "rbc-modal-head",
      '<div><h2 id="rbc-title">Cookie preferences</h2>' +
      '<p>Choose which cookies we can use. You can change this any time from “Cookie settings” in the footer.</p></div>');
    var x = el("button", "rbc-x", "&times;");
    x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", closeDialog);
    head.appendChild(x);
    modal.appendChild(head);

    var list = el("div", "rbc-list");
    CATEGORIES.forEach(function (c) {
      var row = el("div", "rbc-row");
      row.innerHTML =
        '<div class="rbc-row-txt"><div class="t">' + c.title +
          (c.locked ? ' <span class="rbc-badge">Always on</span>' : '') + '</div>' +
          '<p class="d">' + c.desc + '</p></div>';
      var sw = el("label", "rbc-sw");
      var input = el("input");
      input.type = "checkbox";
      input.setAttribute("data-cat", c.key);
      input.checked = c.locked ? true : !!current[c.key];
      input.disabled = !!c.locked;
      input.setAttribute("aria-label", c.title);
      sw.appendChild(input);
      sw.appendChild(el("span", "track"));
      sw.appendChild(el("span", "thumb"));
      row.appendChild(sw);
      list.appendChild(row);
    });
    modal.appendChild(list);

    var foot = el("div", "rbc-modal-foot");
    var reject = el("button", "rbc-btn", "Reject all"); reject.type = "button";
    var savbtn = el("button", "rbc-btn rbc-btn--primary", "Save preferences"); savbtn.type = "button";
    reject.addEventListener("click", function () { save(defaults(false)); closeDialog(); removeBanner(); });
    savbtn.addEventListener("click", function () {
      var o = defaults(false);
      list.querySelectorAll("input[data-cat]").forEach(function (i) { o[i.getAttribute("data-cat")] = i.checked; });
      save(o); closeDialog(); removeBanner();
    });
    foot.appendChild(reject);
    foot.appendChild(savbtn);
    modal.appendChild(foot);

    scrim.appendChild(modal);
    document.body.appendChild(scrim);
    dialogEl = scrim;
    document.addEventListener("keydown", onKey);
    var first = modal.querySelector("input:not(:disabled), button");
    if (first && first.focus) { try { first.focus(); } catch (e) {} }
  }

  // Delegated trigger: any element with [data-rb-consent-open] (e.g. the
  // "Cookie settings" footer link) opens the preferences dialog.
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-rb-consent-open]");
    if (t) { e.preventDefault(); openDialog(); }
  });

  // ---- boot ----------------------------------------------------------------
  function boot() {
    injectStyle();
    consent = load();
    if (consent) { notify(); }        // already decided -> let consumers act
    else { showBanner(); }            // first visit -> ask
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
