export const MCP_INSTRUCTIONS = `Skill Tree shows how you collaborate with Claude — based on 11 observable behaviors from Anthropic's AI Fluency Index.

It classifies your conversation history across three axes (Description, Discernment, Delegation), assigns a character archetype, and suggests one concrete growth action.

## Tools

- **analyze**: Classifies behaviors across sessions. Pass extracted session data as sessions_json. Returns a narrative-writing summary that includes a \`profile_id\`, the archetype, notable behaviors with evidence quotes, and phase context. The full profile is stashed server-side; the response is intentionally compact (~2KB). Run this first.
- **visualize**: Renders the skill tree visualization on the server and returns a URL. Pass the \`profile_id\` from analyze plus your \`narrative_json\`. **Do NOT reconstruct or pass \`profile_json\`** — the full profile lives on the server, and reconstructing it manually drops fields the visualization needs and produces a broken report.
- **archetypes**: Lists all 7 archetypes with names and taglines.

## Flow

The skill instructions (SKILL.md) define the full step-by-step flow. In brief:
1. Extract sessions and call \`analyze\` → capture the \`profile_id\` from the response
2. Save the growth quest locally
3. Read the \`notable_behaviors\` evidence quotes and \`phases\` from the analyze response
4. Synthesize a narrative JSON (thesis + phaseNames + phaseInsights)
5. Call \`visualize\` with the \`profile_id\` and your narrative → get a URL to share

The narrative step is critical — it transforms raw behavior rates into an interpretive story. See SKILL.md for detailed guidance on what makes a good narrative.
`;
