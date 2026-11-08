// node --test tests/extension/lib.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as lib from "../../extension/lib.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const snap = (over = {}) => ({
  id: "tabs_2026-01-02_03-04-05", created: new Date(2026, 0, 2, 3, 4, 5).getTime(),
  browser: "Google Chrome", note: "", scope: "",
  windows: [
    { label: "Window 1", tabs: [
      { title: "Super Egg Drop - LeetCode", url: "https://leetcode.com/problems/super-egg-drop/", pinned: false },
      { title: "Inbox [3]", url: "https://mail.google.com/mail/u/0/", pinned: true },
      { title: "  spaced \n title ", url: "https://example.com/a?utm=zzz#x", pinned: false, done: true },
    ] },
    { label: "Window 2", tabs: [{ title: "", url: "https://www.notion.so/page", pinned: false }] },
  ],
  ...over,
});

test("stamp and file name follow FORMAT.md", () => {
  assert.equal(lib.stamp(new Date(2026, 0, 2, 3, 4, 5)), "tabs_2026-01-02_03-04-05");
});

test("markdown matches the shared format", () => {
  const md = lib.toMarkdown(snap({ note: "a  note", scope: "This window" }));
  assert.match(md, /^# Tab snapshot — 2026-01-02 03:04:05 \S+\n\n> a note\n\n\*\*Total tabs:\*\* 4 · \*\*Scope:\*\* This window\n/);
  assert.match(md, /## Google Chrome — 4 tabs\n\n### Window 1 \(3 tabs\)\n\n/);
  assert.match(md, /- \[ \] \[Inbox \\\[3\\\]\]\(https:\/\/mail\.google\.com\/mail\/u\/0\/\)/);
  assert.match(md, /- \[x\] \[spaced title\]\(https:\/\/example\.com\/a\?utm=zzz#x\)/);
  assert.match(md, /- \[ \] \[\(untitled\)\]\(https:\/\/www\.notion\.so\/page\)/);
});

test("keep list matches hosts and subdomains only", () => {
  const keep = lib.parseKeep(" Mail.Google.com , notion.so ,,");
  assert.deepEqual(keep, ["mail.google.com", "notion.so"]);
  assert.ok(lib.isKept("https://www.notion.so/x", keep));
  assert.ok(!lib.isKept("https://notnotion.so/x", keep));
  assert.ok(!lib.isKept("https://google.com/search?q=mail.google.com", keep));
  assert.ok(!lib.isKept("not a url", keep));
});

test("closable skips pinned tabs and the keep list", () => {
  const s = { keep: "notion.so", closePinned: false };
  assert.equal(lib.closable({ url: "https://a.com", pinned: true }, s), false);
  assert.equal(lib.closable({ url: "https://a.com", pinned: true }, { ...s, closePinned: true }), true);
  assert.equal(lib.closable({ url: "https://www.notion.so/p", pinned: false }, s), false);
  assert.equal(lib.closable({ url: "https://a.com", pinned: false }, s), true);
});

test("restore skips done tabs and duplicate urls", () => {
  const tabs = [{ url: "a" }, { url: "a" }, { url: "b", done: true }, { url: "c" }];
  assert.deepEqual(lib.toRestore(tabs).map(t => t.url), ["a", "c"]);
  assert.deepEqual(lib.toRestore(tabs, { all: true }).map(t => t.url), ["a", "b", "c"]);
});

test("search: all words, ignores query strings, newest first, counts snapshots", () => {
  const older = snap({ id: "old", created: 1 });
  const newer = snap({ id: "new", created: 2 });
  const hits = lib.searchSnapshots([older, newer], "EGG drop");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].snapshots, 2);
  assert.equal(hits[0].snapshotId, "new");
  assert.equal(lib.searchSnapshots([older], "zzz").length, 0);
  assert.equal(lib.searchSnapshots([older], "   ").length, 0);
});

test("browser detection", () => {
  assert.equal(lib.detectBrowser({ brave: {}, userAgent: "Chrome/140" }), "Brave Browser");
  assert.equal(lib.detectBrowser({ userAgentData: { brands: [{ brand: "Microsoft Edge" }] }, userAgent: "" }), "Microsoft Edge");
  assert.equal(lib.detectBrowser({ userAgent: "Mozilla/5.0 Chrome/140 Safari/537 OPR/120" }), "Opera");
  assert.equal(lib.detectBrowser({ userAgent: "Mozilla/5.0 Firefox/140.0" }), "Firefox");
  assert.equal(lib.detectBrowser({ userAgentData: { brands: [{ brand: "Google Chrome" }] }, userAgent: "Chrome/140" }), "Google Chrome");
});

// The point of FORMAT.md: snapshots written by the extension work with the CLI
test("the CLI reads extension snapshots (restore + search)", { skip: process.platform !== "darwin" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "tabsnap-interop-"));
  const s = snap();
  writeFileSync(join(dir, s.id + ".md"), lib.toMarkdown(s));
  const env = { ...process.env, TABSNAP_DIR: dir, TABSNAP_CONFIG: join(dir, "none") };
  const restore = execFileSync(join(REPO, "tabsnap"), ["restore", "--dry-run"], { env, encoding: "utf8" });
  assert.match(restore, /Would reopen 3 tabs from tabs_2026-01-02_03-04-05\.md:/);  // done tab skipped
  assert.match(restore, /\[Google Chrome\] https:\/\/leetcode\.com\/problems\/super-egg-drop\//);
  const search = JSON.parse(execFileSync(join(REPO, "tabsnap"), ["search", "inbox", "--json"], { env, encoding: "utf8" }));
  assert.equal(search[0].title, "Inbox [3]");
  assert.equal(search[0].browser, "Google Chrome");
});
