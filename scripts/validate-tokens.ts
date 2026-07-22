import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CanonicalToken, ValidationIssue } from "../src/types/token.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COLORS = join(ROOT, "tokens/colors");

const PRIMITIVE_NAME = /^[a-z]+\.\d{1,4}$/;
const SEMANTIC_NAME =
  /^color\.[a-z]+(\.[a-z0-9-]+){0,4}$/;
const ALIAS_NAME = /^[a-z]+(\.[a-z0-9-]+)+$/;

function loadTier(file: string): CanonicalToken[] {
  const path = join(COLORS, file);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CanonicalToken[];
  } catch {
    return [];
  }
}

function loadAllTokens(): CanonicalToken[] {
  return [
    ...loadTier("primitive.json"),
    ...loadTier("alias.json"),
    ...loadTier("semantic.json"),
    ...loadTier("component.json"),
    ...loadTier("state.json"),
  ];
}

function nameRegexForTier(tier: CanonicalToken["tier"]): RegExp {
  switch (tier) {
    case "primitive":
      return PRIMITIVE_NAME;
    case "semantic":
    case "state":
    case "component":
      return SEMANTIC_NAME;
    case "alias":
      return ALIAS_NAME;
  }
}

export function validateTokens(tokens: CanonicalToken[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const names = new Map<string, string>();

  for (const t of tokens) {
    if (names.has(t.name)) {
      issues.push({
        severity: "blocking",
        rule: "duplicate-names",
        tokenId: t.id,
        tokenName: t.name,
        message: `Duplicate name "${t.name}" (also id ${names.get(t.name)})`,
      });
    } else {
      names.set(t.name, t.id);
    }

    const re = nameRegexForTier(t.tier);
    if (!re.test(t.name)) {
      issues.push({
        severity: "blocking",
        rule: "invalid-naming",
        tokenId: t.id,
        tokenName: t.name,
        message: `Name "${t.name}" does not match ${t.tier} pattern ${re}`,
      });
    }

    if (
      (t.tier === "semantic" || t.tier === "component" || t.tier === "state") &&
      !t.description?.trim()
    ) {
      issues.push({
        severity: "blocking",
        rule: "missing-documentation",
        tokenId: t.id,
        tokenName: t.name,
        message: "description is required for semantic/component/state tiers",
      });
    }

    if (t.aliasOf && !byId.has(t.aliasOf)) {
      issues.push({
        severity: "blocking",
        rule: "missing-aliases",
        tokenId: t.id,
        tokenName: t.name,
        message: `aliasOf "${t.aliasOf}" does not exist`,
      });
    }

    if (t.tier === "primitive" && !t.value?.hex) {
      issues.push({
        severity: "blocking",
        rule: "missing-value",
        tokenId: t.id,
        tokenName: t.name,
        message: "primitive tokens must have a value.hex",
      });
    }
  }

  // Circular alias detection (DAG)
  for (const t of tokens) {
    if (!t.aliasOf) continue;
    const seen = new Set<string>();
    let cur: string | null = t.id;
    while (cur) {
      if (seen.has(cur)) {
        issues.push({
          severity: "blocking",
          rule: "circular-aliases",
          tokenId: t.id,
          tokenName: t.name,
          message: `Circular alias chain involving ${[...seen].join(" → ")}`,
        });
        break;
      }
      seen.add(cur);
      const next = byId.get(cur);
      cur = next?.aliasOf ?? null;
    }
  }

  // Duplicate primitive hex values → warning
  const hexOwners = new Map<string, string[]>();
  for (const t of tokens) {
    if (t.tier !== "primitive" || !t.value?.hex) continue;
    const hex = t.value.hex.toUpperCase();
    const list = hexOwners.get(hex) ?? [];
    list.push(t.name);
    hexOwners.set(hex, list);
  }
  for (const [hex, owners] of hexOwners) {
    if (owners.length > 1) {
      issues.push({
        severity: "warning",
        rule: "duplicate-values",
        message: `Primitives share ${hex}: ${owners.join(", ")}`,
      });
    }
  }

  return issues;
}

function main() {
  const tokens = loadAllTokens();
  const issues = validateTokens(tokens);
  const blocking = issues.filter((i) => i.severity === "blocking");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(`Validated ${tokens.length} tokens`);
  for (const i of issues) {
    const tag = i.severity === "blocking" ? "FAIL" : "WARN";
    console.log(
      `[${tag}] ${i.rule}${i.tokenName ? ` (${i.tokenName})` : ""}: ${i.message}`
    );
  }

  if (blocking.length === 0) {
    console.log(
      `\n✓ Pass (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`
    );
    process.exit(0);
  }
  console.log(`\n✗ ${blocking.length} blocking issue(s)`);
  process.exit(1);
}

main();
