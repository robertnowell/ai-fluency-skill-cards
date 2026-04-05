import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ARCHETYPES, type SkillProfile } from "./profile.js";

export interface NarrativeData {
  thesis: string;
  phaseInsights: Record<number | string, string>;
  /** Claude can override auto-generated phase names with contextual ones */
  phaseNames?: Record<number | string, string>;
}

const execFileAsync = promisify(execFile);

function getTemplateDir(): string {
  // Try relative to this file first (works in dev and dist)
  const thisDir = dirname(fileURLToPath(import.meta.url));

  // In dist/core/render.js → templates is at ../../templates
  const distPath = join(thisDir, "..", "..", "templates");
  if (existsSync(distPath)) return distPath;

  // In src/core/render.ts → templates is at ../../templates
  const srcPath = join(thisDir, "..", "..", "templates");
  if (existsSync(srcPath)) return srcPath;

  // Fallback: look in cwd
  const cwdPath = join(process.cwd(), "templates");
  if (existsSync(cwdPath)) return cwdPath;

  throw new Error("Cannot find templates directory");
}

function getOutputDir(): string {
  const dir = join(homedir(), ".skill-tree");
  return dir;
}

export function renderHTML(
  profile: SkillProfile,
  templateName = "skill-tree.html",
  narrative?: NarrativeData | null,
): string {
  const templatePath = join(getTemplateDir(), templateName);
  const template = readFileSync(templatePath, "utf-8");
  // Escape </script> in JSON to prevent HTML parser breaking
  const jsonStr = JSON.stringify(profile).replace(/<\/script>/gi, "<\\/script>");
  const archetypesStr = JSON.stringify(ARCHETYPES).replace(/<\/script>/gi, "<\\/script>");
  const narrativeStr = JSON.stringify(narrative || null).replace(/<\/script>/gi, "<\\/script>");
  return template
    .replace("__PROFILE_DATA__", jsonStr)
    .replace("__ARCHETYPES_DATA__", archetypesStr)
    .replace("__NARRATIVE_DATA__", narrativeStr);
}

export function writeAndOpen(
  profile: SkillProfile,
  templateName = "skill-tree.html",
  narrative?: NarrativeData | null,
): string {
  const html = renderHTML(profile, templateName, narrative);
  const baseName = templateName.replace(".html", "");
  const outputPath = join(getOutputDir(), `${baseName}.html`);
  writeFileSync(outputPath, html);
  return outputPath;
}

export async function openInBrowser(filePath: string): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      await execFileAsync("open", [filePath]);
    } else if (platform === "linux") {
      await execFileAsync("xdg-open", [filePath]);
    } else if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", filePath]);
    }
  } catch {
    // Silent — caller has the path
  }
}
// Narrative injection: thesis and phase insights into template
// Phase names: derived from actual project work, not generic labels
