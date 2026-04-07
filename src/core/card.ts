/**
 * Single source of truth for tarot card rendering.
 *
 * Used by:
 *   - templates/skill-tree.html (via render.ts marker substitution)
 *   - scripts/generate-fixtures.mjs (the local fixtures grid)
 *   - src/remote.ts (the public /grid endpoint and /fixture/:key reports)
 *
 * Why this exists: card CSS and JS used to be duplicated in 3 places. When
 * the main template got an update, the others silently drifted. This module
 * is now the only place card markup, CSS, and rendering logic lives.
 *
 * The CSS is split into two pieces:
 *
 *   - CARD_FACE_CSS — the static card face. Used by ANY consumer that just
 *     needs to render a card, including the grid where there's no flip.
 *     Uses static layout (position:relative, width:390px, aspect-ratio:7/12).
 *
 *   - CARD_FLIP_CSS — the flip mechanics: .card-wrapper, .card-inner, the
 *     .card-back face-down state, hover effects, animations. Only the full
 *     report (skill-tree.html) needs this. It includes a `.card-wrapper .card`
 *     override that promotes the static .card to absolute-positioned and
 *     rotated 180° for the 3D flip.
 *
 * The renderMiniRadar and renderCard JS source strings are inlined into
 * skill-tree.html via marker substitution so the browser-side runtime uses
 * the same source as the build-time renderers below.
 */

import type { SkillProfile } from "./profile.js";

// ─── CSS: static card face (used by everyone) ─────────────────────────────

export const CARD_FACE_CSS = `
    /* ══════════════════════════════════════════
       TAROT CARD — face (static)
       ══════════════════════════════════════════ */

    .card {
      --ap: #9e9589; --aa: #d4cec6;
      width: 390px;
      aspect-ratio: 7 / 12;
      position: relative;
      border-radius: 13px;
      border: 4px solid #2a2520;
      overflow: hidden;
      background: #0e0d0b;
      box-shadow: 0 10px 42px rgba(0,0,0,0.5);
    }

    .card[data-archetype="catalyst"]    { --ap: #d4584a; --aa: #e8a090; }
    .card[data-archetype="compass"]     { --ap: #4a7ba3; --aa: #a3c4db; }
    .card[data-archetype="forgemaster"] { --ap: #b8860b; --aa: #e8d4a8; }
    .card[data-archetype="illuminator"] { --ap: #3d8a5a; --aa: #a8d4b8; }
    .card[data-archetype="architect"]   { --ap: #6a8094; --aa: #b0c0d0; }
    .card[data-archetype="conductor"]   { --ap: #8b3a62; --aa: #d4a0b8; }
    .card[data-archetype="polymath"]    { --ap: #a08040; --aa: #e8d8b0; }

    .card::before {
      content: '';
      position: absolute; inset: 8px; z-index: 1;
      border: 1px solid rgba(160,128,64,0.25);
      border-radius: 8px;
      pointer-events: none;
    }
    .card::after {
      content: '';
      position: absolute; inset: 13px; z-index: 1;
      border: 1px solid rgba(160,128,64,0.12);
      border-radius: 5px;
      pointer-events: none;
    }

    .corner {
      position: absolute; width: 26px; height: 26px; z-index: 2;
      border-color: rgba(160,128,64,0.3); border-style: solid; border-width: 0;
    }
    .corner.tl { top: 16px; left: 16px; border-top-width: 1px; border-left-width: 1px; }
    .corner.tr { top: 16px; right: 16px; border-top-width: 1px; border-right-width: 1px; }
    .corner.bl { bottom: 16px; left: 16px; border-bottom-width: 1px; border-left-width: 1px; }
    .corner.br { bottom: 16px; right: 16px; border-bottom-width: 1px; border-right-width: 1px; }

    .card-art { position: absolute; inset: 0; z-index: 0; }
    .card-art img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
    }

    .card-top {
      position: relative; z-index: 2; text-align: center;
      padding: 1.3rem 1.56rem 0.65rem;
      background: linear-gradient(180deg, rgba(14,13,11,0.9) 0%, transparent 100%);
    }
    .card-header-row {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 0.3rem;
    }
    .card-user-name {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 600; font-size: 0.65rem;
      letter-spacing: 0.3em; text-transform: uppercase;
      color: rgba(160,128,64,0.7);
    }
    .card-brand {
      font-family: 'Outfit', sans-serif;
      font-weight: 400; font-size: 0.55rem;
      letter-spacing: 0.15em; text-transform: uppercase;
      color: rgba(160,128,64,0.35);
    }
    .card-numeral {
      font-family: 'Cormorant Garamond', serif;
      font-size: 0.845rem; color: rgba(160,128,64,0.5); letter-spacing: 0.3em;
      margin-bottom: 0.26rem;
    }
    .card-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.82rem; font-weight: 600; color: #e8d8b0;
      letter-spacing: 0.04em; text-shadow: 0 2px 12px rgba(0,0,0,0.8); line-height: 1.1;
    }

    .card-bottom {
      position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
      text-align: center;
      padding: 2rem 1.5rem 1.3rem;
      background: linear-gradient(to top, rgba(14,13,11,0.98) 0%, rgba(14,13,11,0.92) 50%, rgba(14,13,11,0.5) 75%, transparent 100%);
    }
    .card-tagline {
      font-family: 'Outfit', sans-serif;
      font-size: 1rem; color: rgba(232,228,223,0.85); line-height: 1.5; margin-bottom: 0.3rem;
    }
    .card-sig {
      font-family: 'Cormorant Garamond', serif;
      font-size: 0.8rem; color: rgba(160,128,64,0.5); font-style: italic;
      letter-spacing: 0.03em;
    }
    .card-divider { width: 52px; height: 1px; background: rgba(160,128,64,0.3); margin: 0.52rem auto; }
    .card-axes { display: flex; justify-content: center; gap: 1.56rem; margin-bottom: 0.65rem; }
    .card-ax {
      font-family: 'Cormorant Garamond', serif;
      font-size: 0.845rem; color: rgba(160,128,64,0.6); letter-spacing: 0.05em;
    }
    .card-power {
      font-family: 'Cormorant Garamond', serif;
      font-size: 0.78rem; color: rgba(232,216,176,0.5); font-style: italic; line-height: 1.4;
    }
`;

// ─── CSS: flip mechanics (only used by skill-tree.html) ───────────────────

export const CARD_FLIP_CSS = `
    @keyframes fadeUp {
      to { opacity: 1; transform: translateY(0); }
    }

    /* ══════════════════════════════════════════
       TAROT CARD — flip mechanics
       ══════════════════════════════════════════ */

    .card-wrapper {
      max-width: 390px;
      margin: 0 auto 2rem;
      perspective: 1200px;
      cursor: pointer;
      opacity: 0;
      transform: translateY(12px);
      animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
    }
    .card-inner {
      position: relative;
      aspect-ratio: 7 / 12;
      transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
      transform-style: preserve-3d;
    }
    .card-wrapper.revealed .card-inner {
      transform: rotateY(180deg);
    }
    .card-wrapper.revealed {
      cursor: pointer;
    }

    /* Promote .card to flip context: absolute, inset:0, rotated 180° to start
       face-away from the viewer. The flip on .card-inner brings it forward.
       This override is more specific than the static .card rule in CARD_FACE_CSS. */
    .card-wrapper .card {
      position: absolute;
      inset: 0;
      width: auto;
      aspect-ratio: auto;
      backface-visibility: hidden;
      transform: rotateY(180deg);
    }

    /* Card back (face-down — visible first) */
    .card-back {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      border-radius: 13px;
      border: 4px solid #2a2520;
      background: radial-gradient(ellipse at 50% 40%, #1a1714 0%, #0e0d0b 70%);
      box-shadow: 0 10px 42px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      overflow: hidden;
    }
    /* Ornate double border */
    .card-back::before {
      content: '';
      position: absolute; inset: 8px;
      border: 1px solid rgba(160,128,64,0.3);
      border-radius: 8px;
      pointer-events: none;
    }
    .card-back::after {
      content: '';
      position: absolute; inset: 13px;
      border: 1px solid rgba(160,128,64,0.15);
      border-radius: 5px;
      pointer-events: none;
    }
    /* Corner ornaments on the back */
    .card-back .corner {
      position: absolute; width: 26px; height: 26px; z-index: 2;
      border-color: rgba(160,128,64,0.35); border-style: solid; border-width: 0;
    }
    .card-back .corner.tl { top: 16px; left: 16px; border-top-width: 1px; border-left-width: 1px; }
    .card-back .corner.tr { top: 16px; right: 16px; border-top-width: 1px; border-right-width: 1px; }
    .card-back .corner.bl { bottom: 16px; left: 16px; border-bottom-width: 1px; border-left-width: 1px; }
    .card-back .corner.br { bottom: 16px; right: 16px; border-bottom-width: 1px; border-right-width: 1px; }
    /* Decorative cross pattern */
    .card-back-pattern {
      position: absolute; inset: 30px;
      border: 1px solid rgba(160,128,64,0.06);
      border-radius: 3px;
      pointer-events: none;
    }
    .card-back-pattern::before {
      content: '';
      position: absolute;
      top: 50%; left: 20%; right: 20%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(160,128,64,0.1), transparent);
    }
    .card-back-pattern::after {
      content: '';
      position: absolute;
      left: 50%; top: 25%; bottom: 25%;
      width: 1px;
      background: linear-gradient(180deg, transparent, rgba(160,128,64,0.1), transparent);
    }
    .card-back-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: rgba(232,216,176,0.85);
      text-align: center;
      z-index: 2;
    }
    .card-back-glyph {
      width: 100px; height: 100px;
      color: rgba(160,128,64,0.5);
      margin-bottom: 2rem;
      filter: drop-shadow(0 0 20px rgba(160,128,64,0.15));
    }
    @keyframes glyphBreathe {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.03); }
    }
    .card-back-glyph {
      animation: glyphBreathe 4s ease-in-out infinite;
    }
    .card-back-cta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }
    .card-back-text {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #e8d8b0;
      text-shadow: 0 0 20px rgba(160,128,64,0.2);
    }
    .card-back-sessions {
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem;
      color: rgba(160,128,64,0.5);
    }
    .card-back-btn {
      margin-top: 2rem;
      padding: 0.65rem 2.2rem;
      border: 1px solid rgba(160,128,64,0.4);
      border-radius: 6px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem;
      font-weight: 400;
      letter-spacing: 0.1em;
      color: #e8d8b0;
      background: rgba(160,128,64,0.06);
      transition: all 0.3s;
    }
    .card-wrapper:hover .card-back-btn {
      background: rgba(160,128,64,0.14);
      border-color: rgba(160,128,64,0.55);
      box-shadow: 0 0 24px rgba(160,128,64,0.1);
    }
    .card-wrapper:hover .card-back {
      border-color: #3a3020;
    }
    .card-wrapper:hover .card-back-glyph {
      color: rgba(160,128,64,0.7);
    }
    .card-wrapper:hover .card-back-text {
      text-shadow: 0 0 30px rgba(160,128,64,0.3);
    }
`;

// ─── About overlay (modal) ────────────────────────────────────────────────
//
// CSS + HTML for the About modal. Duplicated literally from
// templates/skill-tree.html lines 783–918 — keep the two in sync if you
// edit either. Used by renderGridPage so /grid has its own self-contained
// About modal without needing a separate /about route.

export const ABOUT_OVERLAY_CSS = `
  .about-btn {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.65rem; letter-spacing: 0.25em; text-transform: uppercase;
    color: #8a8580; background: none; border: 1px solid #3a3530;
    padding: 0.3rem 0.8rem; border-radius: 3px; cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .about-btn:hover { color: #cca67b; border-color: #cca67b; }

  .about-overlay {
    display: none; position: fixed; inset: 0; z-index: 9000;
    background: rgba(10,9,8,0.92); overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .about-overlay.is-open { display: block; }
  .about-content {
    max-width: 640px; margin: 0 auto; padding: 3rem 2rem 4rem;
    font-family: 'Outfit', sans-serif; font-weight: 300;
    color: #e8e4df; line-height: 1.7;
  }
  .about-content h1 {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.8rem; color: #cca67b; margin-bottom: 0.5rem;
    text-align: left;
  }
  .about-content h2 {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.2rem; color: #cca67b; margin-top: 2rem; margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
  }
  .about-content p { margin-bottom: 1rem; font-size: 0.88rem; color: #c8c4bf; }
  .about-content strong { color: #e8e4df; font-weight: 500; }
  .about-content ul { margin: 0.5rem 0 1rem 1.2rem; font-size: 0.88rem; color: #c8c4bf; }
  .about-content li { margin-bottom: 0.4rem; }
  .about-content a { color: #cca67b; text-decoration: underline; text-underline-offset: 2px; }
  .about-content code { font-family: 'SF Mono', Consolas, monospace; font-size: 0.82rem; color: #cca67b; }
  .about-close {
    position: fixed; top: 1.5rem; right: 1.5rem; z-index: 9001;
    font-family: 'Outfit', sans-serif; font-size: 0.75rem; letter-spacing: 0.15em;
    color: #8a8580; background: rgba(10,9,8,0.8); border: 1px solid #3a3530;
    padding: 0.4rem 1rem; border-radius: 3px; cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .about-close:hover { color: #cca67b; border-color: #cca67b; }
  .about-divider { border: none; border-top: 1px solid #2a2520; margin: 2rem 0; }
`;

export const ABOUT_OVERLAY_HTML = `
<div class="about-overlay" id="about-overlay">
  <button class="about-close" onclick="document.getElementById('about-overlay').classList.remove('is-open')">Close</button>
  <div class="about-content">
    <h1>Skill Tree</h1>
    <p>Your AI collaboration style &mdash; analyzed, visualized, and tracked.</p>
    <p>Built on <a href="https://www.anthropic.com/research/AI-fluency-index">Anthropic&rsquo;s AI Fluency Index</a> (Feb 2026), which identified 11 observable behaviors across 9,830 conversations that distinguish how people collaborate with AI. The 3-axis structure (Description, Discernment, Delegation) is drawn from <a href="https://aifluencyframework.org/">Dakan &amp; Feller&rsquo;s 4D AI Fluency Framework</a>.</p>

    <h2>The Problem</h2>
    <p>Most users iterate &mdash; 85.7% refine Claude&rsquo;s outputs across turns. But the behaviors that require critical evaluation are far less common: only 15.8% question Claude&rsquo;s reasoning, and 8.7% verify facts. The most provocative finding: when Claude produces polished artifacts, specification behaviors increase while evaluation behaviors <em>decrease</em>. The more capable the tool becomes, the less scrutiny its outputs receive.</p>
    <p>This is not an engagement problem. It&rsquo;s a discernment problem &mdash; and it gets worse as the product improves.</p>

    <h2>Core Insight</h2>
    <p><strong>You can&rsquo;t improve what you can&rsquo;t see.</strong></p>
    <p>Most people have no visibility into how they collaborate with AI. They don&rsquo;t know whether they&rsquo;re iterating or evaluating, specifying or scrutinizing. Skill Tree makes these patterns visible, measurable, and actionable &mdash; not through instruction, but through reflection on real work the user has already done.</p>

    <h2>How It Works</h2>
    <p>Skill Tree is a Claude Code plugin backed by a remote MCP server. It:</p>
    <ul>
      <li><strong>Extracts</strong> user messages from Claude Code and Cowork session files</li>
      <li><strong>Classifies</strong> 11 behaviors from the 4D AI Fluency Framework using Claude Haiku</li>
      <li><strong>Compares</strong> rates against population baselines from 9,830 conversations</li>
      <li><strong>Assigns</strong> a character archetype deterministically &mdash; no LLM in the loop</li>
      <li><strong>Renders</strong> this visualization with archetype card, skill radar, and narrative deep dive</li>
      <li><strong>Issues</strong> a growth quest that injects into the next session via a hook</li>
    </ul>

    <h2>Design Decisions</h2>
    <p><strong>Why a plugin, not a web app.</strong> Skill Tree lives where the user already works. The visualization opens in the browser when you need it, but the growth quest persists in the session itself.</p>
    <p><strong>Why behaviors, not engagement.</strong> Not session count, not message volume. The 11 behaviors are the atoms of AI fluency, and the three observable axes derive from the artifact effect data.</p>
    <p><strong>Why archetypes, not scores.</strong> &ldquo;You&rsquo;re a Polymath&rdquo; is more motivating than &ldquo;your discernment score is 39%.&rdquo; Identity creates narrative. These are styles of working &mdash; any one might suit you best. Some are more unique than others, and some resist the artifact effect. There is a path through them, but you don&rsquo;t have to climb it: many people stay at one stage and do excellent work there.</p>
    <p><strong>Why growth quests, not badges.</strong> One quest at a time, tied to the user&rsquo;s archetype and growth edge. Gentle (&ldquo;if a natural opportunity arises&rdquo;) rather than prescriptive.</p>
    <p><strong>Why deterministic assignment.</strong> The profile builder uses no LLM call. Axis averages, baseline comparison, priority ordering. Reproducible, inspectable, cheap.</p>

    <h2>Learning Principles</h2>
    <p><strong>Metacognition.</strong> Surfaces patterns the user can&rsquo;t see themselves &mdash; a prerequisite for deliberate practice. You can&rsquo;t intentionally develop discernment if you don&rsquo;t know your current discernment rate is 12% against a 15% baseline.</p>
    <p><strong>Zone of Proximal Development.</strong> Growth quests target the behavior just outside current practice. The Catalyst&rsquo;s quest isn&rsquo;t &ldquo;do everything differently&rdquo; &mdash; it&rsquo;s &ldquo;try opening with one sentence.&rdquo; One step. The target archetype system (Catalyst &rarr; Compass &rarr; Conductor &rarr; Polymath) creates a progression path, not a demand.</p>
    <p><strong>Identity-based motivation.</strong> Archetypes create narrative identity around collaboration style. &ldquo;I&rsquo;m a Forgemaster working on strategic setup&rdquo; is more generative than &ldquo;my Setup score is low.&rdquo; The cards use museum art &mdash; hand-curated, not generated &mdash; because aesthetic quality signals the system takes your identity seriously.</p>
    <p><strong>Spaced reflection.</strong> One quest per session, injected via hook. Not a one-time assessment, not a daily digest. The natural unit of AI collaboration is the session, so that&rsquo;s when the nudge appears.</p>

    <h2>The 11 Behaviors</h2>
    <ul>
      <li><strong>Description axis:</strong> Provides examples (41%), Specifies format (30%), Expresses tone (23%), Defines audience (18%)</li>
      <li><strong>Discernment axis:</strong> Flags context gaps (20%), Questions reasoning (16%), Verifies facts (9%)</li>
      <li><strong>Delegation axis:</strong> Clarifies goals (51%), Discusses approach (10%), Sets interaction style (30%)</li>
      <li><strong>Diligence axis:</strong> Transparent about AI&rsquo;s role, Considers sharing consequences, Deploys AI responsibly &mdash; not observable in chat</li>
      <li><strong>Gateway:</strong> Iterates on outputs (86%)</li>
    </ul>
    <p style="font-size:0.78rem;color:#8a8580;">Baselines from <a href="https://www.anthropic.com/research/AI-fluency-index">Anthropic&rsquo;s AI Fluency Index</a> (Feb 2026, N=9,830).</p>

    <hr class="about-divider">

    <h2>Research Basis</h2>
    <p><a href="https://www.anthropic.com/research/AI-fluency-index">Anthropic AI Fluency Index</a> &mdash; behavioral taxonomy and population baselines</p>
    <p><a href="https://aifluencyframework.org/">4D AI Fluency Framework</a> &mdash; Dakan &amp; Feller&rsquo;s framework (Description, Discernment, Delegation, Diligence)</p>

    <hr class="about-divider">
    <p style="font-size:0.78rem;color:#6a6560;">Built by Robert Nowell &middot; <a href="https://github.com/robertnowell/ai-fluency-skill-cards" style="color:#6a6560;">Source</a></p>
  </div>
</div>
`;

// ─── Constants used by both browser and Node renderers ────────────────────

// JS object literal source string, embedded into RENDER_CARD_JS for the
// browser-side runtime. Keep in sync with the AXIS_SIGS map below.
const AXIS_SIGS_OBJ_LITERAL = `{
  catalyst: 'No axes above average',
  compass: 'High Delegation',
  forgemaster: 'High Description',
  illuminator: 'High Discernment',
  conductor: 'High Description + Delegation',
  architect: 'High Discernment + Delegation',
  polymath: 'High Description + Discernment',
}`;

// Same constants as JS objects for the Node-side renderers below.
const NUMERALS: Record<string, string> = {
  catalyst: "I", compass: "II", forgemaster: "III",
  conductor: "IV", illuminator: "V", architect: "VI", polymath: "VII",
};
const AXIS_SIGS: Record<string, string> = {
  catalyst: "No axes above average",
  compass: "High Delegation",
  forgemaster: "High Description",
  illuminator: "High Discernment",
  conductor: "High Description + Delegation",
  architect: "High Discernment + Delegation",
  polymath: "High Description + Discernment",
};

// ─── Progression graph layout ─────────────────────────────────────────────
// Mirrors GRAPH_NODES / GRAPH_EDGES in templates/skill-tree.html (~line 1546).
// Kept in sync manually — both are stable and rarely change.

const GRAPH_NODES: Record<string, { x: number; y: number }> = {
  catalyst:    { x: 100, y: 470 },
  compass:     { x: 145, y: 335 },
  forgemaster: { x: 390, y: 335 },
  illuminator: { x: 500, y: 470 },
  conductor:   { x: 210, y: 195 },
  architect:   { x: 415, y: 195 },
  polymath:    { x: 300, y: 65 },
};

const GRAPH_EDGES: Array<[string, string]> = [
  ["catalyst", "compass"],
  ["compass", "conductor"],
  ["forgemaster", "conductor"],
  ["illuminator", "architect"],
  ["conductor", "polymath"],
  ["architect", "polymath"],
];

const GRAPH_R = 36;

function getGraphPath(fromKey: string, toKey: string): string {
  const a = GRAPH_NODES[fromKey];
  const b = GRAPH_NODES[toKey];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const sx = a.x + (dx / dist) * GRAPH_R;
  const sy = a.y + (dy / dist) * GRAPH_R;
  const ex = b.x - (dx / dist) * (GRAPH_R + 6);
  const ey = b.y - (dy / dist) * (GRAPH_R + 6);
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2 - Math.abs(dx) * 0.08;
  return `M${sx},${sy} Q${mx},${my} ${ex},${ey}`;
}

// ─── Browser-side JS source (injected into skill-tree.html) ───────────────

export const RENDER_MINI_RADAR_JS = `
    // ── Mini radar for tarot card ─────────────────────────────────
    function renderMiniRadar(descPct, discPct, delegPct, color) {
      const cx = 70, cy = 70, r = 48;
      function ptAt(angleDeg, pct) {
        const rad = (angleDeg - 90) * Math.PI / 180;
        const v = r * Math.max(pct / 100, 0.08);
        return { x: cx + v * Math.cos(rad), y: cy + v * Math.sin(rad) };
      }
      const pts = [ptAt(0, descPct), ptAt(90, discPct), ptAt(180, 0), ptAt(270, delegPct)];
      const userPoly = pts.map(p => \`\${p.x},\${p.y}\`).join(' ');
      const grid = [ptAt(0,100), ptAt(90,100), ptAt(180,100), ptAt(270,100)];
      const gridPoly = grid.map(p => \`\${p.x},\${p.y}\`).join(' ');

      const labels = [
        { angle: 0, label: 'Description', pct: descPct, anchor: 'middle', dx: 0, dy: -6 },
        { angle: 90, label: 'Discernment', pct: discPct, anchor: 'start', dx: 4, dy: 4 },
        { angle: 270, label: 'Delegation', pct: delegPct, anchor: 'end', dx: -4, dy: 4 },
      ];
      let labelsSvg = '';
      for (const l of labels) {
        const lp = ptAt(l.angle, 125);
        labelsSvg += \`<text x="\${lp.x + l.dx}" y="\${lp.y + l.dy}" text-anchor="\${l.anchor}" font-family="'Cormorant Garamond', serif" font-size="11" fill="rgba(232,216,176,0.7)" font-weight="600">\${l.label} \${l.pct}%</text>\`;
      }

      return \`<div style="display:flex;justify-content:center;margin:0.4rem 0;position:relative">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(14,13,11,0.7) 0%,rgba(14,13,11,0.4) 50%,transparent 75%);pointer-events:none"></div>
        <svg viewBox="0 0 140 140" width="140" height="140" style="overflow:visible;position:relative">
          <polygon points="\${gridPoly}" fill="none" stroke="rgba(232,216,176,0.12)" stroke-width="0.75"/>
          <line x1="\${cx}" y1="\${cy-r}" x2="\${cx}" y2="\${cy+r}" stroke="rgba(232,216,176,0.08)" stroke-width="0.5"/>
          <line x1="\${cx-r}" y1="\${cy}" x2="\${cx+r}" y2="\${cy}" stroke="rgba(232,216,176,0.08)" stroke-width="0.5"/>
          <polygon points="\${userPoly}" fill="\${color}" fill-opacity="0.35" stroke="rgba(232,216,176,0.7)" stroke-width="1.5"/>
          <circle cx="\${pts[0].x}" cy="\${pts[0].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
          <circle cx="\${pts[1].x}" cy="\${pts[1].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
          <circle cx="\${pts[3].x}" cy="\${pts[3].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
          \${labelsSvg}
        </svg>
      </div>\`;
    }
`;

export const RENDER_CARD_JS = `
    const AXIS_SIGS = ${AXIS_SIGS_OBJ_LITERAL};

    // ── 1. Tarot Card ───────────────────────────────────────────────
    // NOTE: Relies on top-level NUMERALS constant declared in skill-tree.html
    //       (it's also used by pcp-numeral in the progression graph).
    function renderCard(p) {
      const a = p.archetype || {};
      const el = document.getElementById('character-card');
      const key = a.key || 'catalyst';
      el.setAttribute('data-archetype', key);

      const url = a.hero_art?.url || '';
      const pos = a.hero_art?.position || 'center center';
      const descPct = Math.round((a.axis_scores?.description || 0) * 100);
      const discPct = Math.round((a.axis_scores?.discernment || 0) * 100);
      const delegPct = Math.round((a.axis_scores?.delegation || 0) * 100);
      const sig = AXIS_SIGS[key] || '';

      el.innerHTML = \`
        <div class="corner tl"></div><div class="corner tr"></div>
        <div class="corner bl"></div><div class="corner br"></div>
        <div class="card-art">\${url ? \`<img src="\${url}" alt="" style="object-position:\${pos}">\` : ''}</div>
        <div class="card-top">
          <div class="card-header-row">
            <div class="card-user-name">\${p.user_name || ''}</div>
            <div class="card-brand">AI Fluency Skills</div>
          </div>
          <div class="card-numeral">\${NUMERALS[key] || ''}</div>
          <div class="card-name">\${a.name || 'Unknown'}</div>
        </div>
        <div class="card-bottom">
          \${renderMiniRadar(descPct, discPct, delegPct, a.color || '#a08040')}
          <div class="card-divider"></div>
          <div class="card-tagline">\${(() => { const fn = (p.user_name || '').split(' ')[0]; return (a.headline || a.tagline || '').replace('{name}', fn || 'You'); })()}</div>
          <div class="card-sig">\${sig}</div>
        </div>
      \`;
    }
`;

// ─── Node-side renderers (used by fixtures script + remote /grid) ─────────

export function renderMiniRadarHtml(
  descPct: number,
  discPct: number,
  delegPct: number,
  color: string,
): string {
  const cx = 70, cy = 70, r = 48;
  const ptAt = (angleDeg: number, pct: number) => {
    const rad = (angleDeg - 90) * Math.PI / 180;
    const v = r * Math.max(pct / 100, 0.08);
    return { x: cx + v * Math.cos(rad), y: cy + v * Math.sin(rad) };
  };
  const pts = [ptAt(0, descPct), ptAt(90, discPct), ptAt(180, 0), ptAt(270, delegPct)];
  const userPoly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const grid = [ptAt(0, 100), ptAt(90, 100), ptAt(180, 100), ptAt(270, 100)];
  const gridPoly = grid.map((p) => `${p.x},${p.y}`).join(" ");
  const labels = [
    { angle: 0, label: "Description", pct: descPct, anchor: "middle", dx: 0, dy: -6 },
    { angle: 90, label: "Discernment", pct: discPct, anchor: "start", dx: 4, dy: 4 },
    { angle: 270, label: "Delegation", pct: delegPct, anchor: "end", dx: -4, dy: 4 },
  ];
  const labelsSvg = labels
    .map((l) => {
      const lp = ptAt(l.angle, 125);
      return `<text x="${lp.x + l.dx}" y="${lp.y + l.dy}" text-anchor="${l.anchor}" font-family="'Cormorant Garamond', serif" font-size="11" fill="rgba(232,216,176,0.7)" font-weight="600">${l.label} ${l.pct}%</text>`;
    })
    .join("");
  return `<div style="display:flex;justify-content:center;margin:0.4rem 0;position:relative">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(14,13,11,0.7) 0%,rgba(14,13,11,0.4) 50%,transparent 75%);pointer-events:none"></div>
    <svg viewBox="0 0 140 140" width="140" height="140" style="overflow:visible;position:relative">
      <polygon points="${gridPoly}" fill="none" stroke="rgba(232,216,176,0.12)" stroke-width="0.75"/>
      <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="rgba(232,216,176,0.08)" stroke-width="0.5"/>
      <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="rgba(232,216,176,0.08)" stroke-width="0.5"/>
      <polygon points="${userPoly}" fill="${color}" fill-opacity="0.35" stroke="rgba(232,216,176,0.7)" stroke-width="1.5"/>
      <circle cx="${pts[0].x}" cy="${pts[0].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
      <circle cx="${pts[1].x}" cy="${pts[1].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
      <circle cx="${pts[3].x}" cy="${pts[3].y}" r="2.5" fill="rgba(232,216,176,0.8)"/>
      ${labelsSvg}
    </svg>
  </div>`;
}

export interface RenderCardOptions {
  /** If set, override the user_name shown in the card top-left (e.g. "ARCHETYPE" for the grid). */
  userNameOverride?: string;
}

export interface GridCardEntry {
  /** Archetype key (used for the link href). */
  key: string;
  /** Profile to render in the card. */
  profile: SkillProfile;
}

export interface RenderGridPageOptions {
  /** Page title shown above the grid. */
  title?: string;
  /** Subtitle shown below the title. */
  subtitle?: string;
  /** href template — `{key}` is replaced with the archetype key for each card. */
  hrefTemplate?: string;
}

/**
 * Render an "Anatomy of an archetype" section using the Illuminator as the
 * worked example. Two columns on desktop: the actual archetype card on the
 * left, three signature behaviors with real evidence quotes on the right.
 *
 * Pulled live from `entries[]` rather than hard-coded so the bullets stay
 * in sync if the fixtures regenerate. Falls back to nothing if the
 * illuminator fixture isn't available.
 */
export function renderAnatomySection(
  entries: GridCardEntry[],
  opts: { hrefTemplate?: string } = {},
): string {
  const hrefTemplate = opts.hrefTemplate || "/fixture/{key}";
  const illuminator = entries.find((e) => e.key === "illuminator");
  if (!illuminator) return "";

  const arch = illuminator.profile.archetype;
  const behaviors = illuminator.profile.behaviors || {};

  // Three signature discernment behaviors, in narrative order. If any are
  // missing from the fixture (older snapshots), they're silently dropped.
  const featuredKeys = [
    "question_reasoning",
    "identify_context_gaps",
    "verify_facts",
  ];
  const featured = featuredKeys
    .map((k) => behaviors[k])
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (featured.length === 0) return "";

  const bullets = featured
    .map((b) => {
      const quote = b.evidence?.[0]?.text || "";
      return `<li>
        <div class="anatomy-label">${escapeAttr(b.label || "")}</div>
        ${quote ? `<div class="anatomy-quote">&ldquo;${escapeAttr(quote)}&rdquo;</div>` : ""}
      </li>`;
    })
    .join("");

  const cardHtml = renderCardHtml(illuminator.profile, {
    userNameOverride: "ARCHETYPE",
  });
  const href = hrefTemplate.replace("{key}", "illuminator");
  const color = arch.color || "#3d8a5a";

  return `
  <section class="anatomy-section">
    <a class="anatomy-card-wrapper" href="${href}" target="_blank" rel="noopener" title="${escapeAttr(arch.name || "")}">
      ${cardHtml}
    </a>
    <div class="anatomy-content">
      <div class="anatomy-eyebrow" style="color:${color}">&#9670; Example</div>
      <h2 class="anatomy-title">How an ${escapeAttr((arch.name || "").replace(/^The /, ""))} behaves</h2>
      <p class="anatomy-lead">Leads with discernment &mdash; questioning, gap&#8209;checking, fact&#8209;verifying. Three signature moves you&rsquo;ll see in their conversations:</p>
      <ul class="anatomy-list">${bullets}</ul>
    </div>
  </section>`;
}

/**
 * Render the progression-map section that appears below the card grid on
 * /grid. This is the "neutral" version of the personal-report progression
 * graph (templates/skill-tree.html ~line 1545) — same node positions and
 * edges, but with no current archetype to highlight, no path colouring,
 * and no comparison details. Hover shows a tooltip; click navigates to
 * the archetype's full report via `hrefTemplate`.
 */
export function renderProgressionMapSection(
  entries: GridCardEntry[],
  opts: { hrefTemplate?: string } = {},
): string {
  const hrefTemplate = opts.hrefTemplate || "/fixture/{key}";
  const byKey = new Map(entries.map((e) => [e.key, e.profile.archetype]));

  // Build edges first so they sit behind the nodes.
  const edgesSvg = GRAPH_EDGES.map(([from, to]) => {
    const d = getGraphPath(from, to);
    return `<path d="${d}" fill="none" stroke="#3a3530" stroke-width="1.5" stroke-opacity="0.6" marker-end="url(#prog-arr)"/>`;
  }).join("");

  // ClipPaths for each node's hero-art image.
  const clipsSvg = Object.entries(GRAPH_NODES)
    .map(
      ([key, pos]) =>
        `<clipPath id="prog-clip-${key}"><circle cx="${pos.x}" cy="${pos.y}" r="${GRAPH_R - 2}"/></clipPath>`,
    )
    .join("");

  const nodesSvg = Object.entries(GRAPH_NODES)
    .map(([key, pos]) => {
      const arch = byKey.get(key);
      if (!arch) return "";
      const color = arch.color || "#6b6560";
      const artUrl = arch.hero_art?.url || "";
      const name = escapeAttr(arch.name || key);
      // /grid has no user — rewrite "you/your" → "they/their" so the
      // descriptions read as third-person archetype profiles, not as if
      // we're addressing whoever is looking at the page.
      const tag = escapeAttr(toThirdPerson(arch.tagline || ""));
      const desc = escapeAttr(toThirdPerson(arch.description || ""));

      // Mini radar — same one used on the tarot card. Server-rendered here
      // so the hover handler just needs to inject the prebuilt SVG.
      const scores = arch.axis_scores || {};
      const descPct = Math.round((scores.description || 0) * 100);
      const discPct = Math.round((scores.discernment || 0) * 100);
      const delegPct = Math.round((scores.delegation || 0) * 100);
      const radarHtml = escapeAttr(
        renderMiniRadarHtml(descPct, discPct, delegPct, color),
      );

      const image = artUrl
        ? `<image href="${artUrl}" x="${pos.x - GRAPH_R}" y="${pos.y - GRAPH_R}" width="${GRAPH_R * 2}" height="${GRAPH_R * 2}" clip-path="url(#prog-clip-${key})" preserveAspectRatio="xMidYMid slice" opacity="0.55"/>`
        : `<circle cx="${pos.x}" cy="${pos.y}" r="${GRAPH_R}" fill="${color}" opacity="0.12"/>`;

      return `<g class="prog-node" data-key="${key}" data-cx="${pos.x}" data-cy="${pos.y}" data-name="${name}" data-tag="${tag}" data-desc="${desc}" data-color="${color}" data-radar="${radarHtml}">
        ${image}
        <circle cx="${pos.x}" cy="${pos.y}" r="${GRAPH_R}" fill="none" stroke="${color}" stroke-width="1.75" stroke-opacity="0.55"/>
        <text x="${pos.x}" y="${pos.y + GRAPH_R + 22}">${escapeAttr(arch.name || key)}</text>
      </g>`;
    })
    .join("");

  return `
  <section class="prog-section" data-href-template="${escapeAttr(hrefTemplate)}">
    <div class="prog-section-header">
      <div class="prog-eyebrow">&#9670; The Skill Tree</div>
      <h2 class="prog-title">How the archetypes connect</h2>
      <div class="prog-sub">Hover any node for details. Click to open the full report.</div>
    </div>
    <div class="prog-graph-container">
      <svg class="prog-graph-svg" viewBox="0 0 600 560" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="prog-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#4a4540"/>
          </marker>
          ${clipsSvg}
        </defs>
        ${edgesSvg}
        ${nodesSvg}
      </svg>
      <div class="prog-tooltip" id="prog-tooltip"></div>
    </div>
  </section>
  <script>
    (function() {
      var section = document.querySelector('.prog-section');
      if (!section) return;
      var hrefTpl = section.getAttribute('data-href-template') || '/fixture/{key}';
      var svg = section.querySelector('.prog-graph-svg');
      var tip = section.querySelector('#prog-tooltip');
      var nodes = section.querySelectorAll('.prog-node');
      var hoverTimer = null;
      nodes.forEach(function(node) {
        node.addEventListener('mouseenter', function() {
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function() {
            var name = node.getAttribute('data-name') || '';
            var tag = node.getAttribute('data-tag') || '';
            var desc = node.getAttribute('data-desc') || '';
            var color = node.getAttribute('data-color') || '#e8e4df';
            var radar = node.getAttribute('data-radar') || '';
            tip.innerHTML =
              '<div class="prog-tip-name" style="color:' + color + '">' + name + '</div>' +
              (tag ? '<div class="prog-tip-tag">' + tag + '</div>' : '') +
              (desc ? '<div class="prog-tip-desc">' + desc + '</div>' : '') +
              (radar ? '<div class="prog-tip-radar">' + radar + '</div>' : '');
            var svgRect = svg.getBoundingClientRect();
            var containerRect = svg.parentElement.getBoundingClientRect();
            var cx = parseFloat(node.getAttribute('data-cx'));
            var cy = parseFloat(node.getAttribute('data-cy'));
            var x = (cx / 600) * svgRect.width + (svgRect.left - containerRect.left);
            var y = (cy / 560) * svgRect.height + (svgRect.top - containerRect.top);
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
            tip.classList.add('visible');
          }, 350);
        });
        node.addEventListener('mouseleave', function() {
          if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
          tip.classList.remove('visible');
        });
        node.addEventListener('click', function() {
          var key = node.getAttribute('data-key');
          window.open(hrefTpl.replace('{key}', key), '_blank', 'noopener');
        });
      });
    })();
  </script>`;
}

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Rewrite second-person archetype copy ("You combine..." / "Your scrutiny...")
 * into third-person ("They combine..." / "Their scrutiny..."). Mirrors the
 * inline transformation in templates/skill-tree.html `renderTargetDetail`.
 */
function toThirdPerson(s: string): string {
  return String(s)
    .replace(/\bYou\b/g, "They")
    .replace(/\byou\b/g, "they")
    .replace(/\bYour\b/g, "Their")
    .replace(/\byour\b/g, "their");
}

/**
 * Render the full grid page HTML — used by both the local fixtures script
 * (writes to fixtures/index.html) and the remote /grid endpoint. Single
 * source of truth for the page-level grid layout, fonts, and footer.
 */
export function renderGridPage(
  entries: GridCardEntry[],
  opts: RenderGridPageOptions = {},
): string {
  const title = opts.title || "The Seven Archetypes";
  const subtitle = opts.subtitle || "Click any card to open the full report";
  const hrefTemplate = opts.hrefTemplate || "/fixture/{key}";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skill Tree \u2014 All 7 Archetypes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0908; color: #e8d8b0;
    font-family: 'Outfit', sans-serif; font-weight: 300;
    padding: 1.25rem 2rem 5rem;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto 2.5rem;
    padding: 0 0.25rem;
  }
  .header-link {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.7rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(160,128,64,0.55);
    text-decoration: none;
    transition: color 0.2s;
  }
  .header-link:hover { color: #cca67b; }
  .header-link .arrow {
    display: inline-block;
    margin-left: 0.4em;
    transform: translateY(-0.05em);
    font-size: 0.85em;
    opacity: 0.7;
  }
  h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem; font-weight: 700;
    margin-bottom: 0.4rem; text-align: center;
    color: #e8d8b0;
  }
  .sub {
    text-align: center; font-size: 0.85rem;
    color: #6b6560; margin-bottom: 3rem;
  }
${ABOUT_OVERLAY_CSS}
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    justify-content: center;
    align-items: flex-start;
    max-width: 760px;
    margin: 0 auto;
  }
  .card-link {
    width: 320px;
    height: 549px;
    position: relative;
    text-decoration: none;
    color: inherit;
    display: block;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card-link:hover {
    transform: translateY(-4px);
  }
  .card-link > .card {
    position: absolute;
    top: 0; left: 0;
    transform: scale(0.821);
    transform-origin: top left;
  }
  .card-link:hover > .card {
    box-shadow: 0 14px 56px rgba(0,0,0,0.65);
  }

  /* Shared card face — same source as templates/skill-tree.html */
${CARD_FACE_CSS}

  /* Anatomy section — single archetype example, two-column layout. */
  .anatomy-section {
    max-width: 900px;
    margin: 8rem auto 0;
    padding: 0 1rem;
    display: flex;
    gap: 3.5rem;
    align-items: center;
    justify-content: center;
  }
  .anatomy-card-wrapper {
    flex-shrink: 0;
    width: 320px;
    height: 549px;
    position: relative;
    text-decoration: none;
    color: inherit;
    display: block;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .anatomy-card-wrapper:hover { transform: translateY(-4px); }
  .anatomy-card-wrapper > .card {
    position: absolute;
    top: 0; left: 0;
    transform: scale(0.821);
    transform-origin: top left;
  }
  .anatomy-card-wrapper:hover > .card {
    box-shadow: 0 14px 56px rgba(0,0,0,0.65);
  }
  .anatomy-content {
    flex: 1;
    max-width: 380px;
  }
  .anatomy-eyebrow {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.75rem; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .anatomy-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.6rem; font-weight: 700;
    color: #e8d8b0;
    margin-bottom: 0.6rem;
    line-height: 1.15;
  }
  .anatomy-lead {
    font-size: 0.85rem; color: #8a8580;
    line-height: 1.6;
    margin-bottom: 1.4rem;
  }
  .anatomy-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .anatomy-list li {
    padding: 0.7rem 0;
    border-bottom: 1px solid #2a2826;
  }
  .anatomy-list li:last-child { border-bottom: none; padding-bottom: 0; }
  .anatomy-list li:first-child { padding-top: 0; }
  .anatomy-label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; font-weight: 600;
    color: #cca67b;
    margin-bottom: 0.3rem;
  }
  .anatomy-quote {
    font-size: 0.78rem; color: #908a84;
    font-style: italic; line-height: 1.55;
  }
  @media (max-width: 820px) {
    .anatomy-section {
      flex-direction: column;
      gap: 2rem;
    }
    .anatomy-content { max-width: 100%; }
  }

  /* CTA — closing inscription of the page. No box, no SaaS pill button.
     A typographic moment that matches the page's tarot/grimoire register:
     ornamental rules flanking a diamond, italic Cormorant title, restrained
     body, an underlined serif link styled as a signature, not a button. */
  .cta-section {
    max-width: 560px;
    margin: 9rem auto 2rem;
    padding: 0 1rem;
    text-align: center;
    position: relative;
  }
  .cta-rule {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.4rem;
    margin-bottom: 3rem;
  }
  .cta-rule::before,
  .cta-rule::after {
    content: '';
    flex: 1;
    height: 1px;
    max-width: 140px;
    background: linear-gradient(to right, transparent, rgba(160,128,64,0.35), transparent);
  }
  .cta-rule-mark {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1rem;
    color: rgba(160,128,64,0.7);
    letter-spacing: 0.4em;
    line-height: 1;
    transform: translateY(-0.05em);
  }
  .cta-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 3rem;
    font-weight: 600;
    font-style: italic;
    color: #e8d8b0;
    line-height: 1;
    letter-spacing: 0.005em;
    margin-bottom: 1.4rem;
  }
  .cta-title .amp {
    font-size: 0.9em;
    opacity: 0.65;
    margin: 0 0.05em;
  }
  .cta-sub {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.05rem;
    font-style: italic;
    color: #8a8580;
    line-height: 1.7;
    margin: 0 auto 2.6rem;
    max-width: 440px;
  }
  .cta-link {
    display: inline-block;
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: #cca67b;
    text-decoration: none;
    padding: 0.6rem 0 0.4rem;
    border-bottom: 1px solid rgba(204,166,123,0.35);
    transition: color 0.25s, border-color 0.25s, letter-spacing 0.25s;
  }
  .cta-link:hover {
    color: #e8d8b0;
    border-bottom-color: rgba(232,216,176,0.7);
    letter-spacing: 0.36em;
  }
  .cta-link .arrow {
    display: inline-block;
    margin-left: 0.5em;
    font-size: 0.92em;
    opacity: 0.75;
    transform: translateY(-0.05em);
  }
  @media (max-width: 600px) {
    .cta-title { font-size: 2.3rem; }
    .cta-sub { font-size: 0.95rem; }
    .cta-rule::before, .cta-rule::after { max-width: 80px; }
  }

  /* Progression map section (mirrors skill-tree.html .progression styling,
     but inline / unboxed to fit the grid page aesthetic). */
  .prog-section {
    max-width: 760px;
    margin: 8rem auto 0;
    padding: 0 1rem;
  }
  .prog-section-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .prog-eyebrow {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.75rem; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: rgba(160,128,64,0.6);
    margin-bottom: 0.5rem;
  }
  .prog-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.6rem; font-weight: 700;
    color: #e8d8b0;
    margin-bottom: 0.4rem;
  }
  .prog-sub {
    font-size: 0.8rem; color: #6b6560;
  }
  .prog-graph-container {
    position: relative;
    width: 100%;
  }
  .prog-graph-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .prog-node {
    cursor: pointer;
    transition: filter 0.2s;
  }
  .prog-node:hover { filter: brightness(1.2); }
  .prog-node text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    fill: #e8e4df;
    text-anchor: middle;
    font-weight: 600;
    pointer-events: none;
  }
  .prog-tooltip {
    display: none;
    position: absolute;
    width: 280px;
    background: #1e1d1b;
    border: 1px solid #3a3530;
    border-radius: 0.5rem;
    padding: 0.75rem;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 12px));
  }
  .prog-tooltip.visible { display: block; }
  .prog-tip-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1rem; font-weight: 600;
    margin-bottom: 0.2rem;
  }
  .prog-tip-tag {
    font-size: 0.7rem; color: #8a8580;
    font-style: italic; margin-bottom: 0.4rem;
  }
  .prog-tip-desc {
    font-size: 0.7rem; color: #908a84; line-height: 1.5;
    margin-bottom: 0.4rem;
  }
  .prog-tip-radar {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #2a2826;
  }
  .prog-tip-radar > div { margin: 0 !important; }
  /* Hide the radial-gradient backdrop baked into renderMiniRadarHtml —
     it exists to darken hero art behind the radar on the tarot card,
     and just looks like a stray dim circle inside the tooltip. */
  .prog-tip-radar > div > div:first-child { display: none !important; }

  .footer {
    text-align: center; margin-top: 3rem;
    font-size: 0.75rem; color: #4a4540;
  }
  .footer a { color: #4a4540; text-decoration: none; }
  .footer a:hover { color: #6b6560; }
</style>
</head>
<body>
  <header class="page-header">
    <a class="header-link" href="https://www.anthropic.com/research/AI-fluency-index" target="_blank" rel="noopener">Anthropic AI Fluency Index<span class="arrow">↗</span></a>
    <button class="about-btn" onclick="document.getElementById('about-overlay').classList.add('is-open')">About</button>
  </header>
  <h1>${title}</h1>
  <div class="sub">${subtitle}</div>
  <div class="grid">
    ${entries
      .map((e) => {
        const href = hrefTemplate.replace("{key}", e.key);
        const name = e.profile.archetype.name;
        return `
      <a class="card-link" href="${href}" title="${name}" target="_blank" rel="noopener">
        ${renderCardHtml(e.profile, { userNameOverride: "ARCHETYPE" })}
      </a>`;
      })
      .join("")}
  </div>
  ${renderProgressionMapSection(entries, { hrefTemplate })}
  ${renderAnatomySection(entries, { hrefTemplate })}
  <section class="cta-section">
    <div class="cta-rule"><span class="cta-rule-mark">&#9670;</span></div>
    <h2 class="cta-title">Find your card</h2>
    <p class="cta-sub">Skill Tree is a Claude Code plugin. Run it on your own conversations to discover which of these seven archetypes you collaborate as.</p>
    <a class="cta-link" href="https://github.com/robertnowell/ai-fluency-skill-cards" target="_blank" rel="noopener">Install via GitHub<span class="arrow">&#8599;</span></a>
  </section>
  ${ABOUT_OVERLAY_HTML}
</body>
</html>`;
}

export function renderCardHtml(profile: SkillProfile, opts: RenderCardOptions = {}): string {
  const a = profile.archetype || ({} as SkillProfile["archetype"]);
  const key = a.key || "catalyst";
  const url = a.hero_art?.url || "";
  const pos = a.hero_art?.position || "center center";
  const scores = a.axis_scores || {};
  const descPct = Math.round((scores.description || 0) * 100);
  const discPct = Math.round((scores.discernment || 0) * 100);
  const delegPct = Math.round((scores.delegation || 0) * 100);
  const sig = AXIS_SIGS[key] || "";
  const userName = opts.userNameOverride !== undefined ? opts.userNameOverride : (profile.user_name || "");
  // If userNameOverride is set we treat the card as an archetype preview
  // and skip the personalized "{name}, ..." headline substitution.
  const isArchetypePreview = opts.userNameOverride !== undefined;
  let tagline: string;
  if (isArchetypePreview) {
    tagline = (a.headline || a.tagline || "")
      .replace(/^\{name\},\s*/i, "")
      .replace(/^\w/, (c) => c.toUpperCase());
  } else {
    const firstName = (profile.user_name || "").split(" ")[0] || "You";
    tagline = (a.headline || a.tagline || "").replace("{name}", firstName);
  }

  return `<div class="card" data-archetype="${key}">
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <div class="card-art">${url ? `<img src="${url}" alt="" style="object-position:${pos}">` : ""}</div>
    <div class="card-top">
      <div class="card-header-row">
        <div class="card-user-name">${userName}</div>
        <div class="card-brand">AI Fluency Skills</div>
      </div>
      <div class="card-numeral">${NUMERALS[key] || ""}</div>
      <div class="card-name">${a.name || "Unknown"}</div>
    </div>
    <div class="card-bottom">
      ${renderMiniRadarHtml(descPct, discPct, delegPct, a.color || "#a08040")}
      <div class="card-divider"></div>
      <div class="card-tagline">${tagline}</div>
      <div class="card-sig">${sig}</div>
    </div>
  </div>`;
}
