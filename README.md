# AI Fluency Skill Cards

Your AI collaboration style — analyzed, visualized, and tracked.

Built on [Anthropic's AI Fluency Index](https://www.anthropic.com/research/AI-fluency-index) (Feb 2026), which identified 11 observable behaviors across 9,830 conversations that distinguish how people collaborate with AI. The 3-axis structure (Description, Discernment, Delegation) is drawn from [Dakan & Feller's 4D AI Fluency Framework](https://aifluencyframework.org/).

<p align="center">
  <a href="https://skill-tree-ai.fly.dev/grid">
    <img src="https://img.shields.io/badge/%E2%9C%A6%20View%20the%20Cards-cca67b?style=for-the-badge&labelColor=2a2520&color=cca67b" alt="View the Cards">
  </a>
</p>

## What it does

Analyzes your Claude conversation history, classifies 11 behaviors using a calibrated Haiku classifier, assigns one of 7 character archetypes, and renders an interactive visualization with a narrative deep dive that Claude writes about your journey.

Works in **Claude Code** and **Cowork**.

## Surface support

| Feature | Claude Code | Cowork |
|---|---|---|
| Analyze your sessions | ✓ | ✓ |
| Archetype + skill radar | ✓ | ✓ |
| Narrative deep dive | ✓ | ✓ |
| Hosted visualization URL | ✓ | ✓ |
| Growth quest in-session | ✓ | ✓ |
| Quest persists across sessions via SessionStart hook | ✓ | ✓ * |

**\*Cowork caveat:** Cowork sandboxes have an ephemeral `$HOME` per session, so the quest is also stored inside the persistent plugin directory (`$CLAUDE_PLUGIN_ROOT/.user-state/`). It survives across sessions but is wiped when the plugin is updated. Claude Code uses the more durable `~/.skill-tree/` path which survives plugin updates as well.

## Install

### Claude Code

```
/plugin marketplace add robertnowell/ai-fluency-skill-cards
/plugin install skill-tree-ai@robertnowell/ai-fluency-skill-cards
```

Then say "skill tree" or run `/skill-tree`.

### Cowork

1. Download `skill-tree-ai.zip` from [Releases](https://github.com/robertnowell/ai-fluency-skill-cards/releases)
2. In Cowork: **Customize → Upload a file** → select the ZIP
3. Enable network egress: **Settings → Code execution and file creation → Allow network egress**
4. Say "skill tree"

After you trigger it, Claude follows a 7-step orchestration: it finds your session files, extracts user messages, calls the remote classifier, writes a personalized narrative based on the evidence quotes, and then returns a hosted visualization URL. The whole flow takes ~30–60 seconds depending on how many sessions you have.

## How it works

1. Claude reads your session files and extracts user messages with timestamps
2. Sends them to a remote classifier (Claude Haiku on Fly.io)
3. Classifier detects 11 behaviors per session, builds a profile with archetype assignment
4. Claude reads the evidence and writes a narrative synthesis
5. Calls `visualize` to render the report; the server stores it on a Fly.io volume and returns a stable URL you can revisit or share

The visualization includes:
- **Tarot card** — your archetype with curated museum art
- **Skill radar** — 4-axis chart with drilldown
- **Your Story** — narrative deep dive with timeline phases
- **Growth quest** — one specific behavior to try next session

## The 7 Archetypes

| # | Archetype | Pattern |
|---|-----------|---------|
| I | The Catalyst | Pure momentum — iterates rapidly |
| II | The Compass | Sets clear direction with goals and approach |
| III | The Forgemaster | Shapes output precisely — format, tone, examples |
| IV | The Conductor | Directs AND specifies every detail |
| V | The Illuminator | Questions and probes Claude's reasoning |
| VI | The Architect | Plans deliberately AND evaluates rigorously |
| VII | The Polymath | Shapes AND evaluates — the rarest combination |

## The 11 Behaviors

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

## Architecture

```
Plugin (marketplace install)
├── .mcp.json             → Remote MCP server (Fly.io)
├── SKILL.md              → 7-step orchestration flow
├── hooks/                → SessionStart growth quest injection
│
Remote Server (skill-tree-ai.fly.dev)
├── analyze               → Haiku classifies → profile + timeline + evidence
├── visualize             → Renders HTML with narrative
├── archetypes            → Lists all 7
│
Source
├── src/                  → TypeScript MCP server (HTTP)
├── templates/            → Self-contained HTML visualizations
```

## Research basis

- [Anthropic AI Fluency Index](https://www.anthropic.com/research/AI-fluency-index) — behavioral taxonomy and population baselines
- [AI Fluency Framework](https://aifluencyframework.org/) — Dakan & Feller's 4D framework (Description, Discernment, Delegation, Diligence)

## License

MIT
