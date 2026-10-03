// Calls the Groq API. Lives in the service worker so the key never touches page scripts.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT =
  "You answer questions found on a web page. Be accurate and concise. " +
  "If options are given (multiple choice), start with the correct option letter/text, then give a one-line reason. " +
  "For math or calculations, show the final answer first, then brief working. " +
  "If the text is not actually a question, reply exactly: NOT_A_QUESTION.";

const ALLOWED_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const DEFAULT_MODEL = "openai/gpt-oss-20b";

async function callGroq({ question, options }) {
  const { apiKey, model: storedModel } = await chrome.storage.local.get(["apiKey", "model"]);
  // Old saved models (e.g. llama-3.3-70b-versatile) are retired -> fall back to the default
  const model = ALLOWED_MODELS.includes(storedModel) ? storedModel : DEFAULT_MODEL;
  if (!apiKey) throw new Error("No Groq API key set. Open the extension popup.");

  let userContent = `Question:\n${question}`;
  if (options && options.length) {
    userContent += `\n\nOptions:\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // gpt-oss models reason first; reasoning tokens count toward this limit
      max_completion_tokens: 2000,
      reasoning_effort: "low",
      include_reasoning: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch (_) {}
    if (res.status === 401) throw new Error("Invalid Groq API key.");
    if (res.status === 429) throw new Error("Rate limited by Groq. Try again shortly.");
    throw new Error(`Groq error ${res.status}${detail ? ": " + detail : ""}`);
  }

  const data = await res.json();
  return { answer: (data.choices?.[0]?.message?.content || "").trim() };
}

// ---- Request budget: max 2 API requests per question, answers cached ----
const MAX_ATTEMPTS = 2;

function qkey(q) {
  return q.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

async function handle(payload) {
  const key = qkey(payload.question);
  const { qaCache = {} } = await chrome.storage.local.get("qaCache");
  const entry = qaCache[key] || { attempts: 0 };

  if (entry.answer) return { answer: entry.answer, cached: true };   // no API call
  if (entry.attempts >= MAX_ATTEMPTS) {
    return { error: `Limit reached: this question was already tried ${MAX_ATTEMPTS} times.` };
  }

  // Count the attempt BEFORE calling, so crashes/reloads can't cause extra requests
  entry.attempts += 1;
  entry.t = Date.now();
  qaCache[key] = entry;
  await save(qaCache);

  try {
    const { answer } = await callGroq(payload);
    entry.answer = answer;
    await save(qaCache);
    return { answer };
  } catch (e) {
    return { error: e.message };
  }
}

async function save(cache) {
  const keys = Object.keys(cache);
  if (keys.length > 300) {
    keys.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0))
        .slice(0, keys.length - 300)
        .forEach((k) => delete cache[k]);
  }
  await chrome.storage.local.set({ qaCache: cache });
}

// One request at a time across ALL tabs/frames (also avoids bursts and duplicate frames)
let chain = Promise.resolve();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ASK") {
    chain = chain.then(() => handle(msg.payload)).then(sendResponse, (e) => sendResponse({ error: e.message }));
    return true; // async response
  }
});
