export const MCP_INSTRUCTIONS = `Skill Tree shows how you collaborate with Claude — based on 11 observable behaviors from Anthropic's AI Fluency Index.

It classifies your conversation history across three axes (Specification, Evaluation, Setup), assigns a character archetype, and suggests one concrete growth action.

## Tools

- **analyze**: Classifies behaviors across sessions. Returns a quantitative profile (archetype, behavior rates, axes) plus evidence quotes. Run this first.
- **visualize**: Renders the HTML skill tree visualization. Accepts profile_json and optional narrative_json to enrich the "Your Story" deep dive section.
- **growth_quest**: Quick growth recommendation without the full analysis.

## Flow

The skill instructions (SKILL.md) define the full step-by-step flow. In brief:
1. Extract sessions and call \`analyze\`
2. Read the evidence, synthesize a narrative JSON (thesis + phase insights)
3. Call \`visualize\` with both profile and narrative

The narrative step is critical — it transforms raw behavior rates into an interpretive story. See SKILL.md for detailed guidance on what makes a good narrative.
`;
// Axis naming: Description, Discernment, Delegation (consistent throughout)
