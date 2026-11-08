# Changelog

All notable changes to tabsnap. New work goes under **Unreleased**; `./release` turns it into the next version's section and its GitHub release notes.

## [Unreleased]

## [0.2.6] - 2026-11-08

### Added
- `refresh` setting for how often the menu bar count updates (`refresh = 30s`, `1m`, …; at least 5s). The menu bar picks up a change by itself.

### Changed
- The menu bar count now updates every 10 seconds by default (was every minute).

## [0.2.5] - 2026-11-08

### Added
- **AI agents:** a tabsnap skill teaches Claude Code (and other agents that read skills) to list, save, search, close and restore your tabs on request, with safety rules built in. Install it from `tabsnap setup` or with `/plugin install tabsnap --marketplace paragdudeja/tabsnap`.
- `tabsnap search WORDS…` finds tabs across all your snapshots and triage notes, newest first, one result per page. `--restore` reopens the matches in the browser each was saved from (`--dry-run` to preview; asks before opening more than 5).
- `tabsnap restore --url URL…` reopens specific pages, and `--from-json -` takes a list such as `tabsnap search --json` output.
- `tabsnap list` shows open tabs without saving anything.
- `--json` output for snapshots, `list`, `search` and `config`.

### Changed
- `tabsnap setup` does the whole install: it can install SwiftBar and add the menu bar counter for you (no more picking a plugin folder), and install the Claude Code skill. `--yes`, `--no-menu-bar` and `--no-skill` control it; run without a terminal, it only describes optional steps.
- Homebrew now reminds you to run `tabsnap setup` after installing.

## [0.2.4] - 2026-11-08

### Fixed
- `--close` closes tabs one by one again and never closes a whole window by script. In 0.2.3, closing a window that still had several tabs could leave Brave with a half-closed window and crash it. If you're on 0.2.3, please upgrade.

## [0.2.3] - 2026-11-08

### Changed
- `tabsnap restore` opens each URL once. Pass `--all-copies` to reopen duplicate tabs too. Snapshots still record every tab.
- When `--close` empties a window, tabsnap now closes the window itself instead of closing its last tab by script. **⚠️ Reverted in 0.2.4: this could crash Brave. Upgrade if you're on 0.2.3.**

### Fixed
- `restore` accepts hand-edited checkbox lines (extra spaces, nested items, `*` and `+` bullets).
- Notes keep backslash sequences like `\n` as typed.
- `restore` rejects unknown options instead of treating them as a file name.

## [0.2.2] - 2026-11-08

### Added
- `--browser brave|chrome|arc|edge|safari` limits a snapshot (and `--close`) to one browser.
- `--window front` targets the front window of the browser you were last using; `--window "Name"` targets a window you named in Chrome, Brave or Edge.
- Menu bar: **Snapshot + Close front window**.
- Snapshot files record their scope, e.g. `**Scope:** front window`.

### Changed
- `--close` only closes tabs in the windows it saved, not matching URLs anywhere in the browser.
- Unknown flags and missing values are errors instead of becoming part of the note.

### Fixed
- Two snapshots in the same second no longer overwrite each other.

## [0.2.1] - 2026-11-08

### Added
- `tabsnap setup`: asks for browser access, writes a commented config file, links the menu bar plugin and checks triage.
- Config file at `~/.config/tabsnap/config` (`dir`, `warn`, `keep`, `model`), shown by `tabsnap config`. Environment variables override it.
- Keep list: `--close` never closes tabs on sites you list, including subdomains.

### Changed
- Incognito windows in Brave, Chrome, Arc and Edge are never saved, counted or closed.
- Triage strips query strings, `#fragments` and credentials from URLs before sending them. Set `TABSNAP_TRIAGE_FULL_URLS=1` to send full URLs.

### Fixed
- A clear message, and a ⚠️ in the menu bar, when macOS automation access is denied.
- Tab titles containing backslashes no longer break triage or restore.

## [0.2.0] - 2026-11-08

### Added
- SwiftBar menu bar plugin: live open-tab count (orange past your limit), last-snapshot age, and one-click snapshot, close, triage, restore and open actions.
- `tabsnap count` prints how many tabs are open, without launching any browser.

## [0.1.2] - 2026-11-08

### Fixed
- `triage` and `restore` printed a stray "no matches found" error when the snapshot folder was empty.
- The Homebrew formula's test failed after triage gained the Claude Code fallback.

## [0.1.1] - 2026-11-08

### Added
- `tabsnap restore` reopens unticked tabs from a snapshot or triage file in the browser they came from (`--all`, `--dry-run`).
- Triage uses your Claude Code login when `ANTHROPIC_API_KEY` isn't set.
- `tabsnap --help` and `--version`.

### Fixed
- Triage notes no longer mention internal tab numbers.

## [0.1.0] - 2026-11-08

### Added
- First release: save every open tab in Brave, Chrome, Arc, Edge and Safari to a timestamped markdown checklist, optionally close them, and have Claude triage them.
