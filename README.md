# tabsnap

Too many tabs open? `tabsnap` saves every open browser tab to a timestamped markdown checklist, so you can close them without losing anything. Optionally, Claude groups the tabs by theme, notes what each one is, and tells you which to read later, keep, or drop.

Works with Brave, Chrome, Arc, Edge and Safari on macOS.

## Install

```sh
brew install paragdudeja/tap/tabsnap
```

## Usage

```sh
tabsnap                         # snapshot all open tabs
tabsnap "leetcode backlog"      # snapshot with a note
tabsnap --close "done for today" # snapshot, then close the saved tabs
tabsnap --close --triage        # snapshot, close, then AI-triage
tabsnap triage                  # AI-triage the latest snapshot
```

Snapshots are saved to `~/tab-snapshots/` (override with `TABSNAP_DIR`):

```markdown
# Tab snapshot — 2026-11-08 12:15:26 IST

**Total tabs:** 70

## Brave Browser — 70 tabs

### Window 1 (68 tabs)

- [ ] [Super Egg Drop - LeetCode](https://leetcode.com/problems/super-egg-drop/)
- [ ] [Bus Routes - LeetCode](https://leetcode.com/problems/bus-routes/)
```

`--close` only closes tabs whose URLs were saved, and only after the file is written.

## AI triage

`tabsnap triage` sends the tab titles and URLs (not page contents) to Claude and writes `<snapshot>.triage.md`: an overview, tabs grouped by theme with a one-line note each, an action per tab (📖 read later, 📌 reference, ✅ done, 🗑 drop), and duplicates.

Requires an Anthropic API key:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
```

Uses `claude-opus-5-5` by default; set `TABSNAP_MODEL` to change it.

## Permissions

The first run asks to let your terminal control your browser (System Settings → Privacy & Security → Automation). Allow it once.

## License

MIT
