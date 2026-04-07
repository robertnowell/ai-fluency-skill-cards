#!/usr/bin/env node
/**
 * Generates a sample skill tree report for each of the 7 archetypes,
 * using synthetic but representative session classifications.
 *
 * Output: fixtures/<archetype-key>/profile.json + report.html
 *         fixtures/index.html — grid linking to all 7 reports
 *
 * Run: node scripts/generate-fixtures.mjs
 *
 * Re-run any time you change archetype copy, the renderer, or the
 * template — these fixtures are the visual QA harness for all 7
 * archetypes at once.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProfile, ARCHETYPES } from "../dist/core/profile.js";
import { renderHTML } from "../dist/core/render.js";
import { renderGridPage } from "../dist/core/card.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");

// ─── Behavior groupings (mirror src/core/classify.ts AXES) ─────────────────
const DESC_BEHAVIORS = ["show_examples", "specify_format", "express_tone_style", "define_audience"];
const DISC_BEHAVIORS = ["identify_context_gaps", "question_reasoning", "verify_facts"];
const DELEG_BEHAVIORS = ["clarify_goals", "consult_approach", "set_interactive_mode"];

// Synthetic projects + session summaries used to give the timeline texture.
const SYNTHETIC_PROJECTS = ["acme-api", "growth-experiments", "data-pipeline", "marketing-site"];
const SYNTHETIC_SUMMARIES = [
  "Refactored the auth middleware",
  "Drafted the launch announcement",
  "Investigated the latency regression",
  "Wrote the migration script",
  "Designed the onboarding flow",
  "Cleaned up the legacy export",
  "Built the dashboard prototype",
  "Reviewed the PR feedback",
  "Planned the Q2 roadmap",
  "Debugged the webhook race condition",
];

// Per-archetype "high" axes — drives which behaviors fire above baseline.
const ARCHETYPE_HIGH_AXES = {
  catalyst: [],                                       // none above
  compass: ["Delegation"],
  forgemaster: ["Description"],
  illuminator: ["Discernment"],
  conductor: ["Description", "Delegation"],
  architect: ["Discernment", "Delegation"],
  polymath: ["Description", "Discernment"],
};

// The 11 observable behaviors from Anthropic's AI Fluency Index (Feb 2026).
// Order mirrors src/core/classify.ts.
const BEHAVIOR_KEYS = [
  "iterative_improvement",
  "clarify_goals",
  "show_examples",
  "specify_format",
  "set_interactive_mode",
  "express_tone_style",
  "identify_context_gaps",
  "define_audience",
  "question_reasoning",
  "consult_approach",
  "verify_facts",
];

// Canonical evidence quotes per archetype × behavior. Each archetype speaks
// in a distinct voice — these fixtures are reference cards, not sample users.
// Three quotes per behavior; the picker draws one (seeded) per session that
// exhibits the behavior.
//
// A reader looking at the Forgemaster fixture should learn what "shaping
// output with examples" looks like for someone who leads with description;
// ditto for every other archetype. Same behavior, different archetype =
// different voice.
const ARCHETYPE_EVIDENCE = {
  // POLYMATH — shapes AND scrutinizes; the rarest combination.
  // Voice: senior craft-conscious; toggles between specifying and
  // questioning in the same paragraph.
  polymath: {
    iterative_improvement: [
      "Closer — but the second paragraph is still doing too much. Cut it in half.",
      "Right shape, wrong tone. Try again — drier, less hedging.",
      "Better. Now do the same pass on the third section.",
    ],
    clarify_goals: [
      "Goal: a one-page brief I can hand to the CEO Friday morning. It has to survive a skeptical read.",
      "I need to choose between two storage backends before end of week. That's the decision; everything else is detail.",
      "I'm trying to understand the tradeoff space well enough to defend a pick when someone pushes back.",
    ],
    show_examples: [
      "Here — match the precision of this paragraph but lose the academic tone.",
      "This is the bar. The previous draft wasn't there yet.",
      "Look at how the first sentence does the work. That's the move.",
    ],
    specify_format: [
      "Three columns: claim, evidence, counterargument. Strict order.",
      "One paragraph of context, then a numbered list of decisions, then risks. No headers.",
      "Return it as the same shape as the spec we discussed — don't reorganize.",
    ],
    set_interactive_mode: [
      "Walk me through your reasoning before giving me the answer.",
      "Push back if my framing is off.",
      "Tell me when you're hedging — I'd rather see the uncertainty.",
    ],
    express_tone_style: [
      "Confident but provisional — this isn't settled science.",
      "Plainspoken. No 'leverage,' no 'unlock,' no 'ecosystem.'",
      "Like you're explaining it to a peer who'll catch you if you bluff.",
    ],
    identify_context_gaps: [
      "You're missing that the customer reference design uses left-to-right reading order.",
      "Heads up — the v3 deprecation kills approach two before you start.",
      "Important: the original spec was wrong about the data shape. Don't trust it.",
    ],
    define_audience: [
      "Senior engineers who already know the basics — don't waste their time.",
      "The reader is a skeptical PM who's seen this pitch three times before.",
      "For someone who'll forward it to their boss without rereading. Make every sentence load-bearing.",
    ],
    question_reasoning: [
      "Walk me through why you ranked option B above A. I'm not seeing it.",
      "That conclusion is doing a lot of work — what's the assumption it rests on?",
      "Where did you get the 23% number? I want to see it.",
    ],
    consult_approach: [
      "Talk through the structure first before drafting anything.",
      "Walk me through three options and the failure mode for each.",
      "Before you write, tell me what you'd cut.",
    ],
    verify_facts: [
      "Confirm that against the actual API docs — don't trust your memory.",
      "Source for that claim?",
      "I've seen Wikipedia get that wrong twice this year. Check the primary source.",
    ],
  },

  // CONDUCTOR — direction AND detail; clear goals plus precise specs.
  // Voice: executive briefing; transactional clarity; brand-conscious.
  conductor: {
    iterative_improvement: [
      "Good first pass. Tighten the headline and rerun.",
      "Second draft is closer — push the CTA above the fold.",
      "Almost there. One more pass on the opening paragraph.",
    ],
    clarify_goals: [
      "We're shipping a beta to fifty enterprise customers next Tuesday. Copy needs to land for risk-averse buyers.",
      "Goal is a launch announcement that drives demo bookings — not awareness, bookings.",
      "I want a one-screen explainer for the homepage that converts cold traffic into trial signups.",
    ],
    show_examples: [
      "Here's our best email from last quarter — match the rhythm.",
      "Use this as the template — same structure, new content.",
      "Look at how Stripe writes their changelog. Borrow that voice.",
    ],
    specify_format: [
      "Subject line under fifty characters, three short paragraphs, single CTA at the bottom.",
      "Five sections, each with a bolded one-line summary. No more than 80 words per section.",
      "Markdown, H2 headers, bullet lists where it helps scanning.",
    ],
    set_interactive_mode: [
      "Be terse. Skip the preamble.",
      "Give me the answer first, then the reasoning.",
      "Bullet points unless I ask for prose.",
    ],
    express_tone_style: [
      "Calm authority. Not salesy.",
      "Warm but professional — we're not their friend, we're their vendor.",
      "Confident, declarative, no hedging language.",
    ],
    identify_context_gaps: [
      "FYI — pricing changed Monday. Use the new tier names.",
      "Note: legal nixed 'guaranteed' last week. Don't use it.",
      "Reminder, the launch date moved to the 18th.",
    ],
    define_audience: [
      "VP-level. They've seen every pitch this year.",
      "Heads of engineering at series-B startups. Smart, busy, allergic to fluff.",
      "Marketing leads at Fortune 500s — they need an internal-defense narrative, not a feature list.",
    ],
    question_reasoning: [
      "Why this order? The strongest point should come first.",
      "Are you sure that framing lands with enterprise buyers?",
      "What's the data behind 'most teams'? I'd cut it if we can't back it.",
    ],
    consult_approach: [
      "Before you write, walk me through the sections you'd include and why.",
      "Outline the structure first. Then we'll fill it in.",
      "What's your recommended order for these three points? Make a case.",
    ],
    verify_facts: [
      "Double-check the customer count before we publish.",
      "Verify that integration is actually live in production.",
      "Make sure the testimonial is approved — last time we had to pull one.",
    ],
  },

  // ARCHITECT — plans deliberately and questions every result.
  // Voice: methodical staff engineer; frames problems before opening
  // them; demands tradeoffs and evidence.
  architect: {
    iterative_improvement: [
      "Good first cut. The boundaries are wrong — let me explain.",
      "Closer. Now address the failure mode I flagged earlier.",
      "That handles the happy path. Now do the error cases.",
    ],
    clarify_goals: [
      "Goal: choose between two storage backends before end of week. Decision needs to survive a postmortem in six months.",
      "I'm trying to understand whether to refactor the auth layer now or carry the debt to v2. I need a defensible answer.",
      "What I actually need is a migration plan I can execute with one engineer over two weeks.",
    ],
    show_examples: [
      "Here's how we did it for the previous service — same constraints, different scale.",
      "This is the failure pattern I want to avoid. Here's the postmortem.",
      "Look at how the standard library handles this. Same shape.",
    ],
    specify_format: [
      "ADR format: context, decision, consequences. One page max.",
      "Numbered list of steps, each with a rollback path.",
      "Table: option, complexity, ops cost, blast radius.",
    ],
    set_interactive_mode: [
      "Push back if my assumptions are wrong.",
      "Tell me what you're uncertain about. I need to know where the risk is.",
      "Don't paper over the parts you're not sure about — flag them.",
    ],
    express_tone_style: [
      "Plain technical English. No marketing.",
      "Explain it like you're writing a postmortem for someone who wasn't there.",
      "Direct. I'd rather you be wrong and clear than right and vague.",
    ],
    identify_context_gaps: [
      "You don't know about the v3 deprecation — that rules out approach two.",
      "Important context: this service has a hard dependency on the legacy queue. Plan around it.",
      "Heads up — the database is on a managed plan that doesn't allow extensions.",
    ],
    define_audience: [
      "For an engineer joining the team next month who needs to understand why we picked this.",
      "On-call engineers reading this at 2am. Make it scannable.",
      "Senior engineers who'll review the PR — assume they know the system.",
    ],
    question_reasoning: [
      "What's the assumption underlying that recommendation? If it's wrong, does the answer change?",
      "You're implying linear scale. What happens at 100x?",
      "Walk me through why a queue beats a cron here. The latency math doesn't support it.",
    ],
    consult_approach: [
      "Outline three approaches and the failure mode for each before we commit.",
      "Before code, talk me through the data model and where it can go wrong.",
      "What's the right pattern here — queue, cron, or event-driven? Make the case for one.",
    ],
    verify_facts: [
      "Confirm that against the actual API docs — don't trust your memory on this.",
      "Check the version we're on actually supports that flag.",
      "Source? Last time you cited a syntax that didn't exist.",
    ],
  },

  // FORGEMASTER — shapes every detail; craft over correction.
  // Voice: designer/writer fixated on texture, references, exact specs.
  forgemaster: {
    iterative_improvement: [
      "The third sentence — too clever. Strip it back.",
      "Closer, but the rhythm breaks at the comma. Re-cast it.",
      "Better. Now do the same pass for the closing line — same energy.",
    ],
    clarify_goals: [
      "I'm working on the launch page hero. It has to feel inevitable, not loud.",
      "Drafting the welcome email for new subscribers. Want it to feel like a postcard from a friend.",
      "Writing the about page. Aiming for warmth without sentimentality.",
    ],
    show_examples: [
      "Here's a paragraph from a New Yorker piece — that's the cadence I want.",
      "Look at how Patagonia writes their product descriptions. Borrow the texture.",
      "This is the reference draft. Match the line length and the comma rhythm.",
    ],
    specify_format: [
      "H2 headers, eighty-character line length, em-dashes not hyphens.",
      "Two short paragraphs. Bold the verb that does the work.",
      "Three bullets, each starting with a present-tense verb. No periods.",
    ],
    set_interactive_mode: [
      "Match my edits — don't reintroduce things I cut.",
      "Read it aloud in your head before you write it.",
      "If it sounds like a press release, start over.",
    ],
    express_tone_style: [
      "Dry, slightly amused. Like Patricia Lockwood in a good mood.",
      "Warm, confident, no jargon. Aim for spoken-word, not written-word.",
      "Plain and slightly crooked — the rhythm of how people actually talk.",
    ],
    identify_context_gaps: [
      "Quick note — 'Pro' is a deprecated tier name. Use 'Studio.'",
      "Heads up: the testimonials need explicit consent before we use them.",
      "Reminder, the brand voice doc says no second-person plural.",
    ],
    define_audience: [
      "Readers of literary criticism — they'll resent being talked down to.",
      "Designers who care about typography. They'll notice the kerning of every choice.",
      "Long-time customers, not new ones. Don't re-explain the brand to them.",
    ],
    question_reasoning: [
      "Why did you pick that verb? 'Optimize' feels off-brand.",
      "Are you sure that adjective is doing work, or is it just there?",
      "That metaphor doesn't land — what were you going for?",
    ],
    consult_approach: [
      "Before drafting, what's the structural choice — narrative or list?",
      "Should this open with a scene or a claim? Pick one and defend it.",
      "What if we lead with the testimonial instead of the tagline?",
    ],
    verify_facts: [
      "Confirm the spelling of the founder's name.",
      "Double-check that quote — the original is slightly different.",
      "Verify the year. I don't trust 2018.",
    ],
  },

  // ILLUMINATOR — questions and verifies; resists the artifact effect.
  // Voice: skeptical analyst / fact-checker; sources, claims, never dazzled.
  illuminator: {
    iterative_improvement: [
      "Better, but the second claim still isn't sourced. Fix it.",
      "Closer. The numbers don't match the chart caption — re-check.",
      "You revised the language but kept the original assumption. Re-examine that.",
    ],
    clarify_goals: [
      "Trying to figure out whether the vendor's claim about 99.9% uptime holds up against their actual incident history.",
      "I want to know if the methodology in this paper is doing what it claims.",
      "Goal is to understand whether the framing of this report is honest or marketing.",
    ],
    show_examples: [
      "Here's a study with the opposite finding. How do you reconcile?",
      "This is what a well-cited claim looks like — match the standard.",
      "Look at how the original paper sourced this. We should match it.",
    ],
    specify_format: [
      "Each claim followed by a citation in brackets.",
      "Two columns: assertion, evidence.",
      "Numbered list with a confidence level next to each item.",
    ],
    set_interactive_mode: [
      "Tell me what you're uncertain about.",
      "Show your work. Don't summarize — show.",
      "If a claim is shaky, say so out loud.",
    ],
    express_tone_style: [
      "Cautious. Don't oversell.",
      "Skeptical voice. Treat every claim as provisional.",
      "Sober. No 'definitely' or 'clearly' — earn those words.",
    ],
    identify_context_gaps: [
      "You haven't looked at the actual user research — your recommendation rests on guesses.",
      "The 2024 follow-up study contradicts this. Have you accounted for it?",
      "You're missing the funding-source disclosure — that changes how to read the paper.",
    ],
    define_audience: [
      "Anyone who'll be making a decision based on this. They need to know the limits.",
      "A reader who'll quote it back at me. Every line has to be defensible.",
      "Researchers who'll check the citations. Don't fudge them.",
    ],
    question_reasoning: [
      "That's a confident answer for something you can't have measured. Where's the evidence?",
      "Why would that be true? Walk me through the mechanism.",
      "You're implying causation. The data only supports correlation.",
    ],
    consult_approach: [
      "Before we accept the conclusion, let's audit the data.",
      "What would have to be true for this argument to fail? Start there.",
      "Walk me through how you'd falsify the claim before defending it.",
    ],
    verify_facts: [
      "Check that against the primary source. I've seen Wikipedia get that wrong twice this year.",
      "Source for that statistic? Citation needed.",
      "Are you sure that author wrote that? It doesn't sound like them.",
    ],
  },

  // COMPASS — sets the destination; trusts the path.
  // Voice: strategic operator; goals + frameworks first, then steps back.
  compass: {
    iterative_improvement: [
      "Good direction. Take another pass with the goal in mind.",
      "Closer to the destination — keep going.",
      "Right framework. Now refine the third step.",
    ],
    clarify_goals: [
      "I'm trying to figure out whether to hire a contractor or stretch our team to ship by Q2. Help me think it through.",
      "Goal is a hiring plan I can defend at the board meeting. Help me get there.",
      "I want a roadmap for the next two quarters that the team can rally behind.",
    ],
    show_examples: [
      "Here's how a peer company handled the same call.",
      "This is the kind of one-pager I'm trying to produce.",
      "Use this old plan as a template for shape, not content.",
    ],
    specify_format: [
      "One-page strategic summary, three sections.",
      "Bullet points with clear next steps.",
      "Decision matrix: options across the top, criteria down the side.",
    ],
    set_interactive_mode: [
      "Ask me clarifying questions before answering.",
      "Be a thinking partner, not an answer machine.",
      "If you need more context, ask. Don't guess.",
    ],
    express_tone_style: [
      "Direct. Strategic. No buzzwords.",
      "Plain language a non-specialist could follow.",
      "Confident, but show the alternatives we considered.",
    ],
    identify_context_gaps: [
      "You don't know that we already tried approach two last year.",
      "FYI, the budget freeze starts next month. Plan around it.",
      "Heads up — the team composition is changing in Q3.",
    ],
    define_audience: [
      "The exec team. They need to understand the tradeoffs in five minutes.",
      "My direct reports — they need to know what decision was made and why.",
      "The board. Assume they're skeptical and short on time.",
    ],
    question_reasoning: [
      "Why this option over the others? Make the case.",
      "What are we giving up if we pick this?",
      "Are we sure the team has the bandwidth for this approach?",
    ],
    consult_approach: [
      "What's the right way to approach this kind of decision? I want a framework first.",
      "Walk me through how you'd structure this before we dive in.",
      "What are my options here, and how would you compare them?",
    ],
    verify_facts: [
      "Confirm the headcount numbers with HR before I cite them.",
      "Double-check the budget figures against last quarter's report.",
      "Source for that benchmark?",
    ],
  },

  // CATALYST — momentum is the engine; light setup, fast loops.
  // Voice: casual, terse, fast — "let's just try it."
  catalyst: {
    iterative_improvement: [
      "Closer. Cut the third bullet. Keep going.",
      "Cool. Now make it shorter.",
      "Yeah — try a different angle.",
    ],
    clarify_goals: [
      "Let's draft something for the homepage.",
      "Trying to ship a quick prototype.",
      "Let's just see what this looks like.",
    ],
    show_examples: [
      "Something like this — but rougher.",
      "Match this vibe.",
      "Use this as a starting point.",
    ],
    specify_format: [
      "Short paragraphs.",
      "Bullets are fine.",
      "Whatever works.",
    ],
    set_interactive_mode: [
      "Just go — I'll iterate.",
      "Don't ask, just try.",
      "Move fast, we'll fix it later.",
    ],
    express_tone_style: [
      "Casual.",
      "Not too corporate.",
      "Make it sound like a person.",
    ],
    identify_context_gaps: [
      "Oh — forgot to mention, this is for mobile.",
      "Heads up, ignore the legacy code.",
      "By the way, the deadline moved.",
    ],
    define_audience: [
      "For the team chat.",
      "Just for me — rough draft.",
      "Internal only.",
    ],
    question_reasoning: [
      "Why that one?",
      "Are you sure?",
      "Hmm, that doesn't feel right — try again.",
    ],
    consult_approach: [
      "What's the fastest way to do this?",
      "Just give me an option, I'll iterate.",
      "Pick one and run with it.",
    ],
    verify_facts: [
      "Is that right?",
      "Double-check that.",
      "Sure?",
    ],
  },
};

// Build a single SessionClassification from a recipe of which behaviors
// should fire. Evidence quotes are pulled from the archetype-specific bank
// so each fixture's voice is consistent across all 30 sessions.
function makeSession(opts) {
  const { archetypeKey, sessionId, timestamp, project, summary, presentBehaviors, rand } = opts;
  const archetypeBank = ARCHETYPE_EVIDENCE[archetypeKey] || {};
  const behaviors = {};
  for (const key of BEHAVIOR_KEYS) {
    const present = presentBehaviors.includes(key);
    const pool = archetypeBank[key] || [];
    const pick = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : "";
    behaviors[key] = {
      present,
      confidence: "high",
      evidence: present ? pick : "",
    };
  }
  return {
    sessionId,
    behaviors,
    sessionSummary: summary,
    classifiedAt: new Date().toISOString(),
    sessionTimestamp: timestamp,
    project,
  };
}

// Generate a deterministic-feeling set of 30 sessions for an archetype.
// The trick: high axes fire at ~70-90% rate, low axes fire at ~10-25%
// (to put them comfortably below their already-low baselines).
function generateClassifications(archetypeKey) {
  const highAxes = new Set(ARCHETYPE_HIGH_AXES[archetypeKey]);
  const isHigh = (axisName) => highAxes.has(axisName);

  // Per-behavior fire rates per archetype.
  const HIGH_RATE = 0.78;
  const MED_RATE = 0.45;
  const LOW_RATE = 0.12;

  function rateFor(behaviorKey) {
    if (DESC_BEHAVIORS.includes(behaviorKey)) return isHigh("Description") ? HIGH_RATE : LOW_RATE;
    if (DISC_BEHAVIORS.includes(behaviorKey)) return isHigh("Discernment") ? HIGH_RATE : LOW_RATE;
    if (DELEG_BEHAVIORS.includes(behaviorKey)) return isHigh("Delegation") ? HIGH_RATE : LOW_RATE;
    if (behaviorKey === "iterative_improvement") return 0.85; // gateway, ~baseline
    return LOW_RATE;
  }

  // Seedable RNG so fixtures are reproducible across runs.
  let seed = archetypeKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const sessions = [];
  const N = 30;
  // Spread sessions across ~6 weeks ending today.
  const NOW = Date.UTC(2026, 3, 6); // Apr 6, 2026
  const SPAN_DAYS = 42;

  for (let i = 0; i < N; i++) {
    const dayOffset = Math.floor((i / N) * SPAN_DAYS);
    const ts = new Date(NOW - (SPAN_DAYS - dayOffset) * 86400 * 1000).toISOString();
    const project = SYNTHETIC_PROJECTS[i % SYNTHETIC_PROJECTS.length];
    const summary = SYNTHETIC_SUMMARIES[i % SYNTHETIC_SUMMARIES.length];

    const presentBehaviors = [];
    for (const key of BEHAVIOR_KEYS) {
      if (rand() < rateFor(key)) presentBehaviors.push(key);
    }

    sessions.push(makeSession({
      archetypeKey,
      sessionId: `${archetypeKey}-${i.toString().padStart(2, "0")}`,
      timestamp: ts,
      project,
      summary,
      presentBehaviors,
      rand,
    }));
  }
  return sessions;
}

// Synthesize a plausible narrative JSON the way Claude would write one.
// Real runs get this from Claude in step 5; for fixtures we hardcode
// thesis + phase names so the deep dive looks complete.
function makeNarrative(archetypeKey, profile) {
  const arch = ARCHETYPES[archetypeKey];
  const phases = profile.timeline?.phases || [];
  const phaseNames = {};
  const phaseInsights = {};
  const NAMES = [
    "Getting Oriented",
    "Building the Prototype",
    "Hardening for Launch",
    "Polish & Refinement",
  ];
  const INSIGHTS = {
    catalyst: [
      "You opened most sessions by jumping in. No briefing, no scaffolding — just a quick ask and a willingness to refine whatever came back.",
      "The pace stayed high. You trusted the loop more than the setup, and the loop carried you. Speed was real, even when the setup was light.",
      "By the end the rhythm was unmistakable: ask, react, refine, ship. You used iteration the way other people use planning — as the primary tool.",
    ],
    compass: [
      "You opened almost every session by stating the destination. Claude knew what you wanted before it knew how — a discipline only ~half of users practice.",
      "You kept setting direction across sessions: goals, then approach, then mode of interaction. The collaboration ran smoothly because the brief was clean.",
      "By the end you were defining destinations and trusting the path. The artifact effect didn't change your habit — you stayed a director, not a specifier.",
    ],
    forgemaster: [
      "You led with description from the first message. Examples, format, tone, audience — all four behaviors firing where most users skip three of them.",
      "The artifact effect rewarded you. Polished outputs deepened your craft instinct rather than dulling it. Description discipline stayed high through every session.",
      "By the end the polish came from upfront craft, not revision cycles. Claude's first drafts were already close to your vision because you'd said what you wanted.",
    ],
    illuminator: [
      "You questioned reasoning early and verified facts often. The Index calls these the rarest behaviors in the data — and you exhibited them when most users were getting more compliant, not less.",
      "When Claude's outputs got polished, your scrutiny went up, not down. That's the artifact effect in reverse — and it's unusual.",
      "By the end you were treating every confident answer as a hypothesis to be tested. The gaps you flagged kept the work honest in a way most users wouldn't have caught.",
    ],
    conductor: [
      "You ran on two rails from session one: clear goals upfront AND precise specs for what came back. Both Description and Delegation firing together.",
      "The combination compounded. Claude got closer on the first try because you'd told it both the what and the how — direction plus detail in the same brief.",
      "By the end the pattern was textbook: orchestrate the setup, shape the output. The only piece you weren't using was discernment — which is your one growth edge.",
    ],
    architect: [
      "You planned the approach before opening it. Goals stated, options discussed, mode of interaction set — and only then did the work begin.",
      "After the setup came the scrutiny. Your discernment wasn't random — it was targeted, because you knew exactly what you'd asked for.",
      "By the end the loop was unmistakable: deliberate intent up front, deliberate evaluation after. Two skills that compound because they share a foundation: knowing what you wanted.",
    ],
    polymath: [
      "You shaped Claude's output AND questioned its reasoning across nearly every session. The Index documents these as anti-correlated in practice — the rarest combination in the data.",
      "Description and discernment moving together is the artifact effect inverted. You stayed critical even when polished output would have softened most users' judgment.",
      "By the end you were operating on both axes simultaneously. The frontier ahead isn't another in-chat skill — it's Diligence, the only D the research can't observe in transcripts.",
    ],
  };

  const narrativeBank = INSIGHTS[archetypeKey] || INSIGHTS.catalyst;
  for (let i = 0; i < phases.length; i++) {
    phaseNames[i] = NAMES[i] || `Phase ${i + 1}`;
    phaseInsights[i] = narrativeBank[i] || narrativeBank[narrativeBank.length - 1];
  }

  const THESIS = {
    catalyst: "Light setup, fast loops. You trust iteration to do what other people use planning for.",
    compass: "You set the destination and let Claude find the path. Clarity of intent was the through-line.",
    forgemaster: "You shaped every output with examples, format, tone, audience. Craft over correction, from the first message.",
    illuminator: "You questioned reasoning and verified facts when the artifact effect made most users less critical, not more.",
    conductor: "You ran direction and detail on the same rails. Claude got it right the first time because you said both the what and the how.",
    architect: "You planned deliberately, then evaluated rigorously. Intent up front, scrutiny after — and the two compounded.",
    polymath: "You shaped Claude's output and questioned its reasoning in the same breath. The rarest combination in the data.",
  };

  return {
    thesis: THESIS[archetypeKey],
    phaseNames,
    phaseInsights,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────
const archetypeKeys = Object.keys(ARCHETYPES);
const results = [];

if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true });

for (const key of archetypeKeys) {
  const classifications = generateClassifications(key);
  const profile = buildProfile(classifications);
  // user_name is the archetype's display name (single word, no "The " prefix)
  // so the {name} substitution in headlines reads naturally — e.g.,
  // "Polymath, you shape Claude's output and question its reasoning..."
  // and the card-header label renders as "POLYMATH" via CSS uppercase.
  profile.user_name = ARCHETYPES[key].name.replace(/^The /, "");

  // Force the archetype assignment if buildProfile picked a different one
  // (the synthetic fire rates aim for the right cluster, but rounding can
  // push a borderline case to a neighbor — pin it explicitly).
  if (profile.archetype.key !== key) {
    profile.archetype = {
      ...ARCHETYPES[key],
      key,
      axis_scores: profile.archetype.axis_scores,
    };
  }

  const narrative = makeNarrative(key, profile);

  const dir = join(FIXTURES_DIR, key);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "profile.json"), JSON.stringify(profile, null, 2));
  writeFileSync(join(dir, "narrative.json"), JSON.stringify(narrative, null, 2));

  const html = renderHTML(profile, "skill-tree.html", narrative);
  writeFileSync(join(dir, "report.html"), html);

  results.push({ key, name: ARCHETYPES[key].name, profile });

  console.log(`\u2713 ${ARCHETYPES[key].name.padEnd(20)} \u2192 fixtures/${key}/report.html`);
}

// Grid index page — single source of truth in src/core/card.ts.
// Cards link to local report.html files (relative path) instead of /fixture/<key>.
const indexHtml = renderGridPage(
  results.map((r) => ({ key: r.key, profile: r.profile })),
  {
    title: "The 7 Archetypes",
    subtitle: "Click any card to open the full report",
    hrefTemplate: "{key}/report.html",
  },
);

writeFileSync(join(FIXTURES_DIR, "index.html"), indexHtml);
console.log(`\n\u2713 Grid index \u2192 fixtures/index.html`);
console.log(`\nOpen: open ${join(FIXTURES_DIR, "index.html")}`);
