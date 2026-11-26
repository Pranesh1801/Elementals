import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

/**
 * Evaluates an organic multi-harmonic wave curve for continuous Arctic aurora curtains.
 */
function sampleRibbonY(
  xNorm: number,
  baseY: number,
  amp: number,
  phase: number,
  time: number,
  freq: number
): number {
  return (
    baseY +
    Math.sin(xNorm * Math.PI * 2.1 + phase + time * 0.22 * freq) * amp +
    Math.sin(xNorm * Math.PI * 4.3 - phase * 0.65 + time * 0.34 * freq) * (amp * 0.42) +
    Math.cos(xNorm * Math.PI * 1.15 + phase * 1.4 - time * 0.14 * freq) * (amp * 0.55)
  );
}

/**
 * Draws a continuous full-sky Arctic Borealis curtain made of finely feathered
 * vertical magnetic-field light rays rising from a luminous lower rim.
 */
function drawArcticCurtain(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  sim: SimulationContext
): void {
  const w = sim.width;
  const h = sim.height;
  const amp = p.extra ?? h * 0.08;
  const curtainHeight = p.size;
  const rays = Math.max(48, Math.min(110, Math.round(w / 14)));
  const stepX = (w + 80) / rays;
  const rayWidth = stepX * 2.4;

  const secondaryColor = sim.colors[(Math.floor(p.phase * 10) + 1) % sim.colors.length] ?? p.color;
  const tertiaryColor = sim.colors[(Math.floor(p.phase * 10) + 2) % sim.colors.length] ?? secondaryColor;

  const lightBoost = sim.theme === 'light' ? 1.55 : 1;

  for (let i = 0; i <= rays; i++) {
    const x = -40 + i * stepX;
    const xNorm = x / Math.max(1, w);

    // Subtle horizontal fold density: real auroras brighten where the curtain folds edge-on
    const foldWave =
      0.5 +
      0.5 *
        Math.sin(xNorm * Math.PI * 3.6 + p.phase * 1.3 + sim.time * 0.38 * p.freq) *
        Math.cos(xNorm * Math.PI * 6.2 - p.phase + sim.time * 0.25 * p.freq);

    // Fine vertical ray striation shimmer (the classic Arctic "curtain pillar" look)
    const striation =
      0.62 +
      0.38 * Math.sin(xNorm * 42 + p.phase * 3 + sim.time * 0.85 * p.freq) *
        Math.cos(xNorm * 19 - sim.time * 0.45);

    // Edge fade so curtains vanish organically into the horizon at viewport sides
    const edgeFade = Math.sin(clamp(xNorm, 0, 1) * Math.PI);
    const localIntensity = clamp(p.alpha * lightBoost * (0.28 + 0.95 * foldWave) * striation * (0.25 + 0.75 * edgeFade), 0, 0.95);
    if (localIntensity <= 0.004) continue;

    let baseY = sampleRibbonY(xNorm, p.y, amp, p.phase, sim.time, p.freq);

    // Subtle pointer magnetic deflection
    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0) {
      const dx = x - sim.pointer.x;
      const dist = Math.abs(dx);
      const influenceR = 240 * (0.7 + sim.interactionStrength * 0.35);
      if (dist < influenceR) {
        const pull = Math.pow(1 - dist / influenceR, 2);
        baseY += (sim.pointer.y - baseY) * 0.18 * pull * sim.interactionStrength;
      }
    }

    const localRayHeight = curtainHeight * (0.65 + 0.65 * foldWave);
    const topY = baseY - localRayHeight;
    const bottomY = baseY + localRayHeight * 0.14;

    const grad = ctx.createLinearGradient(x, bottomY, x, topY);
    grad.addColorStop(0, hexToRgba(p.color, 0));
    // Luminous lower rim (characteristic crisp emission edge of real borealis)
    grad.addColorStop(0.14, hexToRgba(p.color, localIntensity));
    grad.addColorStop(0.36, hexToRgba(p.color, localIntensity * 0.72));
    grad.addColorStop(0.68, hexToRgba(secondaryColor, localIntensity * 0.34));
    grad.addColorStop(0.88, hexToRgba(tertiaryColor, localIntensity * 0.12));
    grad.addColorStop(1, hexToRgba(tertiaryColor, 0));

    ctx.fillStyle = grad;
    ctx.fillRect(x - rayWidth * 0.5, topY, rayWidth, bottomY - topY);
  }
}

export const auroraElement: ElementDefinition<'aurora'> = {
  name: 'aurora',
  label: 'Aurora',
  description: 'Arctic Circle borealis curtains, flowing silk waves, and starry polar skies.',
  defaultPreset: 'northern',
  presets: {
    northern: {
      id: 'northern',
      label: 'Arctic Borealis',
      description: 'Sweeping full-sky northern lights with fine vertical ray striations and luminous lower rims.',
      count: 4,
      colors: ['#2ee59d', '#00d2b8', '#38bdf8', '#7c3aed', '#c026d3'],
      lightColors: ['#047857', '#0f766e', '#0369a1', '#5b21b6', '#a21caf'],
      blendMode: 'screen',
      defaultWind: 0.12,
      defaultSpeed: 0.9,
      params: { mode: 'northern' },
    },
    silk: {
      id: 'silk',
      label: 'Silk Waves',
      description: 'Sleek iridescent ribbon waves gliding effortlessly across modern hero sections.',
      count: 6,
      colors: ['#22d3ee', '#818cf8', '#e879f9', '#34d399', '#60a5fa'],
      lightColors: ['#0e7490', '#4338ca', '#a21caf', '#047857', '#1d4ed8'],
      blendMode: 'screen',
      defaultWind: 0.18,
      defaultSpeed: 0.9,
      params: { mode: 'silk' },
    },
    polar: {
      id: 'polar',
      label: 'Polar Night',
      description: 'Crisp Arctic starfield beneath a calm, high-altitude shimmering borealis veil.',
      count: 52,
      colors: ['#34d399', '#22d3ee', '#818cf8', '#a855f7', '#f8fafc'],
      lightColors: ['#047857', '#0284c7', '#4338ca', '#7c3aed', '#1e293b'],
      blendMode: 'screen',
      defaultWind: 0.08,
      defaultSpeed: 0.8,
      params: { mode: 'polar' },
    },
  },

  drawBackground(ctx: CanvasRenderingContext2D, sim: SimulationContext): void {
    if (sim.preset.params?.mode !== 'polar') return;
    // Guarantee 2 calm high-altitude Arctic borealis veils behind the polar starfield
    for (let idx = 0; idx < 2; idx++) {
      const veil: Particle = {
        x: 0,
        y: sim.height * (0.36 + idx * 0.14),
        vx: 0,
        vy: 0,
        size: sim.height * (0.34 + idx * 0.08),
        alpha: (0.14 + idx * 0.04) * sim.opacity,
        baseAlpha: 0.16,
        color: sim.colors[idx % Math.max(1, sim.colors.length - 1)] ?? '#34d399',
        rotation: 0,
        vRot: 0,
        life: sim.time,
        maxLife: 999,
        phase: idx * 2.4 + sim.time * (0.1 + sim.wind * 0.25),
        freq: 0.65 + idx * 0.2,
        depth: 1,
        extra: sim.height * (0.055 + idx * 0.025),
      };
      drawArcticCurtain(ctx, veil, sim);
    }
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'northern');
    const depth = rand(0.7, 1.2);

    if (mode === 'silk') {
      const baseAlpha = rand(0.14, 0.25);
      return {
        x: 0,
        y: rand(sim.height * 0.22, sim.height * 0.78),
        vx: rand(10, 22) * depth,
        vy: 0,
        size: rand(65, 145) * depth, // band thickness
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(1, 10) : 0,
        maxLife: 999,
        phase: rand(0, Math.PI * 2),
        freq: rand(0.45, 0.95),
        depth,
        kind: 'silk',
        extra: rand(26, 68) * depth, // wave amplitude
      };
    }

    if (mode === 'polar') {
      const isBright = Math.random() < 0.18;
      const baseAlpha = isBright ? rand(0.6, 0.95) : rand(0.28, 0.7);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height * 0.94),
        vx: rand(-2, 3) * depth,
        vy: rand(-1.5, 1.5),
        size: isBright ? rand(1.6, 2.6) : rand(0.7, 1.6),
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: isBright ? sim.colors[sim.colors.length - 1] ?? '#ffffff' : pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(1, 10) : 0,
        maxLife: 999,
        phase: rand(0, Math.PI * 2),
        freq: rand(1.1, 3.2),
        depth,
        kind: 'polar-star',
      };
    }

    // Continuous Arctic Borealis curtain layer
    const baseAlpha = mode === 'polar' ? rand(0.11, 0.18) : rand(0.14, 0.24);
    return {
      x: 0,
      y: rand(sim.height * 0.34, sim.height * 0.62),
      vx: 0,
      vy: 0,
      size: rand(sim.height * 0.28, sim.height * 0.52) * depth, // vertical ray reach
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors.slice(0, Math.min(3, sim.colors.length))),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(2, 12) : 0,
      maxLife: 999,
      phase: rand(0, Math.PI * 2),
      freq: rand(0.55, 1.15),
      depth,
      kind: 'arctic-curtain',
      extra: rand(sim.height * 0.045, sim.height * 0.11), // wave amplitude
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'polar-star') {
      p.x += (p.vx + sim.wind * 8 * p.depth) * dt;
      p.y += p.vy * dt;
      if (p.x < -8) p.x = sim.width + 8;
      if (p.x > sim.width + 8) p.x = -8;
      if (p.y < -8) p.y = sim.height + 8;
      if (p.y > sim.height + 8) p.y = -8;

      const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.life * p.freq + p.phase));
      p.alpha = p.baseAlpha * twinkle * sim.opacity;
      return true;
    }

    if (p.kind === 'silk') {
      p.phase += (0.5 + sim.wind * 0.45) * dt * p.freq;
      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const dy = sim.pointer.y - p.y;
        p.y += clamp(dy, -120, 120) * 0.28 * sim.interactionStrength * sim.dt;
      }
      const breath = 0.76 + 0.24 * Math.sin(p.life * 0.65 + p.depth * 3);
      p.alpha = p.baseAlpha * breath * sim.opacity;
      return true;
    }

    // Arctic curtain gently drifts horizontally via phase shift
    p.phase += (0.14 + sim.wind * 0.35) * dt * p.freq;
    const breath = 0.78 + 0.22 * Math.sin(p.life * 0.42 + p.depth * 4);
    p.alpha = p.baseAlpha * breath * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.004) return;

    if (p.kind === 'polar-star') {
      const boost = sim.theme === 'light' ? 1.45 : 1;
      ctx.fillStyle = hexToRgba(p.color, clamp(p.alpha * boost, 0, 1));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (p.kind === 'silk') {
      const amp = p.extra ?? 48;
      const bandH = p.size;
      const steps = 28;
      const boost = sim.theme === 'light' ? 1.4 : 1;
      const alpha = clamp(p.alpha * boost, 0, 0.85);

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = t * sim.width;
        const wave =
          Math.sin(t * Math.PI * 2.1 + p.phase) * amp +
          Math.cos(t * Math.PI * 3.4 - p.phase * 0.7) * (amp * 0.35);
        const y = p.y + wave - bandH * 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const x = t * sim.width;
        const wave =
          Math.sin(t * Math.PI * 2.1 + p.phase) * amp +
          Math.cos(t * Math.PI * 3.4 - p.phase * 0.7) * (amp * 0.35);
        const y = p.y + wave + bandH * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, p.y - bandH * 1.1, 0, p.y + bandH * 1.1);
      grad.addColorStop(0, hexToRgba(p.color, 0));
      grad.addColorStop(0.45, hexToRgba(p.color, alpha));
      grad.addColorStop(0.55, hexToRgba(p.color, alpha * 0.9));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      return;
    }

    // Continuous Arctic Borealis curtain
    drawArcticCurtain(ctx, p, sim);
  },
};
