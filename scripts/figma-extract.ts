/**
 * Phase 1: Manual Figma Variables extraction.
 * Requires FIGMA_ACCESS_TOKEN + FIGMA_FILE_KEY in env (see .env.example).
 *
 * Usage: npm run extract
 * Writes a snapshot to tokens/_registry/figma-snapshot.json for review.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { colorFromHex } from "../src/lib/color.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

const TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;

interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
}

interface FigmaCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
}

function figmaColorToHex(c: {
  r: number;
  g: number;
  b: number;
  a?: number;
}): string {
  const to = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`.toUpperCase();
}

async function main() {
  if (!TOKEN || !FILE_KEY) {
    console.error(`
Missing Figma credentials.

1. Copy .env.example → .env
2. Set FIGMA_ACCESS_TOKEN (Figma → Settings → Personal access tokens)
3. Set FIGMA_FILE_KEY (from https://www.figma.com/design/<FILE_KEY>/...)

Then re-run: npm run extract
`);
    process.exit(1);
  }

  const url = `https://api.figma.com/v1/files/${FILE_KEY}/variables/local`;
  console.log(`Fetching variables from file ${FILE_KEY}...`);

  const res = await fetch(url, {
    headers: { "X-Figma-Token": TOKEN },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Figma API ${res.status}: ${body}`);
    process.exit(1);
  }

  const data = (await res.json()) as {
    meta: {
      variables: Record<string, FigmaVariable>;
      variableCollections: Record<string, FigmaCollection>;
    };
  };

  const collections = data.meta.variableCollections;
  const variables = Object.values(data.meta.variables);
  const colorVars = variables.filter((v) => v.resolvedType === "COLOR");

  const normalized = colorVars.map((v) => {
    const collection = collections[v.variableCollectionId];
    const modes: Record<string, string | null> = {};
    for (const [modeId, raw] of Object.entries(v.valuesByMode)) {
      const modeName =
        collection?.modes.find((m) => m.modeId === modeId)?.name ?? modeId;
      if (raw && typeof raw === "object" && "r" in (raw as object)) {
        const hex = figmaColorToHex(
          raw as { r: number; g: number; b: number }
        );
        modes[modeName] = hex;
      } else if (raw && typeof raw === "object" && "type" in (raw as object)) {
        const alias = raw as { type: string; id: string };
        modes[modeName] = `alias:${alias.id}`;
      } else {
        modes[modeName] = null;
      }
    }

    const firstHex = Object.values(modes).find(
      (m) => m && m.startsWith("#")
    ) as string | undefined;

    return {
      figmaVariableId: v.id,
      figmaCollectionId: v.variableCollectionId,
      collectionName: collection?.name ?? null,
      name: v.name.replace(/\//g, "."),
      figmaName: v.name,
      modes,
      sampleValue: firstHex ? colorFromHex(firstHex) : null,
    };
  });

  mkdirSync(join(ROOT, "tokens/_registry"), { recursive: true });
  const outPath = join(ROOT, "tokens/_registry/figma-snapshot.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        extractedAt: new Date().toISOString(),
        fileKey: FILE_KEY,
        colorVariableCount: normalized.length,
        variables: normalized,
      },
      null,
      2
    ) + "\n"
  );

  console.log(
    `✓ Extracted ${normalized.length} color variables → ${outPath}`
  );
  console.log(
    "Next: review the snapshot and map variables into tokens/colors/*.json + figma-mapping.json"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
