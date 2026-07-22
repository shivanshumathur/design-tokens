import type { ColorValue } from "../types/token.js";

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3}|[0-9A-Fa-f]{8})$/;

/** Normalize #RGB, #RRGGBB, or #RRGGBBAA (composited on white) to #RRGGBB */
export function normalizeHex(hex: string): string {
  const raw = hex.trim().toUpperCase();
  if (!HEX_RE.test(raw)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  let h = raw.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${h}`;
  }
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16) / 255;
    const blend = (c: number) => Math.round(c * a + 255 * (1 - a));
    const rr = blend(r).toString(16).padStart(2, "0");
    const gg = blend(g).toString(16).padStart(2, "0");
    const bb = blend(b).toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`;
  }
  return `#${h}`;
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  const h = normalized.slice(1);
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
      break;
    case gn:
      h = ((bn - rn) / d + 2) / 6;
      break;
    default:
      h = ((rn - gn) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function colorFromHex(hex: string): ColorValue {
  const upper = normalizeHex(hex);
  const rgb = parseHex(upper);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { hex: upper, rgb, hsl };
}

/** Relative luminance (WCAG) */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contentHash(value: unknown): string {
  const json = JSON.stringify(value, Object.keys(value as object).sort());
  // Simple deterministic hash for MVP (SHA-256 via Web Crypto when available)
  let h = 0;
  for (let i = 0; i < json.length; i++) {
    h = (Math.imul(31, h) + json.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16).padStart(8, "0")}`;
}
