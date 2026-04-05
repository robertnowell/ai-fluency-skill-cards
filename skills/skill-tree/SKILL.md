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

## Step 1: Find session files

**Cowork only:**
```bash
find ~/Library/Application\ Support/Claude/local-agent-mode-sessions -name "*.jsonl" -size +1k 2>/dev/null | head -30
```

**Claude Code only** (use Glob if available, otherwise find):
```bash
find ~/.claude/projects -name "*.jsonl" -size +1k ! -path "*/subagents/*" 2>/dev/null | head -30
```

Do NOT mix sessions from both sources.

## Step 2: Extract user messages, timestamps, and project names

For each JSONL file, read it and extract user messages. Each line is JSON. Keep lines where:
- `type` is `"user"`
- `message.content` is a string (not an array/list)
- Content does NOT contain paste markers: `⏺`, `⎿`, `ctrl+o to expand`, `✻ Brewed`, `✻ Baked`
- Content is longer than 10 characters

Truncate each message to 2000 characters. Group by file (filename without `.jsonl` = session ID). Aim for 15-30 sessions.

**Extract the timestamp** from the first user message in each JSONL file (the `timestamp` field on the JSON line). This is CRITICAL for chronological analysis — without it, the timeline and phases are meaningless.

**Extract the project name** from the directory path. Under `~/.claude/projects/`, each subdirectory name is a munged path like `-Users-you-Projects-my-app`. Extract the meaningful part (typically the last 1-3 segments after stripping the home directory prefix). For Cowork sessions, use `"cowork"` as the project name.

## Step 3: Call the analyze tool

Format extracted sessions as a JSON string and call the `analyze` MCP tool:

```
analyze({ sessions_json: '[{"id":"uuid1","timestamp":"2026-04-02T10:00:00Z","project":"my-app","messages":["msg1","msg2"]},{"id":"uuid2","timestamp":"2026-04-03T14:00:00Z","project":"my-app","messages":["msg3"]}]' })
```

The parameter is a **JSON string** containing an array of `{id, timestamp, project, messages}` objects. The `timestamp` is the ISO timestamp from the first user message in the JSONL file. The `project` is the cleaned directory name.

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

Call the `visualize` MCP tool with **both** the profile and your narrative:

```
visualize({ profile_json: '<the profile JSON>', narrative_json: '{"thesis":"...","phaseNames":{"0":"Research & Architecture","1":"Building the Classifier"},"phaseInsights":{"0":"...","1":"..."}}' })
```

This returns self-contained HTML. Save it to `~/.skill-tree/report.html` and open it in the browser:
```bash
open ~/.skill-tree/report.html
```

## Step 7: Present results conversationally

Present the key findings:

1. **Surface context** — "Based on your [Claude Code / Cowork] sessions:"
2. **Archetype** — name and tagline
3. **Superpower** — their distinctive strength
4. **Axis scores** — Description %, Discernment %, Delegation % (vs population averages of 28%, 15%, 30%)
5. **Growth quest** — one specific action for their next session
6. **Growth edge** — the behavior with the largest gap vs population average

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
# Phase names: work-grounded, not abstract
