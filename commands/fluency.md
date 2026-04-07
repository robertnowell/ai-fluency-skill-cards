---
description: Analyze your AI collaboration style and generate a Skill Tree visualization
---

Run the Skill Tree analysis on the user's conversation history.

Use the `skill-tree` skill (from `skills/skill-tree/SKILL.md`) to drive the full flow:

1. Detect the surface (Claude Code or Cowork) and set up accordingly
2. Find session files and extract user messages
3. Call the `analyze` MCP tool from the `skill-tree` server to classify behaviors and build the profile
4. Read the evidence quotes and write a personalized narrative synthesis
5. Call `visualize` to render the report and return a hosted URL

Follow the SKILL.md instructions exactly — do not classify behaviors yourself, do not skip steps, and do not invent your own extraction logic. The skill exists precisely to enforce a deterministic, validated flow.
