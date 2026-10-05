// Detects questions visible on the page and shows answers in a top-right panel.
// NOTE: there is intentionally NO tab-focus / visibilitychange / window.focus logic here.
(() => {
  if (window.__gqaLoaded) return;
  window.__gqaLoaded = true;

  const HOST_ID = "gqa-root";
  const MAX_QUESTIONS = 15;      // safety cap per page load
  const MAX_CANDIDATES = 2500;   // DOM elements examined per scan

  let enabled = false;
  let observer = null;
  let scanTimer = null;
  let scanInterval = null;
  let startTimer = null;
  let host = null, listEl = null, bodyEl = null;
  let panelClosed = false;
  let zoomValue = 1;

  const seen = new Set();
  const claimed = new Map();   // elements already used as a question (stops container+child duplicates)
  const queue = [];
  let busy = false;
  let asked = 0;

  /* ---------- activation ---------- */
  chrome.storage.local.get(["enabled"], ({ enabled: e }) => setEnabled(!!e));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) setEnabled(!!changes.enabled.newValue);
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "RESCAN" && enabled) {
      panelClosed = false;
      seen.clear(); claimed.clear(); asked = 0;
      ensurePanel();
      scheduleScan(100);
    }
    if (msg?.type === "SHOW_PANEL" && enabled) {
      panelClosed = false;
      ensurePanel();
    }
  });

  // A popup opened with window.open("") can briefly have no body. Waiting here
  // keeps the extension alive in that window instead of silently missing it.
  function setEnabled(on) {
    if (on === enabled) return;
    enabled = on;
    if (on) start(); else stop();
  }

  function start() {
    if (!enabled || observer || scanInterval) return;
    if (!document.body) {
      clearTimeout(startTimer);
      startTimer = setTimeout(start, 50);
      return;
    }
    clearTimeout(startTimer);
    scheduleScan(300);
    scanInterval = setInterval(scan, 2500);   // safety net (e.g. missed during a fade-in); costs no API calls
    observer = new MutationObserver(() => scheduleScan(1200));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("keydown", onPanelShortcut, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
  }

  function stop() {
    observer?.disconnect(); observer = null;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    window.removeEventListener("keydown", onPanelShortcut, true);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    clearTimeout(scanTimer);
    clearTimeout(startTimer);
    clearInterval(scanInterval);
    scanInterval = null;
    queue.length = 0;
    host?.remove(); host = listEl = bodyEl = null;
    panelClosed = false;
    seen.clear(); claimed.clear(); asked = 0;
  }

  function onPanelShortcut(event) {
    // Useful in kiosk-style popup windows where the extension toolbar is not
    // visible. Do not steal ordinary quiz keyboard shortcuts.
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== "g") return;
    event.preventDefault();
    panelClosed = !panelClosed;
    ensurePanel();
  }

  function onFullscreenChange() {
    mountHost();
    scheduleScan(100);
  }

  // A document fullscreen element is the only part of a page rendered in
  // fullscreen. Move our host inside it so the answer panel remains visible.
  function mountHost() {
    if (!host) return;
    const target = document.fullscreenElement || document.documentElement;
    if (target && host.parentNode !== target) target.appendChild(host);
  }

  function onScroll() { scheduleScan(700); }
  function scheduleScan(delay) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, delay);
  }

  /* ---------- question detection ---------- */
  const STARTERS = /^\s*(?:q(?:uestion)?\s*\.?\s*\d+[\).:\-]?\s*|\d+[\).:\-]\s*)?(what|why|how|which|who|whom|whose|when|where|is|are|was|were|do|does|did|can|could|should|would|will|shall|may|might|has|have|had|explain|define|describe|find|calculate|compute|solve|evaluate|simplify|prove|name|list|state|write|choose|select|identify|determine|differentiate|compare|match|fill)\b/i;
  const HINTS = /(choose the (correct|right|best)|fill in the blank|which of the following|select the (correct|right)|_{3,}|true or false)/i;

  function looksLikeQuestion(t) {
    if (t.length < 12 || t.length > 500) return false;
    if (/\?\s*$/.test(t) || /\?/.test(t)) return true;
    if (HINTS.test(t)) return true;
    return STARTERS.test(t) && t.split(/\s+/).length >= 4;
  }

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (r.bottom <= 0 || r.top >= window.innerHeight) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  }

  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  // Stable key: letters/digits only, first 80 chars -> ignores timers, spacing, trailing changes
  function qkey(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80); }

  const NAV_LABELS = /^(next|previous|prev|back|submit|skip|continue|check|finish|restart|retry|start|close|ok|cancel|done|reset|home|menu|login|log in|sign in|sign up)$/i;
  const OPTION_SEL =
    'label, li, button, [role="button"], [role="radio"], [role="option"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), input[type="radio"] + *, input[type="checkbox"] + *';
  const CAND_SEL =
    "p, li, h1, h2, h3, h4, h5, h6, label, legend, span, div, td, th, b, strong, em, [role='heading'], [data-question], [tabindex]";

  // querySelectorAll that also walks into open shadow roots
  function deepAll(root, sel, out = []) {
    root.querySelectorAll(sel).forEach((n) => out.push(n));
    root.querySelectorAll("*").forEach((n) => { if (n.shadowRoot) deepAll(n.shadowRoot, sel, out); });
    return out;
  }

  function parentFor(node) {
    if (node.parentElement) return node.parentElement;
    const root = node.getRootNode?.();
    return root?.host || null;
  }

  function gatherOptions(el) {
    let node = el;
    for (let depth = 0; depth < 5 && node && node !== document.body; depth++) {
      node = parentFor(node);
      if (!node) break;
      const texts = [];
      // A number of quiz engines use plain divs with tabindex="1" instead of
      // buttons or radio roles. Search open shadow roots too, because those
      // controls are common in embedded/fullscreen quiz widgets.
      for (const o of deepAll(node, OPTION_SEL)) {
        if (o.contains(el) || el.contains(o)) continue;
        // options normally come after the question text
        if (!(el.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        const t = norm(o.textContent || "");
        if (!t || t.length > 200 || NAV_LABELS.test(t) || texts.includes(t)) continue;
        if (o.getAttribute("aria-disabled") === "true" || o.hasAttribute("disabled")) continue;
        // skip wrappers that merely contain other options
        if (deepAll(o, OPTION_SEL).length && t.length > 60) continue;
        texts.push(t);
        if (texts.length > 10) break;
      }
      if (texts.length >= 2 && texts.length <= 10) return texts;
    }
    return [];
  }

  function scan() {
    if (!enabled || !document.body) return;
    // ignore tiny frames (ads, trackers); real content frames are large
    if (window.innerWidth < 300 || window.innerHeight < 200) return;

    // Quiz apps (React etc.) REUSE the same elements for the next question.
    // Release an element once its content is no longer the question it was claimed for.
    for (const [cel, ckey] of claimed) {
      if (!cel.isConnected || qkey(norm(cel.textContent || '')) !== ckey) claimed.delete(cel);
    }

    const nodes = deepAll(document.body, CAND_SEL);
    let examined = 0, tier2 = 0;
    for (const el of nodes) {
      if (++examined > MAX_CANDIDATES || asked >= MAX_QUESTIONS) break;
      if (el.closest("#" + HOST_ID)) continue;
      if (el.closest("script, style, noscript, textarea, input, nav, footer, code, pre, button, [role='button']")) continue;

      const text = norm(el.textContent || "");
      if (text.length < 12 || text.length > 500) continue;

      // skip anything overlapping an element we already turned into a question
      let overlap = false;
      for (const q of claimed.keys()) { if (q === el || q.contains(el) || el.contains(q)) { overlap = true; break; } }
      if (overlap) continue;

      // keep only the deepest element that carries (almost) the whole text
      let dominated = false;
      for (const c of el.children) {
        if ((c.textContent || "").trim().length >= text.length * 0.9) { dominated = true; break; }
      }
      if (dominated) continue;

      const key = qkey(text);
      if (seen.has(key)) continue;

      let options = null;
      if (looksLikeQuestion(text)) {
        if (!inViewport(el)) continue;
      } else {
        // Tier 2: a short heading/paragraph followed by answer choices is a question
        // even without a "?" (typical quiz UIs built from buttons/cards).
        if (text.length < 15 || text.length > 300 || ++tier2 > 300) continue;
        if (!/^(P|H[1-6]|LEGEND|DIV|SPAN)$/.test(el.tagName)) continue;
        if (!inViewport(el)) continue;
        options = gatherOptions(el);
        if (options.length < 3) continue;
      }

      seen.add(key);
      claimed.set(el, key);
      asked++;
      if (options === null) options = text.length < 250 ? gatherOptions(el) : [];
      enqueue({ question: text, options });
    }
  }

  /* ---------- request queue (one at a time) ---------- */
  function enqueue(job) {
    const card = addCard(job.question);
    queue.push({ job, card });
    pump();
  }

  async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const { job, card } = queue.shift();
      if (!card.isConnected) continue;
      try {
        const res = await chrome.runtime.sendMessage({ type: "ASK", payload: job });
        if (!card.isConnected) continue;
        if (!res || res.error) setCard(card, res?.error || "No response.", true, job);
        else if (res.answer === "NOT_A_QUESTION") card.remove();
        else setCard(card, res.answer, false);
      } catch (e) {
        setCard(card, "Extension error: " + e.message, true, job);
      }
    }
    busy = false;
  }

  /* ---------- UI: top-right panel in a shadow root ---------- */
  function ensurePanel() {
    if (host) {
      host.style.display = panelClosed ? "none" : "block";
      mountHost();
      return;
    }
    if (panelClosed) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "all:initial;display:block;position:fixed;top:16px;right:16px;z-index:2147483647;";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        .panel{width:min(340px,calc(100vw - 24px));max-height:min(70vh,calc(100vh - 24px));display:flex;flex-direction:column;background:#111827;color:#f3f4f6;
          font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border-radius:12px;
          box-shadow:0 10px 30px rgba(0,0,0,.35);border:1px solid #374151;overflow:hidden}
        .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#1f2937;
          font-weight:600;cursor:default}
        .tools{display:flex;align-items:center;gap:2px}
        .bar button{background:none;border:0;color:#9ca3af;cursor:pointer;font-size:15px;line-height:1;padding:4px;margin:0;border-radius:4px}
        .bar button:hover,.bar button:focus-visible{color:#fff;background:#374151}
        .zoom{display:flex;align-items:center;gap:4px;padding:5px 8px;color:#9ca3af;border-bottom:1px solid #374151;font-size:11px}
        .zoom button{background:#374151;border:0;color:#f3f4f6;border-radius:4px;cursor:pointer;padding:3px 7px;font-size:13px;line-height:1}
        .zoom button:hover,.zoom button:focus-visible{background:#4b5563}
        .zoom-value{min-width:38px;text-align:center}
        .body{overflow:auto;padding:8px}
        .collapsed .body{display:none}
        .card{background:#1f2937;border-radius:8px;padding:8px 10px;margin-bottom:8px}
        .q{color:#93c5fd;font-size:12px;margin-bottom:4px;max-height:3.9em;overflow:hidden}
        .a{white-space:pre-wrap;word-break:break-word}
        .err{color:#fca5a5}
        .load{color:#9ca3af;font-style:italic}
        .retry{margin-top:6px;background:#374151;color:#f3f4f6;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px}
        .empty{color:#9ca3af;padding:4px 2px}
      </style>
      <div class="panel" id="panel">
        <div class="bar"><span>Groq Answers</span>
          <span class="tools">
            <button id="min" title="Minimize answers">–</button>
            <button id="clr" title="Clear answers">⟲</button>
            <button id="hide" title="Hide answer panel">×</button>
          </span>
        </div>
        <div class="zoom" aria-label="Page zoom controls">
          <span>Page zoom</span>
          <button id="zoomOut" title="Zoom out">−</button>
          <span class="zoom-value" id="zoomValue">100%</span>
          <button id="zoomIn" title="Zoom in">+</button>
          <button id="zoomReset" title="Reset zoom">Reset</button>
        </div>
        <div class="body" id="body"><div class="empty" id="empty">Looking for questions…</div></div>
      </div>`;
    document.documentElement.appendChild(host);
    mountHost();
    bodyEl = root.getElementById("body");
    listEl = bodyEl;
    const panel = root.getElementById("panel");
    root.getElementById("min").onclick = () => panel.classList.toggle("collapsed");
    root.getElementById("clr").onclick = () => {
      bodyEl.querySelectorAll(".card").forEach((c) => c.remove());
      queue.length = 0; seen.clear(); claimed.clear(); asked = 0; scheduleScan(100);
    };
    root.getElementById("hide").onclick = () => {
      panelClosed = true;
      host.style.display = "none";
      queue.length = 0;
    };

    const zoomLabel = root.getElementById("zoomValue");
    const updateZoomLabel = (value) => {
      zoomValue = Number(value) || 1;
      zoomLabel.textContent = `${Math.round(zoomValue * 100)}%`;
    };
    const changeZoom = (value) => {
      chrome.runtime.sendMessage({ type: "SET_ZOOM", zoom: value }).then((res) => {
        if (res?.zoom) updateZoomLabel(res.zoom);
      }).catch(() => {});
    };
    root.getElementById("zoomOut").onclick = () => changeZoom(zoomValue - 0.1);
    root.getElementById("zoomIn").onclick = () => changeZoom(zoomValue + 0.1);
    root.getElementById("zoomReset").onclick = () => changeZoom(1);
    chrome.runtime.sendMessage({ type: "GET_ZOOM" }).then((res) => {
      if (res?.zoom) updateZoomLabel(res.zoom);
    }).catch(() => {});
  }

  function addCard(question) {
    ensurePanel();
    host.shadowRoot.getElementById("empty")?.remove();
    const card = document.createElement("div");
    card.className = "card";
    const q = document.createElement("div"); q.className = "q"; q.textContent = question;
    const a = document.createElement("div"); a.className = "a load"; a.textContent = "Thinking…";
    card.append(q, a);
    listEl.appendChild(card);
    listEl.scrollTop = listEl.scrollHeight;
    return card;
  }

  function setCard(card, text, isErr, job) {
    const a = card.querySelector(".a");
    a.className = "a" + (isErr ? " err" : "");
    a.textContent = text;
    card.querySelector(".retry")?.remove();
    if (isErr && job && !/limit reached/i.test(text)) {
      const b = document.createElement("button");
      b.className = "retry"; b.textContent = "Retry (uses 1 request)";
      b.onclick = () => {
        b.remove();
        a.className = "a load"; a.textContent = "Thinking…";
        queue.push({ job, card }); pump();
      };
      card.appendChild(b);
    }
  }
})();
