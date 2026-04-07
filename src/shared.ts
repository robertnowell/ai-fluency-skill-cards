export const MCP_INSTRUCTIONS = `Skill Tree shows how you collaborate with Claude — based on 11 observable behaviors from Anthropic's AI Fluency Index.

It classifies your conversation history across three axes (Description, Discernment, Delegation), assigns a character archetype, and suggests one concrete growth action.

## Tools

- **analyze**: Classifies behaviors across sessions. Pass extracted session data as sessions_json. Returns a quantitative profile (archetype, behavior rates, axes) plus evidence quotes. Run this first.
- **visualize**: Renders the skill tree visualization on the server and returns a URL. Pass profile_json from analyze and your narrative_json.
- **archetypes**: Lists all 7 archetypes with names and taglines.

## Flow

The skill instructions (SKILL.md) define the full step-by-step flow. In brief:
1. Extract sessions and call \`analyze\`
2. Save profile and growth quest locally
3. Synthesize a narrative JSON
4. Call \`visualize\` with profile + narrative → get a URL to share

The narrative step is critical — it transforms raw behavior rates into an interpretive story. See SKILL.md for detailed guidance on what makes a good narrative.
`;
