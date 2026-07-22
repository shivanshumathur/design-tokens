/**
 * Import dummy color tokens from @atlaskit/tokens (Apache-2.0) into canonical schema.
 * Usage: npm run import:atlassian
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import tokenDefaultsModule from "@atlaskit/tokens/dist/esm/artifacts/token-default-values.js";
import { colorFromHex, normalizeHex } from "../src/lib/color.js";
import type { CanonicalToken } from "../src/types/token.js";

const defaultTokenValues: Record<string, string> =
  (tokenDefaultsModule as { default?: Record<string, string> }).default ??
  (tokenDefaultsModule as Record<string, string>);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COLORS = join(ROOT, "tokens/colors");

const SOURCE = "dummy:atlassian-design-system";
const NOW = "2026-07-22T12:00:00Z";

/** Core semantic tokens for demo — names match Atlassian ADS */
const SEMANTIC_NAMES = [
  "color.text",
  "color.text.subtle",
  "color.text.subtlest",
  "color.text.disabled",
  "color.text.inverse",
  "color.text.brand",
  "color.text.danger",
  "color.text.warning",
  "color.text.success",
  "color.text.selected",
  "color.text.link",
  "color.background.neutral",
  "color.background.neutral.subtle",
  "color.background.neutral.subtle.hovered",
  "color.background.neutral.bold",
  "color.background.brand.bold",
  "color.background.brand.boldest",
  "color.background.brand.subtlest",
  "color.background.danger",
  "color.background.danger.bold",
  "color.background.warning",
  "color.background.warning.bold",
  "color.background.success",
  "color.background.success.bold",
  "color.background.selected",
  "color.background.input",
  "color.background.disabled",
  "color.border",
  "color.border.bold",
  "color.border.focused",
  "color.border.danger",
  "color.border.warning",
  "color.border.success",
  "color.icon",
  "color.icon.subtle",
  "color.icon.brand",
  "color.icon.danger",
  "color.icon.warning",
  "color.icon.success",
];

const STATE_NAMES = [
  "color.background.neutral.hovered",
  "color.background.neutral.pressed",
  "color.background.brand.bold.hovered",
  "color.background.brand.bold.pressed",
];

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function parseAtlaskitHex(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!HEX_RE.test(trimmed)) return null;
  try {
    return normalizeHex(trimmed);
  } catch {
    return null;
  }
}

function ulidFrom(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex").toUpperCase();
  return `01${h.slice(0, 24)}`;
}

function loadDarkValues(): Record<string, string> {
  const darkPath = join(
    ROOT,
    "node_modules/@atlaskit/tokens/dist/esm/artifacts/tokens-raw/atlassian-dark.js"
  );
  const src = readFileSync(darkPath, "utf8");
  const match = src.match(/var tokens = (\[[\s\S]*\]);/);
  if (!match) return {};
  const tokens = JSON.parse(match[1]) as {
    cleanName: string;
    value: string;
    name: string;
  }[];
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const parsed = parseAtlaskitHex(t.value);
    if (!parsed) continue;
    const key = t.cleanName ?? t.name.replace(/\.\[default\]$/, "");
    if (!out[key]) out[key] = parsed;
  }
  return out;
}

function makeToken(
  partial: Pick<CanonicalToken, "id" | "tier" | "name" | "value" | "aliasOf" | "description">
): CanonicalToken {
  return {
    id: partial.id,
    type: "color",
    tier: partial.tier,
    name: partial.name,
    value: partial.value,
    description: partial.description,
    aliasOf: partial.aliasOf,
    brand: "atlassian",
    themes: ["light", "dark"],
    deprecated: false,
    deprecatedInFavorOf: null,
    figmaVariableId: null,
    figmaCollectionId: null,
    version: "0.2.0",
    createdAt: NOW,
    createdBy: SOURCE,
    lastModifiedAt: NOW,
    lastModifiedBy: SOURCE,
    history: [],
  };
}

function primitiveNameForHex(hex: string, index: number): string {
  const { hsl } = colorFromHex(hex);
  if (hsl.s < 8) return `neutral.${Math.min(1000, Math.round((100 - hsl.l) * 10))}`;
  const hueMap: [number, string][] = [
    [15, "red"],
    [45, "amber"],
    [75, "yellow"],
    [150, "green"],
    [200, "teal"],
    [240, "blue"],
    [280, "purple"],
    [330, "magenta"],
  ];
  let hue = "blue";
  for (const [max, name] of hueMap) {
    if (hsl.h <= max) {
      hue = name;
      break;
    }
  }
  const step = Math.min(1000, Math.max(0, Math.round((100 - hsl.l) * 10)));
  const base = `${hue}.${step}`;
  return index > 0 ? `${base}` : base;
}

function main() {
  const light = defaultTokenValues;
  const dark = loadDarkValues();

  const hexToPrimitiveId = new Map<string, string>();
  const primitives: CanonicalToken[] = [];
  const usedPrimitiveNames = new Set<string>();

  function ensurePrimitive(hex: string): string {
    const upper = hex.toUpperCase();
    if (hexToPrimitiveId.has(upper)) return hexToPrimitiveId.get(upper)!;

    let name = primitiveNameForHex(upper, primitives.length);
    let n = 1;
    while (usedPrimitiveNames.has(name)) {
      name = `${name.split(".")[0]}.${parseInt(name.split(".")[1] ?? "0", 10) + n}`;
      n++;
    }
    usedPrimitiveNames.add(name);

    const id = ulidFrom(`primitive:${upper}`);
    hexToPrimitiveId.set(upper, id);
    primitives.push(
      makeToken({
        id,
        tier: "primitive",
        name,
        value: colorFromHex(upper),
        aliasOf: null,
        description: `Primitive palette color (from Atlassian ADS dummy import).`,
      })
    );
    return id;
  }

  const semantics: CanonicalToken[] = [];
  const states: CanonicalToken[] = [];
  const nameToId = new Map<string, string>();

  function importToken(name: string, tier: "semantic" | "state") {
    const hex = parseAtlaskitHex(light[name] ?? "");
    if (!hex) return;

    const id = ulidFrom(`semantic:${name}`);
    nameToId.set(name, id);
    const primitiveId = ensurePrimitive(hex);

    const token = makeToken({
      id,
      tier,
      name,
      value: null,
      aliasOf: primitiveId,
      description: `Atlassian ADS dummy token — ${name}`,
    });

    if (tier === "state") states.push(token);
    else semantics.push(token);
  }

  for (const name of SEMANTIC_NAMES) importToken(name, "semantic");
  for (const name of STATE_NAMES) importToken(name, "state");

  const brandBlueId = nameToId.get("color.background.brand.bold");
  const aliases: CanonicalToken[] = [];
  if (brandBlueId) {
    aliases.push(
      makeToken({
        id: ulidFrom("alias:brand.blue"),
        tier: "alias",
        name: "brand.blue",
        value: null,
        aliasOf: brandBlueId,
        description: "Brand primary alias (Atlassian ADS dummy).",
      })
    );
  }

  // Theme resolution maps (semantic name -> primitive id for light/dark)
  const lightResolutions: Record<string, string> = {};
  const darkResolutions: Record<string, string> = {};

  const themeKeys = [
    "color.background.neutral",
    "color.background.neutral.subtle",
    "color.text",
    "color.text.inverse",
    "color.background.brand.bold",
    "color.border",
  ];

  for (const key of themeKeys) {
    const lightHex = parseAtlaskitHex(light[key] ?? "");
    const darkHex = parseAtlaskitHex(dark[key] ?? light[key] ?? "");
    if (lightHex) lightResolutions[key] = ensurePrimitive(lightHex);
    if (darkHex) darkResolutions[key] = ensurePrimitive(darkHex);
  }

  const contrastPairs = [
    {
      foreground: nameToId.get("color.text")!,
      background: nameToId.get("color.background.neutral")!,
      minRatioAA: 4.5,
      largeText: false,
    },
    {
      foreground: nameToId.get("color.text.inverse")!,
      background: nameToId.get("color.background.brand.bold")!,
      minRatioAA: 4.5,
      largeText: false,
    },
    {
      foreground: nameToId.get("color.text")!,
      background: nameToId.get("color.background.neutral.subtle")!,
      minRatioAA: 4.5,
      largeText: false,
    },
  ].filter((p) => p.foreground && p.background);

  const figmaMapping = {
    version: "0.2.0",
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    note: "Dummy data — no Figma variable IDs until plugin export or Enterprise API",
    mappings: [] as unknown[],
  };

  writeFileSync(
    join(COLORS, "primitive.json"),
    JSON.stringify(primitives, null, 2) + "\n"
  );
  writeFileSync(join(COLORS, "alias.json"), JSON.stringify(aliases, null, 2) + "\n");
  writeFileSync(
    join(COLORS, "semantic.json"),
    JSON.stringify(semantics, null, 2) + "\n"
  );
  writeFileSync(join(COLORS, "component.json"), "[]\n");
  writeFileSync(join(COLORS, "state.json"), JSON.stringify(states, null, 2) + "\n");
  writeFileSync(
    join(COLORS, "contrast-pairs.json"),
    JSON.stringify(contrastPairs, null, 2) + "\n"
  );
  writeFileSync(
    join(COLORS, "themes/light.json"),
    JSON.stringify({ theme: "light", resolutions: lightResolutions }, null, 2) + "\n"
  );
  writeFileSync(
    join(COLORS, "themes/dark.json"),
    JSON.stringify({ theme: "dark", resolutions: darkResolutions }, null, 2) + "\n"
  );
  writeFileSync(
    join(COLORS, "themes/high-contrast.json"),
    JSON.stringify(
      { theme: "high-contrast", resolutions: { ...darkResolutions } },
      null,
      2
    ) + "\n"
  );
  writeFileSync(
    join(ROOT, "tokens/_registry/figma-mapping.json"),
    JSON.stringify(figmaMapping, null, 2) + "\n"
  );

  console.log(`Imported Atlassian ADS dummy tokens:`);
  console.log(`  primitives: ${primitives.length}`);
  console.log(`  aliases:    ${aliases.length}`);
  console.log(`  semantic:   ${semantics.length}`);
  console.log(`  state:      ${states.length}`);
  console.log(`  contrast:   ${contrastPairs.length} pairs`);
}

main();
