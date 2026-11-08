# tabsnap

Too many tabs open? `tabsnap` saves every open browser tab to a timestamped markdown checklist, so you can close them without losing anything. Optionally, Claude groups the tabs by theme, notes what each one is, and tells you which to read later, keep, or drop.

Works with Brave, Chrome, Arc, Edge and Safari on macOS. Not on a Mac? Try the [browser extension](#browser-extension-beta) (Windows, Linux, ChromeOS, macOS).

## Install

```sh
brew install paragdudeja/tap/tabsnap && tabsnap setup
```

`tabsnap setup` walks you through the rest:

- asks macOS for access to your open browsers (click **Allow**),
- writes a config file you can edit later,
- offers a live tab counter in your menu bar, installing the free [SwiftBar](https://github.com/swiftbar/SwiftBar) app for you,
- offers to teach Claude Code to use tabsnap (see [AI agents](#ai-agents)).

It's safe to re-run, for example after opening another browser. `tabsnap setup --yes` accepts everything without asking; `--no-menu-bar` and `--no-skill` skip those parts.

## Usage

```sh
tabsnap                         # snapshot all open tabs
tabsnap "leetcode backlog"      # snapshot with a note
tabsnap --close "done for today" # snapshot, then close the saved tabs
tabsnap --close --triage        # snapshot, close, then AI-triage
tabsnap --close --window front  # save and close just the window you're in
tabsnap triage                  # AI-triage the latest snapshot
tabsnap restore                 # reopen tabs you haven't ticked off
tabsnap search egg drop         # find a tab across all your snapshots
tabsnap search egg drop --restore  # …and reopen it
tabsnap list                    # show open tabs without saving anything
tabsnap count                   # how many tabs are open right now
tabsnap config                  # show your settings
```

Add `--json` to a snapshot, `list`, `search` or `config` for machine-readable output.

Snapshots are saved to `~/tab-snapshots/` by default:

```markdown
# Tab snapshot — 2026-11-08 12:15:26 IST

**Total tabs:** 70

## Brave Browser — 70 tabs

### Window 1 (68 tabs)

- [ ] [Super Egg Drop - LeetCode](https://leetcode.com/problems/super-egg-drop/)
- [ ] [Bus Routes - LeetCode](https://leetcode.com/problems/bus-routes/)
```

`--close` only closes tabs whose URLs were saved, only after the file is written, and never tabs on your [keep list](#config). Pinned tabs aren't detected; put their sites on the keep list.

## Just one browser or window

```sh
tabsnap --browser brave                     # only Brave (also: chrome, arc, edge, safari)
tabsnap --close --window front              # the front window of the browser you were using
tabsnap --close --window "Interview prep"   # a window you named
```

`--window front` picks the browser you were last using; if several are open and none is in front (e.g. you're in Terminal), add `--browser`. To name a window in Chrome, Brave or Edge, right-click the tab strip → **Name window…**. Names make good targets for project windows you want to park and come back to. With a target, `--close` only touches that window.

## Restore

`tabsnap restore` reopens every unticked (`- [ ]`) tab from the latest snapshot, in the browser it was saved from. Tick off tabs as you deal with them and restore brings back only what's left. It also works on a triage file.

Snapshots keep every tab, duplicates included, so they mirror your windows exactly; restore opens each URL once unless you pass `--all-copies`.

```sh
tabsnap restore --dry-run                 # list what would open
tabsnap restore --all                     # include ticked tabs too
tabsnap restore --all-copies              # reopen duplicate tabs too
tabsnap restore ~/tab-snapshots/tabs_2026-11-08_12-15-26.triage.md
```

## Search

`tabsnap search` finds tabs in every snapshot you've taken, matching all your words against titles, URLs and triage notes. Each page appears once, with when you last had it open:

```
$ tabsnap search egg drop
2026-11-08 12:15  Super Egg Drop - LeetCode
                  https://leetcode.com/problems/super-egg-drop/description/
                  seen in 1 snapshot · Super Egg Drop: hard DP.
```

Add `--restore` to reopen the matches, each once, in the browser it was saved from (`--dry-run` to preview; it asks before opening more than 5). To reopen particular pages, use `tabsnap restore --url URL [--url URL…]`, or pipe search results straight in: `tabsnap search egg drop --json | tabsnap restore --from-json -`.

## Menu bar

A [SwiftBar](https://github.com/swiftbar/SwiftBar) plugin shows your open-tab count in the menu bar (orange once you pass your `warn` limit) and puts every command one click away: snapshot, snapshot + close (everything or just the front window), triage, restore, and open the latest files.

`tabsnap setup` installs SwiftBar and adds the plugin for you. Already use SwiftBar? It just links the plugin into your plugin folder.

## Config

`tabsnap setup` creates `~/.config/tabsnap/config`:

```ini
dir   = ~/tab-snapshots                        # e.g. a folder in your Obsidian vault
warn  = 30                                     # menu bar turns orange from here
keep  = mail.google.com, calendar.google.com   # --close never closes these (subdomains too)
model = claude-opus-5-5                        # model for triage
refresh = 10s                                  # how often the menu bar count updates (min 5s)
```

**Pinned tabs:** browsers don't tell other apps which tabs are pinned, so tabsnap can't skip them automatically. Add their sites to `keep` instead (e.g. `keep = mail.google.com, calendar.google.com, app.slack.com`) and `--close` will leave them alone.

Environment variables `TABSNAP_DIR`, `TABSNAP_WARN`, `TABSNAP_KEEP`, `TABSNAP_MODEL` and `TABSNAP_REFRESH` override the file. A new `refresh` value reaches the menu bar on its next update; no need to re-run setup. `tabsnap config` shows what's in effect.

## AI triage

`tabsnap triage` asks Claude to read your snapshot and writes `<snapshot>.triage.md`: an overview, tabs grouped by theme with a one-line note each, an action per tab (📖 read later, 📌 reference, ✅ done, 🗑 drop), and duplicates.

It uses whichever of these you have:

- **Claude Code**: if the `claude` CLI is installed and logged in, triage runs through it. No API key needed.
- **Anthropic API key**: `export ANTHROPIC_API_KEY=sk-ant-...` (takes priority when set).

## AI agents

tabsnap ships a skill that teaches Claude Code (and other agents that read skills) to use it, so you can just ask:

- "What tabs do I have open? Summarize them."
- "Save this window and close it."
- "Find that Fenwick tree article I had open last week." / "Bring it back."
- "Reopen what I didn't finish yesterday."

`tabsnap setup` offers to install it. In Claude Code you can also run:

```
/plugin install tabsnap --marketplace paragdudeja/tabsnap
```

The skill tells the agent to close tabs only when you ask, to show what `restore` will open before opening it, and to keep your snapshots private. Other agents can read `skills/tabsnap/SKILL.md` directly.

## Browser extension (beta)

The same idea inside Chrome, Edge, Brave, Arc or Opera, on any OS:

- a tab count on the toolbar icon (orange past your limit),
- **Save all**, **Save this window**, and **Save & close** (pinned tabs and your keep list stay open),
- search past snapshots and reopen tabs, tick tabs off, reopen what's left,
- shortcuts: **Alt+Shift+S** saves everything, **Alt+Shift+W** saves and closes the current window,
- a markdown copy of each snapshot in `Downloads/tabsnap/`, in the [same format](FORMAT.md) as the CLI. On a Mac, set the CLI's `dir` to that folder to search, triage and use the agent skill on them too.

It isn't in the browser stores yet. To try it:

1. Download `tabsnap-extension-*.zip` from the [latest extension release](https://github.com/paragdudeja/tabsnap/releases?q=extension&expanded=true) and unzip it somewhere you'll keep (the browser loads it from that folder).
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder. Pin the tabsnap icon to your toolbar.

Snapshots stay in your browser and your Downloads folder; the extension sends nothing anywhere. It needs the "tabs" permission to read tab titles and URLs, which browsers describe as reading your browsing history.

## Privacy

- Snapshots stay on your Mac as plain markdown files. Nothing leaves your machine unless you run triage.
- **Incognito windows** in Brave, Chrome, Arc and Edge are never saved, counted or closed. Safari doesn't let other apps tell private windows apart, so **Safari private tabs are saved like any other tab**.
- **Triage** sends tab titles and URLs to Claude, never page contents. Query strings, `#fragments` and `user:password@` are stripped from URLs first, since they often hold session tokens. Set `TABSNAP_TRIAGE_FULL_URLS=1` to send full URLs.

## Permissions

macOS asks once per browser whether the app running tabsnap (Terminal, iTerm, SwiftBar, …) may control it. If you said no, tabsnap tells you; turn it back on in System Settings → Privacy & Security → Automation.

## License

MIT
