# Working on tabsnap

Notes for coding agents (and humans) changing this repo. For *using* tabsnap from an agent, see `skills/tabsnap/SKILL.md`.

## Layout

- `tabsnap`: main CLI (zsh): config loading, snapshot, `--close`, `list`, `count`, `config`; dispatches `setup|triage|restore|search` to `tabsnap-<cmd>`.
- `tabsnap-setup`, `tabsnap-triage`, `tabsnap-restore`, `tabsnap-search`: subcommands. Each `tabsnap-*` script must be listed in `bin.install` in the Homebrew formula (`../homebrew-tap/Formula/tabsnap.rb`); `./release` refuses otherwise.
- `swiftbar/tabsnap.1m.sh`: SwiftBar menu bar plugin; it calls the CLI. SwiftBar reads the refresh interval from the *link's* file name, so `setup` links it as `tabsnap.<refresh>.sh` and the plugin renames its own link when the `refresh` setting changes (only when `$SWIFTBAR` is set).
- `skills/tabsnap/SKILL.md` + `.claude-plugin/`: the agent skill, also a Claude Code plugin marketplace. Check with `claude plugin validate .`.
- `tests/run`: offline tests, safe anywhere. `tests/live`: drives a real Brave Browser (see below).
- Browser access is JXA (`osascript -l JavaScript`). Shared helpers live in `JXA_COMMON` in `tabsnap`; scripts are passed in quoted heredocs (`<<'JXA'`) so the shell never touches them.

## Shell and jq traps (all of these bit us)

- **Never `echo "$var"` data in zsh.** zsh's `echo` turns `\n` and friends into real characters, corrupting JSON and titles. Use `print -r -- "$var"`.
- **`set -e` + subshells:** `x=$( (( n > 0 )) && echo y )` exits the whole script when the test is false. Use an `if`.
- **jq `select` on a single value yields nothing, not null**, so `{a: ($x | select(. != ""))}` drops the entire object. Use `if … then … else null end`.
- **No apostrophes inside single-quoted jq programs or comments** (`it's` ends the shell string).
- **Pattern flags:** `(#i)` needs `extendedglob`; prefer `${(L)var}` comparisons.
- Keep stdout clean for `--json`: human messages go through `say` (stderr in JSON mode).

## Browser safety

- **Never call `window.close()` on a browser window by script.** Close tabs one by one (`--close` does). Closing a Brave window that still had several tabs crashed Brave twice (SIGSEGV in `-[NSWindow _finishClosingWindow]`); see the 0.2.4 changelog.
- Test anything that closes tabs in **Google Chrome**, in windows the test creates, never in someone's daily browser. Read-only calls (count, list, snapshot) are fine anywhere.
- `tests/live` uses Brave and only touches windows it creates, but ask the user before running it.
- When testing `restore`/`search --restore`, use `--dry-run`, or put a stub `open` first in `PATH`, so tabs don't open in the user's browser.

## Tests

```sh
tests/run        # offline: must pass before any commit
tests/live       # real Brave; ask first
```

Add a test to `tests/run` for every bug fix. Agent behaviour can be checked without touching the user's Claude config: `claude -p "…" --plugin-dir . --allowedTools "Bash(tabsnap:*)"`.

## Releasing

1. Describe user-facing changes under `## [Unreleased]` in `CHANGELOG.md` (written for users, not about tests or CI).
2. Commit everything, then `./release X.Y.Z` (`--dry-run` first if unsure). It bumps `VERSION` and the plugin manifest, dates the changelog, tags, pushes, updates the tap formula, and publishes the GitHub release notes.
3. Verify: `brew update && brew upgrade tabsnap && brew test tabsnap && brew audit --strict --online paragdudeja/tap/tabsnap`.

The maintainer picks version numbers and approves every commit and release.
