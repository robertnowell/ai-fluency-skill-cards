/**
 * Aggregate per-session classifications into a skill profile and assign archetype.
 *
 * The archetype system is DETERMINISTIC — no LLM call needed.
 * Uses three axes derived from the artifact effect data in the AI Fluency Index:
 *   Description: behaviors that INCREASE with polished artifacts
 *   Delegation: behaviors that INCREASE with polished artifacts
 *   Discernment: behaviors that DECREASE with polished artifacts
 *
 * Research basis:
 *   - Artifact effect: Anthropic AI Fluency Index (Feb 2026)
 *   - Three-tier clustering: "Nested Skills in Labor Ecosystems" (Nature Human Behaviour, 2025)
 *   - Parallel dimensions: AI literacy systematic review (PMC, 2024, 16 scales)
 */

import {
  BASELINES,
  BEHAVIOR_LABELS,
  AXES,
  type SessionClassification,
} from "./classify.js";

// ─── Axis behavior groupings ───────────────────────────────────────────────

const DESC_BEHAVIORS = AXES.Description.behaviors;
const DISC_BEHAVIORS = AXES.Discernment.behaviors;
const DELEG_BEHAVIORS = AXES.Delegation.behaviors;

const DESC_BASELINE = AXES.Description.baseline;
const DISC_BASELINE = AXES.Discernment.baseline;
const DELEG_BASELINE = AXES.Delegation.baseline;

// ─── The 7 Archetypes ──────────────────────────────────────────────────────

export const ARCHETYPES: Record<string, ArchetypeData> = {
  polymath: {
    name: "The Polymath",
    tagline: "Describes with precision and discerns with scrutiny",
    description:
      "You've developed fluency across both description and discernment — " +
      "the two dimensions that most users specialize in, not combine. " +
      "The data shows these skills are anti-correlated in practice (the artifact effect), " +
      "which makes your balance genuinely unusual.",
    superpower: "You shift between shaping output and scrutinizing it as the task demands",
    growth_unlock: "The 4th D — Diligence: how you use these skills in the world",
    growth_quest:
      "You've mastered the in-chat dimensions. The real frontier is Diligence — " +
      "are you transparent about AI's role in your work? Do you consider the consequences " +
      "of sharing AI-generated output? Next session, notice one moment where the answer matters.",
    target_archetype: null,
    color: "#a08040",
    accent: "#e8d8b0",
    glyph: "polymath",
    hero_art: {
      url: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-27908-001.jpg",
      credit: "Van Dyck, Lucas van Uffel, c. 1622",
    },
  },
  conductor: {
    name: "The Conductor",
    tagline: "Delegates direction and describes detail",
    description:
      "You combine delegation and description — clear goals upfront, " +
      "then precise specifications for format, examples, and tone. " +
      "You brief both the what and the how.",
    superpower: "Claude gets closer on the first try because you've defined both direction and detail",
    growth_unlock: "Unlock The Polymath's edge — add discernment to your orchestration",
    growth_quest:
      "Next session, after Claude delivers what you specified, " +
      "pick one claim and ask: 'How confident are you in this? What might be wrong?'",
    target_archetype: "polymath",
    color: "#8b3a62",
    accent: "#d4a0b8",
    glyph: "conductor",
    hero_art: {
      url: "https://www.artic.edu/iiif/2/9f08b895-4960-4bc6-5871-dc9bfab4c655/full/843,/0/default.jpg",
      credit: "Maharana Bhim Singh in Procession, Rajasthan, c. 1820",
    },
  },
  architect: {
    name: "The Architect",
    tagline: "Delegates deliberately and discerns rigorously",
    description:
      "You combine delegation with discernment — " +
      "clear goals and discussed approach, then critical evaluation " +
      "of what Claude produces. Your scrutiny is targeted because " +
      "your setup was intentional.",
    superpower: "You catch what others miss because you defined what you were looking for upfront",
    growth_unlock: "Unlock The Polymath's craft — add description to your discernment",
    growth_quest:
      "Next session, try showing Claude an example of exactly what you want " +
      "before you start evaluating what it gives you.",
    target_archetype: "polymath",
    color: "#5a6a7a",
    accent: "#b0c0d0",
    glyph: "architect",
    hero_art: {
      url: "https://iiif.micr.io/DVZRG/full/800,/0/default.jpg",
      credit: "Saenredam, Sint-Bavokerk, Haarlem",
    },
  },
  forgemaster: {
    name: "The Forgemaster",
    tagline: "Describes output precisely — format, tone, audience",
    description:
      "You lead with description — examples of desired output, " +
      "format requirements, tone preferences, audience awareness. " +
      "You don't accept generic responses; you shape them into what you envisioned.",
    superpower: "Claude's output matches your vision because you've described it precisely",
    growth_unlock: "Unlock The Conductor's vision — add strategic delegation to your craft",
    growth_quest:
      "Next session, before specifying details, try stating your overall goal " +
      "and asking Claude to propose an approach first.",
    target_archetype: "conductor",
    color: "#b8860b",
    accent: "#e8d4a8",
    glyph: "forgemaster",
    hero_art: {
      url: "https://images.metmuseum.org/CRDImages/as/web-large/DT240.jpg",
      credit: "Nataraja, Chola dynasty, Tamil Nadu, 11th c.",
      position: "center 30%",
    },
  },
  illuminator: {
    name: "The Illuminator",
    tagline: "Discerns critically — questioning reasoning and facts",
    description:
      "You lead with discernment — identifying gaps, challenging logic, " +
      "checking facts. When polished AI output makes most users less critical " +
      "(the artifact effect), you resist that pull.",
    superpower: "You catch errors and gaps before they compound — the rarest behavior in the data",
    growth_unlock: "Unlock The Architect's structure — add deliberate delegation to your discernment",
    growth_quest:
      "Next session, try setting a clear goal and interaction mode before you start " +
      "evaluating — give Claude the context to get closer on the first try.",
    target_archetype: "architect",
    color: "#3d8a5a",
    accent: "#a8d4b8",
    glyph: "illuminator",
    hero_art: {
      url: "https://www.artic.edu/iiif/2/39018e31-6200-f4e3-7fc0-17ef919a6723/full/843,/0/default.jpg",
      credit: "Batoni, Time Unveiling Truth, 1740–45",
    },
  },
  compass: {
    name: "The Compass",
    tagline: "Delegates with clear goals and defined approach",
    description:
      "You lead with delegation — clear goals, discussed approach, " +
      "defined interaction style. You brief well, then trust the collaboration. " +
      "You set the destination and let Claude find the path.",
    superpower: "Claude knows what you need before the first word is written — because you said so",
    growth_unlock: "Unlock The Conductor's precision — add description to your direction",
    growth_quest:
      "Next session, after stating your goal, try adding: 'Here's an example of " +
      "what good output looks like' or 'Format this as...'",
    target_archetype: "conductor",
    color: "#4a7ba3",
    accent: "#a3c4db",
    glyph: "compass",
    hero_art: {
      url: "https://openaccess-cdn.clevelandart.org/1985.320/1985.320_web.jpg",
      credit: "Hiroshige, Moon-Viewing Promontory, 1857",
    },
  },
  catalyst: {
    name: "The Catalyst",
    tagline: "Iterates rapidly, refining through conversation",
    description:
      "You collaborate through momentum: ask, iterate, refine, ship. " +
      "You don't over-specify or over-question — you trust the loop. " +
      "This works well for rapid exploration and first drafts.",
    superpower: "Speed to outcome — you get to a working result faster than most",
    growth_unlock: "Unlock The Compass's direction — try stating your destination before launching",
    growth_quest:
      "Next session, try opening with one sentence: 'My goal is [X] because [Y].' " +
      "See how it changes what Claude gives you on the first try.",
    target_archetype: "compass",
    color: "#d4584a",
    accent: "#e8a090",
    glyph: "catalyst",
    hero_art: {
      url: "https://images.metmuseum.org/CRDImages/is/web-large/DP231332.jpg",
      credit: "Dancing Dervishes, Divan of Hafiz, Persia, c. 1480",
      position: "center 25%",
    },
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface ArchetypeData {
  name: string;
  tagline: string;
  description: string;
  superpower: string;
  growth_unlock: string;
  growth_quest: string;
  target_archetype: string | null;
  color: string;
  accent: string;
  glyph: string;
  hero_art: {
    url: string;
    credit: string;
    position?: string;
  };
}

interface BehaviorData {
  label: string;
  rate: number;
  baseline: number;
  above_baseline: boolean;
  present_count: number;
  total_sessions: number;
  evidence: Array<{ text: string; session_id: string; project: string }>;
}

interface BranchData {
  score: number;
  baseline: number;
  above_baseline: boolean;
  color: string;
  description: string;
  behaviors: readonly string[];
}

export interface TimelineMoment {
  quote: string;
  behavior: string;
  behaviorLabel: string;
  sessionSummary: string;
  sessionId: string;
  significance: number;
  project: string;
}

export interface TimelinePhase {
  name: string;
  startDate: string;
  endDate: string;
  sessionCount: number;
  dominantAxis: string;
  axisColor: string;
  keyMoments: TimelineMoment[];
  /** Distinct project names active during this phase */
  projects: string[];
}

export interface TimelineSession {
  sessionId: string;
  timestamp: string;
  summary: string;
  dominantAxis: string;
  behaviorsPresent: string[];
  project: string;
}

export interface Timeline {
  sessions: TimelineSession[];
  phases: TimelinePhase[];
}

export interface SkillProfile {
  total_sessions: number;
  behaviors: Record<string, BehaviorData>;
  branches: Record<string, BranchData>;
  archetype: ArchetypeData & { key: string; axis_scores: Record<string, number> };
  growth_edge: {
    behavior: string;
    label: string;
    rate: number;
    baseline: number;
    gap: number;
  };
  generated_at: string;
  // Progress tracking
  previous_archetype?: string;
  previous_generated_at?: string;
  // Deep dive timeline
  timeline?: Timeline;
}

// ─── Timeline & Phase Detection ───────────────────────────────────────────

const AXIS_DEFS = [
  { name: "Description", behaviors: DESC_BEHAVIORS, color: AXES.Description.color },
  { name: "Discernment", behaviors: DISC_BEHAVIORS, color: AXES.Discernment.color },
  { name: "Delegation", behaviors: DELEG_BEHAVIORS, color: AXES.Delegation.color },
];

function dominantAxisForSession(
  behaviors: Record<string, { present: boolean; confidence: string }>,
): { axis: string; color: string } {
  let best = { axis: "Delegation", color: AXES.Delegation.color as string };
  let bestScore = -1;

  for (const def of AXIS_DEFS) {
    // Score = sum of (1 - baseline) for each present behavior in this axis
    // Rarer behaviors contribute more, so the dominant axis reflects
    // which cluster of *interesting* behaviors showed up
    let score = 0;
    for (const key of def.behaviors) {
      if (behaviors[key]?.present) {
        score += 1 - (BASELINES[key] ?? 0.5);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = { axis: def.name, color: def.color };
    }
  }

  return best;
}

/** Fallback phase names when no project context is available */
const PHASE_NAMES_FALLBACK: Record<string, string> = {
  Description: "Shaping the Output",
  Discernment: "Questioning Everything",
  Delegation: "Setting the Stage",
};

/** Build a phase name from its project context, falling back to behavioral axis */
function buildPhaseName(projects: string[], axis: string): string {
  if (projects.length > 0) {
    return projects.join(", ");
  }
  return PHASE_NAMES_FALLBACK[axis] || axis;
}

export function buildTimeline(classifications: SessionClassification[]): Timeline {
  // Sort chronologically by sessionTimestamp, falling back to classifiedAt
  const sorted = [...classifications].sort((a, b) => {
    const ta = a.sessionTimestamp || a.classifiedAt;
    const tb = b.sessionTimestamp || b.classifiedAt;
    return ta.localeCompare(tb);
  });

  // Build per-session timeline entries
  const sessions: TimelineSession[] = sorted.map((c) => {
    const dom = dominantAxisForSession(c.behaviors);
    const behaviorsPresent = Object.entries(c.behaviors)
      .filter(([, v]) => v.present)
      .map(([k]) => k);

    return {
      sessionId: c.sessionId,
      timestamp: c.sessionTimestamp || c.classifiedAt,
      summary: c.sessionSummary,
      dominantAxis: dom.axis,
      behaviorsPresent,
      project: c.project || "",
    };
  });

  // Phase detection: walk forward, detect when dominant axis shifts
  // for 2+ consecutive sessions (lower threshold since datasets may be small)
  const MIN_SESSIONS_FOR_PHASES = 6;
  if (sessions.length < MIN_SESSIONS_FOR_PHASES) {
    // Too few sessions — return portrait mode (no phases, ranked moments)
    return {
      sessions,
      phases: buildPortraitPhase(sorted, sessions),
    };
  }

  const phases: TimelinePhase[] = [];
  let phaseStart = 0;

  for (let i = 1; i <= sessions.length; i++) {
    const axisChanged = i === sessions.length || sessions[i].dominantAxis !== sessions[phaseStart].dominantAxis;

    if (axisChanged && i - phaseStart >= 2) {
      // Close this phase
      const phaseClassifications = sorted.slice(phaseStart, i);
      const phaseSessions = sessions.slice(phaseStart, i);
      const axis = phaseSessions[0].dominantAxis;
      const axisDef = AXIS_DEFS.find((d) => d.name === axis)!;

      const phaseProjects = [...new Set(phaseSessions.map((s) => s.project).filter(Boolean))];

      phases.push({
        name: buildPhaseName(phaseProjects, axis),
        startDate: phaseSessions[0].timestamp,
        endDate: phaseSessions[phaseSessions.length - 1].timestamp,
        sessionCount: phaseSessions.length,
        dominantAxis: axis,
        axisColor: axisDef.color,
        keyMoments: extractKeyMoments(phaseClassifications, 3),
        projects: phaseProjects,
      });

      phaseStart = i;
    } else if (axisChanged) {
      // Single-session blip — absorb into next phase
      phaseStart = i;
    }
  }

  // If phase detection produced only one phase, still show it
  // If it produced none (all sessions same axis, but under threshold), make one phase from all
  if (phases.length === 0) {
    return {
      sessions,
      phases: buildPortraitPhase(sorted, sessions),
    };
  }

  return { sessions, phases };
}

function buildPortraitPhase(
  sorted: SessionClassification[],
  sessions: TimelineSession[],
): TimelinePhase[] {
  if (sorted.length === 0) return [];

  // Count dominant axes to find the overall dominant
  const axisCounts: Record<string, number> = {};
  for (const s of sessions) {
    axisCounts[s.dominantAxis] = (axisCounts[s.dominantAxis] || 0) + 1;
  }
  const dominantAxis = Object.entries(axisCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  const axisDef = AXIS_DEFS.find((d) => d.name === dominantAxis)!;

  const phaseProjects = [...new Set(sessions.map((s) => s.project).filter(Boolean))];

  return [{
    name: buildPhaseName(phaseProjects, dominantAxis),
    startDate: sessions[0].timestamp,
    endDate: sessions[sessions.length - 1].timestamp,
    sessionCount: sessions.length,
    dominantAxis,
    axisColor: axisDef.color,
    keyMoments: extractKeyMoments(sorted, 4),
    projects: phaseProjects,
  }];
}

function extractKeyMoments(
  classifications: SessionClassification[],
  maxMoments: number,
): TimelineMoment[] {
  const moments: TimelineMoment[] = [];

  for (const c of classifications) {
    for (const [key, b] of Object.entries(c.behaviors)) {
      if (!b.present || !b.evidence || b.evidence === "none") continue;

      // Significance: rarer behaviors (lower baseline) are more interesting
      // High-confidence classifications are more reliable
      const rarity = 1 - (BASELINES[key] ?? 0.5);
      const confWeight = b.confidence === "high" ? 1.0 : 0.5;
      const significance = rarity * confWeight;

      moments.push({
        quote: b.evidence,
        behavior: key,
        behaviorLabel: BEHAVIOR_LABELS[key] || key,
        sessionSummary: c.sessionSummary,
        sessionId: c.sessionId,
        significance,
        project: c.project || "",
      });
    }
  }

  // Sort by significance (most interesting first), dedupe by behavior
  moments.sort((a, b) => b.significance - a.significance);

  // Take top moments, but avoid showing same behavior twice
  const seen = new Set<string>();
  const top: TimelineMoment[] = [];
  for (const m of moments) {
    if (seen.has(m.behavior)) continue;
    seen.add(m.behavior);
    top.push(m);
    if (top.length >= maxMoments) break;
  }

  return top;
}

// ─── Deterministic archetype assignment ────────────────────────────────────

export function determineArchetype(behaviors: Record<string, BehaviorData>): string {
  function axisAvg(keys: readonly string[]): number {
    const rates = keys.map((k) => behaviors[k]?.rate ?? 0);
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }

  const desc = axisAvg(DESC_BEHAVIORS);
  const disc = axisAvg(DISC_BEHAVIORS);
  const deleg = axisAvg(DELEG_BEHAVIORS);

  const descHigh = desc > DESC_BASELINE;
  const discHigh = disc > DISC_BASELINE;
  const delegHigh = deleg > DELEG_BASELINE;

  // Priority order: most specific combination first
  if (descHigh && discHigh) return "polymath";
  if (descHigh && delegHigh) return "conductor";
  if (discHigh && delegHigh) return "architect";
  if (descHigh) return "forgemaster";
  if (discHigh) return "illuminator";
  if (delegHigh) return "compass";
  return "catalyst";
}

// ─── Build profile ─────────────────────────────────────────────────────────

export function buildProfile(
  classifications: SessionClassification[],
  previousProfile?: SkillProfile | null,
): SkillProfile {
  const total = classifications.length;

  // Compute per-behavior stats
  const behaviors: Record<string, BehaviorData> = {};
  for (const key of Object.keys(BASELINES)) {
    const presentCount = classifications.filter(
      (c) => c.behaviors[key]?.present,
    ).length;
    const rate = total > 0 ? presentCount / total : 0;
    const baseline = BASELINES[key];

    const evidence: Array<{ text: string; session_id: string; project: string }> = [];
    for (const c of classifications) {
      const b = c.behaviors[key];
      if (b?.present && b.evidence && b.evidence !== "none") {
        evidence.push({
          text: b.evidence,
          session_id: c.sessionId,
          project: c.project || "",
        });
        if (evidence.length >= 3) break;
      }
    }

    behaviors[key] = {
      label: BEHAVIOR_LABELS[key],
      rate: Math.round(rate * 1000) / 1000,
      baseline,
      above_baseline: rate > baseline,
      present_count: presentCount,
      total_sessions: total,
      evidence,
    };
  }

  // Compute axis/branch scores
  const branches: Record<string, BranchData> = {};
  for (const [axisName, axisDef] of Object.entries(AXES)) {
    const rates = axisDef.behaviors.map((k) => behaviors[k].rate);
    const baselines = axisDef.behaviors.map((k) => BASELINES[k]);
    const score = rates.reduce((a, b) => a + b, 0) / rates.length;
    const baseline = baselines.reduce((a, b) => a + b, 0) / baselines.length;

    branches[axisName] = {
      score: Math.round(score * 1000) / 1000,
      baseline: Math.round(baseline * 1000) / 1000,
      above_baseline: score > baseline,
      color: axisDef.color,
      description: axisDef.description,
      behaviors: axisDef.behaviors,
    };
  }

  // Deterministic archetype assignment (no LLM call)
  const archetypeKey = determineArchetype(behaviors);
  const archetypeData = ARCHETYPES[archetypeKey];

  function axisAvg(keys: readonly string[]): number {
    const rates = keys.map((k) => behaviors[k]?.rate ?? 0);
    return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 1000;
  }

  const archetype = {
    ...archetypeData,
    key: archetypeKey,
    axis_scores: {
      description: axisAvg(DESC_BEHAVIORS),
      discernment: axisAvg(DISC_BEHAVIORS),
      delegation: axisAvg(DELEG_BEHAVIORS),
    },
  };

  // Growth edge: behavior with largest negative gap vs baseline
  let growthEdgeKey = Object.keys(BASELINES)[0];
  let worstGap = Infinity;
  for (const key of Object.keys(BASELINES)) {
    const gap = behaviors[key].rate - BASELINES[key];
    if (gap < worstGap) {
      worstGap = gap;
      growthEdgeKey = key;
    }
  }

  // Build timeline with phase detection
  const timeline = buildTimeline(classifications);

  const profile: SkillProfile = {
    total_sessions: total,
    behaviors,
    branches,
    archetype,
    growth_edge: {
      behavior: growthEdgeKey,
      label: BEHAVIOR_LABELS[growthEdgeKey],
      rate: behaviors[growthEdgeKey].rate,
      baseline: BASELINES[growthEdgeKey],
      gap: Math.round(worstGap * 1000) / 1000,
    },
    generated_at: new Date().toISOString(),
    timeline,
  };

  // Track progress from previous profile
  if (previousProfile) {
    profile.previous_archetype = previousProfile.archetype.key;
    profile.previous_generated_at = previousProfile.generated_at;
  }

  return profile;
}
// Profile computation: axis scores derived from behavior rates
// Archetype assignment: deterministic from axis thresholds
// Growth edge: largest gap between user rate and population baseline
// Timeline: phase detection from session timestamps and behavior shifts
// Archetype hero art: curated museum CC0 images mapped to archetypes
