---
name: skill-tree
description: Analyze your Claude collaboration style and generate a skill tree visualization with character archetype card. Use when the user says "skill tree", "show my skills", "analyze my style", "check my ai fluency", or wants to see their AI fluency profile.
---

# Skill Tree

Generate a personalized AI fluency profile by analyzing the user's conversation history **on the current surface**.

**CRITICAL: You MUST use the `analyze` MCP tool for classification. NEVER attempt to classify behaviors yourself — your classifications will be inconsistent and unvalidated. The remote server uses a calibrated classifier with cached results for consistency across runs.**

## Step 0: Detect surface and set up

**Run this test FIRST. Do not skip it. Do not guess based on context clues.** The branches below have different file layouts, different available tools, and different failure modes. Mixing them produces broken analysis.

```bash
[ -d "$HOME/.claude/projects" ] && echo "claude-code" || echo "cowork"
```

- Output `claude-code` → use the **Claude Code** branch in every step below. Stop reading the Cowork branch.
- Output `cowork` → use the **Cowork** branch in every step below. Stop reading the Claude Code branch.

If the test errors, default to `claude-code` — its branch is read-only file access and will fail safely. Never assume Cowork without evidence.

### Claude Code branch

No setup needed. You will read from `~/.claude/projects/` only. **Do NOT** read from `~/Library/Application Support/Claude/`. Skip ahead to Steps 1–2.

### Cowork branch

Cowork sandboxes do **not** have host filesystem access — there is **nothing to mount**. Cowork exposes session data only via the `mcp__session_info__*` MCP tools (server prefix is literal). The old `request_cowork_directory` mount tool was removed from session runtime in a recent desktop build (anthropics/claude-code#25797), and folder picks are locked to `$HOME` with symlinks rejected (anthropics/claude-code#24964). Do **not** try to `find` the Library path — it does not exist inside the sandbox.

If `mcp__session_info__list_sessions` is not in your tool list, you are NOT actually on Cowork — re-run the surface test in Step 0 and use the Claude Code branch instead.

**0a. Enable network egress** — The analyzer in Step 3 runs on a remote server. If `analyze` returns a **network error** (and only then), tell the user:

> "The Skill Tree analyzer needs network access. Please enable it:
> **Settings → Code execution and file creation → Allow network egress → toggle ON**
> Then say 'skill tree' again."

**Do NOT classify manually as a fallback.** Network errors come from `analyze` only — they are unrelated to reading sessions.

**0b. List sessions.** Call the MCP tool:

```
mcp__session_info__list_sessions(limit: 100)
```

The response is plain text, one line per session:

```
local_<uuid> "<title>" (idle, cwd: /sessions/<slug>, is_child: false)
```

Extract every `local_<uuid>` whose line ends with `is_child: false`. Skip `is_child: true` lines — those are subagents that share their parent's context and would double-count. **Preserve list order** — `list_sessions` returns most-recent-first and the parser in 0d depends on it to synthesize timestamps.

Write the ordered IDs to `/tmp/cowork_session_ids.txt`, one per line, in the order returned:

```bash
mkdir -p /tmp/cowork_transcripts
cat > /tmp/cowork_session_ids.txt <<'EOF'
local_<uuid_1>
local_<uuid_2>
...
EOF
```

**0c. Read each transcript.** For each `session_id` in `/tmp/cowork_session_ids.txt`, call:

```
mcp__session_info__read_transcript(
  session_id: "local_<uuid>",
  limit: 500,
  format: "full",
  max_wait_seconds: 0
)
```

All four parameters matter:

- `limit: 500` — **required**. The default of 20 returns only the tail of each session and produces a hollow analysis.
- `format: "full"` — **required**. `auto` returns a one-line progress message for any still-running session instead of the transcript.
- `max_wait_seconds: 0` — **required**. Otherwise each running session blocks you for 30s, and a list of 50 sessions takes 25 minutes.

Save each tool response (the plain-text body) to `/tmp/cowork_transcripts/<session_id>.txt` — exact filename, no extra prefix.

**0d. Parse transcripts and build sessions.json.** Run this exactly:

```bash
python3 <<'PY' > /tmp/sessions.json
import os, re, json
from datetime import datetime, timedelta, timezone
SKIP = ["\u23fa","\u23bf","ctrl+o to expand","\u273b Brewed","\u273b Baked","\u273b Saut\u00e9ed","\u273b Cooked","\u273b Cogitated","\u273b Churned","<system-reminder>","<command-name>","<local-command"]
DIR = "/tmp/cowork_transcripts"
ids = [line.strip() for line in open("/tmp/cowork_session_ids.txt") if line.strip()]
# list_sessions is most-recent-first → reverse so chronologically oldest is first
ids = list(reversed(ids))
now = datetime.now(timezone.utc)
sessions = []
for i, sid in enumerate(ids):
    path = os.path.join(DIR, sid + ".txt")
    if not os.path.exists(path): continue
    text = open(path).read()
    # Cowork transcripts interleave Human:/Assistant: turns at line start.
    parts = re.split(r"^(Human|Assistant):\s*", text, flags=re.MULTILINE)
    msgs = []
    for j in range(1, len(parts) - 1, 2):
        role, content = parts[j], parts[j+1].strip()
        if role != "Human": continue
        if len(content) <= 10: continue
        if any(m in content[:500] for m in SKIP): continue
        msgs.append(content[:2000])
    if msgs:
        # Synthesize a timestamp from list order so the analyzer's phase logic works.
        # Spaced one day apart, oldest first. session_info does not expose real
        # timestamps, so absolute dates are fictional but the ordering is correct.
        fake_ts = (now - timedelta(days=len(ids) - i - 1)).isoformat()
        sessions.append({"id": sid, "timestamp": fake_ts, "project": "cowork", "messages": msgs})
print(json.dumps(sessions))
PY
```

> ⚠️ **Cowork timestamps are synthetic.** `mcp__session_info__list_sessions` does not expose real session timestamps. The script above generates fake ones one day apart (oldest first, derived from list order). The phase analysis still produces a meaningful arc, but the absolute dates in the visualization are fiction. If `session_info` ever grows a `timestamps` field, replace the synthesis with real values.

**Cowork branch ends here. Skip Steps 1–2 entirely** — they are Claude-Code-only — and go directly to Step 3 with `/tmp/sessions.json`.

## Steps 1–2: Find and extract sessions (Claude Code branch only)

> Cowork users: do NOT run anything in this section. Your data extraction lives in Step 0b–0d. The commands below assume host filesystem access, which Cowork sandboxes do not have.

Run the commands below **exactly as written**. Do NOT write your own extraction script.

```bash
find ~/.claude/projects -name "*.jsonl" -size +1k \
  ! -name "audit.jsonl" ! -path "*/subagents/*" \
  2>/dev/null > /tmp/session_files.txt
```

Then extract:
```bash
cat /tmp/session_files.txt | python3 -c '
import json, sys, os, re
SKIP = ["\u23fa","\u23bf","ctrl+o to expand","\u273b Brewed","\u273b Baked","\u273b Saut\u00e9ed","\u273b Cooked","\u273b Cogitated","\u273b Churned","<local-command","<command-name>","<system-reminder>"]
PARENTS = {"Users","Projects","Documents","Downloads","Desktop","repos","src","code","work","dev","Library","Application"}
def proj(path):
    parts = path.split("/")
    try: raw = parts[parts.index("projects") + 1].lstrip("-")
    except: return "unknown"
    segs = raw.split("-")
    last = -1
    for i, s in enumerate(segs):
        if s in PARENTS: last = i
    return "-".join(segs[last + 1:]) if last >= 0 and last < len(segs) - 1 else raw
sessions = []
for path in sys.stdin.read().strip().split("\n"):
    if not path: continue
    msgs, ts = [], None
    try:
        for line in open(path):
            line = line.strip()
            if not line: continue
            try: obj = json.loads(line)
            except: continue
            if obj.get("type") != "user": continue
            content = obj.get("message", {}).get("content")
            if not isinstance(content, str) or len(content) <= 10: continue
            if any(m in content[:500] for m in SKIP): continue
            if ts is None: ts = obj.get("timestamp", "")
            msgs.append(content[:2000])
    except: continue
    if msgs:
        sid = os.path.basename(path).replace(".jsonl", "")
        sessions.append({"id": sid, "timestamp": ts or "", "project": proj(path), "messages": msgs})
sessions.sort(key=lambda s: s.get("timestamp", ""))
print(json.dumps(sessions))
' > /tmp/sessions.json
```

## Step 3: Call the analyze tool

Read `/tmp/sessions.json` and pass its contents directly to the `analyze` MCP tool. Include the user's name (from git config, environment, or ask them):

```
analyze({ sessions_json: '<contents of /tmp/sessions.json>', user_name: 'First Last' })
```

**If the tool call fails with a network error:** Do NOT fall back to manual analysis. Guide the user to enable network egress (see Step 0a).

**The response is a compact summary (~2KB), not the full profile.** It contains:
- `profile_id` — opaque ID; you MUST pass this to `visualize` in step 6
- `archetype` — name, tagline, growth_quest, axis_scores, target_archetype
- `growth_edge` — the behavior to grow next
- `branches` — score and baseline for each axis
- `notable_behaviors` — top 5 above-baseline behaviors with 1-2 evidence quotes each
- `phases` — phase context with project names and one key moment per phase

The full profile is stashed server-side. Do NOT try to reconstruct it.

## Step 4: Save the growth quest

Write the `growth_quest` field from the analyze response's `archetype` to **both** of these locations (different surfaces persist different ones):

```bash
# Primary: $HOME — persistent in Claude Code, ephemeral in Cowork
mkdir -p ~/.skill-tree
# write quest text to ~/.skill-tree/growth-quest.txt

# Plugin-dir fallback: persistent across Cowork sessions (sandbox $HOME is per-session)
mkdir -p "${CLAUDE_PLUGIN_ROOT}/.user-state" 2>/dev/null || true
# write quest text to "${CLAUDE_PLUGIN_ROOT}/.user-state/growth-quest.txt" (ignore failure if read-only)
```

The SessionStart hook reads from whichever location has content. Writing to both means the quest persists across sessions in both Claude Code and Cowork.

## Step 5: Synthesize narrative (YOU do this — don't skip it)

Read the `notable_behaviors[].evidence` quotes and `phases[].keyMoment` quotes from the analyze response. Write a narrative JSON object that interprets the user's journey:

```json
{
  "thesis": "1-2 sentences capturing the ARC of their journey",
  "phaseNames": {
    "0": "Research & Architecture",
    "1": "Building the Classifier"
  },
  "phaseInsights": {
    "0": "1-2 sentences about the first phase",
    "1": "1-2 sentences about the next phase"
  }
}
```

The `phaseInsights` and `phaseNames` keys ("0", "1", etc.) map by index to the `phases` array in the analyze response. If there are no phases, write insights based on the `notable_behaviors` evidence grouped by axis.

**Phase names MUST describe what the user was building, not behavioral abstractions.** "Building the Classifier" is good. "Delegation-dominant phase" is terrible. Look at each phase's `projects` and `keyMoment.quote` to understand what was happening, then name it after the work.

**What makes a GOOD narrative:**
- Ground everything in the actual work: name the projects, describe what was being built
- Reference specific evidence quotes ("When you said 'don't jump to a UI', that set the frame...")
- Explain what the behavior MEANS in context ("You refused to write code for five sessions because the data model wasn't right")
- The thesis captures what changed over time — the arc, not a static description
- Name specific decisions and turning points, not generic behavior labels

**What makes a BAD narrative:**
- Generic phrases: "demonstrates strong ability", "shows proficiency"
- Axis labels as insights: "Delegation-dominant phase" (say what they actually DID)
- Abstracting away the work: "Setting the Stage" instead of "Scoping the skill-tree MCP"
- Flattery without evidence: "You're an exceptional collaborator"
- Behavior names without interpretation: "You clarified goals" (say WHY that matters in this project)

## Step 6: Generate visualization

Call the `visualize` MCP tool with the **`profile_id` from step 3** and your narrative JSON from step 5:

```
visualize({ profile_id: '<profile_id from analyze response>', narrative_json: '{"thesis":"...","phaseNames":{"0":"..."},"phaseInsights":{"0":"..."}}' })
```

**CRITICAL: Do NOT pass `profile_json`. Use the `profile_id` from the analyze response.** The full profile lives on the server. If you reconstruct it manually you will drop required fields and the visualization will be broken (empty drilldowns, missing hero art, no Your Story). The server will reject malformed reconstructions with a validation error.

`profile_json` exists only as a legacy escape hatch. Always prefer `profile_id`.

This renders the visualization on the server and returns a **URL**. Share the URL with the user — they can open it in their browser to see their full skill tree with archetype card, radar chart, and narrative deep dive.

## Step 7: Present results conversationally

**Do NOT reveal the archetype name, axis scores, or card details.** The visualization has a dramatic reveal — let it do its job.

Present three things, in this order (all sourced from the analyze response):

1. **Link** — "Your skill tree is ready: [URL]"
2. **Credibility + standout** — "Based on N sessions (`total_sessions`) across [project names from `phases[].projects`] — here's what stood out: [one above-baseline behavior from `notable_behaviors`, with context from its evidence quote]."
3. **Growth quest** — one specific action for their next session, from `archetype.growth_quest`.

Example:
> Your skill tree is ready: https://skill-tree-ai.fly.dev/report/abc123
>
> Based on 32 sessions across konid, kopi-promotions, and skill-tree — here's what stood out: you flag context gaps at 2x the population rate. You kept telling Claude what it was missing.
>
> Growth quest: Next session, try opening with "My goal is [X] because [Y]."

Keep it to 3-4 sentences total. The visualization has the full story.

## Archetype Reference

| Archetype | Pattern |
|-----------|---------|
| The Polymath | Shapes AND evaluates (rarest) |
| The Conductor | Plans AND shapes |
| The Architect | Plans AND evaluates |
| The Forgemaster | Shapes output precisely |
| The Illuminator | Questions and probes |
| The Compass | Sets clear direction |
| The Catalyst | Pure momentum |

## The 11 Behaviors (from AI Fluency Index)

| Axis | Behavior | Population Avg |
|------|----------|---------------|
| Description | Provides examples | 41% |
| Description | Specifies format | 30% |
| Description | Expresses tone preferences | 23% |
| Description | Defines audience | 18% |
| Discernment | Flags context gaps | 20% |
| Discernment | Questions Claude's logic | 16% |
| Discernment | Verifies facts | 9% |
| Delegation | Clarifies goals upfront | 51% |
| Delegation | Discusses approach first | 10% |
| Delegation | Sets interaction style | 30% |
| (Gateway) | Iterates on outputs | 86% |

Baselines from [Anthropic's AI Fluency Index](https://www.anthropic.com/research/AI-fluency-index) (Feb 2026, N=9,830).
