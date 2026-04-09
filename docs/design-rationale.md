# Skill Tree: Design Rationale

## The Problem

I chose Option A: helping users master Claude. The specific tension I wanted to address comes from the AI Fluency Index itself.

Most users iterate — 85.7% refine Claude's outputs across turns. But the behaviors that require critical evaluation are far less common: only 15.8% question Claude's reasoning, and 8.7% verify facts. The most provocative finding in the Index is what happens when Claude produces polished artifacts — specification behaviors increase while evaluation behaviors *decrease*. The more capable the tool becomes, the less scrutiny its outputs receive.

This is not an engagement problem. Users are engaged. It's a discernment problem — and it gets worse as the product improves.

## Core Insight

You can't improve what you can't see.

Most people have no visibility into how they collaborate with AI. They don't know whether they're iterating or evaluating, specifying or scrutinizing. They just work. Skill Tree makes these patterns visible, measurable, and actionable — not through instruction, but through reflection on real work the user has already done.

## What I Built

Skill Tree is a Claude Code plugin backed by a remote MCP server on Fly.io. It:

1. **Extracts** user messages from Claude Code and Cowork session files on disk
2. **Classifies** 11 behaviors from the 4D AI Fluency Framework against each session, using Claude Haiku as the classifier
3. **Compares** the user's rates against population baselines from 9,830 conversations
4. **Assigns** a character archetype deterministically — no LLM in the loop for the profile itself
5. **Renders** an HTML visualization that opens in the browser: archetype card, axis scores, behavior breakdown with evidence quotes
6. **Issues** a growth quest that injects into the next session via a SessionStart hook

The user says "analyze my ai fluency" and sees themselves reflected back — what they do, how it compares, where they might grow.

## Design Decisions

**Why a plugin, not a web app.** Skill Tree lives where the user already works. The visualization opens in the browser when you need it, but the growth quest persists in the session itself.

**Why behaviors, not engagement.** Skill Tree measures Description, Discernment, and Delegation behaviors — the dimensions from the 4D AI Fluency Framework. Not session count, not message volume, not time spent. The 11 behaviors are the atoms of AI fluency, and the three observable axes derive from the artifact effect data: Description behaviors increase with polished artifacts, Discernment behaviors decrease. This empirical grouping shapes the entire archetype system.

**Why archetypes, not scores.** "You're a Polymath" is more motivating than "your discernment score is 39%." Identity creates narrative. Each archetype has a superpower (what you already do well), a growth unlock (what adjacent capability would compound your strengths), and a target archetype (the next state in your progression). I borrowed from game design — the assignment explicitly invites this: "think how video games teach complex mechanics through gameplay itself." The seven archetypes form a progression graph, not a hierarchy. A Catalyst isn't worse than a Polymath — they have a different growth path.

**Why growth quests, not badges.** Quests are contextual and progressive. They inject into the next session via a SessionStart hook, so the nudge appears in context — not on a dashboard the user would need to remember to visit. One quest at a time, tied to the user's specific archetype and growth edge. The quest text is designed to be gentle ("if a natural opportunity arises during this session") rather than prescriptive.

**Why deterministic archetype assignment.** The profile builder (`profile.ts`) uses no LLM call. It computes axis averages, compares against baselines, and applies a priority ordering. This makes the system reproducible, inspectable, and cheap. The only LLM call is the classifier (Haiku), which runs once per session and is cached. On a re-run, only new sessions incur API cost.

**Why no "all three high" archetype.** The deterministic assignment stops at two-axis combinations. A user who scores high on Description, Discernment, and Delegation simultaneously is routed to Polymath — the third axis is never checked. This is intentional and empirical, not editorial-by-omission. The AI Fluency Index's artifact effect finding shows Description and Delegation behaviors both *increase* with polished outputs, while Discernment *decreases* — Description and Delegation co-move, Discernment moves opposite. The rare and valuable combination is therefore Description × Discernment together, because it's the one that breaks the anti-correlation. Polymath is the apex by virtue of resisting the artifact effect, not by treating Delegation as a lesser virtue. The 4D framework itself (Dakan & Feller) presents Delegation, Description, Discernment, and Diligence as four equal pillars; this taxonomy is an empirical overlay on the Index's behavioral data, not a hierarchy of skills. Polymath's growth path then points to Diligence — the off-screen 4th D — for the same reason: the in-chat dimensions are foundational, and mastery extends them into the world.

## The Design Process

**Research before building.** I read the assignment, the job description, the AI Fluency Index, the 4D Framework, the RCT paper on interaction modes and learning outcomes, and the education reports. I refused to start coding until I understood what "skill development" actually means in this team's vocabulary — and until I had a specific tension to address, not just a category to build in.

**De-risking before committing.** I wrote four standalone scripts to test each assumption before building the real system: Can I reliably extract clean user messages from JSONL files? Can a classifier detect these 11 behaviors accurately? Does the archetype mapping produce sensible results? What's the API cost at scale? All four passed. The classifier was accurate on 4/4 test sessions. The cost was $0.003 per session with Haiku. I committed to the architecture only after the evidence was in.

**Build, deploy, observe.** TypeScript MCP server deployed to Fly.io. Plugin metadata. HTML templates with hand-curated museum art for each archetype. And then I ran my own tool on my own sessions — and the concept locked in. The tool I was building to analyze AI collaboration was itself a product of AI collaboration. That self-referential quality isn't a gimmick; it's the proof of concept. The session transcripts *are* the design process evidence.

## Learning Principles

**Metacognition.** Skill Tree surfaces patterns the user can't see themselves. Metacognitive awareness — knowing how you think and work — is a prerequisite for deliberate practice. You can't intentionally develop discernment if you don't know your current discernment rate is 12% against a 15% baseline.

**Zone of Proximal Development.** Growth quests target the behavior just outside current practice. The Catalyst's quest isn't "do everything differently" — it's "try opening with one sentence: 'My goal is [X] because [Y].'" One step. The target archetype system (Catalyst -> Compass -> Conductor -> Polymath) creates a progression path, not a demand.

**Identity-based motivation.** Archetypes create narrative identity around collaboration style. "I'm a Forgemaster working on strategic setup" is more generative than "my Setup score is low." The archetype cards use museum art — hand-curated, not generated — because aesthetic quality signals that the system takes your identity seriously.

**Spaced reflection.** One quest per session, injected via hook. Not a one-time assessment, not a daily digest. The natural unit of AI collaboration is the session, so that's when the nudge appears. Each new analysis generates a fresh snapshot stored in `~/.skill-tree/history/`, creating the raw material for progression tracking over time.

**The Description-Discernment Loop.** Skill Tree itself embodies this loop. You describe your work to Claude across sessions. Skill Tree discerns your collaboration patterns from that work. You see the patterns, adjust your approach, and describe differently next session. The tool is the loop.

## How This Enhances Human Agency

Skill Tree doesn't automate collaboration or prescribe a "correct" style. It reveals *your* style and *your* growth edge. The user remains the agent — more aware, more intentional, more capable.

The artifact evaluation gap — discernment dropping when outputs look polished — is a threat to agency. It means the better Claude gets, the less users exercise the judgment that makes them effective collaborators. Skill Tree addresses this not by forcing users to evaluate, but by making their evaluation patterns visible and named. An Illuminator who sees "you question Claude's logic more than 84% of conversations" has a reason to keep doing it. A Catalyst who sees "you verify facts in 3% of sessions vs. a baseline of 8.7%" has a specific, actionable observation — not a lecture.

## Measuring Success

- **Primary:** Behavior diversity increase over time. Do users develop new collaboration behaviors after seeing their profile?
- **Secondary:** Axis score progression across snapshots. Does Discernment increase after growth quests targeting it?
- **Leading indicator:** Growth quest adoption. Do users engage with the quest prompt in their next session?
- **Anti-metric:** Not measuring session frequency, message volume, or time-on-site. These are engagement proxies, not capability indicators.

## Methodology note

Both the population baseline and the user's rate are **per-conversation prevalence**: (conversations exhibiting behavior) / (total conversations). The Anthropic AI Fluency Index reports "85.7% of conversations exhibited iteration and refinement," not "85.7% of users." Anthropic does not publish user-level prevalence and does not disclose unique-user counts, so the source data does not support claims of the form "X% of users do this."

Skill Tree's per-behavior rate in `src/core/profile.ts` is computed as `sessions_with_behavior / total_sessions`, which uses the same unit. The two are directly comparable.

This was caught and corrected on 2026-04-06 after a user flagged the misleading "X% of users do this" framing in the behavior tooltips. The numbers were always right; the words around them weren't. A small but real Diligence win — and a reminder that the units of analysis behind a number matter as much as the number itself.

A second comparability caveat: the formal unit is the same (binary present/absent per container), but Anthropic's "conversation" container is presumably a focused claude.ai thread, while Skill Tree's "session" container is a Claude Code session file that can run for hours and contain hundreds of user messages across multiple topics. Longer containers are mechanically more likely to contain any given behavior at least once, so Skill Tree's per-session rates are possibly *inflated* relative to Anthropic's per-conversation rates. The rates remain reliable for tracking change *within* a user over time, and for relative ordering across the 11 behaviors. They should be read with caution as cross-platform comparisons. Caught and named on 2026-04-08.

## Scaling

Skill Tree works today for any Claude Code or Cowork user — install the plugin. The remote classifier (Fly.io) scales horizontally; classification is stateless and uses Haiku. The 4D framework is platform-agnostic — the same 11 behaviors apply whether someone uses Code, Cowork, or claude.ai. Session metadata already exists server-side, so classification could run as a native feature without requiring local file access.

## What I'd Do Next

**Progression over time.** Currently single-snapshot. The history directory stores timestamped profiles, and I prototyped a progression visualization (`preview-progression.html`), but the real version needs thoughtful design — showing growth without implying a score to optimize.

**Classifier calibration.** I noticed variance between classification runs — a session might show 7/11 behaviors detected on one pass and 10/11 on another, depending on how the classifier interprets edge cases. Production would need confidence thresholds, ensemble passes, or a fine-tuned classifier to stabilize.

**Privacy.** Reading session files raises real privacy questions. The plugin accesses `~/.claude/projects/` and Cowork's local storage. Ideally this would all happen locally similar to the built-in /insights claude code command.

**Causality.** I can't prove that seeing your profile causes behavior change.
