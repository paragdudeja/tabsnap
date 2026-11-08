# Snapshot format

The CLI (`tabsnap`) and the browser extension (`extension/`) write the same markdown, so either can read the other's snapshots: point the CLI's `dir` at the extension's download folder and `search`, `restore`, `triage` and the agent skill work on them.

## File name

`tabs_YYYY-MM-DD_HH-MM-SS.md` in local time. If that name is taken, writers add a suffix before `.md` (the CLI uses `_2`, `_3`…; browsers add ` (1)`), so readers should match `tabs_*.md`. Triage reports sit next to their snapshot as `tabs_….triage.md`.

## Contents

```markdown
# Tab snapshot — 2026-11-08 12:15:26 IST

> optional note

**Total tabs:** 70 · **Scope:** front window

## Brave Browser — 70 tabs

### Window 1 (68 tabs)

- [ ] [Page title](https://example.com/page)
- [x] [Something already dealt with](https://example.com/done)
```

- `# Tab snapshot — <local date and time> <time zone>`: first line.
- `> note`: optional, one line.
- `**Total tabs:** N`, optionally followed by ` · **Scope:** <text>` when only part of the browser was saved.
- `## <Browser> — N tabs`: one section per browser. Readers map these names to apps: `Brave Browser`, `Google Chrome`, `Arc`, `Microsoft Edge`, `Safari`. Any other name (e.g. `Firefox`, `Opera`) is allowed; readers fall back to the default browser.
- `### <Window label> (N tabs)`: `Window 1`, `Front window`, `Window "Name"`, `This window`…
- `- [ ] [title](url)`: one line per tab, in tab order. `[` and `]` in titles are escaped as `\[` `\]`; whitespace in titles collapses to single spaces; empty titles are written as `(untitled)`. `- [x]` marks a tab the user has dealt with.

Writers may append extra text after a tab line only in triage files (` — note \`badge\``). Readers must accept hand-edited lines: extra spaces, nesting, and `*` or `+` bullets.

Incognito/private tabs are never written.
