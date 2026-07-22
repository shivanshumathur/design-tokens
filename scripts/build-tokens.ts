import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CanonicalToken } from "../src/types/token.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COLORS = join(ROOT, "tokens/colors");

function loadTier(file: string): CanonicalToken[] {
  try {
    return JSON.parse(readFileSync(join(COLORS, file), "utf8")) as CanonicalToken[];
  } catch {
    return [];
  }
}

function resolveHex(
  t: CanonicalToken,
  byId: Map<string, CanonicalToken>,
  depth = 0
): string | null {
  if (depth > 20) return null;
  if (t.value?.hex) return t.value.hex;
  if (t.aliasOf) {
    const target = byId.get(t.aliasOf);
    if (target) return resolveHex(target, byId, depth + 1);
  }
  return null;
}

function cssVarName(name: string): string {
  return `--${name.replace(/\./g, "-")}`;
}

function main() {
  const tokens = [
    ...loadTier("primitive.json"),
    ...loadTier("alias.json"),
    ...loadTier("semantic.json"),
    ...loadTier("component.json"),
    ...loadTier("state.json"),
  ];
  const byId = new Map(tokens.map((t) => [t.id, t]));

  const registry = {
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    tokens,
  };
  mkdirSync(join(ROOT, "tokens/_registry"), { recursive: true });
  writeFileSync(
    join(ROOT, "tokens/_registry/canonical-registry.json"),
    JSON.stringify(registry, null, 2) + "\n"
  );

  const cssLines = [":root {"];
  const tsLines: string[] = [
    "/** Auto-generated — do not edit */",
    "export const Colors = {",
  ];
  const dtcg: Record<string, unknown> = {};

  for (const t of tokens) {
    const hex = resolveHex(t, byId);
    if (!hex) continue;
    const varName = cssVarName(t.name);
    cssLines.push(`  ${varName}: ${hex};`);
    const safeKey = t.name.replace(/\./g, "_");
    tsLines.push(`  ${JSON.stringify(safeKey)}: ${JSON.stringify(hex)},`);

    const path = t.name.split(".");
    let cursor: Record<string, unknown> = dtcg;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i]!;
      if (!cursor[seg] || typeof cursor[seg] !== "object") cursor[seg] = {};
      cursor = cursor[seg] as Record<string, unknown>;
    }
    cursor[path[path.length - 1]!] = {
      $type: "color",
      $value: hex,
      $description: t.description,
      $extensions: {
        canonical: {
          id: t.id,
          tier: t.tier,
          figmaVariableId: t.figmaVariableId,
        },
      },
    };
  }
  cssLines.push("}");
  tsLines.push("} as const;");
  tsLines.push("export type ColorTokenName = keyof typeof Colors;");

  const dark = JSON.parse(
    readFileSync(join(COLORS, "themes/dark.json"), "utf8")
  ) as { resolutions: Record<string, string> };

  cssLines.push("", '[data-theme="dark"] {');
  for (const [name, id] of Object.entries(dark.resolutions)) {
    const target = byId.get(id);
    const resolved = target ? resolveHex(target, byId) : null;
    if (resolved) cssLines.push(`  ${cssVarName(name)}: ${resolved};`);
  }
  cssLines.push("}");

  const storybookDocs = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    tier: t.tier,
    description: t.description,
    hex: resolveHex(t, byId),
    cssVariable: cssVarName(t.name),
    themes: t.themes,
    version: t.version,
    deprecated: t.deprecated,
    aliasOf: t.aliasOf,
    figmaVariableId: t.figmaVariableId,
    lastModifiedAt: t.lastModifiedAt,
    lastModifiedBy: t.lastModifiedBy,
  }));

  writeFileSync(join(ROOT, "generated/css/colors.css"), cssLines.join("\n") + "\n");
  writeFileSync(
    join(ROOT, "generated/scss/_colors.scss"),
    cssLines
      .filter((l) => l.includes("--"))
      .map((l) => {
        const m = l.trim().match(/^(--[\w-]+):\s*(.+);$/);
        if (!m) return null;
        return `$${m[1]!.slice(2).replace(/-/g, "-")}: ${m[2]};`;
      })
      .filter(Boolean)
      .join("\n") + "\n"
  );
  writeFileSync(
    join(ROOT, "generated/typescript/colors.ts"),
    tsLines.join("\n") + "\n"
  );
  writeFileSync(
    join(ROOT, "generated/json/colors.tokens.json"),
    JSON.stringify(dtcg, null, 2) + "\n"
  );
  writeFileSync(
    join(ROOT, "generated/storybook/color-docs.json"),
    JSON.stringify({ generatedAt: registry.generatedAt, tokens: storybookDocs }, null, 2) +
      "\n"
  );

  console.log(`Built ${tokens.length} tokens → generated/ + registry`);
}

main();
