/**
 * Single source of truth for the About modal.
 *
 * Used by:
 *   - templates/skill-tree.html (via render.ts marker substitution)
 *   - src/core/card.ts renderGridPage (the public /grid endpoint)
 *
 * Why this exists: the About content used to be inlined in two places that
 * silently drifted. It's now extracted here so updates propagate to both
 * the report pages and the grid front door.
 *
 * On voice and length: this is intentionally minimal (~140 words). The full
 * design thinking lives in docs/design-rationale.md, which is the canonical
 * home for prose. The About modal exists to anchor the prototype, name the
 * research it's built on, and point evaluators to the rationale doc.
 *
 * The voice is grounded in Anthropic Education Labs' published writing style:
 * hedged, data narrativized, frameworks named explicitly, em-dashes for
 * qualification, no marketing language. The artifact effect is introduced as
 * vocabulary the rest of the visualization references through tooltips.
 */

const RATIONALE_URL = "https://github.com/robertnowell/ai-fluency-skill-cards/blob/main/docs/design-rationale.md";
const REPO_URL = "https://github.com/robertnowell/ai-fluency-skill-cards";
const FLUENCY_INDEX_URL = "https://www.anthropic.com/research/AI-fluency-index";
const FRAMEWORK_URL = "https://aifluencyframework.org/";

// CSS for the About button + overlay container + the slim content inside.
// Kept lean — no TOC, summary box, decision cards, pull quotes, or counters.
// All of that existed for content we cut.
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
    font-family: 'Cormorant Garamond', serif; font-weight: 600;
    font-size: 1.8rem; color: #cca67b; margin-bottom: 1.25rem;
  }
  .about-content h2 {
    font-family: 'Cormorant Garamond', serif; font-weight: 600;
    font-size: 1.1rem; color: #cca67b; margin-top: 2.25rem; margin-bottom: 0.6rem;
    letter-spacing: 0.04em;
  }
  .about-content p { margin-bottom: 1rem; font-size: 0.92rem; color: #c8c4bf; }
  .about-content em { color: #d8d4cf; font-style: italic; }
  .about-content strong { color: #e8e4df; font-weight: 500; }
  .about-content ul { margin: 0.5rem 0 1rem 0; padding: 0; list-style: none; font-size: 0.88rem; color: #c8c4bf; }
  .about-content li {
    padding: 0.45rem 0;
    border-bottom: 1px solid rgba(58,53,48,0.5);
  }
  .about-content li:last-child { border-bottom: none; }
  .about-content a {
    color: #cca67b; text-decoration: underline; text-underline-offset: 2px;
    text-decoration-color: rgba(204,166,123,0.4);
    transition: text-decoration-color 0.2s;
  }
  .about-content a:hover { text-decoration-color: rgba(204,166,123,0.9); }

  .about-close {
    position: fixed; top: 1.5rem; right: 1.5rem; z-index: 9001;
    font-family: 'Outfit', sans-serif; font-size: 0.75rem; letter-spacing: 0.15em;
    color: #8a8580; background: rgba(10,9,8,0.8); border: 1px solid #3a3530;
    padding: 0.4rem 1rem; border-radius: 3px; cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .about-close:hover { color: #cca67b; border-color: #cca67b; }

  .about-divider {
    border: none; border-top: 1px solid #2a2520;
    margin: 2.25rem 0 1.5rem;
  }

  /* The 11 behaviors reference table — earns its place because radar
     tooltips throughout the visualization cite these baselines directly. */
  .about-behaviors-axis {
    margin-bottom: 1rem;
  }
  .about-behaviors-axis-label {
    font-family: 'Outfit', sans-serif;
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(204,166,123,0.65);
    margin-bottom: 0.35rem;
  }
  .about-behaviors-axis-list {
    font-size: 0.85rem;
    color: #c8c4bf;
    line-height: 1.55;
  }
  /* Archetypes that lead with this axis — sit dim below the behaviors line
     so the connection from "behaviors that drive this axis" → "people whose
     profile is defined by this axis" is visible without competing with the
     primary content above. Hover surfaces the axis signature. */
  .about-behaviors-axis-archetypes {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: 0.82rem;
    color: #6b6560;
    line-height: 1.55;
    margin-top: 0.3rem;
  }
  .about-axis-arch {
    position: relative;
    color: #8a8580;
    cursor: help;
    border-bottom: 1px dotted rgba(107,101,96,0.4);
    transition: color 0.2s, border-color 0.2s;
  }
  .about-axis-arch:hover {
    color: #cca67b;
    border-bottom-color: rgba(204,166,123,0.55);
  }
  .about-axis-arch::after {
    content: attr(data-sig);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-6px);
    background: #1e1d1b;
    color: #c8c4bf;
    border: 1px solid #3a3530;
    border-radius: 0.35rem;
    padding: 0.4rem 0.65rem;
    font-family: 'Outfit', sans-serif;
    font-style: normal;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 100;
    box-shadow: 0 6px 18px rgba(0,0,0,0.55);
  }
  .about-axis-arch:hover::after {
    opacity: 1;
  }
  .about-behaviors-note {
    font-size: 0.78rem;
    color: #8a8580;
    margin-top: 0.5rem;
  }

  /* The "How this is scored" methodology list — same visual register as
     the behaviors block above (border-divided rows, small caps for the
     leading label) so it reads as part of the same reference card, not
     a separate marketing section. */
  .about-method-list {
    margin: 0.5rem 0 1rem 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
    color: #c8c4bf;
    line-height: 1.6;
  }
  .about-method-list li {
    padding: 0.55rem 0;
    border-bottom: 1px solid rgba(58,53,48,0.5);
  }
  .about-method-list li:last-child { border-bottom: none; }
  .about-method-list strong {
    color: #cca67b;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  /* The rationale link sits at the end as the prominent destination */
  .about-rationale-link {
    display: block;
    font-family: 'Cormorant Garamond', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #cca67b;
    padding: 0.85rem 0;
    border-top: 1px solid rgba(204,166,123,0.25);
    border-bottom: 1px solid rgba(204,166,123,0.25);
    margin: 0.5rem 0 1.25rem;
    text-decoration: none;
    letter-spacing: 0.02em;
    transition: color 0.2s, border-color 0.2s;
  }
  .about-rationale-link:hover {
    color: #e8d8b0;
    border-color: rgba(232,216,176,0.5);
  }
  .about-rationale-link .arrow {
    float: right;
    color: rgba(204,166,123,0.6);
    transition: transform 0.2s;
  }
  .about-rationale-link:hover .arrow {
    transform: translateX(3px);
    color: rgba(232,216,176,0.9);
  }
  .about-source-link {
    font-size: 0.78rem;
    color: #8a8580;
  }
  .about-source-link a { color: #8a8580; }
`;

export const ABOUT_OVERLAY_HTML = `
<div class="about-overlay" id="about-overlay">
  <button class="about-close" onclick="document.getElementById('about-overlay').classList.remove('is-open')">Close</button>
  <div class="about-content">
    <h1>Skill Tree</h1>
    <p>A behavioral profile of how you collaborate with Claude, drawn from your real conversation history.</p>
    <p>Built on <a href="${FLUENCY_INDEX_URL}" target="_blank" rel="noopener">Anthropic&rsquo;s AI Fluency Index</a> (Feb 2026), which classified 11 observable behaviors across 9,830 conversations. The headline finding: most users iterate on Claude&rsquo;s outputs &mdash; 85.7% of conversations show some refinement &mdash; but far fewer question its reasoning (15.8%) or verify its claims (8.7%). When Claude&rsquo;s outputs get more polished, users tend to scrutinize them less. This is the <em>artifact effect</em>, and it&rsquo;s what Skill Tree makes visible at the level of one collaborator.</p>
    <p>The three observable axes (Description, Discernment, Delegation) are drawn from <a href="${FRAMEWORK_URL}" target="_blank" rel="noopener">Dakan &amp; Feller&rsquo;s 4D AI Fluency Framework</a>. The fourth &mdash; Diligence &mdash; happens outside the conversation and isn&rsquo;t measurable from chat data.</p>

    <h2>The 11 Behaviors</h2>
    <div class="about-behaviors-axis">
      <div class="about-behaviors-axis-label">Description &middot; how you shape output</div>
      <div class="about-behaviors-axis-list">Provides examples (41%) &middot; Specifies format (30%) &middot; Expresses tone (23%) &middot; Defines audience (18%)</div>
      <div class="about-behaviors-axis-archetypes">
        <span class="about-axis-arch" data-sig="High Description">Forgemaster</span> &middot;
        <span class="about-axis-arch" data-sig="High Description + Delegation">Conductor</span> &middot;
        <span class="about-axis-arch" data-sig="High Description + Discernment">Polymath</span>
      </div>
    </div>
    <div class="about-behaviors-axis">
      <div class="about-behaviors-axis-label">Discernment &middot; how you assess reasoning</div>
      <div class="about-behaviors-axis-list">Flags context gaps (20%) &middot; Questions reasoning (16%) &middot; Verifies facts (9%)</div>
      <div class="about-behaviors-axis-archetypes">
        <span class="about-axis-arch" data-sig="High Discernment">Illuminator</span> &middot;
        <span class="about-axis-arch" data-sig="High Discernment + Delegation">Architect</span> &middot;
        <span class="about-axis-arch" data-sig="High Description + Discernment">Polymath</span>
      </div>
    </div>
    <div class="about-behaviors-axis">
      <div class="about-behaviors-axis-label">Delegation &middot; how you set up the collaboration</div>
      <div class="about-behaviors-axis-list">Clarifies goals (51%) &middot; Sets interaction style (30%) &middot; Discusses approach (10%)</div>
      <div class="about-behaviors-axis-archetypes">
        <span class="about-axis-arch" data-sig="High Delegation">Compass</span> &middot;
        <span class="about-axis-arch" data-sig="High Description + Delegation">Conductor</span> &middot;
        <span class="about-axis-arch" data-sig="High Discernment + Delegation">Architect</span>
      </div>
    </div>
    <div class="about-behaviors-axis">
      <div class="about-behaviors-axis-label">Diligence &middot; not observable in chat</div>
      <div class="about-behaviors-axis-list">Transparent about AI&rsquo;s role &middot; Considers sharing consequences &middot; Deploys AI responsibly</div>
    </div>
    <div class="about-behaviors-axis">
      <div class="about-behaviors-axis-label">Gateway &middot; the most common behavior</div>
      <div class="about-behaviors-axis-list">Iterates on outputs (86%)</div>
      <div class="about-behaviors-axis-archetypes">
        <span class="about-axis-arch" data-sig="No axes above average">Catalyst</span>
      </div>
    </div>
    <p class="about-behaviors-note">Population baselines from the AI Fluency Index (N = 9,830 conversations). Your rates appear next to these throughout the visualization.</p>

    <h2>How this is scored</h2>
    <ul class="about-method-list">
      <li><strong>Unit of analysis:</strong> one conversation = one unit. A behavior either appeared in the session or it didn&rsquo;t.</li>
      <li><strong>Classifier:</strong> Claude Haiku reads each session against the 11 behavior definitions and emits <em>present</em> / <em>absent</em> with a <em>high</em> / <em>medium</em> / <em>low</em> confidence label and a short evidence quote.</li>
      <li><strong>Your rate:</strong> sessions where the behavior was present, divided by total sessions classified.</li>
      <li><strong>Baseline:</strong> per-conversation prevalence published in the AI Fluency Index (N&nbsp;=&nbsp;9,830, Feb 2026).</li>
      <li><strong>Limitations:</strong> Diligence isn&rsquo;t observable in chat transcripts. Small samples (under ~20 sessions) produce noisy rates &mdash; treat the archetype as a sketch, not a verdict. The classifier is an LLM judging another LLM&rsquo;s collaborator; the evidence quotes are there so you can audit any call you doubt.</li>
    </ul>

    <hr class="about-divider">

    <a class="about-rationale-link" href="${RATIONALE_URL}" target="_blank" rel="noopener">
      Read the full design rationale<span class="arrow">&rarr;</span>
    </a>
    <p class="about-source-link">Source on GitHub &middot; <a href="${REPO_URL}" target="_blank" rel="noopener">robertnowell/ai-fluency-skill-cards</a></p>
  </div>
</div>
`;
