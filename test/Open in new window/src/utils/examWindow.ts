const WINDOW_NAME = "mindwork-exam";

export const EXAM_ROOT_ID = "exam-root";

/**
 * Opens a real, separate browser window for the quiz and mirrors the current
 * document's styles into it so the quiz can be rendered through a React portal.
 * Returns null when the browser refuses the pop-up, letting the caller fall
 * back to an in-page focused overlay.
 */
export function openQuizWindow(title: string): Window | null {
  const width = Math.min(1140, Math.max(360, (window.screen.availWidth || 1200) - 120));
  const height = Math.min(820, Math.max(520, (window.screen.availHeight || 800) - 120));
  const left = Math.max(0, Math.round(((window.screen.availWidth || width) - width) / 2));
  const top = Math.max(0, Math.round(((window.screen.availHeight || height) - height) / 2));

  let win: Window | null = null;
  try {
    win = window.open("", WINDOW_NAME, `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
  } catch {
    win = null;
  }

  if (!win) return null;

  try {
    const doc = win.document;
    doc.title = title;

    if (!doc.querySelector("meta[charset]")) {
      const meta = doc.createElement("meta");
      meta.setAttribute("charset", "utf-8");
      doc.head.appendChild(meta);
    }

    if (!doc.getElementById("mindwork-styles")) {
      const marker = doc.createElement("style");
      marker.id = "mindwork-styles";
      marker.textContent = copyStyles();
      doc.head.appendChild(marker);
    }

    const previousRoot = doc.getElementById(EXAM_ROOT_ID);
    if (previousRoot) previousRoot.remove();

    const root = doc.createElement("div");
    root.id = EXAM_ROOT_ID;
    doc.body.appendChild(root);
    doc.body.classList.add("exam-body");
  } catch {
    return null;
  }

  return win;
}

function copyStyles(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        chunks.push(Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"));
      }
    } catch {
      // Cross-origin sheets cannot be read; the quiz still renders with its own
      // layout rules.
    }
  }
  return chunks.join("\n");
}

export function closeQuizWindow(win: Window | null) {
  if (!win) return;
  try {
    // Drop any close guard first so closing always succeeds.
    win.onbeforeunload = null;
    if (!win.closed) {
      win.focus();
      win.close();
    }
  } catch {
    // The window may already be gone.
  }
}

export function focusQuizWindow(win: Window | null) {
  if (!win || win.closed) return;
  try {
    win.focus();
  } catch {
    // Ignore focus failures.
  }
}
