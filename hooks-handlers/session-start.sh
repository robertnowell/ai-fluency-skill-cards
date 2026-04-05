#!/usr/bin/env bash
# Inject the active growth quest into the session context.
# Reads from ~/.skill-tree/growth-quest.txt (written by profile.py after /skill-tree runs).

QUEST_FILE="$HOME/.skill-tree/growth-quest.txt"

if [ -f "$QUEST_FILE" ] && [ -s "$QUEST_FILE" ]; then
  QUEST=$(cat "$QUEST_FILE")
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Growth quest from your last skill tree analysis: ${QUEST} — If a natural opportunity arises during this session, gently encourage the user to practice this behavior. Do not force it or mention this unless relevant."
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
