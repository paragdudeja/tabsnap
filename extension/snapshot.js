import { countTabs, toMarkdown, toRestore, hostOf, humanTime } from "./lib.js";
import { ago, el, openTabs, tabs as nTabs } from "./ui.js";

const main = document.getElementById("main");
const id = new URLSearchParams(location.search).get("id");

async function load() {
  return (await chrome.storage.local.get("snapshots")).snapshots || [];
}

async function store(snaps) {
  await chrome.storage.local.set({ snapshots: snaps });
}

// Every snapshot, newest first
async function renderList() {
  document.title = "tabsnap snapshots";
  const snaps = await load();
  main.replaceChildren(
    el("header", {}, el("h1", {}, "Snapshots"), el("a", { href: "options.html" }, "Settings")),
    snaps.length ? el("ul", { class: "list" }, ...snaps.map(s => {
      const open = s.windows.flatMap(w => w.tabs).filter(t => !t.done).length;
      const li = el("li", { class: "click" },
        el("div", { class: "title" }, `${humanTime(new Date(s.created))}${s.note ? " · " + s.note : ""}`),
        el("div", { class: "sub" }, `${nTabs(countTabs(s))} · ${open} not done${s.scope ? " · " + s.scope : ""} · ${ago(s.created)}`));
      li.onclick = () => { location.search = "?id=" + encodeURIComponent(s.id); };
      return li;
    })) : el("p", { class: "muted" }, "Nothing saved yet. Use the tabsnap button in your toolbar."));
}

// One snapshot: tick tabs off, restore what's left, download, delete
async function renderOne() {
  const snaps = await load();
  const snap = snaps.find(s => s.id === id);
  if (!snap) {
    main.replaceChildren(el("p", {}, "This snapshot no longer exists. ", el("a", { href: "snapshot.html" }, "All snapshots")));
    return;
  }
  document.title = `tabsnap: ${nTabs(countTabs(snap))}`;
  const tabs = snap.windows.flatMap(w => w.tabs);
  const left = toRestore(tabs);

  const persist = async () => {
    const all = await load();
    const i = all.findIndex(s => s.id === snap.id);
    if (i >= 0) { all[i] = snap; await store(all); }
  };

  const restoreLeft = el("button", { class: "primary" }, `Reopen ${left.length} not done`);
  restoreLeft.disabled = !left.length;
  restoreLeft.onclick = () => openTabs(left.map(t => t.url));
  const restoreAll = el("button", {}, "Reopen all");
  restoreAll.onclick = () => openTabs(toRestore(tabs, { all: true }).map(t => t.url));
  const download = el("button", {}, "Download markdown");
  download.onclick = () => chrome.downloads.download({
    url: "data:text/markdown;charset=utf-8," + encodeURIComponent(toMarkdown(snap)),
    filename: `${snap.id}.md`, saveAs: true });
  const del = el("button", { class: "danger" }, "Delete");
  del.onclick = async () => {
    if (!confirm("Delete this snapshot? Its tabs won't be reopened.")) return;
    await store((await load()).filter(s => s.id !== snap.id));
    location.search = "";
  };

  main.replaceChildren(
    el("header", {}, el("h1", {}, humanTime(new Date(snap.created))), el("a", { href: "snapshot.html" }, "All snapshots")),
    snap.note ? el("p", {}, snap.note) : null,
    el("p", { class: "muted" }, `${nTabs(tabs.length)} · ${tabs.filter(t => !t.done).length} not done${snap.scope ? " · " + snap.scope : ""}. Tick tabs off as you deal with them.`),
    el("div", { class: "actions" }, restoreLeft, restoreAll, download, del),
    ...snap.windows.flatMap(w => [
      el("h2", {}, `${w.label} (${w.tabs.length})`),
      el("ul", { class: "list" }, ...w.tabs.map(t => {
        const box = el("input", { type: "checkbox", "aria-label": "Done" });
        box.checked = !!t.done;
        const li = el("li", { class: "tab" + (t.done ? " done" : "") }, box,
          el("div", {},
            el("div", { class: "title" }, el("a", { href: t.url, target: "_blank", rel: "noreferrer" }, t.title || t.url)),
            el("div", { class: "sub" }, hostOf(t.url) + (t.pinned ? " · pinned" : ""))));
        box.onchange = async () => { t.done = box.checked; li.classList.toggle("done", t.done); await persist(); renderOne(); };
        return li;
      })),
    ]));
}

(id ? renderOne : renderList)();
