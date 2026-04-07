#!/usr/bin/env node
/**
 * Remote MCP server for skill-tree.
 *
 * Deployed to Fly.io. Accepts conversation data from the client (Claude reads
 * local files and sends them here), classifies with Haiku using the server's
 * API key, and returns the profile. The user never needs an API key.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  StreamableHTTPServerTransport,
} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { classifySessions } from "./core/classify.js";
import {
  buildProfile,
  ARCHETYPES,
  SkillProfileSchema,
  type SkillProfile,
} from "./core/profile.js";
import { renderHTML } from "./core/render.js";
import { renderGridPage } from "./core/card.js";
import { MCP_INSTRUCTIONS } from "./shared.js";
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = process.env.REPORTS_DIR || "/data/reports";
const PROFILES_DIR = join(REPORTS_DIR, "profiles");
if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR, { recursive: true });

/**
 * Build a minimal narrative-writing summary from a full profile.
 *
 * Why this exists: returning the full ~10KB profile through the MCP response
 * was the root cause of the Cowork visualization bug — Claude paraphrased the
 * response and dropped required fields when reconstructing it for `visualize`.
 * Now the full profile lives only on the server (referenced by profile_id);
 * Claude only needs enough context to write a good narrative.
 *
 * Target size: <3KB. Keep it lean. If you add a field here, justify it as
 * something Claude needs to write the narrative — not "nice to have."
 */
function buildSummary(profile: SkillProfile, profileId: string) {
  const branches = profile.branches || {};
  const behaviorEntries = Object.entries(profile.behaviors || {});

  // Top 5 behaviors ranked by how far above baseline they are.
  // Include 1-2 evidence quotes per behavior so Claude can ground the narrative.
  const ranked = behaviorEntries
    .filter(([key]) => key !== "iterative_improvement")
    .map(([key, b]) => ({ key, b, delta: (b.rate ?? 0) - (b.baseline ?? 0) }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  const notable_behaviors = ranked.map(({ key, b }) => {
    let axis = "";
    for (const [axisName, branch] of Object.entries(branches)) {
      if ((branch.behaviors || []).includes(key)) {
        axis = axisName;
        break;
      }
    }
    return {
      key,
      label: b.label,
      axis,
      rate: b.rate,
      baseline: b.baseline,
      above_baseline: b.above_baseline,
      evidence: (b.evidence || []).slice(0, 2).map((e) => ({
        text: e.text,
        project: e.project,
        session_id: e.session_id,
      })),
    };
  });

  // Phase context — narrative writing leans heavily on this for the arc.
  // Keep one key moment per phase, plus project list.
  const phases = (profile.timeline?.phases || []).map((p, i) => ({
    index: i,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    sessionCount: p.sessionCount,
    dominantAxis: p.dominantAxis,
    projects: p.projects,
    keyMoment: p.keyMoments?.[0]
      ? {
          quote: p.keyMoments[0].quote,
          behaviorLabel: p.keyMoments[0].behaviorLabel,
          project: p.keyMoments[0].project,
        }
      : null,
  }));

  return {
    profile_id: profileId,
    user_name: profile.user_name,
    total_sessions: profile.total_sessions,
    archetype: {
      key: profile.archetype.key,
      name: profile.archetype.name,
      tagline: profile.archetype.tagline,
      growth_quest: profile.archetype.growth_quest,
      target_archetype: profile.archetype.target_archetype,
      axis_scores: profile.archetype.axis_scores,
    },
    growth_edge: profile.growth_edge,
    branches: Object.fromEntries(
      Object.entries(branches).map(([name, b]) => [
        name,
        { score: b.score, baseline: b.baseline, above_baseline: b.above_baseline },
      ]),
    ),
    notable_behaviors,
    phases,
  };
}

/**
 * Load a stashed profile from disk by ID. Returns null if missing.
 * The ID is sanitized before path construction to prevent traversal.
 */
function loadStashedProfile(profileId: string): unknown | null {
  const safeId = profileId.replace(/[^a-z0-9-]/gi, "");
  if (!safeId) return null;
  const filePath = join(PROFILES_DIR, `${safeId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Bundled archetype fixtures. Lives at FIXTURES_DIR (path inside the
 * Docker container — the Dockerfile COPYs ./fixtures into /app/fixtures).
 *
 * Each archetype has profile.json (input data) and narrative.json (the
 * Claude-written narrative). report.html is regenerated on demand from
 * profile + narrative — never read from disk — so updates to the template
 * are immediately visible without re-running the fixtures script.
 */
const FIXTURES_DIR = process.env.FIXTURES_DIR || join(process.cwd(), "fixtures");

const ARCHETYPE_KEYS = [
  "polymath",
  "conductor",
  "architect",
  "forgemaster",
  "illuminator",
  "compass",
  "catalyst",
] as const;
type ArchetypeKey = typeof ARCHETYPE_KEYS[number];

function isArchetypeKey(s: string): s is ArchetypeKey {
  return (ARCHETYPE_KEYS as readonly string[]).includes(s);
}

interface FixtureBundle {
  key: ArchetypeKey;
  profile: SkillProfile;
  narrative: unknown;
}

/** Load one fixture bundle from disk. Returns null if missing/malformed. */
function loadFixture(key: ArchetypeKey): FixtureBundle | null {
  const profilePath = join(FIXTURES_DIR, key, "profile.json");
  const narrativePath = join(FIXTURES_DIR, key, "narrative.json");
  if (!existsSync(profilePath)) return null;
  try {
    const profile = JSON.parse(readFileSync(profilePath, "utf-8")) as SkillProfile;
    const narrative = existsSync(narrativePath)
      ? JSON.parse(readFileSync(narrativePath, "utf-8"))
      : null;
    return { key, profile, narrative };
  } catch {
    return null;
  }
}

/**
 * "Is this profile worth rendering?" check, applied AFTER Zod validation.
 *
 * Zod confirms the shape is correct; this check confirms the *content* is
 * coherent enough to produce a meaningful visualization. It catches cases
 * where the shape is technically valid but the data is stub/placeholder
 * (e.g. empty behaviors, "X" as the archetype name, no real hero art URL),
 * which would otherwise render as a sad-looking empty card shell.
 *
 * Returns null if the profile is meaningful, or a reason string if not.
 */
function checkProfileMeaningful(p: SkillProfile): string | null {
  if (p.total_sessions < 1) {
    return "total_sessions is 0 — no sessions to analyze.";
  }
  const behaviorCount = Object.keys(p.behaviors).length;
  if (behaviorCount < 5) {
    return `behaviors object has only ${behaviorCount} entries — expected 11 from the classifier.`;
  }
  if (!/^https?:\/\//i.test(p.archetype.hero_art.url)) {
    return `archetype.hero_art.url is not a real URL (got "${p.archetype.hero_art.url.slice(0, 30)}").`;
  }
  if (!p.archetype.name || p.archetype.name.length < 3) {
    return `archetype.name looks like a placeholder ("${p.archetype.name}").`;
  }
  // At least one behavior should have evidence — if every behavior has zero
  // evidence, the deep dive will be empty and the visualization is hollow.
  const hasAnyEvidence = Object.values(p.behaviors).some(
    (b) => Array.isArray(b.evidence) && b.evidence.length > 0,
  );
  if (!hasAnyEvidence) {
    return "no behaviors have any evidence quotes — deep dive would be empty.";
  }
  return null;
}

const BASE_URL = process.env.BASE_URL || "https://skill-tree-ai.fly.dev";

const PORT = parseInt(process.env.PORT || "3000", 10);

function createMcpSession(): { server: McpServer; transport: StreamableHTTPServerTransport } {
  const server = new McpServer(
    { name: "skill-tree-ai", version: "1.0.2" },
    { instructions: MCP_INSTRUCTIONS },
  );

  server.tool(
    "analyze",
    "Analyze conversation data and return a narrative-writing summary plus a profile_id. " +
    "The client (Claude) should read the user's local JSONL session files, extract user " +
    "messages, and pass them here as sessions_json. The full profile is stashed server-side; " +
    "the response contains only what Claude needs to write a narrative. Pass the returned " +
    "profile_id to visualize — do NOT reconstruct the full profile JSON.",
    {
      sessions_json: z.string().describe(
        'JSON array of sessions: [{"id":"...","messages":["msg1","msg2",...]}]'
      ),
      user_name: z.string().optional().describe("User's display name for the card (e.g. 'Robert Nowell')"),
    },
    async ({ sessions_json, user_name }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { content: [{ type: "text" as const, text: "Error: Server API key not configured." }] };
      }

      let parsed: Array<{ id: string; messages: string[]; timestamp?: string; project?: string }>;
      try {
        parsed = JSON.parse(sessions_json);
      } catch {
        return { content: [{ type: "text" as const, text: "Error: Invalid JSON." }] };
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { content: [{ type: "text" as const, text: "No sessions provided." }] };
      }

      const client = new Anthropic({ apiKey });

      const sessionsForClassifier = parsed.map((s) => ({
        sessionId: s.id || randomUUID().slice(0, 8),
        messages: (s.messages || []).map((text: string) => ({
          text: String(text).slice(0, 2000),
          rawLength: String(text).length,
          cleanedLength: Math.min(String(text).length, 2000),
        })),
        sessionTimestamp: s.timestamp || "",
        project: s.project || "",
      }));

      const classifications = await classifySessions(client, sessionsForClassifier, 50);
      const profile = buildProfile(classifications);
      if (user_name) profile.user_name = user_name;

      // Stash the full profile server-side. Claude only ever sees the summary.
      const profileId = randomUUID().slice(0, 12);
      try {
        writeFileSync(join(PROFILES_DIR, `${profileId}.json`), JSON.stringify(profile));
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Error: Failed to stash profile server-side: ${(err as Error).message}`,
          }],
        };
      }

      const summary = buildSummary(profile, profileId);
      return { content: [{ type: "text" as const, text: JSON.stringify(summary) }] };
    },
  );

  server.tool(
    "visualize",
    "Render a skill tree visualization and return a URL to view it. Pass the profile_id " +
    "returned by analyze plus your narrative_json. Do NOT reconstruct or pass the full " +
    "profile JSON — analyze stores the profile server-side, and reconstructing it manually " +
    "drops fields the visualization needs.",
    {
      profile_id: z.string().optional().describe("Profile ID returned by analyze (preferred)"),
      profile_json: z.string().optional().describe("Full profile JSON (legacy escape hatch — prefer profile_id)"),
      narrative_json: z.string().optional().describe('Narrative JSON: {"thesis":"...","phaseNames":{"0":"..."},"phaseInsights":{"0":"..."}}'),
    },
    async ({ profile_id, profile_json, narrative_json }) => {
      // Exactly one of profile_id / profile_json must be provided.
      if (!profile_id && !profile_json) {
        return {
          content: [{
            type: "text" as const,
            text: "Error: visualize requires either profile_id (preferred — from analyze) or profile_json (legacy).",
          }],
        };
      }
      if (profile_id && profile_json) {
        return {
          content: [{
            type: "text" as const,
            text: "Error: pass either profile_id OR profile_json, not both. Prefer profile_id from analyze.",
          }],
        };
      }

      // Load the profile from whichever source was provided.
      let rawProfile: unknown;
      if (profile_id) {
        rawProfile = loadStashedProfile(profile_id);
        if (rawProfile === null) {
          return {
            content: [{
              type: "text" as const,
              text: `Error: profile_id "${profile_id}" not found on server. The stash may have expired or the ID is malformed. Re-run analyze to get a fresh profile_id.`,
            }],
          };
        }
      } else {
        try {
          rawProfile = JSON.parse(profile_json!);
        } catch (err) {
          return {
            content: [{
              type: "text" as const,
              text: `Error: profile_json is not valid JSON: ${(err as Error).message}`,
            }],
          };
        }
      }

      // Strict validation. This is the boundary that catches reconstructed/trimmed
      // profiles before they reach the template and produce a broken visualization.
      const parsed = SkillProfileSchema.safeParse(rawProfile);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 5)
          .map((iss) => `  - ${iss.path.join(".") || "(root)"}: ${iss.message}`)
          .join("\n");
        return {
          content: [{
            type: "text" as const,
            text:
              "Error: profile validation failed. The profile is missing required fields. " +
              "If you reconstructed it manually, stop — pass the profile_id from analyze instead.\n" +
              `Validation issues:\n${issues}`,
          }],
        };
      }
      const profile = parsed.data as SkillProfile;

      // Content sanity: even if the shape is valid, refuse to render an
      // empty-looking shell. Real analyze runs always produce coherent
      // profiles; this catches stub/placeholder data.
      const meaninglessReason = checkProfileMeaningful(profile);
      if (meaninglessReason) {
        return {
          content: [{
            type: "text" as const,
            text:
              "Error: profile is structurally valid but lacks meaningful content — " +
              "refusing to render a hollow visualization. " +
              `Reason: ${meaninglessReason}`,
          }],
        };
      }

      // Narrative is optional but if provided must parse cleanly. No more silent swallow.
      let narrative = null;
      if (narrative_json) {
        try {
          narrative = JSON.parse(narrative_json);
        } catch (err) {
          return {
            content: [{
              type: "text" as const,
              text: `Error: narrative_json is not valid JSON: ${(err as Error).message}`,
            }],
          };
        }
      }

      const html = renderHTML(profile, "skill-tree.html", narrative);
      const id = randomUUID().slice(0, 12);
      writeFileSync(join(REPORTS_DIR, `${id}.html`), html);

      const url = `${BASE_URL}/report/${id}`;
      return { content: [{ type: "text" as const, text: url }] };
    },
  );

  server.tool(
    "archetypes",
    "List all 7 archetypes.",
    {},
    async () => {
      const list = Object.entries(ARCHETYPES)
        .map(([, a]) => `**${a.name}** — ${a.tagline}`)
        .join("\n\n");
      return { content: [{ type: "text" as const, text: list }] };
    },
  );

  // Stateless mode: every request stands alone, no initialize handshake required.
  // Why: Fly.io auto_stop_machines wipes any in-memory session map on cold start,
  // and the SDK's stateful transport rejects post-restart tool calls with
  // "Server not initialized" because a fresh transport never saw the original
  // initialize. All three of our tools (analyze, visualize, archetypes) are
  // already stateless, so there's nothing to lose by dropping session tracking.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  server.connect(transport);

  return { server, transport };
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  // Stateless: spin up a fresh server+transport per request. The SDK transport
  // handles the request without requiring a prior initialize, and any
  // mcp-session-id header from the client is simply ignored.
  const session = createMcpSession();
  await session.transport.handleRequest(req, res, await readBody(req));
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve(body); }
    });
  });
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url.pathname === "/mcp" && req.method === "POST") {
    await handleMcp(req, res);
    return;
  }

  if (url.pathname.startsWith("/report/") && req.method === "GET") {
    const id = url.pathname.slice(8).replace(/[^a-z0-9-]/gi, "");
    const filePath = join(REPORTS_DIR, `${id}.html`);
    if (id && existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(filePath));
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Report not found. It may have expired — run 'skill tree' again to generate a new one.");
    }
    return;
  }

  // /grid — public archetype showcase. Renders all 7 fixture cards in a grid.
  if (url.pathname === "/grid" && req.method === "GET") {
    const bundles: FixtureBundle[] = [];
    for (const k of ARCHETYPE_KEYS) {
      const b = loadFixture(k);
      if (b) bundles.push(b);
    }
    if (bundles.length === 0) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`No fixtures found at ${FIXTURES_DIR}. Run 'npm run fixtures' before deploying.`);
      return;
    }
    const html = renderGridPage(
      bundles.map((b) => ({ key: b.key, profile: b.profile })),
      { hrefTemplate: "/fixture/{key}" },
    );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  // /fixture/:key — full report for one archetype, rendered on demand from
  // bundled profile + narrative. Always reflects the current template.
  if (url.pathname.startsWith("/fixture/") && req.method === "GET") {
    const key = url.pathname.slice(9).replace(/[^a-z]/gi, "");
    if (!isArchetypeKey(key)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Unknown archetype "${key}". Valid: ${ARCHETYPE_KEYS.join(", ")}`);
      return;
    }
    const bundle = loadFixture(key);
    if (!bundle) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Fixture "${key}" not found at ${FIXTURES_DIR}.`);
      return;
    }
    const html = renderHTML(bundle.profile, "skill-tree.html", bundle.narrative as Parameters<typeof renderHTML>[2]);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

httpServer.listen(PORT, () => {
  console.error(`Skill Tree MCP server running on http://localhost:${PORT}/mcp`);
});
// Visualize: returns self-contained HTML with injected profile data
// Session timestamps: extracted from JSONL for timeline construction
// Project names: resolved from session directory paths
// Archetypes tool: lists all 7 with descriptions and progression paths
