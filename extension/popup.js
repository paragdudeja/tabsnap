import { DEFAULTS, searchSnapshots, countTabs, hostOf, toRestore } from "./lib.js";
import { ago, el, openTabs, tabs } from "./ui.js";

const $ = id => document.getElementById(id);
let snaps = [];
let results = [];

async function refresh() {
  const { snapshots = [], settings = {} } = await chrome.storage.local.get(["snapshots", "settings"]);
  snaps = snapshots;
  const n = (await chrome.tabs.query({ windowType: "normal" })).filter(t => !t.incognito).length;
  $("count").textContent = n;
  $("count").classList.toggle("warn", n >= Number(settings.warn ?? DEFAULTS.warn));
  const recent = $("recent");
  recent.replaceChildren(...snaps.slice(0, 5).map(s => {
    const li = el("li", { class: "click", title: "Open this snapshot" },
      el("div", { class: "title" }, `${tabs(countTabs(s))} · ${ago(s.created)}${s.scope ? " · " + s.scope : ""}`),
      s.note ? el("div", { class: "sub" }, s.note) : null);
    li.onclick = () => chrome.tabs.create({ url: `snapshot.html?id=${encodeURIComponent(s.id)}` });
    return li;
  }));
  if (!snaps.length) recent.replaceChildren(el("li", { class: "muted" }, "Nothing saved yet."));
  search();
}

function status(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}

async function save(opts) {
  for (const b of document.querySelectorAll("button")) b.disabled = true;
  const windowId = (await chrome.windows.getCurrent()).id;
  const r = await chrome.runtime.sendMessage({ type: "save", windowId, note: $("note").value.trim(), ...opts });
  for (const b of document.querySelectorAll("button")) b.disabled = false;
  if (r?.error) return status(r.error, true);
  if (!r?.total) return status("No tabs to save.");
  let text = `Saved ${tabs(r.total)}.`;
  if (opts.close) text += ` Closed ${r.closed}${r.kept ? `, kept ${r.kept} (pinned or on your keep list)` : ""}.`;
  status(text);
  $("note").value = "";
  refresh();
}

function search() {
  const q = $("search").value;
  results = q.trim() ? searchSnapshots(snaps, q, 30) : [];
  $("results").replaceChildren(...results.map(r => {
    const li = el("li", { class: "click" + (r.done ? " done" : ""), title: r.url },
      el("div", { class: "title" }, r.title || r.url),
      el("div", { class: "sub" }, `${hostOf(r.url)} · ${ago(r.lastSeen)}${r.snapshots > 1 ? ` · in ${r.snapshots} snapshots` : ""}`));
    li.onclick = () => chrome.tabs.create({ url: r.url });
    return li;
  }));
  if (q.trim() && !results.length) $("results").replaceChildren(el("li", { class: "muted" }, "No matches."));
  $("results-actions").hidden = results.length < 2;
  $("reopen-results").textContent = `Reopen these ${results.length}`;
}

$("save-all").onclick = () => save({ scope: "all" });
$("save-window").onclick = () => save({ scope: "window" });
$("close-window").onclick = () => save({ scope: "window", close: true });
$("close-all").onclick = () => {
  if (confirm("Save every open tab, then close them (pinned tabs and your keep list stay)?")) save({ scope: "all", close: true });
};
$("search").oninput = search;
$("reopen-results").onclick = () => openTabs(toRestore(results, { all: true }).map(r => r.url));

refresh();
$("search").focus();
