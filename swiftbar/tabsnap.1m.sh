#!/bin/zsh
# <xbar.title>tabsnap</xbar.title>
# <xbar.version>v0.2.0</xbar.version>
# <xbar.author>Parag Dudeja</xbar.author>
# <xbar.author.github>paragdudeja</xbar.author.github>
# <xbar.desc>Live open-tab count, plus one-click snapshot, close, triage and restore.</xbar.desc>
# <xbar.dependencies>tabsnap (brew install paragdudeja/tap/tabsnap)</xbar.dependencies>
# <xbar.abouturl>https://github.com/paragdudeja/tabsnap</xbar.abouturl>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
# <swiftbar.refreshOnOpen>true</swiftbar.refreshOnOpen>
#
# SwiftBar runs this every minute to draw the menu, and again with an action
# argument (snapshot, close, ...) when a menu item is clicked.

# SwiftBar starts plugins with a minimal PATH; add Homebrew and the Claude Code CLI
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
TABSNAP="${TABSNAP_BIN:-$(command -v tabsnap)}"
OUT_DIR="${TABSNAP_DIR:-$HOME/tab-snapshots}"
WARN="${TABSNAP_WARN:-30}"
# Pick up the user's config file (dir, warn) the same way the CLI does
if [[ -n "$TABSNAP" ]]; then
  while read -r k _ v; do
    case "$k" in dir) OUT_DIR="$v" ;; warn) WARN="$v" ;; esac
  done < <("$TABSNAP" config 2>/dev/null | tail -n +2)
fi
SELF="${SWIFTBAR_PLUGIN_PATH:-$0}"

notify() { osascript -e "display notification \"${1//\"/\\\"}\" with title \"tabsnap\"" 2>/dev/null; }

latest() {  # $1 = snapshot | triage
  local files=("$OUT_DIR"/tabs_*.md(N.om))
  if [[ "$1" == triage ]]; then files=(${(M)files:#*.triage.md}); else files=(${files:#*.triage.md}); fi
  print -r -- "$files[1]"
}

# --- Click handlers ------------------------------------------------------
if [[ -n "$1" ]]; then
  case "$1" in
    snapshot) msg=$("$TABSNAP" 2>&1) ;;
    close)    msg=$("$TABSNAP" --close 2>&1) ;;
    close-front) msg=$("$TABSNAP" --close --window front 2>&1) ;;
    triage-close)
      notify "Saving and closing tabs, then triaging…"
      msg=$("$TABSNAP" --close --triage 2>&1) ;;
    triage)
      notify "Triaging latest snapshot…"
      msg=$("$TABSNAP" triage 2>&1) ;;
    restore)  msg=$("$TABSNAP" restore 2>&1) ;;
  esac
  [[ -n "$msg" ]] && notify "$(print -r -- "$msg" | grep -v '^Triaging' | sed "s|$HOME|~|g" | tr '\n' ' ')"
  # Open the triage report once it exists, since that's what the user wants to read
  if [[ "$1" == triage* ]] && [[ "$msg" == *"Saved triage"* ]]; then open "$(latest triage)"; fi
  exit 0
fi

# --- Menu ----------------------------------------------------------------
if [[ -z "$TABSNAP" ]]; then
  echo "tabs ? | sfimage=square.stack.3d.up.slash"
  echo "---"
  echo "tabsnap not found"
  echo "Install with Homebrew… | href=https://github.com/paragdudeja/tabsnap#install"
  exit 0
fi

count=$("$TABSNAP" count 2>/dev/null)
if (( $? == 3 )); then
  echo "! | sfimage=exclamationmark.triangle color=#E8590C sfcolor=#E8590C tooltip=\"tabsnap can't read your tabs\""
  echo "---"
  echo "tabsnap needs permission to read your browser tabs"
  echo "Open Automation settings… | href=x-apple.systempreferences:com.apple.preference.security?Privacy_Automation sfimage=gear"
  echo "Enable your browsers under SwiftBar, then refresh | size=11"
  echo "Refresh | refresh=true sfimage=arrow.clockwise"
  exit 0
fi
[[ "$count" == <-> ]] || count="?"
if [[ "$count" != "?" ]] && (( count >= WARN )); then
  echo "$count | sfimage=square.stack.3d.up.fill color=#E8590C sfcolor=#E8590C tooltip=\"$count tabs open — time to snapshot\""
else
  echo "$count | sfimage=square.stack.3d.up tooltip=\"$count tabs open\""
fi

echo "---"
echo "$count tabs open | sfimage=safari"
snap=$(latest snapshot)
if [[ -n "$snap" ]]; then
  mins=$(( ($(date +%s) - $(stat -f %m "$snap")) / 60 ))
  if (( mins < 60 )); then ago="${mins}m ago"; elif (( mins < 1440 )); then ago="$((mins / 60))h ago"; else ago="$((mins / 1440))d ago"; fi
  saved=$(grep -m1 '^\*\*Total tabs:\*\*' "$snap" | grep -o '[0-9]\+')
  echo "Last snapshot: $ago (${saved:-?} tabs) | sfimage=clock"
else
  echo "No snapshots yet | sfimage=clock"
fi

echo "---"
echo "Snapshot | bash=$SELF param1=snapshot terminal=false refresh=true sfimage=camera shortcut=CMD+CTRL+OPTION+S"
echo "Snapshot + Close | bash=$SELF param1=close terminal=false refresh=true sfimage=xmark.square shortcut=CMD+CTRL+OPTION+X"
echo "Snapshot + Close front window | bash=$SELF param1=close-front terminal=false refresh=true sfimage=macwindow.badge.plus"
echo "Snapshot + Close + Triage | bash=$SELF param1=triage-close terminal=false refresh=true sfimage=sparkles"
echo "---"
if [[ -n "$snap" ]]; then
  echo "Triage latest | bash=$SELF param1=triage terminal=false refresh=true sfimage=wand.and.stars"
  echo "Restore latest | bash=$SELF param1=restore terminal=false refresh=true sfimage=arrow.uturn.backward.square"
  echo "Open latest snapshot | bash=/usr/bin/open param1=$snap terminal=false sfimage=doc.text"
  triage=$(latest triage)
  [[ -n "$triage" ]] && echo "Open latest triage | bash=/usr/bin/open param1=$triage terminal=false sfimage=list.bullet.rectangle"
fi
echo "Open snapshots folder | bash=/usr/bin/open param1=$OUT_DIR terminal=false sfimage=folder"
