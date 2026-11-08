---
name: tabsnap
description: Work with the user's open browser tabs and their saved tab snapshots on macOS via the tabsnap CLI. Use when the user asks what tabs they have open, wants to save, park or close tabs or a browser window, wants to find or reopen a link or page they had open before ("that article about X from last week", "bring back the egg drop problem"), asks what they were reading or working on, or wants to reopen tabs they didn't finish. Supports Brave, Chrome, Arc, Edge and Safari.
---

# tabsnap

`tabsnap` saves open browser tabs to timestamped markdown checklists (`tabs_YYYY-MM-DD_HH-MM-SS.md`), can close what it saved, finds tabs across past snapshots, and reopens the unfinished ones. You drive it through its CLI; prefer `--json` whenever you'll parse the output.

## First, check it's installed

Run `tabsnap --version`. If it's missing, tell the user to install it (macOS + Homebrew) and stop:

```
brew install paragdudeja/tap/tabsnap && tabsnap setup
```

Run `tabsnap config --json` once to learn where snapshots live (`dir`) and which sites are protected from closing (`keep`).

## What the user asks → what you run

| Request | Command |
|---|---|
| "What tabs do I have open?" / "summarize my tabs" | `tabsnap list --json`, then summarize it yourself |
| "How many tabs…" | `tabsnap count` |
| "Save my tabs" / "snapshot this" | `tabsnap --json ["short note"]` |
| "Save just this window / just Brave" | add `--window front` or `--browser brave` (also chrome, arc, edge, safari) |
| "Park this window" / "save and close these" | `tabsnap --close --json …` (see rules below) |
| "Find that page about X" / "did I have Y open?" | `tabsnap search X Y --json` (every word must match titles, URLs or triage notes; add `--limit N`) |
| "Reopen that page about X" / "bring back the Y tabs" | `tabsnap search X Y --restore --dry-run`, show the list, then the same without `--dry-run`. To reopen only some results, pass their URLs: `tabsnap restore --url URL [--url URL…]` |
| "What was I reading last week / on Tuesday?" | read the `tabs_<date>_*.md` files for those dates in `dir`, plus any `*.triage.md` next to them |
| "Reopen what I didn't finish" | `tabsnap restore --dry-run`, show the list, then `tabsnap restore` once they agree |
| "Sort / triage my tabs" | read the snapshot and do it yourself; use `tabsnap triage` only if they want the `.triage.md` report file |

`--window front` means the front window of the browser the user was last in. `--window "Name"` matches a window they named in Chrome, Brave or Edge.

## Rules

- **Never close tabs unless the user clearly asked to close them.** "Save" means snapshot only. Before `--close`, say which browser/window will be closed. `--close` saves first, only closes tabs in the windows it saved, and skips sites on the keep list. Never close the user's browser windows any other way.
- **Restore with a dry run first** (`restore --dry-run`, `search … --restore --dry-run`) and show what will open; restoring can open dozens of tabs. If the preview is exactly what the user asked to reopen, go ahead; if it's more than a few tabs or not clearly what they meant, show it and ask first. If a search matches more than the user meant, narrow the words or use `restore --url` with just the right ones.
- **Snapshots are private browsing history.** Quote what the user needs, but don't send URLs or snapshot contents to outside services, and don't paste whole files into chat unless asked.
- **Incognito windows are never captured**, and Safari private tabs can't be told apart. If the user asks about something they say was in an incognito window, explain that tabsnap never saw it.
- **Pinned tabs aren't detected.** If the user worries about pinned tabs, suggest adding their sites to `keep` in `~/.config/tabsnap/config`.

## Snapshot format

```markdown
# Tab snapshot — 2026-11-08 12:15:26 IST
> optional note
**Total tabs:** 70 · **Scope:** front window

## Brave Browser — 70 tabs
### Window 1 (68 tabs)
- [ ] [Page title](https://example.com/page)
- [x] [Something the user ticked off](https://example.com/done)
```

`- [x]` means the user dealt with it; `restore` skips those (but `search --restore` and `restore --url` reopen exactly what you name). Search results include the `browser` each page was saved from, and pages reopen there. Triage files (`*.triage.md`) group the same tabs by theme with a note and an action (📖 read later, 📌 reference, ✅ done, 🗑 drop).

## Errors

- **Exit 3 / "isn't allowed to read tabs"**: macOS automation permission is off. Tell the user to enable their browser under the app running tabsnap in System Settings → Privacy & Security → Automation; don't retry in a loop.
- **"more than one browser is open … add --browser"**: ask which browser, or pass `--browser`.
- **"no window named …"**: the message lists the named windows; offer those.
