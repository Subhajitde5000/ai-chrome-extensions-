// ── State ────────────────────────────────────────────────────
let isEnabled    = true;
let isTabFocused = true;
let scanInterval = null;
let lastScannedHash = "";
let currentPanel    = null;
let statusDot       = null;   // always-visible status indicator
let questionCount   = 0;      // last detected question count

// ═══════════════════════════════════════════════════════════════
//  STATUS INDICATOR  — always visible, never blocked by tab focus
//  Shows user the extension is alive even when the answer panel
//  is hidden (tab not focused).
// ═══════════════════════════════════════════════════════════════

const STATUS_STATES = {
  idle:     { icon: "🤖", label: "MCQ Solver ready",         dot: "#6c7086", pulse: false },
  scanning: { icon: "🔍", label: "Scanning for MCQs…",       dot: "#f9e2af", pulse: true  },
  solving:  { icon: "⚡", label: "Solving questions…",       dot: "#89b4fa", pulse: true  },
  done:     { icon: "✅", label: "Answers ready",            dot: "#a6e3a1", pulse: false },
  hidden:   { icon: "👁", label: "Tab not focused — hidden", dot: "#cba6f7", pulse: false },
  disabled: { icon: "⏸", label: "Extension disabled",       dot: "#45475a", pulse: false },
  error:    { icon: "❌", label: "Server not reachable",     dot: "#f38ba8", pulse: false },
};

function createStatusIndicator() {
  // Inject keyframe animation once
  if (!document.getElementById("mcq-keyframes")) {
    const style = document.createElement("style");
    style.id = "mcq-keyframes";
    style.textContent = `
      @keyframes mcq-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(137,180,250,0.7); }
        50%      { box-shadow: 0 0 0 6px rgba(137,180,250,0);  }
      }
      @keyframes mcq-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes mcq-fadein {
        from { opacity:0; transform: translateY(6px); }
        to   { opacity:1; transform: translateY(0);   }
      }
      #mcq-status-pill {
        animation: mcq-fadein 0.4s ease both;
      }
      #mcq-status-pill.pulsing #mcq-dot {
        animation: mcq-pulse 1.2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  const pill = document.createElement("div");
  pill.id = "mcq-status-pill";
  pill.title = "MCQ Auto Solver — click to toggle panel";
  pill.style.cssText = `
    position: fixed;
    bottom: 18px;
    right: 18px;
    z-index: 2147483646;
    background: #1e1e2eee;
    border: 1.5px solid #313244;
    border-radius: 999px;
    padding: 5px 10px 5px 7px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-family: 'Segoe UI', sans-serif;
    font-size: 12px;
    color: #cdd6f4;
    user-select: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    transition: border-color 0.3s, background 0.3s;
    min-width: 140px;
  `;

  pill.innerHTML = `
    <span id="mcq-dot" style="
      width: 9px; height: 9px;
      border-radius: 50%;
      background: #6c7086;
      flex-shrink: 0;
      transition: background 0.3s;
    "></span>
    <span id="mcq-pill-icon" style="font-size:13px;line-height:1;">🤖</span>
    <span id="mcq-pill-label" style="
      font-size: 11px;
      color: #a6adc8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    ">MCQ Solver ready</span>
    <span id="mcq-q-count" style="
      display:none;
      background:#313244;
      border-radius:999px;
      padding:1px 6px;
      font-size:10px;
      color:#89b4fa;
      font-weight:600;
      margin-left:2px;
    "></span>
  `;

  document.body.appendChild(pill);

  // Click pill → toggle answer panel
  pill.addEventListener("click", () => {
    if (!currentPanel || currentPanel.style.display === "none") {
      if (isTabFocused && isEnabled) showPanel();
    } else {
      hidePanel();
    }
  });

  // Draggable pill
  makeDraggable(pill, pill);

  return pill;
}

function setStatus(state, qCount) {
  if (!statusDot) return;
  const s = STATUS_STATES[state] || STATUS_STATES.idle;

  const dot   = document.getElementById("mcq-dot");
  const icon  = document.getElementById("mcq-pill-icon");
  const label = document.getElementById("mcq-pill-label");
  const badge = document.getElementById("mcq-q-count");

  if (dot)   dot.style.background = s.dot;
  if (icon)  icon.textContent = s.icon;
  if (label) label.textContent = s.label;

  // Show question count badge
  if (badge) {
    if (qCount && qCount > 0) {
      badge.style.display = "inline-block";
      badge.textContent   = qCount + "Q";
    } else {
      badge.style.display = "none";
    }
  }

  // Pulse class
  if (s.pulse) {
    statusDot.classList.add("pulsing");
  } else {
    statusDot.classList.remove("pulsing");
  }

  // Border color follows dot
  statusDot.style.borderColor = s.dot + "88";
}

// ── Tab focus detection (Page Visibility API) ─────────────────
document.addEventListener("visibilitychange", () => {
  isTabFocused = document.visibilityState === "visible";
  if (!isTabFocused) {
    hidePanel();
    setStatus("hidden", questionCount);   // indicator stays visible!
  } else {
    if (isEnabled) setStatus(questionCount > 0 ? "done" : "idle", questionCount);
    showPanel();
  }
});

window.addEventListener("blur",  () => {
  isTabFocused = false;
  hidePanel();
  setStatus("hidden", questionCount);
});
window.addEventListener("focus", () => {
  isTabFocused = true;
  if (isEnabled) setStatus(questionCount > 0 ? "done" : "idle", questionCount);
  showPanel();
});

// ── MCQ Detection helpers ─────────────────────────────────────
function detectMCQs() {
  const results = [];

  const questionSelectors = [
    ".question", ".mcq", ".quiz-question", ".test-question",
    "[class*='question']", "[class*='Question']",
    "[data-type='question']",
    "fieldset"
  ];

  for (const sel of questionSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      const parsed = parseQuestionBlock(el);
      if (parsed) results.push(parsed);
    });
  }

  if (results.length === 0) {
    const paragraphs = [...document.querySelectorAll("p, h3, h4, li, td, div")];
    for (const el of paragraphs) {
      const text = el.innerText?.trim();
      if (!text || text.length < 10) continue;
      const hasOptionLabels = /\b[A-Da-d][.)]\s+\S/.test(text) ||
                              /\b[1-4][.)]\s+\S/.test(text);
      if (!hasOptionLabels) continue;
      const parsed = parseRawText(text);
      if (parsed) results.push(parsed);
    }
  }

  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.question)) return false;
    seen.add(r.question);
    return true;
  });
}

function parseQuestionBlock(el) {
  const text = el.innerText?.trim();
  if (!text || text.length < 10) return null;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const optionRe = /^[\(（]?[A-Da-d1-4][\)）.\s]/;
  const optionLines = lines.filter(l => optionRe.test(l));
  if (optionLines.length < 2) return null;
  const firstOptionIdx = lines.findIndex(l => optionRe.test(l));
  const questionText = lines.slice(0, firstOptionIdx).join(" ").trim();
  if (!questionText) return null;
  return { question: questionText, options: optionLines };
}

function parseRawText(text) {
  const parts = text.split(/(?=\b[A-Da-d][.)]\s)/);
  if (parts.length < 3) return null;
  const question = parts[0].trim();
  const options = parts.slice(1).map(p => p.trim()).filter(Boolean);
  if (!question || options.length < 2) return null;
  return { question, options };
}

function hashMCQs(mcqs) {
  return mcqs.map(m => m.question.slice(0, 60)).join("|");
}

// ── Server communication ──────────────────────────────────────
async function solveQuestion(question, options) {
  const res = await fetch("http://127.0.0.1:5000/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: `${question}\n${options.join("\n")}` })
  });
  if (!res.ok) throw new Error("Server error " + res.status);
  return res.json();
}

// ── Answer Panel UI ───────────────────────────────────────────
function createPanel() {
  const panel = document.createElement("div");
  panel.id = "mcq-auto-panel";
  panel.style.cssText = `
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 2147483647;
    background: #1e1e2e;
    color: #cdd6f4;
    border: 2px solid #89b4fa;
    border-radius: 14px;
    padding: 0;
    font-family: 'Segoe UI', monospace, sans-serif;
    font-size: 14px;
    min-width: 260px;
    max-width: 340px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 6px 32px rgba(0,0,0,0.6);
    transition: opacity 0.25s ease;
    opacity: 1;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    background: #313244;
    border-radius: 12px 12px 0 0;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: move;
    user-select: none;
    gap: 8px;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="color:#89b4fa;font-weight:bold;font-size:13px;">🤖 MCQ Auto Solver</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span id="mcq-live-badge" style="
        background:#a6e3a122;
        border:1px solid #a6e3a1;
        color:#a6e3a1;
        font-size:9px;
        border-radius:999px;
        padding:1px 7px;
        font-family:'Segoe UI',sans-serif;
        letter-spacing:0.5px;
      ">● LIVE</span>
      <button id="mcq-close-btn" style="
        background:none;border:none;color:#f38ba8;font-size:18px;
        cursor:pointer;line-height:1;padding:0 2px;
      ">×</button>
    </div>
  `;
  panel.appendChild(header);

  // Progress bar (shown while solving)
  const progress = document.createElement("div");
  progress.id = "mcq-progress-bar";
  progress.style.cssText = `
    height: 2px;
    background: linear-gradient(90deg, #89b4fa, #cba6f7, #89b4fa);
    background-size: 200% 100%;
    animation: mcq-progress-slide 1.2s linear infinite;
    display: none;
  `;
  panel.appendChild(progress);

  // Inject progress animation
  if (!document.getElementById("mcq-progress-style")) {
    const s = document.createElement("style");
    s.id = "mcq-progress-style";
    s.textContent = `
      @keyframes mcq-progress-slide {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(s);
  }

  // Body
  const body = document.createElement("div");
  body.id = "mcq-panel-body";
  body.style.cssText = "padding: 12px 14px;";
  body.innerHTML = `<div style="color:#a6adc8;font-size:12px;">🔍 Scanning page for MCQs…</div>`;
  panel.appendChild(body);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    background: #181825;
    border-top: 1px solid #313244;
    border-radius: 0 0 12px 12px;
    padding: 5px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  footer.innerHTML = `
    <span id="mcq-footer-status" style="font-size:10px;color:#585b70;">Waiting for scan…</span>
    <span style="font-size:10px;color:#45475a;">AI powered</span>
  `;
  panel.appendChild(footer);

  document.body.appendChild(panel);

  panel.querySelector("#mcq-close-btn").addEventListener("click", () => {
    panel.style.display = "none";
  });

  makeDraggable(panel, header);
  return panel;
}

function getOrCreatePanel() {
  if (!currentPanel || !document.body.contains(currentPanel)) {
    currentPanel = createPanel();
  }
  currentPanel.style.display = "block";
  currentPanel.style.opacity = "1";
  return currentPanel;
}

function hidePanel() {
  if (currentPanel) {
    currentPanel.style.opacity = "0";
    setTimeout(() => {
      if (currentPanel) currentPanel.style.display = "none";
    }, 250);
  }
}

function showPanel() {
  if (currentPanel) {
    currentPanel.style.display = "block";
    requestAnimationFrame(() => {
      if (currentPanel) currentPanel.style.opacity = "1";
    });
  }
}

function setProgressBar(visible) {
  const bar = document.getElementById("mcq-progress-bar");
  if (bar) bar.style.display = visible ? "block" : "none";
}

function setFooterStatus(text) {
  const f = document.getElementById("mcq-footer-status");
  if (f) f.textContent = text;
}

// Render answers
function renderAnswers(results) {
  const panel = getOrCreatePanel();
  const body  = panel.querySelector("#mcq-panel-body");
  setProgressBar(false);

  if (!results || results.length === 0) {
    body.innerHTML = `<div style="color:#a6adc8;font-size:12px;">❌ No MCQs detected on this page.</div>`;
    setFooterStatus("No questions found");
    setStatus("idle", 0);
    return;
  }

  questionCount = results.length;

  body.innerHTML = results.map((r, i) => {
    const statusColor = r.error ? "#f38ba8" : "#a6e3a1";
    const answerText  = r.error ? "Error" : (r.answer || "?");
    const timeBadge   = r.time  ? `<span style="color:#585b70;font-size:10px;margin-left:6px;">⏱${r.time}s</span>` : "";
    return `
      <div style="margin-bottom:12px;border-bottom:1px solid #313244;padding-bottom:10px;">
        <div style="font-size:11px;color:#a6adc8;margin-bottom:4px;">Q${i + 1}</div>
        <div style="font-size:12px;color:#cdd6f4;margin-bottom:6px;line-height:1.4;">
          ${escapeHtml(r.question.slice(0, 120))}${r.question.length > 120 ? "…" : ""}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="
            background:#313244;
            border:1.5px solid ${statusColor};
            color:${statusColor};
            font-size:22px;
            font-weight:bold;
            border-radius:8px;
            padding:2px 14px;
            letter-spacing:1px;
          ">${escapeHtml(answerText)}</span>
          ${timeBadge}
        </div>
      </div>
    `;
  }).join("") + `<div style="font-size:10px;color:#45475a;text-align:right;margin-top:4px;">
    ${results.length} question(s) found
  </div>`;

  const now = new Date().toLocaleTimeString();
  setFooterStatus(`Last scan: ${now}`);
  setStatus("done", results.length);
}

function renderLoading(count) {
  const panel = getOrCreatePanel();
  const body  = panel.querySelector("#mcq-panel-body");
  setProgressBar(true);
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:8px;">
      <div style="
        width:32px;height:32px;
        border:3px solid #313244;
        border-top-color:#89b4fa;
        border-radius:50%;
        animation:mcq-spin 0.8s linear infinite;
      "></div>
      <div style="color:#89b4fa;font-size:12px;font-weight:600;">
        Solving ${count} question${count !== 1 ? "s" : ""}…
      </div>
      <div style="color:#a6adc8;font-size:11px;">AI is thinking, please wait</div>
    </div>
  `;
  setFooterStatus("Asking AI…");
}

function renderError(msg) {
  const panel = getOrCreatePanel();
  const body  = panel.querySelector("#mcq-panel-body");
  setProgressBar(false);
  body.innerHTML = `
    <div style="color:#f38ba8;font-size:12px;margin-bottom:4px;">❌ ${escapeHtml(msg)}</div>
    <div style="color:#a6adc8;font-size:11px;">Make sure the local server is running at 127.0.0.1:5000</div>
  `;
  setFooterStatus("Server error");
  setStatus("error", 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Draggable utility ─────────────────────────────────────────
function makeDraggable(el, handle) {
  let ox = 0, oy = 0, sx = 0, sy = 0;
  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    sx = e.clientX; sy = e.clientY;
    const rect = el.getBoundingClientRect();
    ox = rect.left; oy = rect.top;
    const onMove = ev => {
      el.style.left  = (ox + (ev.clientX - sx)) + "px";
      el.style.top   = (oy + (ev.clientY - sy)) + "px";
      el.style.right = "auto";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",  onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",  onUp);
  });
}

// ── Main scan + solve loop ────────────────────────────────────
async function scanAndSolve() {
  if (!isEnabled) return;

  setStatus("scanning", questionCount);

  const mcqs = detectMCQs();

  // Always keep scanning, even when tab not focused —
  // but only SHOW the panel when focused
  if (mcqs.length === 0) {
    setStatus(isTabFocused ? "idle" : "hidden", 0);
    return;
  }

  const hash = hashMCQs(mcqs);
  if (hash === lastScannedHash) {
    // Same questions — just update focus state indicator
    setStatus(isTabFocused ? "done" : "hidden", questionCount);
    return;
  }
  lastScannedHash = hash;

  setStatus("solving", mcqs.length);
  if (isTabFocused) renderLoading(mcqs.length);

  const results = await Promise.all(
    mcqs.map(async ({ question, options }) => {
      try {
        const data = await solveQuestion(question, options);
        return { question, answer: data.answer, time: data.time };
      } catch {
        return { question, error: true };
      }
    })
  );

  questionCount = results.filter(r => !r.error).length;

  // Update indicator regardless of focus
  setStatus(isTabFocused ? "done" : "hidden", questionCount);

  // Only update the visible panel if tab is focused
  if (isTabFocused && isEnabled) {
    renderAnswers(results);
  }
  // Store last results so we can show them when focus returns
  lastResults = results;
}

let lastResults = null;

// When tab regains focus, show cached results immediately
window.addEventListener("focus", () => {
  if (lastResults && isEnabled) {
    renderAnswers(lastResults);
    showPanel();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && lastResults && isEnabled) {
    renderAnswers(lastResults);
    showPanel();
  }
});

// ── Start / Stop scanning ─────────────────────────────────────
function startScanning() {
  if (scanInterval) return;
  scanInterval = setInterval(scanAndSolve, 3000);
  scanAndSolve();
}

function stopScanning() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  hidePanel();
  setStatus("disabled", 0);
}

// ── Boot ──────────────────────────────────────────────────────
// Create the status indicator immediately (always visible)
statusDot = createStatusIndicator();
setStatus("idle", 0);

chrome.storage.sync.get(["mcqEnabled"], res => {
  isEnabled = res.mcqEnabled !== false;
  if (isEnabled) {
    startScanning();
  } else {
    setStatus("disabled", 0);
  }
});

// ── Message listener ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "setEnabled") {
    isEnabled = msg.value;
    if (isEnabled) {
      lastScannedHash = "";
      lastResults = null;
      startScanning();
    } else {
      stopScanning();
    }
    sendResponse({ ok: true });
  }

  if (msg.action === "rescan") {
    lastScannedHash = "";
    lastResults = null;
    scanAndSolve();
    sendResponse({ ok: true });
  }

  // Legacy right-click solve
  if (msg.action === "solve") {
    const sel = window.getSelection().toString().trim();
    if (sel) {
      renderLoading(1);
      solveQuestion(sel, [])
        .then(data => {
          const r = [{ question: sel, answer: data.answer, time: data.time }];
          lastResults = r;
          renderAnswers(r);
        })
        .catch(() => renderError("Server not reachable."));
    }
  }

  if (msg.action === "getStatus") {
    // Determine current state string
    let state = "idle";
    if (!isEnabled)                          state = "disabled";
    else if (!isTabFocused)                  state = "hidden";
    else if (lastResults && questionCount)   state = "done";
    sendResponse({ state, qCount: questionCount, focused: isTabFocused });
    return true;
  }

  if (msg.action === "tabFocused") {
    isTabFocused = msg.focused;
    if (!isTabFocused) {
      hidePanel();
      setStatus("hidden", questionCount);
    } else {
      if (isEnabled) {
        setStatus(questionCount > 0 ? "done" : "idle", questionCount);
        if (lastResults) { renderAnswers(lastResults); showPanel(); }
      }
    }
  }
});
