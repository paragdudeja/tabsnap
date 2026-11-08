import { DEFAULTS } from "./lib.js";

const fields = ["keep", "closePinned", "warn", "saveMarkdown", "folder"];
const $ = id => document.getElementById(id);

async function load() {
  const s = { ...DEFAULTS, ...(await chrome.storage.local.get("settings")).settings };
  for (const f of fields) {
    if ($(f).type === "checkbox") $(f).checked = !!s[f];
    else $(f).value = s[f];
  }
  $("folder-name").textContent = s.folder;
}

let timer;
async function save() {
  const s = {};
  for (const f of fields) s[f] = $(f).type === "checkbox" ? $(f).checked : $(f).value.trim();
  s.warn = Math.max(1, parseInt(s.warn, 10) || DEFAULTS.warn);
  s.folder = s.folder.replace(/[^\w.\- ]/g, "").trim() || DEFAULTS.folder;
  await chrome.storage.local.set({ settings: s });
  $("folder-name").textContent = s.folder;
  $("status").textContent = "Saved.";
  clearTimeout(timer);
  timer = setTimeout(() => { $("status").textContent = ""; }, 1500);
}

for (const f of fields) $(f).addEventListener("change", save);
load();
