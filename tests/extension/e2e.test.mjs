// End-to-end tests: load the extension into Chrome for Testing (throwaway profile,
// local pages, temp download folder) and drive it like a user would.
//   cd tests/extension && npm install && npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = join(REPO, "extension");
const sleep = ms => new Promise(r => setTimeout(r, ms));

let server, port, browser, sw, extId, control, work, downloads;

// Poll until fn() returns something truthy
async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}
const inWorker = (fn, ...args) => sw.evaluate(fn, ...args);
const page = name => `http://127.0.0.1:${port}/p/${name}`;
const kept = name => `http://localhost:${port}/p/${name}`;   // "localhost" goes on the keep list
const snapshots = () => inWorker(() => chrome.storage.local.get("snapshots").then(r => r.snapshots || []));
const normalTabs = () => inWorker(() => chrome.tabs.query({ windowType: "normal" }).then(t => t.map(x => ({ id: x.id, url: x.url, windowId: x.windowId, pinned: x.pinned }))));
const setSettings = s => inWorker(s => chrome.storage.local.set({ settings: s }), s);
// Ask the worker to save, from an extension page (like the popup does)
const send = (msg, from = control) => from.evaluate(m => chrome.runtime.sendMessage(m), msg);

async function newWindow(urls, { pinned = [] } = {}) {
  const w = await inWorker(async urls => {
    const w = await chrome.windows.create({ url: urls });
    return w.id;
  }, urls);
  await until(async () => (await normalTabs()).filter(t => t.windowId === w && t.url.startsWith("http")).length === urls.length, "window to load");
  for (const u of pinned) await inWorker(async (w, u) => {
    const [t] = await chrome.tabs.query({ windowId: w, url: u });
    await chrome.tabs.update(t.id, { pinned: true });
  }, w, u);
  return w;
}

before(async () => {
  server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split("/").pop());
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><title>Page ${name}</title><p>${name}</p>`);
  }).listen(0, "127.0.0.1");
  await new Promise(r => server.once("listening", r));
  port = server.address().port;

  work = mkdtempSync(join(tmpdir(), "tabsnap-e2e-"));
  downloads = join(work, "downloads");
  const profile = join(work, "profile");
  mkdirSync(join(profile, "Default"), { recursive: true });
  mkdirSync(downloads);
  writeFileSync(join(profile, "Default", "Preferences"), JSON.stringify({
    download: { default_directory: downloads, prompt_for_download: false, directory_upgrade: true },
  }));

  browser = await puppeteer.launch({
    headless: true, userDataDir: profile,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--no-default-browser-check"],
  });
  // Downloads go to the temp folder via the profile preference above. (Overriding it with
  // CDP Browser.setDownloadBehavior makes Chrome ignore the extension's file names.)

  const target = await browser.waitForTarget(t => t.type() === "service_worker" && t.url().endsWith("/background.js"));
  sw = await target.worker();
  extId = new URL(target.url()).host;
  control = await browser.newPage();
  control.on("dialog", d => d.accept());
  await control.goto(`chrome-extension://${extId}/options.html`);
});

after(async () => {
  await browser?.close();
  server?.close();
});

test("badge counts open tabs and turns orange at the limit", async () => {
  await setSettings({ warn: 100 });
  await newWindow([page("alpha"), page("bravo")]);
  const n = (await normalTabs()).length;
  await until(async () => (await inWorker(() => chrome.action.getBadgeText({}))) === String(n), `badge to read ${n}`);
  assert.deepEqual(await inWorker(() => chrome.action.getBadgeBackgroundColor({})), [92, 95, 102, 255]);
  await setSettings({ warn: 2 });
  await until(async () => (await inWorker(() => chrome.action.getBadgeBackgroundColor({})))[0] === 232, "orange badge");
});

test("popup: Save all stores the snapshot and downloads markdown", async () => {
  await setSettings({ keep: "localhost" });
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.type("#note", "e2e note");
  const before = (await snapshots()).length;
  await popup.click("#save-all");
  const status = await until(() => popup.$eval("#status", e => e.textContent).then(t => /Saved \d+ tabs?/.test(t) && t), "status");
  const snaps = await snapshots();
  assert.equal(snaps.length, before + 1);
  assert.equal(snaps[0].note, "e2e note");
  const urls = snaps[0].windows.flatMap(w => w.tabs.map(t => t.url));
  assert.ok(urls.includes(page("alpha")) && urls.includes(page("bravo")));
  assert.match(status, new RegExp(`Saved ${urls.length} tabs`));

  const md = await until(() => {
    const dir = join(downloads, "tabsnap");
    const f = existsSync(dir) && readdirSync(dir).find(x => x.startsWith(snaps[0].id));
    return f && readFileSync(join(dir, f), "utf8");
  }, "markdown download");
  assert.match(md, /^# Tab snapshot — /);
  assert.match(md, /> e2e note/);
  assert.match(md, new RegExp(`- \\[ \\] \\[Page alpha\\]\\(${page("alpha").replace(/[.?]/g, "\\$&")}\\)`));
  await popup.close();
});

test("Save & close window: closes only that window's tabs, keeps pinned and keep-list tabs", async () => {
  await setSettings({ keep: "localhost", closePinned: false });
  const w = await newWindow([page("charlie"), page("delta"), page("pinned"), kept("kilo")], { pinned: [page("pinned")] });
  const elsewhere = (await normalTabs()).filter(t => t.windowId !== w).map(t => t.id).sort();
  const r = await send({ type: "save", scope: "window", windowId: w, close: true });
  assert.equal(r.total, 4);
  assert.equal(r.closed, 2);
  assert.equal(r.kept, 2);
  const left = await until(async () => {
    const t = (await normalTabs()).filter(t => t.windowId === w);
    return t.length === 2 && t;
  }, "window to shrink to 2 tabs");
  assert.deepEqual(left.map(t => t.url).sort(), [kept("kilo"), page("pinned")].sort());
  assert.deepEqual((await normalTabs()).filter(t => t.windowId !== w).map(t => t.id).sort(), elsewhere, "other windows untouched");
  assert.equal((await snapshots())[0].scope, "This window");
});

test("search finds saved tabs across snapshots", async () => {
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.type("#search", "charlie");
  const titles = await until(() => popup.$$eval("#results li .title", els => els.map(e => e.textContent)).then(t => t.length && t), "results");
  assert.deepEqual(titles, ["Page charlie"]);
  await popup.click("#search", { count: 3 });
  await popup.keyboard.press("Backspace");
  await popup.type("#search", "zzzqqq");
  await until(() => popup.$eval("#results", e => e.textContent.includes("No matches")), "no matches");
  await popup.close();
});

test("snapshot page: tick off a tab, then reopen the rest in a new window", async () => {
  const snap = (await snapshots()).find(s => s.scope === "This window");
  const p = await browser.newPage();
  p.on("dialog", d => d.accept());
  await p.goto(`chrome-extension://${extId}/snapshot.html?id=${encodeURIComponent(snap.id)}`);
  await p.waitForSelector("input[type=checkbox]");
  // Tick "Page charlie" (pinning reorders tabs, so find it by name)
  await p.evaluate(() => [...document.querySelectorAll("li.tab")].find(li => li.textContent.includes("Page charlie")).querySelector("input").click());
  await until(async () => (await snapshots()).find(s => s.id === snap.id).windows[0].tabs.find(t => t.title === "Page charlie").done, "done to persist");
  const windowsBefore = await inWorker(() => chrome.windows.getAll().then(w => w.map(x => x.id)));
  const button = await until(() => p.$$eval("button", bs => bs.find(b => b.textContent.startsWith("Reopen 3"))?.textContent), "Reopen 3 not done");
  assert.equal(button, "Reopen 3 not done");
  await p.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.startsWith("Reopen 3")).click());
  const opened = await until(async () => {
    const t = (await normalTabs()).filter(t => !windowsBefore.includes(t.windowId));
    return t.length === 3 && t;
  }, "new window with 3 tabs");
  assert.deepEqual(opened.map(t => t.url).sort(), [kept("kilo"), page("delta"), page("pinned")].sort());
  await p.close();
});

test("Save & close all never quits the browser: it lands on the snapshot page", async () => {
  await setSettings({ keep: "", closePinned: true });
  const id = await control.evaluate(() => { chrome.runtime.sendMessage({ type: "save", scope: "all", close: true }); return true; });
  assert.ok(id);
  const landing = await until(async () => {
    const t = await normalTabs();
    return t.length === 1 && t[0].url.includes("/snapshot.html?id=") && t[0];
  }, "only the snapshot page left open", 10000);
  assert.ok(landing.url.startsWith(`chrome-extension://${extId}/snapshot.html`));
  assert.ok(browser.connected, "browser still running");
  control = await browser.newPage();   // the old control page was closed with everything else
  await control.goto(`chrome-extension://${extId}/options.html`);
});

test("the macOS CLI reads the extension's markdown", { skip: process.platform !== "darwin" }, () => {
  const dir = join(downloads, "tabsnap");
  const env = { ...process.env, TABSNAP_DIR: dir, TABSNAP_CONFIG: join(work, "none") };
  const out = execFileSync(join(REPO, "tabsnap"), ["search", "bravo", "--json"], { env, encoding: "utf8" });
  const hits = JSON.parse(out);
  assert.equal(hits[0].title, "Page bravo");
  assert.equal(hits[0].browser, "Google Chrome");
});
