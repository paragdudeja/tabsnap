# tabsnap

Too many tabs open? `tabsnap` saves every open browser tab to a timestamped markdown checklist, so you can close them without losing anything. Optionally, Claude groups the tabs by theme, notes what each one is, and tells you which to read later, keep, or drop.

Works with Brave, Chrome, Arc, Edge and Safari on macOS.

## Install

```sh
brew install paragdudeja/tap/tabsnap
tabsnap setup
```

`tabsnap setup` asks macOS for access to your open browsers, writes a config file, links the menu bar plugin if you use SwiftBar, and checks whether AI triage is available. It's safe to re-run, for example after opening another browser.

## Usage

```sh
tabsnap                         # snapshot all open tabs
tabsnap "leetcode backlog"      # snapshot with a note
tabsnap --close "done for today" # snapshot, then close the saved tabs
tabsnap --close --triage        # snapshot, close, then AI-triage
tabsnap triage                  # AI-triage the latest snapshot
tabsnap restore                 # reopen tabs you haven't ticked off
tabsnap count                   # how many tabs are open right now
tabsnap config                  # show your settings
```

Snapshots are saved to `~/tab-snapshots/` by default:

```markdown
# Tab snapshot — 2026-11-08 12:15:26 IST

**Total tabs:** 70

## Brave Browser — 70 tabs

### Window 1 (68 tabs)

- [ ] [Super Egg Drop - LeetCode](https://leetcode.com/problems/super-egg-drop/)
- [ ] [Bus Routes - LeetCode](https://leetcode.com/problems/bus-routes/)
```

`--close` only closes tabs whose URLs were saved, only after the file is written, and never tabs on your [keep list](#config).

## Restore

`tabsnap restore` reopens every unticked (`- [ ]`) tab from the latest snapshot, in the browser it was saved from. Tick off tabs as you deal with them and restore brings back only what's left. It also works on a triage file.

```sh
tabsnap restore --dry-run                 # list what would open
tabsnap restore --all                     # include ticked tabs too
tabsnap restore ~/tab-snapshots/tabs_2026-11-08_12-15-26.triage.md
```

## Menu bar

A [SwiftBar](https://github.com/swiftbar/SwiftBar) plugin shows your open-tab count in the menu bar (orange once you pass your `warn` limit) and puts every command one click away: snapshot, snapshot + close, triage, restore, and open the latest files.

```sh
brew install --cask swiftbar   # open SwiftBar once and pick a plugin folder
tabsnap setup                  # links the plugin
```

## Config

`tabsnap setup` creates `~/.config/tabsnap/config`:

```ini
dir   = ~/tab-snapshots                        # e.g. a folder in your Obsidian vault
warn  = 30                                     # menu bar turns orange from here
keep  = mail.google.com, calendar.google.com   # --close never closes these (subdomains too)
model = claude-opus-5-5                        # model for triage
```

Environment variables `TABSNAP_DIR`, `TABSNAP_WARN`, `TABSNAP_KEEP` and `TABSNAP_MODEL` override the file. `tabsnap config` shows what's in effect.

## AI triage

`tabsnap triage` asks Claude to read your snapshot and writes `<snapshot>.triage.md`: an overview, tabs grouped by theme with a one-line note each, an action per tab (📖 read later, 📌 reference, ✅ done, 🗑 drop), and duplicates.

It uses whichever of these you have:

- **Claude Code**: if the `claude` CLI is installed and logged in, triage runs through it. No API key needed.
- **Anthropic API key**: `export ANTHROPIC_API_KEY=sk-ant-...` (takes priority when set).

## Privacy

- Snapshots stay on your Mac as plain markdown files. Nothing leaves your machine unless you run triage.
- **Incognito windows** in Brave, Chrome, Arc and Edge are never saved, counted or closed. Safari doesn't let other apps tell private windows apart, so **Safari private tabs are saved like any other tab**.
- **Triage** sends tab titles and URLs to Claude, never page contents. Query strings, `#fragments` and `user:password@` are stripped from URLs first, since they often hold session tokens. Set `TABSNAP_TRIAGE_FULL_URLS=1` to send full URLs.

## Permissions

macOS asks once per browser whether the app running tabsnap (Terminal, iTerm, SwiftBar, …) may control it. If you said no, tabsnap tells you; turn it back on in System Settings → Privacy & Security → Automation.

## License

MIT
