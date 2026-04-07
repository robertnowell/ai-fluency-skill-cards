import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHETYPES, type SkillProfile } from "./profile.js";
import {
  CARD_FACE_CSS,
  CARD_FLIP_CSS,
  RENDER_MINI_RADAR_JS,
  RENDER_CARD_JS,
} from "./card.js";

export interface NarrativeData {
  thesis: string;
  phaseInsights: Record<number | string, string>;
  /** Claude can override auto-generated phase names with contextual ones */
  phaseNames?: Record<number | string, string>;
}

function getTemplateDir(): string {
  // Both src/core/render.ts and dist/core/render.js are two levels deep,
  // so ../../templates resolves correctly in dev and production.
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const relPath = join(thisDir, "..", "..", "templates");
  if (existsSync(relPath)) return relPath;

  // Fallback: look in cwd
  const cwdPath = join(process.cwd(), "templates");
  if (existsSync(cwdPath)) return cwdPath;

  throw new Error("Cannot find templates directory");
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
    .replace("__NARRATIVE_DATA__", narrativeStr)
    .replace("/* __CARD_FLIP_CSS__ */", CARD_FLIP_CSS)
    .replace("/* __CARD_FACE_CSS__ */", CARD_FACE_CSS)
    .replace("/* __RENDER_MINI_RADAR_JS__ */", RENDER_MINI_RADAR_JS)
    .replace("/* __RENDER_CARD_JS__ */", RENDER_CARD_JS);
}
