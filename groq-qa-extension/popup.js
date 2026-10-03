const $ = (id) => document.getElementById(id);

chrome.storage.local.get(["enabled", "apiKey", "model"], (s) => {
  $("enabled").checked = !!s.enabled;
  $("apiKey").value = s.apiKey || "";
  if (s.model && [...$("model").options].some((o) => o.value === s.model)) $("model").value = s.model;
});

// Activation toggle applies immediately
$("enabled").addEventListener("change", () => {
  chrome.storage.local.set({ enabled: $("enabled").checked });
});

$("save").addEventListener("click", () => {
  chrome.storage.local.set(
    { apiKey: $("apiKey").value.trim(), model: $("model").value },
    () => {
      $("status").textContent = "Saved.";
      setTimeout(() => ($("status").textContent = ""), 1500);
    }
  );
});

$("rescan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "RESCAN" }).catch(() => {});
});

$("clearCache").addEventListener("click", () => {
  chrome.storage.local.remove("qaCache", () => {
    $("status").textContent = "Cache cleared.";
    setTimeout(() => ($("status").textContent = ""), 1500);
  });
});
