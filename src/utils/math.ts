export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function pick<T>(items: readonly T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? items[0]!;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface ParsedRgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const namedColorCache = new Map<string, ParsedRgb | null>();
let colorProbeCtx: CanvasRenderingContext2D | null | undefined;

function parseHexColor(trimmed: string): ParsedRgb | null {
  let hex = trimmed.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6 && hex.length !== 8) {
    return null;
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
    return null;
  }
  return { r, g, b, a };
}

function parseRgbFunction(trimmed: string): ParsedRgb | null {
  const match = trimmed.match(
    /^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (!match) return null;

  const parseChannel = (val: string): number => {
    if (val.endsWith('%')) {
      return Math.round((Number.parseFloat(val) / 100) * 255);
    }
    return Math.round(Number.parseFloat(val));
  };

  const parseAlpha = (val: string | undefined): number => {
    if (!val) return 1;
    if (val.endsWith('%')) return clamp(Number.parseFloat(val) / 100, 0, 1);
    return clamp(Number.parseFloat(val), 0, 1);
  };

  return {
    r: clamp(parseChannel(match[1]!), 0, 255),
    g: clamp(parseChannel(match[2]!), 0, 255),
    b: clamp(parseChannel(match[3]!), 0, 255),
    a: parseAlpha(match[4]),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) {
    r1 = c;
    g1 = x;
  } else if (hue < 120) {
    r1 = x;
    g1 = c;
  } else if (hue < 180) {
    g1 = c;
    b1 = x;
  } else if (hue < 240) {
    g1 = x;
    b1 = c;
  } else if (hue < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function parseHslFunction(trimmed: string): ParsedRgb | null {
  const match = trimmed.match(
    /^hsla?\(\s*(-?[\d.]+)(?:deg|rad|turn)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (!match) return null;

  let hue = Number.parseFloat(match[1]!);
  if (/rad\b/i.test(trimmed)) {
    hue = (hue * 180) / Math.PI;
  } else if (/turn\b/i.test(trimmed)) {
    hue = hue * 360;
  }

  const s = Number.parseFloat(match[2]!) / 100;
  const l = Number.parseFloat(match[3]!) / 100;
  const { r, g, b } = hslToRgb(hue, s, l);

  let a = 1;
  if (match[4]) {
    a = match[4].endsWith('%')
      ? clamp(Number.parseFloat(match[4]) / 100, 0, 1)
      : clamp(Number.parseFloat(match[4]), 0, 1);
  }
  return { r, g, b, a };
}

function resolveBrowserNamedColor(trimmed: string): ParsedRgb | null {
  const key = trimmed.toLowerCase();
  if (namedColorCache.has(key)) {
    return namedColorCache.get(key) ?? null;
  }

  if (typeof document === 'undefined') {
    namedColorCache.set(key, null);
    return null;
  }

  if (colorProbeCtx === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      colorProbeCtx = canvas.getContext('2d');
    } catch {
      colorProbeCtx = null;
    }
  }

  if (!colorProbeCtx) {
    namedColorCache.set(key, null);
    return null;
  }

  colorProbeCtx.fillStyle = '#000000';
  colorProbeCtx.fillStyle = trimmed;
  const normalized = String(colorProbeCtx.fillStyle);
  const parsed = normalized.startsWith('#')
    ? parseHexColor(normalized)
    : parseRgbFunction(normalized);

  namedColorCache.set(key, parsed);
  return parsed;
}

/**
 * Converts any hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), `rgb()`, `rgba()`, `hsl()`,
 * `hsla()`, or named CSS color into an `rgba(r, g, b, alpha)` string.
 */
export function hexToRgba(color: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  const trimmed = color.trim();

  let parsed: ParsedRgb | null = null;
  if (trimmed.startsWith('#')) {
    parsed = parseHexColor(trimmed);
  } else if (/^rgba?\(/i.test(trimmed)) {
    parsed = parseRgbFunction(trimmed);
  } else if (/^hsla?\(/i.test(trimmed)) {
    parsed = parseHslFunction(trimmed);
  } else {
    parsed = resolveBrowserNamedColor(trimmed);
  }

  if (!parsed) {
    // Graceful fallback when running in non-browser environments with named CSS colors
    if (a <= 0) return 'rgba(0, 0, 0, 0)';
    return trimmed;
  }

  const finalAlpha = clamp(parsed.a * a, 0, 1);
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${finalAlpha.toFixed(3)})`;
}

export const colorWithAlpha = hexToRgba;

export function createPolygonPoints(
  sides: number,
  radius: number,
  irregularity = 0.35
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rand(-0.18, 0.18);
    const r = radius * rand(1 - irregularity, 1 + irregularity * 0.6);
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pts;
}
