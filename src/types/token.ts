/** Canonical token envelope — Color MVP (§14 skill.md) */

export type TokenTier =
  | "primitive"
  | "alias"
  | "semantic"
  | "component"
  | "state";

export type TokenType = "color";

export type ThemeMode = "light" | "dark" | "high-contrast";

export interface ColorValue {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

export interface TokenHistoryEntry {
  version: string;
  value: Partial<ColorValue> | null;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface CanonicalToken {
  id: string;
  type: TokenType;
  tier: TokenTier;
  name: string;
  value: ColorValue | null;
  description: string;
  aliasOf: string | null;
  brand: string | null;
  themes: ThemeMode[];
  deprecated: boolean;
  deprecatedInFavorOf: string | null;
  figmaVariableId: string | null;
  figmaCollectionId: string | null;
  version: string;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  history: TokenHistoryEntry[];
}

export interface FigmaMappingEntry {
  figmaVariableId: string;
  canonicalTokenId: string;
  figmaCollectionId: string;
  name: string;
}

export interface ContrastPair {
  foreground: string;
  background: string;
  minRatioAA: number;
  largeText?: boolean;
}

export interface ValidationIssue {
  severity: "blocking" | "warning";
  rule: string;
  tokenId?: string;
  tokenName?: string;
  message: string;
}
