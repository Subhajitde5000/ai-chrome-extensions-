const toggle         = document.getElementById("toggle");
const rescanBtn      = document.getElementById("rescan-btn");
const clearBtn       = document.getElementById("clear-btn");
const liveDot        = document.getElementById("live-dot");
const stateIcon      = document.getElementById("state-icon");
const stateText      = document.getElementById("state-text");
const qBadge         = document.getElementById("q-badge");
const focusIndicator = document.getElementById("focus-indicator");
const focusText      = document.getElementById("focus-text");

// ── Status definitions (mirrors content.js STATUS_STATES) ──────
const STATUS_MAP = {
  idle:     { icon: "🤖", label: "Ready — scanning page",     dot: "on",     focusLabel: "Tab focused" },
  scanning: { icon: "🔍", label: "Scanning for MCQs…",        dot: "warn",   focusLabel: "Tab focused" },
  solving:  { icon: "⚡", label: "Solving with AI…",          dot: "warn",   focusLabel: "Tab focused" },
  done:     { icon: "✅", label: "Answers ready",             dot: "on",     focusLabel: "Tab focused" },
  hidden:   { icon: "👁", label: "Working in background",     dot: "purple", focusLabel: "Tab not focused — panel hidden" },
  disabled: { icon: "⏸", label: "Extension disabled",        dot: "off",    focusLabel: "" },
  error:    { icon: "❌", label: "Server not reachable",      dot: "err",    focusLabel: "" },
};

function applyStatus(state, qCount, focused) {
  const s = STATUS_MAP[state] || STATUS_MAP.idle;

  stateIcon.textContent = s.icon;
  stateText.textContent = s.label;

  // Live dot class
  liveDot.className = "live-dot " + s.dot;

  // Question count badge
  if (qCount && qCount > 0) {
    qBadge.style.display = "inline-block";
    qBadge.textContent   = qCount + " Q";
  } else {
    qBadge.style.display = "none";
  }

  // Focus indicator
  const isFocused = focused !== false && state !== "hidden" && state !== "disabled";
  focusIndicator.className = "focus-indicator" + (isFocused ? " focused" : "");

  if (state === "hidden") {
    focusText.textContent = "⚠ Tab not focused — panel hidden, still working";
  } else if (state === "disabled") {
    focusText.textContent = "Extension is off";
  } else {
    focusText.textContent = "Tab focused — showing answers";
  }
}

// ── Poll status from the active tab's content script ──────────
function pollStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: "getStatus" }, res => {
      if (chrome.runtime.lastError || !res) return;
      applyStatus(res.state, res.qCount, res.focused);
    });
  });
}

// Poll every 1.5 seconds while popup is open
pollStatus();
const pollTimer = setInterval(pollStatus, 1500);
window.addEventListener("unload", () => clearInterval(pollTimer));

// ── Load saved enabled state ──────────────────────────────────
chrome.storage.sync.get(["mcqEnabled"], res => {
  const enabled = res.mcqEnabled !== false;
  toggle.checked = enabled;
  if (!enabled) applyStatus("disabled", 0, false);
});

// ── Toggle ────────────────────────────────────────────────────
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ mcqEnabled: enabled });
  chrome.runtime.sendMessage({ action: "setEnabled", value: enabled });
  if (!enabled) applyStatus("disabled", 0, false);
  else          applyStatus("scanning",  0, true);
});

// ── Scan Now ──────────────────────────────────────────────────
rescanBtn.addEventListener("click", () => {
  rescanBtn.textContent = "⏳ Scanning…";
  rescanBtn.disabled    = true;
  applyStatus("scanning", 0, true);

  chrome.runtime.sendMessage({ action: "rescan" }, () => {
    setTimeout(() => {
      rescanBtn.textContent = "🔍 Scan Now";
      rescanBtn.disabled    = false;
      pollStatus();
    }, 2000);
  });
});

// ── Hide Panel ────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "setEnabled", value: false })
        .catch(() => {});
    }
  });
  toggle.checked = false;
  chrome.storage.sync.set({ mcqEnabled: false });
  applyStatus("disabled", 0, false);
});
