import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

function drawCrystalStar(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string,
  alpha: number,
  coreColor: string
): void {
  ctx.strokeStyle = hexToRgba(color, alpha);
  ctx.lineWidth = Math.max(0.8, radius * 0.14);
  ctx.lineCap = 'round';

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cos * radius, sin * radius);

    // Little crystalline side barbs
    const barbStart = radius * 0.56;
    const barbLen = radius * 0.34;
    const bx = cos * barbStart;
    const by = sin * barbStart;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(angle + 0.55) * barbLen, by + Math.sin(angle + 0.55) * barbLen);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(angle - 0.55) * barbLen, by + Math.sin(angle - 0.55) * barbLen);
    ctx.stroke();
  }

  // Crisp glowing core
  ctx.fillStyle = hexToRgba(coreColor, Math.min(1, alpha * 1.15));
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.8, radius * 0.18), 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamondShard(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string,
  alpha: number,
  edgeColor: string
): void {
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.55, 0);
  ctx.lineTo(0, radius);
  ctx.lineTo(-radius * 0.55, 0);
  ctx.closePath();

  ctx.fillStyle = hexToRgba(color, alpha * 0.55);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(edgeColor, alpha * 0.9);
  ctx.lineWidth = Math.max(0.7, radius * 0.12);
  ctx.stroke();
}

export const iceElement: ElementDefinition<'ice'> = {
  name: 'ice',
  label: 'Ice',
  description: 'Rotating hexagonal ice crystals, suspended frost glints, and sharp blizzards.',
  defaultPreset: 'crystals',
  presets: {
    crystals: {
      id: 'crystals',
      label: 'Crystals',
      description: 'Rotating 6-point ice crystals and diamond shards catching light.',
      count: 75,
      colors: ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#cffafe'],
      lightColors: ['#0284c7', '#0369a1', '#0ea5e9', '#0891b2', '#38bdf8'],
      blendMode: 'lighter',
      defaultWind: 0.12,
      defaultSpeed: 1,
      params: { mode: 'crystals' },
    },
    frost: {
      id: 'frost',
      label: 'Frost',
      description: 'Weightless shimmering frost motes and icy specular glints.',
      count: 85,
      colors: ['#ffffff', '#e0f7ff', '#a5f3fc', '#67e8f9'],
      lightColors: ['#0891b2', '#0284c7', '#06b6d4', '#0369a1'],
      blendMode: 'lighter',
      defaultWind: 0.04,
      defaultSpeed: 0.65,
      params: { mode: 'frost' },
    },
    blizzard: {
      id: 'blizzard',
      label: 'Blizzard',
      description: 'Driving diagonal flurry of icy shards and windswept frost flecks.',
      count: 150,
      colors: ['#ffffff', '#e0f2fe', '#bae6fd', '#93c5fd'],
      lightColors: ['#0284c7', '#38bdf8', '#64748b', '#0ea5e9'],
      blendMode: 'source-over',
      defaultWind: 1.6,
      defaultSpeed: 1.35,
      params: { mode: 'blizzard' },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'crystals');
    const depth = rand(0.45, 1.25);

    if (mode === 'frost') {
      const baseAlpha = rand(0.28, 0.85);
      const maxLife = rand(6, 13);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: rand(-10, 10),
        vy: rand(-6, 12),
        size: rand(2.5, 8) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: rand(0, Math.PI * 2),
        vRot: rand(-0.6, 0.6),
        life: initial ? rand(maxLife * 0.25, maxLife * 0.7) : 0,
        maxLife,
        phase: rand(0, Math.PI * 2),
        freq: rand(1.6, 3.8),
        depth,
        kind: Math.random() < 0.65 ? 'diamond' : 'crystal',
      };
    }

    const isBlizzard = mode === 'blizzard';
    const baseAlpha = rand(0.35, 0.9);
    return {
      x: initial ? rand(-40, sim.width + 40) : rand(-sim.width * 0.25, sim.width + 40),
      y: initial ? rand(-20, sim.height) : rand(-60, -10),
      vx: rand(-12, 12),
      vy: (isBlizzard ? rand(110, 240) : rand(24, 65)) * depth,
      size: (isBlizzard ? rand(2.2, 6.2) : rand(4.5, 11.5)) * depth,
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: rand(0, Math.PI * 2),
      vRot: rand(-1.4, 1.4),
      life: initial ? rand(1, 5) : 0,
      maxLife: 20,
      phase: rand(0, Math.PI * 2),
      freq: rand(1.2, 3.0),
      depth,
      kind: isBlizzard
        ? Math.random() < 0.35
          ? 'diamond'
          : 'fleck'
        : Math.random() < 0.55
          ? 'crystal'
          : 'diamond',
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;
    p.rotation += p.vRot * dt;

    const mode = String(sim.preset.params?.mode ?? 'crystals');
    const sway = Math.sin(p.life * p.freq + p.phase) * (mode === 'frost' ? 12 : 24) * p.depth;
    p.x += (p.vx + sway + sim.wind * 75 * p.depth) * dt;
    p.y += p.vy * dt;

    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 150 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        const push = falloff * 380 * strength * sim.dt;
        p.vx += (dx / dist) * push + sim.pointer.vx * 12 * strength * falloff * sim.dt;
        p.vRot += (dx > 0 ? 1 : -1) * 3.5 * strength * sim.dt;
      }
    }
    p.vx *= Math.pow(0.22, dt);

    if (mode === 'frost') {
      if (p.life >= p.maxLife) return false;
      if (p.x < -20) p.x = sim.width + 20;
      if (p.x > sim.width + 20) p.x = -20;
      if (p.y < -20) p.y = sim.height + 20;
      if (p.y > sim.height + 20) p.y = -20;

      const t = p.life / p.maxLife;
      const env = clamp(t * 4, 0, 1) * clamp((1 - t) * 4, 0, 1);
      const glint = 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(p.life * p.freq + p.phase)), 3);
      p.alpha = p.baseAlpha * env * glint * sim.opacity;
      return true;
    }

    if (p.y > sim.height + 35) return false;
    if (p.x > sim.width + 50) p.x = -35;
    if (p.x < -50) p.x = sim.width + 35;

    const glint = 0.72 + 0.28 * Math.sin(p.life * p.freq * 1.6 + p.phase);
    p.alpha = p.baseAlpha * glint * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.01) return;

    const isLight = sim.theme === 'light';
    const alpha = clamp(p.alpha * (isLight ? 1.48 : 1), 0, 0.96);
    const highlight = isLight ? p.color : '#ffffff';

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.kind === 'crystal') {
      drawCrystalStar(ctx, p.size * (isLight ? 1.12 : 1), p.color, alpha, highlight);
    } else if (p.kind === 'diamond') {
      drawDiamondShard(ctx, p.size * (isLight ? 1.12 : 1), p.color, alpha, highlight);
    } else {
      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (isLight ? 0.56 : 0.48), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};
