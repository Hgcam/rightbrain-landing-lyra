/* Rightbrain — lazy-booted Intercom Messenger with a Lyra-matched launcher.
   App ID: tt6d3d9x. Intercom's widget JS is NOT loaded on page load; it only
   loads on user intent (hover to prefetch, click to open). Messenger colours
   are best-effort here; the authoritative styling lives in the Intercom
   dashboard (Messenger > Styling), action colour #EA580C. */
(function () {
  var APP_ID = "tt6d3d9x";
  var booted = false, loading = false;

  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: APP_ID,
    action_color: "#EA580C",
    background_color: "#EA580C",
    hide_default_launcher: true
  };

  // ---- Lyra launcher UI ----------------------------------------------------
  var style = document.createElement("style");
  style.textContent =
    '.rb-chat{position:fixed;right:1.25rem;bottom:calc(1.25rem + env(safe-area-inset-bottom));z-index:34;}' +
    '.rb-chat__btn{display:inline-flex;align-items:center;gap:.5rem;height:3rem;padding:0 1rem;border:none;cursor:pointer;' +
    'background:#EA580C;color:#fff;font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);' +
    'font-size:.8125rem;font-weight:600;line-height:1;letter-spacing:.01em;box-shadow:0 8px 24px rgba(0,0,0,.18);' +
    'transition:filter 150ms ease,transform 150ms ease,opacity 150ms ease;}' +
    '.rb-chat__btn:hover{filter:brightness(1.06);}' +
    '.rb-chat__btn:active{transform:translateY(1px);}' +
    '.rb-chat__btn:focus-visible{outline:2px solid #fff;outline-offset:2px;}' +
    '.rb-chat__btn svg{width:20px;height:20px;flex:none;display:block;}' +
    '.rb-chat__badge{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;' +
    'background:#1C1917;color:#fff;font-family:var(--font-mono,monospace);font-size:.6875rem;font-weight:600;' +
    'display:none;align-items:center;justify-content:center;line-height:1;}' +
    '.rb-chat.is-loading .rb-chat__btn{opacity:.7;pointer-events:none;}' +
    '.rb-chat.is-open{display:none;}' +
    '@media (max-width:520px){.rb-chat__label{display:none;}.rb-chat__btn{padding:0 .9rem;}}';
  (document.head || document.documentElement).appendChild(style);

  var CHAT_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "rb-chat";
  var btn = document.createElement("button");
  btn.className = "rb-chat__btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = CHAT_SVG + '<span class="rb-chat__label">Chat</span><span class="rb-chat__badge" aria-hidden="true"></span>';
  wrap.appendChild(btn);

  function ready() {
    if (document.body) { document.body.appendChild(wrap); }
    else { document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(wrap); }); }
  }
  ready();

  function setBadge(n) {
    var b = wrap.querySelector(".rb-chat__badge");
    if (!b) return;
    if (n && n > 0) { b.textContent = n > 9 ? "9+" : String(n); b.style.display = "inline-flex"; }
    else { b.style.display = "none"; }
  }
  function setOpen(open) { wrap.classList.toggle("is-open", !!open); }

  // ---- Lazy widget loader --------------------------------------------------
  function bootIntercom(cb) {
    if (booted) { cb && cb(); return; }
    if (loading) { document.addEventListener("rb:intercom-ready", function () { cb && cb(); }, { once: true }); return; }
    loading = true;
    var w = window, d = document;
    var i = function () { i.c(arguments); };
    i.q = []; i.c = function (a) { i.q.push(a); };
    w.Intercom = i;
    var s = d.createElement("script");
    s.async = true;
    s.src = "https://widget.intercom.io/widget/" + APP_ID;
    s.onload = function () {
      booted = true; loading = false;
      try {
        w.Intercom("onUnreadCountChange", function (n) { setBadge(n); });
        w.Intercom("onShow", function () { setOpen(true); });
        w.Intercom("onHide", function () { setOpen(false); });
      } catch (e) {}
      document.dispatchEvent(new Event("rb:intercom-ready"));
      cb && cb();
    };
    var x = d.getElementsByTagName("script")[0];
    x.parentNode.insertBefore(s, x);
  }

  // Prefetch on first hover/focus (desktop) so the click feels instant.
  btn.addEventListener("mouseenter", function () { bootIntercom(); }, { once: true });
  btn.addEventListener("focus", function () { bootIntercom(); }, { once: true });

  // Click always opens (booting first if needed).
  btn.addEventListener("click", function () {
    if (booted) { window.Intercom("showMessenger"); return; }
    wrap.classList.add("is-loading");
    bootIntercom(function () {
      wrap.classList.remove("is-loading");
      window.Intercom("showMessenger");
    });
  });
})();
