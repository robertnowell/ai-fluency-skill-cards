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
import { buildProfile, ARCHETYPES } from "./core/profile.js";
import { renderHTML } from "./core/render.js";
import { MCP_INSTRUCTIONS } from "./shared.js";
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = process.env.REPORTS_DIR || "/data/reports";
if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || "https://skill-tree-ai.fly.dev";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Map from transport session ID → { server, transport }
const activeSessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

function createMcpSession(): { server: McpServer; transport: StreamableHTTPServerTransport } {
  const server = new McpServer(
    { name: "skill-tree-ai", version: "1.0.1" },
    { instructions: MCP_INSTRUCTIONS },
  );

  server.tool(
    "analyze",
    "Analyze conversation data and return a skill profile with archetype. " +
    "The client (Claude) should read the user's local JSONL session files, " +
    "extract user messages, and pass them here as sessions_json.",
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

      return { content: [{ type: "text" as const, text: JSON.stringify(profile) }] };
    },
  );

  server.tool(
    "visualize",
    "Render a skill tree visualization and return a URL to view it. Pass the profile JSON from analyze and your narrative JSON.",
    {
      profile_json: z.string().describe("Profile JSON from analyze"),
      narrative_json: z.string().optional().describe('Narrative JSON: {"thesis":"...","phaseNames":{"0":"..."},"phaseInsights":{"0":"..."}}'),
    },
    async ({ profile_json, narrative_json }) => {
      let profile, narrative = null;
      try { profile = JSON.parse(profile_json); } catch {
        return { content: [{ type: "text" as const, text: "Error: Invalid profile JSON." }] };
      }
      if (narrative_json) {
        try { narrative = JSON.parse(narrative_json); } catch { /* render without */ }
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

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) activeSessions.delete(sid);
  };

  server.connect(transport);

  return { server, transport };
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && activeSessions.has(sessionId)) {
    // Existing session
    const { transport } = activeSessions.get(sessionId)!;
    await transport.handleRequest(req, res, await readBody(req));
  } else if (!sessionId) {
    // New session — create server + transport, let transport assign session ID
    const session = createMcpSession();
    // Handle the request — transport will set mcp-session-id header in response
    await session.transport.handleRequest(req, res, await readBody(req));
    // After handling, get the session ID the transport assigned
    const newSid = session.transport.sessionId;
    if (newSid) {
      activeSessions.set(newSid, session);
    }
  } else {
    // Session ID provided but not found — stale session
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Session expired" }, id: null }));
  }
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
    res.end(JSON.stringify({ status: "ok", sessions: activeSessions.size }));
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
