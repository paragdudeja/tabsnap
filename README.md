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
tabsnap restore                 # reopen tabs you haven't ticked off
tabsnap count                   # how many tabs are open right now
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

## Restore

`tabsnap restore` reopens every unticked (`- [ ]`) tab from the latest snapshot, in the browser it was saved from. Tick off tabs as you deal with them and restore brings back only what's left. It also works on a triage file.

```sh
tabsnap restore --dry-run                 # list what would open
tabsnap restore --all                     # include ticked tabs too
tabsnap restore ~/tab-snapshots/tabs_2026-11-08_12-15-26.triage.md
```

## Menu bar

A [SwiftBar](https://github.com/swiftbar/SwiftBar) plugin shows your open-tab count in the menu bar (orange from 30 tabs) and puts every command one click away: snapshot, snapshot + close, triage, restore, and open the latest files.

```sh
brew install --cask swiftbar
# open SwiftBar once and pick a plugin folder, then:
ln -s "$(brew --prefix)/share/tabsnap/swiftbar/tabsnap.1m.sh" "$(defaults read com.ameba.SwiftBar PluginDirectory)/"
```

Change the warning threshold with `TABSNAP_WARN` in the plugin's SwiftBar settings. `tabsnap count` prints the same number from the terminal.

## AI triage

`tabsnap triage` sends the tab titles and URLs (not page contents) to Claude and writes `<snapshot>.triage.md`: an overview, tabs grouped by theme with a one-line note each, an action per tab (📖 read later, 📌 reference, ✅ done, 🗑 drop), and duplicates.

It uses whichever of these you have:

- **Claude Code**: if the `claude` CLI is installed and logged in, triage runs through it. No API key needed.
- **Anthropic API key**: `export ANTHROPIC_API_KEY=sk-ant-...` (takes priority when set).

Uses `claude-opus-5-5` by default; set `TABSNAP_MODEL` to change it.

## Permissions

The first run asks to let your terminal control your browser (System Settings → Privacy & Security → Automation). Allow it once.

## License

MIT
