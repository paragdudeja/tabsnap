// Pure helpers shared by the service worker and the pages. No chrome.* here,
// so tests/lib.test.mjs can run them under Node.

export const DEFAULTS = {
  keep: "mail.google.com, calendar.google.com", // never closed by "Save & close"
  warn: 30,                                    // badge turns orange from here
  closePinned: false,                          // pinned tabs stay open on close
  saveMarkdown: true,                          // also download a .md copy (see FORMAT.md)
  folder: "tabsnap",                           // …into Downloads/<folder>/
};

const pad = n => String(n).padStart(2, "0");

// tabs_YYYY-MM-DD_HH-MM-SS, the snapshot id and file name stem
export function stamp(d) {
  return `tabs_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export function humanTime(d) {
  const zone = d.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${zone}`;
}

export function escapeTitle(title) {
  const t = (title || "").replace(/\s+/g, " ").trim();
  return t ? t.replace(/([\[\]])/g, "\\$1") : "(untitled)";
}

export function countTabs(snap) {
  return snap.windows.reduce((n, w) => n + w.tabs.length, 0);
}

// Markdown in the shared format (FORMAT.md)
export function toMarkdown(snap) {
  const total = countTabs(snap);
  const lines = [`# Tab snapshot — ${humanTime(new Date(snap.created))}`, ""];
  if (snap.note) lines.push(`> ${snap.note.replace(/\s+/g, " ").trim()}`, "");
  lines.push(`**Total tabs:** ${total}${snap.scope ? ` · **Scope:** ${snap.scope}` : ""}`, "");
  lines.push(`## ${snap.browser} — ${total} tabs`, "");
  for (const w of snap.windows) {
    if (!w.tabs.length) continue;
    lines.push(`### ${w.label} (${w.tabs.length} tabs)`, "");
    for (const t of w.tabs) lines.push(`- [${t.done ? "x" : " "}] [${escapeTitle(t.title)}](${t.url})`);
    lines.push("");
  }
  return lines.join("\n");
}

export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
}

export function parseKeep(text) {
  return (text || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Keep-list match by host, including subdomains (notion.so keeps www.notion.so, not notnotion.so)
export function isKept(url, keep) {
  const h = hostOf(url);
  return !!h && keep.some(k => h === k || h.endsWith("." + k));
}

// Which saved tabs "Save & close" may close
export function closable(tab, settings) {
  if (tab.pinned && !settings.closePinned) return false;
  return !isKept(tab.url, parseKeep(settings.keep));
}

// Reopen each URL once, skipping ones already dealt with unless asked
export function toRestore(tabs, { all = false } = {}) {
  const seen = new Set();
  return tabs.filter(t => (all || !t.done) && !seen.has(t.url) && seen.add(t.url));
}

// Search every snapshot: all words must appear in the title or the URL without its
// query string (those are mostly tracking tokens). One result per URL, newest first.
export function searchSnapshots(snapshots, query, limit = 20) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const byUrl = new Map();
  for (const snap of snapshots) {
    for (const w of snap.windows) for (const t of w.tabs) {
      const hay = `${t.title || ""} ${t.url.replace(/[?#].*$/, "")}`.toLowerCase();
      if (!words.every(x => hay.includes(x))) continue;
      const hit = byUrl.get(t.url);
      if (!hit) byUrl.set(t.url, { title: t.title, url: t.url, lastSeen: snap.created, snapshotId: snap.id,
                                   done: !!t.done, snapshots: new Set([snap.id]) });
      else {
        hit.snapshots.add(snap.id);
        if (snap.created > hit.lastSeen) Object.assign(hit, { title: t.title, lastSeen: snap.created, snapshotId: snap.id, done: !!t.done });
      }
    }
  }
  return [...byUrl.values()]
    .map(r => ({ ...r, snapshots: r.snapshots.size }))
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit);
}

// Browser name for the "## <Browser>" heading, using the names the macOS CLI understands
export function detectBrowser(nav) {
  const brands = (nav.userAgentData?.brands || []).map(b => b.brand);
  const ua = nav.userAgent || "";
  if (nav.brave || brands.includes("Brave")) return "Brave Browser";
  if (brands.includes("Microsoft Edge") || /Edg\//.test(ua)) return "Microsoft Edge";
  if (brands.includes("Opera") || /OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (brands.includes("Google Chrome") || /Chrome\//.test(ua)) return "Google Chrome";
  return "Browser";
}
