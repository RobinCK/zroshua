/** Small colour helpers for token derivation (hex / rgb[a] in, hex or rgba out). */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): Rgba {
  const s = input.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (fn) {
    const [r, g, b, a] = fn[1].split(',').map((x) => parseFloat(x));
    return { r, g, b, a: Number.isFinite(a) ? a : 1 };
  }
  throw new Error(`Unsupported colour: ${input}`);
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

export function toHex(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase();
}

/** `color` at `alpha` as an rgba() string. */
export function withAlpha(color: string, alpha: number): string {
  const c = parseColor(color);
  return `rgba(${c.r},${c.g},${c.b},${+(alpha * c.a).toFixed(3)})`;
}

/** Linear mix: t = 0 → a, t = 1 → b (alpha ignored). */
export function mix(a: string, b: string, t: number): string {
  const x = parseColor(a);
  const y = parseColor(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t, a: 1 });
}

/** Composites a translucent colour over an opaque background (tinted chips on a card). */
export function flatten(color: string, over: string): string {
  const c = parseColor(color);
  return mix(over, toHex(c), c.a);
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: string): number {
  const c = parseColor(color);
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Ten shades around `base` for Mantine: 0 lightest … 9 darkest, with `base` at index 6
 * (the shade Mantine paints filled variants with when primaryShade is 6).
 */
export function ramp(base: string): string[] {
  const lighter = [0.1, 0.22, 0.36, 0.52, 0.68, 0.84].map((t) => mix('#FFFFFF', base, t));
  const darker = [0.16, 0.3, 0.44].map((t) => mix(base, '#000000', t));
  return [...lighter, toHex(parseColor(base)), ...darker];
}
