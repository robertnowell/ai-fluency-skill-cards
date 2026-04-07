---
name: skill-tree
description: Analyze your Claude collaboration style and generate a skill tree visualization with character archetype card. Use when the user says "skill tree", "show my skills", "analyze my style", "check my ai fluency", or wants to see their AI fluency profile.
---

# Skill Tree

Generate a personalized AI fluency profile by analyzing the user's conversation history **on the current surface**.

**CRITICAL: You MUST use the `analyze` MCP tool for classification. NEVER attempt to classify behaviors yourself — your classifications will be inconsistent and unvalidated. The remote server uses a calibrated classifier with cached results for consistency across runs.**

## Step 0: Detect surface and set up

### If running in Cowork (cloud sandbox):

**0a. Enable network egress** — The analyzer runs on a remote server. If you get a network error when calling the `analyze` tool, tell the user:

> "The Skill Tree analyzer needs network access. Please enable it:
> **Settings → Code execution and file creation → Allow network egress → toggle ON**
> Then say 'skill tree' again."

**Do NOT proceed without network access. Do NOT classify manually as a fallback.**

**0b. Mount Cowork sessions only:**

```
request_cowork_directory("~/Library/Application Support/Claude/local-agent-mode-sessions")
```

Only mount the Cowork directory — do NOT mount `~/.claude/projects`. Each surface analyzes its own sessions.

### If running in Claude Code:

No setup needed. You'll read from `~/.claude/projects/` only. Do NOT read from `~/Library/Application Support/Claude/`.

## Steps 1–2: Find and extract sessions

Run the commands below **exactly as written**. Do NOT write your own extraction script.

### Cowork:

```bash
find ~/Library/Application\ Support/Claude/local-agent-mode-sessions \
  -name "*.jsonl" -size +1k ! -name "audit.jsonl" ! -path "*/subagents/*" \
  2>/dev/null > /tmp/session_files.txt
```

Then extract:
```bash
cat /tmp/session_files.txt | python3 -c '
import json, sys, os
SKIP = ["\u23fa","\u23bf","ctrl+o to expand","\u273b Brewed","\u273b Baked","\u273b Saut\u00e9ed","\u273b Cooked","\u273b Cogitated","\u273b Churned","<local-command","<command-name>","<system-reminder>"]
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
        sessions.append({"id": sid, "timestamp": ts or "", "project": "cowork", "messages": msgs})
sessions.sort(key=lambda s: s.get("timestamp", ""))
print(json.dumps(sessions))
' > /tmp/sessions.json
```

### Claude Code:

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

## Step 4: Save profile locally

After receiving the profile JSON from the `analyze` tool, write two files:

**4a. Save the growth quest** (enables the SessionStart hook to nudge you in future sessions):
```bash
mkdir -p ~/.skill-tree
```
Then write the `growth_quest` field from `profile.archetype` to `~/.skill-tree/growth-quest.txt`.

**4b. Save the profile** (for the visualization):
Write the full profile JSON to `~/.skill-tree/profile.json`.

## Step 5: Synthesize narrative (YOU do this — don't skip it)

Read the evidence quotes from the analyze response. Write a narrative JSON object that interprets the user's journey:

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

The `phaseInsights` and `phaseNames` keys ("0", "1", etc.) map to the phases in the profile's `timeline.phases` array. If there are no phases, write insights based on the evidence grouped by axis.

**Phase names MUST describe what the user was building, not behavioral abstractions.** "Building the Classifier" is good. "Delegation-dominant phase" is terrible. Look at the evidence quotes and project names to understand what was happening during each phase, then name it after the work.

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

Call the `visualize` MCP tool with the profile JSON from step 3 and your narrative JSON from step 5:

```
visualize({ profile_json: '<the profile JSON string>', narrative_json: '{"thesis":"...","phaseNames":{"0":"..."},"phaseInsights":{"0":"..."}}' })
```

This renders the visualization on the server and returns a **URL**. Share the URL with the user — they can open it in their browser to see their full skill tree with archetype card, radar chart, and narrative deep dive.

## Step 7: Present results conversationally

**Do NOT reveal the archetype name, axis scores, or card details.** The visualization has a dramatic reveal — let it do its job.

Present three things, in this order:

1. **Link** — "Your skill tree is ready: [URL]"
2. **Credibility + standout** — "Based on N sessions across [project names] — here's what stood out: [one specific behavior above baseline, with context from their actual work]."
3. **Growth quest** — one specific action for their next session, from `profile.archetype.growth_quest`.

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
