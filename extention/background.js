// ── Context menu (keep legacy manual solve) ───────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "solve-mcq",
    title: "Solve MCQ with AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "solve-mcq") {
    chrome.tabs.sendMessage(tab.id, { action: "solve" });
  }
});

// ── Tab focus / visibility tracking ──────────────────────────
// When a tab becomes active, tell its content script the tab is focused.
// When a tab is deactivated, tell it to hide.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  // Newly active tab — notify it (tab is now focused)
  chrome.tabs.sendMessage(tabId, { action: "tabFocused", focused: true })
    .catch(() => {}); // tab may not have content script

  // Notify previously active tabs in same window they lost focus
  chrome.tabs.query({}, tabs => {
    tabs.forEach(t => {
      if (t.id !== tabId) {
        chrome.tabs.sendMessage(t.id, { action: "tabFocused", focused: false })
          .catch(() => {});
      }
    });
  });
});

// Window focus/blur
chrome.windows.onFocusChanged.addListener(windowId => {
  const focused = windowId !== chrome.windows.WINDOW_ID_NONE;

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: "tabFocused", focused })
        .catch(() => {});
    });
  });
});

// ── Relay toggle from popup to active tab ─────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "setEnabled") {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "setEnabled", value: msg.value })
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }));
      }
    });
    return true; // async response
  }

  if (msg.action === "rescan") {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "rescan" })
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }));
      }
    });
    return true;
  }
});
