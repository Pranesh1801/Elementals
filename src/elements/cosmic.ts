import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  coreColor: string
): void {
  const spike = radius * 3.1;
  ctx.save();
  ctx.translate(x, y);

  // Soft halo
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, spike);
  grad.addColorStop(0, hexToRgba(coreColor, alpha));
  grad.addColorStop(0.25, hexToRgba(color, alpha * 0.65));
  grad.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, spike, 0, Math.PI * 2);
  ctx.fill();

  // Crisp diffraction cross
  ctx.strokeStyle = hexToRgba(coreColor, alpha * 0.85);
  ctx.lineWidth = Math.max(0.7, radius * 0.35);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-spike, 0);
  ctx.lineTo(spike, 0);
  ctx.moveTo(0, -spike);
  ctx.lineTo(0, spike);
  ctx.stroke();

  ctx.restore();
}

export const cosmicElement: ElementDefinition<'cosmic'> = {
  name: 'cosmic',
  label: 'Cosmic',
  description: 'Parallax twinkling starfields, streaking shooting meteors, and glowing nebula clouds.',
  defaultPreset: 'starfield',
  presets: {
    starfield: {
      id: 'starfield',
      label: 'Starfield',
      description: 'Multi-depth twinkling stars with subtle pointer parallax.',
      count: 135,
      colors: ['#ffffff', '#dbeafe', '#e0e7ff', '#fef08a', '#c4b5fd'],
      lightColors: ['#4f46e5', '#6366f1', '#7c3aed', '#0284c7', '#1e1b4b'],
      blendMode: 'lighter',
      defaultWind: 0.04,
      defaultSpeed: 1,
      params: { mode: 'starfield' },
    },
    meteors: {
      id: 'meteors',
      label: 'Meteor Shower',
      description: 'Twinkling night sky punctuated by luminous shooting stars.',
      count: 110,
      colors: ['#ffffff', '#bae6fd', '#c4b5fd', '#fde68a', '#93c5fd'],
      lightColors: ['#4f46e5', '#0284c7', '#7c3aed', '#d97706', '#2563eb'],
      blendMode: 'lighter',
      defaultWind: 0.08,
      defaultSpeed: 1,
      params: { mode: 'meteors' },
    },
    nebula: {
      id: 'nebula',
      label: 'Nebula',
      description: 'Luminous indigo, violet, and cyan cosmic clouds layered with micro-stars.',
      count: 95,
      colors: ['#a855f7', '#6366f1', '#ec4899', '#38bdf8', '#ffffff'],
      lightColors: ['#7c3aed', '#4f46e5', '#db2777', '#0284c7', '#312e81'],
      blendMode: 'lighter',
      defaultWind: 0.06,
      defaultSpeed: 0.85,
      params: { mode: 'nebula' },
    },
  },

  onFrame(sim: SimulationContext): void {
    if (sim.preset.params?.mode !== 'meteors') return;
    const dt = sim.dt * sim.speed;
    // Frame-level spawn rate: ~1.3 shooting stars per second regardless of density/viewport
    if (Math.random() < dt * 1.3) {
      const angle = rand(0.35, 0.78);
      const speed = rand(520, 920);
      sim.spawnSecondary({
        x: rand(-40, sim.width * 0.85),
        y: rand(-20, sim.height * 0.45),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(1.6, 2.8),
        alpha: 0,
        baseAlpha: rand(0.75, 1),
        color: pick(sim.colors),
        rotation: angle,
        vRot: 0,
        life: 0,
        maxLife: rand(0.55, 1.05),
        phase: 0,
        freq: 1,
        depth: 1,
        kind: 'meteor',
        extra: rand(75, 165), // tail length
      });
    }
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'starfield');
    const depth = rand(0.3, 1.3);

    if (mode === 'nebula' && Math.random() < 0.22) {
      const size = rand(85, 195) * depth;
      const baseAlpha = rand(0.08, 0.18);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: rand(-7, 7) * depth,
        vy: rand(-5, 5) * depth,
        size,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors.slice(0, Math.max(1, sim.colors.length - 1))),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(1, 10) : 0,
        maxLife: rand(18, 30),
        phase: rand(0, Math.PI * 2),
        freq: rand(0.25, 0.65),
        depth,
        kind: 'nebula',
      };
    }

    const isBrightStar = Math.random() < 0.14;
    const baseAlpha = isBrightStar ? rand(0.65, 1) : rand(0.3, 0.85);
    return {
      x: rand(0, sim.width),
      y: rand(0, sim.height),
      vx: rand(-3, 5) * depth,
      vy: rand(-3, 3) * depth,
      size: isBrightStar ? rand(2.1, 3.6) * depth : rand(0.7, 2.0) * depth,
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(1, 10) : 0,
      maxLife: 999,
      phase: rand(0, Math.PI * 2),
      freq: rand(1.1, 4.2),
      depth,
      kind: isBrightStar ? 'bright-star' : 'star',
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'meteor') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.maxLife || p.x > sim.width + 200 || p.y > sim.height + 200) {
        return false;
      }
      const t = p.life / p.maxLife;
      const env = clamp(t * 5, 0, 1) * clamp((1 - t) * 2.2, 0, 1);
      p.alpha = p.baseAlpha * env * sim.opacity;
      return true;
    }

    // Gentle drift + responsive pointer parallax
    let parallaxX = 0;
    let parallaxY = 0;
    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      parallaxX = -sim.pointer.vx * 0.22 * sim.interactionStrength * p.depth;
      parallaxY = -sim.pointer.vy * 0.22 * sim.interactionStrength * p.depth;
    }

    p.x += (p.vx + sim.wind * 18 * p.depth) * dt + parallaxX;
    p.y += p.vy * dt + parallaxY;

    const margin = p.kind === 'nebula' ? p.size : 12;
    if (p.x < -margin) p.x = sim.width + margin;
    if (p.x > sim.width + margin) p.x = -margin;
    if (p.y < -margin) p.y = sim.height + margin;
    if (p.y > sim.height + margin) p.y = -margin;

    if (p.kind === 'nebula') {
      const breath = 0.72 + 0.28 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * breath * sim.opacity;
      return true;
    }

    const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.life * p.freq + p.phase));
    p.alpha = p.baseAlpha * twinkle * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.008) return;
    const isLight = sim.theme === 'light';
    const coreColor = isLight ? p.color : '#ffffff';

    if (p.kind === 'meteor') {
      const a = clamp(p.alpha * (isLight ? 1.45 : 1), 0, 0.98);
      const tailLen = p.extra ?? 110;
      const tailX = p.x - Math.cos(p.rotation) * tailLen;
      const tailY = p.y - Math.sin(p.rotation) * tailLen;

      const grad = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
      grad.addColorStop(0, hexToRgba(coreColor, a));
      grad.addColorStop(0.25, hexToRgba(p.color, a * 0.8));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.strokeStyle = grad;
      ctx.lineWidth = p.size * (isLight ? 1.2 : 1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Luminous meteor head
      ctx.fillStyle = hexToRgba(coreColor, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (p.kind === 'nebula') {
      const a = clamp(p.alpha * (isLight ? 1.85 : 1), 0, 0.45);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, hexToRgba(p.color, a));
      grad.addColorStop(0.5, hexToRgba(p.color, a * 0.4));
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (p.kind === 'bright-star') {
      const a = clamp(p.alpha * (isLight ? 1.45 : 1), 0, 0.98);
      drawFourPointStar(ctx, p.x, p.y, p.size * (isLight ? 1.15 : 1), p.color, a, coreColor);
      return;
    }

    const a = clamp(p.alpha * (isLight ? 1.55 : 1), 0, 0.95);
    ctx.fillStyle = hexToRgba(p.color, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (isLight ? 1.28 : 1), 0, Math.PI * 2);
    ctx.fill();
  },
};
