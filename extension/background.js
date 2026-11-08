import { DEFAULTS, stamp, toMarkdown, closable, detectBrowser, countTabs } from "./lib.js";

const BROWSER = detectBrowser(navigator);

export async function settings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get("settings")).settings };
}

async function snapshots() {
  return (await chrome.storage.local.get("snapshots")).snapshots || [];
}

// --- Badge: open tab count, orange from the warn threshold -------------------

async function updateBadge() {
  const [tabs, s] = await Promise.all([chrome.tabs.query({ windowType: "normal" }), settings()]);
  const n = tabs.filter(t => !t.incognito).length;
  await chrome.action.setBadgeText({ text: String(n) });
  await chrome.action.setBadgeBackgroundColor({ color: n >= Number(s.warn) ? "#E8590C" : "#5C5F66" });
  await chrome.action.setTitle({ title: `tabsnap: ${n} tabs open` });
}

let badgeTimer;
const scheduleBadge = () => { clearTimeout(badgeTimer); badgeTimer = setTimeout(updateBadge, 150); };
for (const ev of [chrome.tabs.onCreated, chrome.tabs.onRemoved, chrome.tabs.onAttached, chrome.tabs.onDetached,
                  chrome.tabs.onReplaced, chrome.windows.onCreated, chrome.windows.onRemoved]) ev.addListener(scheduleBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.storage.onChanged.addListener(changes => { if (changes.settings) updateBadge(); });

async function flash(text) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#2B8A3E" });
  setTimeout(updateBadge, 1500);
}

// --- Save, and optionally close -------------------------------------------

// scope: "all" or "window" (windowId = the window to save)
export async function save({ scope = "all", windowId, close = false, note = "" } = {}) {
  const s = await settings();
  let wins = scope === "window"
    ? [await chrome.windows.get(windowId, { populate: true })]
    : await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  wins = wins.filter(w => !w.incognito);  // never saved, counted or closed

  const created = Date.now();
  const existing = new Set((await snapshots()).map(x => x.id));
  let id = stamp(new Date(created));
  for (let i = 2; existing.has(id); i++) id = `${stamp(new Date(created))}_${i}`;

  const snap = {
    id, created, note, browser: BROWSER, scope: scope === "window" ? "This window" : "",
    windows: wins.map((w, i) => ({
      label: scope === "window" ? "This window" : `Window ${i + 1}`,
      tabs: w.tabs.filter(t => t.url).map(t => ({ title: t.title || "", url: t.url, pinned: t.pinned, done: false })),
    })).filter(w => w.tabs.length),
  };
  const total = countTabs(snap);
  if (!total) return { total: 0 };

  await chrome.storage.local.set({ snapshots: [snap, ...(await snapshots())] });

  if (s.saveMarkdown) {
    const folder = (s.folder || "tabsnap").replace(/[^\w.\- ]/g, "").trim() || "tabsnap";
    await chrome.downloads.download({
      url: "data:text/markdown;charset=utf-8," + encodeURIComponent(toMarkdown(snap)),
      filename: `${folder}/${id}.md`, conflictAction: "uniquify", saveAs: false,
    }).catch(() => {});  // the snapshot is already stored; a failed export shouldn't undo it
  }

  let closed = 0, kept = 0;
  if (close) {
    // Only tabs we just saved; skip pinned tabs and the keep list
    const ids = [];
    for (const w of wins) for (const t of w.tabs) (t.url && closable(t, s) ? ids.push(t.id) : kept++);
    // Closing every tab in the browser would quit it (on Windows/Linux), so land on the snapshot first
    const open = (await chrome.tabs.query({})).length;
    if (ids.length && ids.length >= open) {
      await chrome.tabs.create({ url: `snapshot.html?id=${encodeURIComponent(id)}`, windowId: wins[0]?.id, active: true });
    }
    if (ids.length) await chrome.tabs.remove(ids);
    closed = ids.length;
  }
  return { id, total, closed, kept };
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  const r = command === "save-close-window"
    ? await save({ scope: "window", windowId: tab?.windowId ?? (await chrome.windows.getLastFocused()).id, close: true })
    : await save({ scope: "all" });
  if (r.total) flash("✓");
});

// Pages talk to the worker with { type: "save", ... }
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "save") { save(msg).then(reply, e => reply({ error: String(e) })); return true; }
  if (msg?.type === "badge") { updateBadge().then(() => reply({})); return true; }
});
