import Anthropic from "@anthropic-ai/sdk";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
export interface ExtractedMessage {
  text: string;
  rawLength: number;
  cleanedLength: number;
}

// Published population baselines from the AI Fluency Index (Feb 2026)
export const BASELINES: Record<string, number> = {
  iterative_improvement: 0.857,
  clarify_goals: 0.511,
  show_examples: 0.411,
  specify_format: 0.3,
  set_interactive_mode: 0.3,
  express_tone_style: 0.227,
  identify_context_gaps: 0.203,
  define_audience: 0.176,
  question_reasoning: 0.158,
  consult_approach: 0.101,
  verify_facts: 0.087,
};

export const BEHAVIOR_LABELS: Record<string, string> = {
  iterative_improvement: "Iterates on outputs",
  clarify_goals: "Clarifies goals upfront",
  show_examples: "Provides examples",
  specify_format: "Specifies format",
  set_interactive_mode: "Sets interaction style",
  express_tone_style: "Expresses tone prefs",
  identify_context_gaps: "Flags context gaps",
  define_audience: "Defines audience",
  question_reasoning: "Questions Claude's logic",
  consult_approach: "Discusses approach first",
  verify_facts: "Verifies facts",
};

// 3-axis system from the 4D AI Fluency Framework (Dakan & Feller)
// mapped to artifact effect data (Anthropic AI Fluency Index, Feb 2026)
// Description behaviors INCREASE with polished artifacts
// Delegation behaviors INCREASE with polished artifacts
// Discernment behaviors DECREASE with polished artifacts
// (Diligence — the 4th D — is not observable in-chat)
export const AXES = {
  Description: {
    behaviors: ["show_examples", "specify_format", "express_tone_style", "define_audience"],
    color: "#cca67b",
    description: "How you shape Claude's output",
    baseline: 0.28, // avg of individual baselines
  },
  Discernment: {
    behaviors: ["identify_context_gaps", "question_reasoning", "verify_facts"],
    color: "#7bcc96",
    description: "How you assess Claude's reasoning",
    baseline: 0.15,
  },
  Delegation: {
    behaviors: ["clarify_goals", "consult_approach", "set_interactive_mode"],
    color: "#7ba3cc",
    description: "How you set up the collaboration",
    baseline: 0.30,
  },
} as const;

export interface BehaviorClassification {
  present: boolean;
  confidence: "high" | "low";
  evidence: string;
}

export interface SessionClassification {
  sessionId: string;
  behaviors: Record<string, BehaviorClassification>;
  sessionSummary: string;
  classifiedAt: string;
  /** ISO timestamp of when the session actually occurred (from JSONL) */
  sessionTimestamp?: string;
  /** Human-readable project name (e.g. "skill-tree", "port/konid") */
  project?: string;
}

const CLASSIFIER_PROMPT = `You are analyzing a user's conversation with Claude to detect specific AI collaboration behaviors.

Given the user's messages from a single session, classify whether each of the following 11 behaviors is PRESENT or ABSENT. These behaviors come from the AI Fluency Index (Anthropic, Feb 2026).

For each behavior, respond with:
- present: true/false
- confidence: "high" or "low"
- evidence: A brief quote or description of the moment that triggered this classification (or "none" if absent)

THE 11 BEHAVIORS:

1. ITERATIVE_IMPROVEMENT: User builds on previous exchanges to refine work, rather than accepting Claude's first response.
2. CLARIFY_GOALS: User states their objective or context before requesting assistance.
3. SHOW_EXAMPLES: User provides examples of desired output, reference material, or illustrative samples.
4. SPECIFY_FORMAT: User states how output should be organized, formatted, or structured.
5. SET_INTERACTIVE_MODE: User requests Claude maintain a certain interaction style (e.g., "be concise", "ask me questions", "think step by step").
6. EXPRESS_TONE_STYLE: User specifies communication tone or writing style preferences.
7. IDENTIFY_CONTEXT_GAPS: User notes gaps in information Claude might need, or proactively provides context Claude is missing.
8. DEFINE_AUDIENCE: User specifies who the deliverable is for (e.g., "explain this to a 5-year-old", "this is for senior engineers").
9. QUESTION_REASONING: User challenges Claude's explanations, logic, or approach — pushes back when something seems wrong.
10. CONSULT_APPROACH: User asks Claude to review or discuss strategy/approach before starting execution.
11. VERIFY_FACTS: User fact-checks critical information Claude provides, or asks Claude to verify its own claims.

USER MESSAGES FROM THIS SESSION:
---
{MESSAGES}
---

Respond in valid JSON with this exact structure:
{
  "behaviors": {
    "iterative_improvement": {"present": true, "confidence": "high", "evidence": "..."},
    "clarify_goals": {"present": true, "confidence": "high", "evidence": "..."},
    "show_examples": {"present": false, "confidence": "high", "evidence": "none"},
    "specify_format": {"present": false, "confidence": "high", "evidence": "none"},
    "set_interactive_mode": {"present": false, "confidence": "high", "evidence": "none"},
    "express_tone_style": {"present": false, "confidence": "high", "evidence": "none"},
    "identify_context_gaps": {"present": false, "confidence": "high", "evidence": "none"},
    "define_audience": {"present": false, "confidence": "high", "evidence": "none"},
    "question_reasoning": {"present": false, "confidence": "high", "evidence": "none"},
    "consult_approach": {"present": false, "confidence": "high", "evidence": "none"},
    "verify_facts": {"present": false, "confidence": "high", "evidence": "none"}
  },
  "session_summary": "One sentence describing what this session was about"
}`;

function getCacheDir(): string {
  const dir = join(homedir(), ".skill-tree", "cache");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getCachedClassification(
  sessionId: string,
): SessionClassification | null {
  const cachePath = join(getCacheDir(), `${sessionId}.json`);
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

function cacheClassification(classification: SessionClassification): void {
  const cachePath = join(getCacheDir(), `${classification.sessionId}.json`);
  writeFileSync(cachePath, JSON.stringify(classification, null, 2));
}

export async function classifySession(
  client: Anthropic,
  sessionId: string,
  messages: ExtractedMessage[],
  sessionTimestamp?: string,
  project?: string,
): Promise<SessionClassification> {
  const cached = getCachedClassification(sessionId);
  if (cached) {
    // Backfill timestamp and project on old cache entries
    let dirty = false;
    if (sessionTimestamp && !cached.sessionTimestamp) {
      cached.sessionTimestamp = sessionTimestamp;
      dirty = true;
    }
    if (project && !cached.project) {
      cached.project = project;
      dirty = true;
    }
    if (dirty) cacheClassification(cached);
    return cached;
  }

  let messageText = "";
  if (project) {
    messageText += `PROJECT: ${project}\n\n`;
  }
  messageText += messages
    .map((m, i) => `[Message ${i + 1}]: ${m.text}`)
    .join("\n\n---\n\n");

  if (messageText.length > 10000) {
    messageText = messageText.slice(0, 10000) + "\n\n[... truncated ...]";
  }

  const prompt = CLASSIFIER_PROMPT.replace("{MESSAGES}", messageText);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}") + 1;

  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error(`Failed to parse classifier response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));

  const classification: SessionClassification = {
    sessionId,
    behaviors: parsed.behaviors,
    sessionSummary: parsed.session_summary || "Unknown session",
    classifiedAt: new Date().toISOString(),
    sessionTimestamp: sessionTimestamp || "",
    project: project || "",
  };

  cacheClassification(classification);
  return classification;
}

export async function classifySessions(
  client: Anthropic,
  sessions: Array<{ sessionId: string; messages: ExtractedMessage[]; sessionTimestamp?: string; project?: string }>,
  maxNew = 50,
  onProgress?: (completed: number, total: number) => void,
): Promise<SessionClassification[]> {
  // Split into cached (instant) and uncached (needs API call)
  const cachedResults: SessionClassification[] = [];
  const uncachedSessions: typeof sessions = [];

  for (const session of sessions) {
    const cached = getCachedClassification(session.sessionId);
    if (cached) {
      // Backfill timestamp and project on old cache entries
      let dirty = false;
      if (session.sessionTimestamp && !cached.sessionTimestamp) {
        cached.sessionTimestamp = session.sessionTimestamp;
        dirty = true;
      }
      if (session.project && !cached.project) {
        cached.project = session.project;
        dirty = true;
      }
      if (dirty) cacheClassification(cached);
      cachedResults.push(cached);
    } else {
      uncachedSessions.push(session);
    }
  }

  // Classify uncached sessions in parallel batches (8 at a time)
  const BATCH_SIZE = 8;
  const uncachedResults: SessionClassification[] = [];
  const toClassify = uncachedSessions.slice(0, maxNew);

  for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
    const batch = toClassify.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((s) => classifySession(client, s.sessionId, s.messages, s.sessionTimestamp, s.project)),
    );
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        uncachedResults.push(result.value);
      }
      // Skip failed sessions — they'll be retried on next run
    }
    onProgress?.(cachedResults.length + uncachedResults.length, sessions.length);
  }

  return [...cachedResults, ...uncachedResults];
}
// Supports parallel batch execution with per-session caching
