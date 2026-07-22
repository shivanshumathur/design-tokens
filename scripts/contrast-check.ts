import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "../src/lib/color.js";
import type {
  CanonicalToken,
  ContrastPair,
  ValidationIssue,
} from "../src/types/token.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COLORS = join(ROOT, "tokens/colors");

function loadTier(file: string): CanonicalToken[] {
  return JSON.parse(readFileSync(join(COLORS, file), "utf8")) as CanonicalToken[];
}

function loadAll(): CanonicalToken[] {
  return [
    ...loadTier("primitive.json"),
    ...loadTier("alias.json"),
    ...loadTier("semantic.json"),
    ...loadTier("component.json"),
    ...loadTier("state.json"),
  ];
}

function resolveHex(
  id: string,
  byId: Map<string, CanonicalToken>,
  depth = 0
): string | null {
  if (depth > 20) return null;
  const t = byId.get(id);
  if (!t) return null;
  if (t.value?.hex) return t.value.hex;
  if (t.aliasOf) return resolveHex(t.aliasOf, byId, depth + 1);
  return null;
}

function main() {
  const tokens = loadAll();
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const pairs = JSON.parse(
    readFileSync(join(COLORS, "contrast-pairs.json"), "utf8")
  ) as ContrastPair[];

  const issues: ValidationIssue[] = [];

  for (const pair of pairs) {
    const fg = resolveHex(pair.foreground, byId);
    const bg = resolveHex(pair.background, byId);
    const fgName = byId.get(pair.foreground)?.name ?? pair.foreground;
    const bgName = byId.get(pair.background)?.name ?? pair.background;

    if (!fg || !bg) {
      issues.push({
        severity: "blocking",
        rule: "accessibility-failures",
        message: `Cannot resolve hex for pair ${fgName} on ${bgName}`,
      });
      continue;
    }

    const ratio = contrastRatio(fg, bg);
    const min = pair.minRatioAA ?? (pair.largeText ? 3 : 4.5);
    const rounded = Math.round(ratio * 100) / 100;

    if (ratio < min) {
      issues.push({
        severity: "blocking",
        rule: "accessibility-failures",
        message: `${fgName} on ${bgName}: ${rounded}:1 < AA ${min}:1 (${fg} / ${bg})`,
      });
    } else {
      console.log(`✓ ${fgName} on ${bgName}: ${rounded}:1 (AA ${min}:1)`);
    }
  }

  if (issues.length) {
    for (const i of issues) console.log(`[FAIL] ${i.message}`);
    process.exit(1);
  }
  console.log(`\n✓ All ${pairs.length} contrast pairs pass AA`);
}

main();
