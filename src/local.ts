#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { findAllSessions } from "./core/extract.js";
import { classifySessions } from "./core/classify.js";
import { buildProfile, type SkillProfile } from "./core/profile.js";
import { writeAndOpen, openInBrowser, type NarrativeData } from "./core/render.js";
import type { SessionClassification } from "./core/classify.js";
import { MCP_INSTRUCTIONS } from "./shared.js";
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// --- State & Persistence ---

let cachedProfile: SkillProfile | null = null;

function getSkillTreeDir(): string {
  const dir = join(homedir(), ".skill-tree");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getProfilePath(): string {
  return join(getSkillTreeDir(), "profile.json");
}

function getHistoryDir(): string {
  const dir = join(getSkillTreeDir(), "history");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function loadCachedProfile(): SkillProfile | null {
  const path = getProfilePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function saveProfile(profile: SkillProfile): void {
  const dir = getSkillTreeDir();

  // Save current profile
  writeFileSync(join(dir, "profile.json"), JSON.stringify(profile, null, 2));

  // Save timestamped snapshot for progress tracking
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  writeFileSync(
    join(getHistoryDir(), `profile-${ts}.json`),
    JSON.stringify(profile, null, 2),
  );

  // Write growth-quest.txt for SessionStart hook
  writeFileSync(
    join(dir, "growth-quest.txt"),
    profile.archetype.growth_quest,
  );
}

// --- MCP Server ---

const server = new McpServer(
  { name: "skill-tree-ai", version: "1.0.0" },
  { instructions: MCP_INSTRUCTIONS },
);

server.tool(
  "analyze",
  "Analyze your Claude conversation history. Scans Claude Code and Cowork sessions, classifies 11 AI collaboration behaviors, builds a skill profile with character archetype and growth recommendation. Returns the full profile.",
  {
    max_sessions: z
      .number()
      .default(100)
      .describe("Maximum number of sessions to analyze (most recent first)"),
    force_refresh: z
      .boolean()
      .default(false)
      .describe("Force re-analysis even if cached results exist"),
  },
  async ({ max_sessions, force_refresh }) => {
    // Check cache unless forced
    if (!force_refresh) {
      const cached = loadCachedProfile();
      if (cached) {
        cachedProfile = cached;
        // Load cached classifications for digest
        const cachedClassifications = loadCachedClassifications();
        return {
          content: [
            {
              type: "text",
              text: formatProfileSummary(cached) + "\n\n" + formatSessionDigest(cachedClassifications),
            },
          ],
        };
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: ANTHROPIC_API_KEY not set. Set it in your environment to enable skill tree analysis.",
          },
        ],
      };
    }

    const client = new Anthropic({ apiKey });

    // Extract sessions
    const sessions = findAllSessions(max_sessions);
    if (sessions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No conversation sessions found. Make sure you have Claude Code or Cowork conversations on this machine.",
          },
        ],
      };
    }

    // Classify (uses per-session cache — only new sessions hit the API)
    const classifications = await classifySessions(
      client,
      sessions.map((s) => ({
        sessionId: s.sessionId,
        messages: s.messages,
        sessionTimestamp: s.sessionTimestamp,
        project: s.project,
      })),
      50,
    );

    // Build profile (deterministic — no LLM call)
    const previousProfile = loadCachedProfile();
    const profile = buildProfile(classifications, previousProfile);
    cachedProfile = profile;
    saveProfile(profile);

    return {
      content: [
        {
          type: "text",
          text: formatProfileSummary(profile) + "\n\n" + formatSessionDigest(classifications),
        },
      ],
    };
  },
);

server.tool(
  "visualize",
  "Generate an HTML skill tree visualization and open it in your browser. Run 'analyze' first. Pass narrative_json from your narrative synthesis to enrich the deep dive section.",
  {
    template: z
      .enum(["skill-tree", "radar-trigon", "radar-constellation"])
      .default("skill-tree")
      .describe("Visualization template to use"),
    narrative_json: z
      .string()
      .optional()
      .describe('Optional narrative JSON from your analysis: {"thesis":"...","phaseInsights":{"0":"...","1":"..."}}'),
  },
  async ({ template, narrative_json }) => {
    const profile = cachedProfile || loadCachedProfile();

    if (!profile) {
      return {
        content: [
          {
            type: "text",
            text: "No profile data available. Run the 'analyze' tool first.",
          },
        ],
      };
    }

    const templateFile = `${template}.html`;

    // Parse narrative from Claude if provided
    let narrative: NarrativeData | null = null;
    if (narrative_json) {
      try {
        narrative = JSON.parse(narrative_json);
      } catch {
        // Invalid JSON — render without narrative
      }
    }

    const outputPath = writeAndOpen(profile, templateFile, narrative);
    await openInBrowser(outputPath);

    return {
      content: [
        {
          type: "text",
          text: `Skill tree visualization generated and opened in browser.\nFile: ${outputPath}`,
        },
      ],
    };
  },
);

server.tool(
  "growth_quest",
  "Get your current growth recommendation — one specific thing to try in your next session, based on your archetype's growth path.",
  {},
  async () => {
    const profile = cachedProfile || loadCachedProfile();

    if (!profile) {
      return {
        content: [
          {
            type: "text",
            text: "No profile data available. Run the 'analyze' tool first to get personalized recommendations.",
          },
        ],
      };
    }

    const a = profile.archetype;
    const ge = profile.growth_edge;
    const userPct = Math.round(ge.rate * 100);
    const basePct = Math.round(ge.baseline * 100);

    return {
      content: [
        {
          type: "text",
          text: [
            `${a.name} — ${a.tagline}`,
            ``,
            `Superpower: ${a.superpower}`,
            ``,
            `Next Unlock: ${a.growth_unlock}`,
            ``,
            `Quest: ${a.growth_quest}`,
            ``,
            `Growth edge: ${ge.label} — you're at ${userPct}%, population average is ${basePct}%`,
          ].join("\n"),
        },
      ],
    };
  },
);

// --- Format helpers ---

function loadCachedClassifications(): SessionClassification[] {
  const cacheDir = join(homedir(), ".skill-tree", "cache");
  if (!existsSync(cacheDir)) return [];
  try {
    const files = readdirSync(cacheDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      try {
        return JSON.parse(readFileSync(join(cacheDir, f), "utf-8"));
      } catch {
        return null;
      }
    }).filter((x): x is SessionClassification => x !== null);
  } catch {
    return [];
  }
}

function formatSessionDigest(classifications: SessionClassification[]): string {
  if (classifications.length === 0) return "";

  // Sort chronologically
  const sorted = [...classifications].sort((a, b) => {
    const ta = a.sessionTimestamp || a.classifiedAt;
    const tb = b.sessionTimestamp || b.classifiedAt;
    return ta.localeCompare(tb);
  });

  const firstDate = sorted[0].sessionTimestamp || sorted[0].classifiedAt;
  const lastDate = sorted[sorted.length - 1].sessionTimestamp || sorted[sorted.length - 1].classifiedAt;
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const lines: string[] = [
    `─── Session Timeline (${sorted.length} sessions, ${fmtDate(firstDate)}–${fmtDate(lastDate)}) ───`,
    ``,
  ];

  for (const c of sorted) {
    const date = fmtDate(c.sessionTimestamp || c.classifiedAt);
    lines.push(`[${date}] ${c.sessionId} — ${c.sessionSummary}`);

    // Show evidence for present behaviors (skip iterative_improvement — too common)
    const evidenceLines: string[] = [];
    for (const [key, b] of Object.entries(c.behaviors)) {
      if (key === "iterative_improvement") continue;
      if (b.present && b.evidence && b.evidence !== "none") {
        const label = key.replace(/_/g, " ");
        const quote = b.evidence.length > 120 ? b.evidence.slice(0, 117) + "..." : b.evidence;
        evidenceLines.push(`  • ${label}: "${quote}"`);
      }
    }
    // Cap at 3 evidence lines per session to keep digest manageable
    lines.push(...evidenceLines.slice(0, 3));
    lines.push(``);
  }

  return lines.join("\n");
}

function formatProfileSummary(profile: SkillProfile): string {
  const a = profile.archetype;
  const lines: string[] = [
    `╔══════════════════════════════════════╗`,
    `║  ${a.name.padStart(18).padEnd(36)}║`,
    `╚══════════════════════════════════════╝`,
    `"${a.tagline}"`,
    ``,
    `Superpower: ${a.superpower}`,
    ``,
    `─── Skill Profile (${profile.total_sessions} sessions) ───`,
    ``,
  ];

  for (const [axisName, axis] of Object.entries(profile.branches)) {
    const indicator = axis.above_baseline ? "+" : "-";
    lines.push(`${axisName} (${indicator} vs avg):`);
    for (const key of axis.behaviors) {
      const b = profile.behaviors[key];
      if (!b) continue;
      const pct = Math.round(b.rate * 100);
      const basePct = Math.round(b.baseline * 100);
      const arrow = b.above_baseline ? "↑" : "↓";
      const bar =
        "■".repeat(Math.round(pct / 10)) +
        "□".repeat(10 - Math.round(pct / 10));
      lines.push(`  ${bar} ${pct}% ${b.label} (avg: ${basePct}%) ${arrow}`);
    }
    lines.push(``);
  }

  const ge = profile.growth_edge;
  lines.push(`Next Unlock: ${a.growth_unlock}`);
  lines.push(`Quest: ${a.growth_quest}`);

  if (profile.previous_archetype && profile.previous_archetype !== a.key) {
    lines.push(`\nProgress: Archetype changed from ${profile.previous_archetype} → ${a.key}`);
  }

  return lines.join("\n");
}

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
// Local stdio transport: for npm/CLI usage without remote server
