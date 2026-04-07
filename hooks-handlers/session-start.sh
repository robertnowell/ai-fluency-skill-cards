#!/usr/bin/env bash
# Inject the active growth quest into the session context.
#
# Reads from one of two locations (in priority order):
#   1. $CLAUDE_PLUGIN_ROOT/.user-state/growth-quest.txt
#      — persistent across Cowork sessions (sandbox $HOME is ephemeral there)
#      — wiped on plugin updates (rare)
#   2. $HOME/.skill-tree/growth-quest.txt
#      — persistent in Claude Code (stable $HOME, survives plugin updates)
#      — does not persist across Cowork sessions

PLUGIN_QUEST="${CLAUDE_PLUGIN_ROOT:-}/.user-state/growth-quest.txt"
HOME_QUEST="$HOME/.skill-tree/growth-quest.txt"

QUEST_FILE=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "$PLUGIN_QUEST" ] && [ -s "$PLUGIN_QUEST" ]; then
  QUEST_FILE="$PLUGIN_QUEST"
elif [ -f "$HOME_QUEST" ] && [ -s "$HOME_QUEST" ]; then
  QUEST_FILE="$HOME_QUEST"
fi

if [ -n "$QUEST_FILE" ]; then
  QUEST=$(cat "$QUEST_FILE")
  # Escape for JSON: backslashes, double quotes, newlines
  QUEST_ESCAPED=$(printf '%s' "$QUEST" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Skill Tree growth quest active: ${QUEST_ESCAPED} — If a natural opportunity arises during this session, gently encourage the user to practice this behavior. Do not force it or mention this unless relevant."
  }
}
EOF
else
  # No quest yet — user hasn't run /skill-tree
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ""
  }
}
EOF
fi

exit 0
