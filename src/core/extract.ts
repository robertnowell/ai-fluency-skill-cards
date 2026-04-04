import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

// Markers indicating pasted Claude Code terminal output (not genuine user input)
const PASTE_MARKERS = [
  "▗ ▗",
  "▘▘ ▝▝",
  "⏺",
  "⎿",
  "✻ Brewed",
  "✻ Sautéed",
  "✻ Baked",
  "ctrl+o to expand",
];

/**
 * Convert a munged directory name like `-Users-robertnowell-Projects-port-design-engineer-take-home`
 * into a human-readable project name like `port-design-engineer-take-home`.
 *
 * The raw value is the full working directory path with `/` replaced by `-`.
 * We can't reconstruct which dashes were path separators, so we just strip
 * the known prefix (up to and including the last parent directory token).
 */
export function cleanProjectName(raw: string): string {
  const stripped = raw.replace(/^-/, "");

  // Find the last occurrence of a common parent directory token followed by a dash.
  // Everything after it is the project path (dashes and all).
  const parentPattern = /(?:^|-)(?:Projects|Documents|Downloads|Desktop|repos|src|code|work|dev)-/gi;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = parentPattern.exec(stripped)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    return stripped.slice(lastMatch.index + lastMatch[0].length);
  }

  // No known parent found — strip "Users-{username}-" if present
  const userPattern = /^Users-[^-]+-/;
  return stripped.replace(userPattern, "");
}

export interface ExtractedMessage {
  text: string;
  rawLength: number;
  cleanedLength: number;
}

export interface ExtractedSession {
  sessionId: string;
  project: string;
  path: string;
  messages: ExtractedMessage[];
  fileSize: number;
  /** ISO timestamp of the first user message, or file mtime as fallback */
  sessionTimestamp: string;
}

function isPastedOutput(text: string): boolean {
  const sample = text.slice(0, 500);
  let markerCount = 0;
  for (const marker of PASTE_MARKERS) {
    if (sample.includes(marker)) markerCount++;
  }
  return markerCount >= 2;
}

export interface ExtractionResult {
  messages: ExtractedMessage[];
  /** ISO timestamp of the first user message (if found in JSONL) */
  firstTimestamp: string | null;
}

export function extractUserMessages(jsonlPath: string): ExtractionResult {
  const messages: ExtractedMessage[] = [];
  let firstTimestamp: string | null = null;
  const content = readFileSync(jsonlPath, "utf-8");

  for (const line of content.split("\n")) {
    if (!line.trim()) continue;

    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (obj.type !== "user") continue;

    // Capture timestamp from the first user message
    if (!firstTimestamp && obj.timestamp) {
      firstTimestamp = obj.timestamp;
    }

    const msgContent = obj.message?.content;

    // Handle string content (direct user input)
    if (typeof msgContent === "string") {
      if (isPastedOutput(msgContent)) continue;

      const cleaned = msgContent.trim().slice(0, 2000);
      if (cleaned.length > 10) {
        messages.push({
          text: cleaned,
          rawLength: msgContent.length,
          cleanedLength: cleaned.length,
        });
      }
    }
    // Skip list content (tool results)
  }

  return { messages, firstTimestamp };
}

function findSessionFiles(baseDir: string, maxPerProject = 50): string[] {
  const files: string[] = [];

  if (!existsSync(baseDir)) return files;

  try {
    const entries = readdirSync(baseDir);
    for (const entry of entries) {
      const entryPath = join(baseDir, entry);
      try {
        const stat = statSync(entryPath);
        if (stat.isDirectory()) {
          // This is a project directory — look for JSONL files inside
          try {
            const projectFiles = readdirSync(entryPath)
              .filter((f) => f.endsWith(".jsonl"))
              .map((f) => join(entryPath, f))
              .filter((f) => {
                try {
                  return statSync(f).size > 1000;
                } catch {
                  return false;
                }
              })
              .sort((a, b) => {
                try {
                  return statSync(b).mtimeMs - statSync(a).mtimeMs;
                } catch {
                  return 0;
                }
              })
              .slice(0, maxPerProject);
            files.push(...projectFiles);
          } catch {
            // Skip unreadable project dirs
          }
        } else if (entry.endsWith(".jsonl") && stat.size > 1000) {
          files.push(entryPath);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Base dir not readable
  }

  return files;
}

function findCoworkSessions(maxSessions = 50): string[] {
  const coworkBase = join(
    homedir(),
    "Library",
    "Application Support",
    "Claude",
    "local-agent-mode-sessions",
  );

  if (!existsSync(coworkBase)) return [];

  const files: string[] = [];

  function walkDir(dir: string): void {
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.endsWith(".jsonl") && stat.size > 1000) {
            files.push(fullPath);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  walkDir(coworkBase);

  return files
    .sort((a, b) => {
      try {
        return statSync(b).mtimeMs - statSync(a).mtimeMs;
      } catch {
        return 0;
      }
    })
    .slice(0, maxSessions);
}

export function findAllSessions(maxSessions = 100): ExtractedSession[] {
  const claudeCodeBase = join(homedir(), ".claude", "projects");
  const claudeCodeFiles = findSessionFiles(claudeCodeBase);
  const coworkFiles = findCoworkSessions();

  const allFiles = [...claudeCodeFiles, ...coworkFiles]
    .sort((a, b) => {
      try {
        return statSync(b).mtimeMs - statSync(a).mtimeMs;
      } catch {
        return 0;
      }
    })
    .slice(0, maxSessions);

  const sessions: ExtractedSession[] = [];

  for (const filePath of allFiles) {
    const { messages, firstTimestamp } = extractUserMessages(filePath);
    if (messages.length === 0) continue;

    const sessionId = basename(filePath, ".jsonl");
    const isCowork = filePath.includes("local-agent-mode");
    const rawProject = basename(isCowork ? filePath : join(filePath, ".."));
    const project = isCowork ? "cowork" : cleanProjectName(rawProject);

    // Use JSONL timestamp if available, else fall back to file mtime
    const sessionTimestamp = firstTimestamp
      || new Date(statSync(filePath).mtimeMs).toISOString();

    sessions.push({
      sessionId: sessionId.slice(0, 8),
      project,
      path: filePath,
      messages,
      fileSize: statSync(filePath).size,
      sessionTimestamp,
    });
  }

  return sessions;
}
