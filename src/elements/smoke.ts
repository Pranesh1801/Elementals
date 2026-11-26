import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

/**
 * Generates procedural multi-lobe volumetric smoke puff sprites on offscreen canvases
 * so puffs look like real irregular turbulent clouds rather than smooth ovals.
 */
const spriteCache = new Map<string, HTMLCanvasElement>();
let offscreenSupported = true;

function getSmokePuffSprite(color: string, variant: number): HTMLCanvasElement | null {
  if (!offscreenSupported || typeof document === 'undefined') return null;

  const key = `${color}__${variant}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      offscreenSupported = false;
      return null;
    }

    // Deterministic pseudo-random lobes per variant so smoke looks organic & varied
    let seed = (variant + 1) * 9301 + 49297;
    const nextRand = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const cx = size * 0.5;
    const cy = size * 0.5;
    const lobeCount = 16;

    for (let i = 0; i < lobeCount; i++) {
      const angle = nextRand() * Math.PI * 2;
      const dist = Math.pow(nextRand(), 0.75) * (size * 0.24);
      const lx = cx + Math.cos(angle) * dist;
      const ly = cy + Math.sin(angle) * dist;
      const lr = size * (0.16 + nextRand() * 0.19);
      const lobeAlpha = 0.08 + nextRand() * 0.09;

      const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      grad.addColorStop(0, hexToRgba(color, lobeAlpha));
      grad.addColorStop(0.45, hexToRgba(color, lobeAlpha * 0.52));
      grad.addColorStop(1, hexToRgba(color, 0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Keep cache bounded when user explores many custom RGB colors
    if (spriteCache.size > 48) {
      const oldest = spriteCache.keys().next().value;
      if (oldest) spriteCache.delete(oldest);
    }
    spriteCache.set(key, canvas);
    return canvas;
  } catch {
    offscreenSupported = false;
    return null;
  }
}

/**
 * Simple smooth 2D curl-like turbulence vector for organic smoke eddies.
 */
function smokeTurbulence(x: number, y: number, time: number): { tx: number; ty: number } {
  const nx = x * 0.0045;
  const ny = y * 0.0045;
  const tx = Math.sin(ny * 2.1 + time * 0.55) * 26 + Math.cos(nx * 1.4 - ny * 1.3 + time * 0.35) * 16;
  const ty = Math.cos(nx * 1.8 + time * 0.42) * 10;
  return { tx, ty };
}

export const smokeElement: ElementDefinition<'smoke'> = {
  name: 'smoke',
  label: 'Smoke',
  description: 'Volumetric billowing smoke wisps, curling incense streams, and layered atmospheric fog.',
  defaultPreset: 'wisps',
  presets: {
    wisps: {
      id: 'wisps',
      label: 'Volumetric Wisps',
      description: 'Soft multi-lobe smoke billows rising, curling in turbulent eddies, and parting around your cursor.',
      count: 64,
      colors: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#f1f5f9'],
      lightColors: ['#334155', '#475569', '#64748b', '#1e293b'],
      blendMode: 'source-over',
      defaultWind: 0.18,
      defaultSpeed: 0.9,
      params: { mode: 'wisps' },
    },
    incense: {
      id: 'incense',
      label: 'Incense Plume',
      description: 'Fine rising smoke streams transitioning from smooth laminar curves into delicate turbulent curls.',
      count: 115,
      colors: ['#f1f5f9', '#cbd5e1', '#e2e8f0', '#94a3b8'],
      lightColors: ['#1e293b', '#334155', '#475569', '#64748b'],
      blendMode: 'source-over',
      defaultWind: 0.12,
      defaultSpeed: 0.95,
      params: { mode: 'incense' },
    },
    fog: {
      id: 'fog',
      label: 'Atmospheric Fog',
      description: 'Deep, moody volumetric cloud haze drifting gently across the horizon.',
      count: 42,
      colors: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b'],
      lightColors: ['#475569', '#64748b', '#334155', '#94a3b8'],
      blendMode: 'source-over',
      defaultWind: 0.35,
      defaultSpeed: 0.7,
      params: { mode: 'fog' },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'wisps');
    const depth = rand(0.55, 1.25);
    const variant = Math.floor(rand(0, 5));

    if (mode === 'incense') {
      // 3 calm emitter columns across the viewport
      const emitters = [0.24, 0.5, 0.76];
      const emitterIdx = Math.floor(rand(0, emitters.length));
      const originX = sim.width * (emitters[emitterIdx] ?? 0.5);
      const maxLife = rand(5.5, 9.5);
      const life = initial ? rand(maxLife * 0.08, maxLife * 0.85) : 0;
      const progress = life / maxLife;

      // Place initial particles along the rising laminar-to-turbulent curve
      const startY = sim.height + 16;
      const y = initial ? startY - progress * (sim.height * 0.95) : startY;
      const x =
        originX +
        (initial
          ? Math.sin(progress * 8 + emitterIdx * 2) * (8 + progress * 62) + sim.wind * progress * 90
          : rand(-4, 4));
      const baseAlpha = rand(0.22, 0.42);
      const startSize = rand(14, 24) * depth;

      return {
        x,
        y,
        vx: rand(-5, 5),
        vy: -rand(52, 92) * (0.75 + depth * 0.3),
        size: startSize * (1 + progress * 3.8),
        alpha: initial ? baseAlpha * Math.sin(progress * Math.PI) * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: rand(0, Math.PI * 2),
        vRot: rand(-0.45, 0.45),
        life,
        maxLife,
        phase: emitterIdx * 2.1 + rand(-0.35, 0.35),
        freq: rand(1.1, 1.9),
        depth,
        kind: 'incense',
        extra: startSize + variant * 1000, // pack variant & startSize cleanly
      };
    }

    if (mode === 'fog') {
      const radius = rand(180, 340) * depth;
      const baseAlpha = rand(0.18, 0.34);
      return {
        x: initial ? rand(-radius * 0.6, sim.width + radius * 0.6) : -radius * 1.1,
        y: rand(sim.height * 0.25, sim.height * 1.02),
        vx: rand(12, 28) * depth,
        vy: rand(-2.5, 2.5),
        size: radius,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: rand(0, Math.PI * 2),
        vRot: rand(-0.04, 0.04),
        life: initial ? rand(2, 12) : 0,
        maxLife: 999,
        phase: rand(0, Math.PI * 2),
        freq: rand(0.22, 0.48),
        depth,
        kind: 'fog',
        extra: variant,
      };
    }

    // Volumetric wisps
    const maxLife = rand(7, 13.5);
    const life = initial ? rand(maxLife * 0.15, maxLife * 0.78) : 0;
    const progress = life / maxLife;
    const startRadius = rand(46, 92) * depth;
    const baseAlpha = rand(0.24, 0.46);

    return {
      x: rand(-40, sim.width + 40),
      y: initial ? rand(0, sim.height) : sim.height + rand(25, 110),
      vx: rand(-10, 10),
      vy: -rand(24, 58) * depth,
      size: startRadius * (0.85 + progress * 1.75),
      alpha: initial ? baseAlpha * Math.sin(progress * Math.PI) * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: rand(0, Math.PI * 2),
      vRot: rand(-0.22, 0.22),
      life,
      maxLife,
      phase: rand(0, Math.PI * 2),
      freq: rand(0.5, 1.15),
      depth,
      kind: 'wisp',
      extra: startRadius + variant * 1000,
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'fog') {
      const dir = sim.wind < 0 ? -1 : 1;
      p.x += (Math.abs(p.vx) * dir + sim.wind * 34 * p.depth) * dt;
      p.y += (p.vy + Math.sin(p.life * p.freq + p.phase) * 4) * dt;
      p.rotation += p.vRot * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 250 * (0.7 + strength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / radius) * 145 * strength * sim.dt;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push * 0.6;
        }
      }

      if (p.x > sim.width + p.size * 1.1) p.x = -p.size * 1.05;
      if (p.x < -p.size * 1.1) p.x = sim.width + p.size * 1.05;

      const breath = 0.74 + 0.26 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * breath * sim.opacity;
      return true;
    }

    if (p.life >= p.maxLife || p.y < -p.size * 1.2) return false;

    const t = clamp(p.life / p.maxLife, 0, 1);
    const packed = p.extra ?? 40;
    const startRadius = packed % 1000;
    const { tx, ty } = smokeTurbulence(p.x, p.y, sim.time);

    if (p.kind === 'incense') {
      // Smooth laminar ribbon near bottom, gradually blossoming into turbulent curl higher up
      const turbulenceMix = Math.pow(t, 1.35);
      const laminarSway = Math.sin(p.life * p.freq * 1.8 + p.phase) * (16 + t * 44);
      p.x += (p.vx + laminarSway * (1 - turbulenceMix * 0.45) + tx * turbulenceMix * 1.35 + sim.wind * (24 + t * 55)) * dt;
      p.y += (p.vy + ty * turbulenceMix) * dt;
      p.rotation += (p.vRot * (0.5 + turbulenceMix * 1.6)) * dt;
      p.size = startRadius * (0.9 + Math.pow(t, 1.15) * 4.2);
    } else {
      // Volumetric rising wisps
      p.x += (p.vx + tx * p.depth + sim.wind * 42 * p.depth) * dt;
      p.y += (p.vy + ty * 0.6) * dt;
      p.rotation += p.vRot * dt;
      p.size = startRadius * (0.85 + t * 1.85);
    }

    // Swirl & vortex wake around pointer
    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 185 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        const push = falloff * 380 * strength * sim.dt;
        p.vx += (dx / dist) * push - (dy / dist) * push * 0.38 + sim.pointer.vx * 18 * strength * falloff * sim.dt;
        p.vy += (dy / dist) * push * 0.32 + sim.pointer.vy * 10 * strength * falloff * sim.dt;
        p.vRot += (dx > 0 ? 1 : -1) * 1.1 * strength * sim.dt;
      }
    }
    p.vx *= Math.pow(0.24, dt);

    const fadeIn = clamp(t * 4.5, 0, 1);
    const fadeOut = Math.pow(clamp(1 - t, 0, 1), 1.45);
    p.alpha = p.baseAlpha * fadeIn * fadeOut * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.004) return;

    const packed = p.extra ?? 0;
    const variant = p.kind === 'fog' ? Math.floor(packed) : Math.floor(packed / 1000);
    const sprite = getSmokePuffSprite(p.color, variant);
    const boost = sim.theme === 'light' ? 1.45 : 1;
    const alpha = clamp(p.alpha * boost, 0, 0.92);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (sprite && typeof ctx.drawImage === 'function') {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * alpha;
      const drawW = p.kind === 'fog' ? p.size * 2.4 : p.size * 2;
      const drawH = p.kind === 'fog' ? p.size * 1.25 : p.size * 2;
      ctx.drawImage(sprite, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.globalAlpha = prevAlpha;
    } else {
      // Fallback for headless test environments without offscreen sprite rendering
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      grad.addColorStop(0, hexToRgba(p.color, alpha * 0.55));
      grad.addColorStop(0.5, hexToRgba(p.color, alpha * 0.25));
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};
