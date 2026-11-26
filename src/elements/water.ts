import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

export const waterElement: ElementDefinition<'water'> = {
  name: 'water',
  label: 'Water',
  description: 'Crisp rainfall with splash ripples, rising iridescent bubbles, and drifting mist.',
  defaultPreset: 'rain',
  presets: {
    rain: {
      id: 'rain',
      label: 'Rain',
      description: 'Layered rain streaks with subtle ground splash ripples.',
      count: 140,
      colors: ['#e0f7ff', '#90e0ef', '#48cae4', '#caf0f8'],
      lightColors: ['#0284c7', '#0369a1', '#0ea5e9', '#38bdf8'],
      blendMode: 'source-over',
      defaultWind: 0.35,
      defaultSpeed: 1,
      params: { mode: 'rain' },
    },
    bubbles: {
      id: 'bubbles',
      label: 'Bubbles',
      description: 'Translucent buoyant bubbles with curved specular highlights.',
      count: 65,
      colors: ['#e0fbfc', '#98c1d9', '#72efdd', '#a8dadc'],
      lightColors: ['#0284c7', '#0ea5e9', '#0d9488', '#38bdf8'],
      blendMode: 'source-over',
      defaultWind: 0.05,
      defaultSpeed: 0.85,
      params: { mode: 'bubbles' },
    },
    mist: {
      id: 'mist',
      label: 'Mist',
      description: 'Soft atmospheric vapor clouds gliding calmly across the viewport.',
      count: 28,
      colors: ['#e2f1f8', '#b8d8e8', '#d6eef8', '#9ec5d6'],
      lightColors: ['#64748b', '#94a3b8', '#7dd3fc', '#475569'],
      blendMode: 'screen',
      defaultWind: 0.5,
      defaultSpeed: 0.7,
      params: { mode: 'mist' },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'rain');

    if (mode === 'bubbles') {
      const depth = rand(0.45, 1.25);
      const baseAlpha = rand(0.28, 0.72);
      return {
        x: rand(0, sim.width),
        y: initial ? rand(0, sim.height) : sim.height + rand(15, 70),
        vx: rand(-8, 8),
        vy: -rand(24, 64) * depth,
        size: rand(4, 16) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(1.5, 8) : 0,
        maxLife: rand(8, 16),
        phase: rand(0, Math.PI * 2),
        freq: rand(1.1, 2.8),
        depth,
        kind: 'bubble',
      };
    }

    if (mode === 'mist') {
      const depth = rand(0.5, 1.1);
      const size = rand(110, 240) * depth;
      const baseAlpha = rand(0.06, 0.16);
      return {
        x: initial ? rand(-size, sim.width + size) : -size * 1.1,
        y: rand(sim.height * 0.1, sim.height * 0.95),
        vx: rand(14, 34) * depth,
        vy: rand(-4, 4),
        size,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(2, 12) : 0,
        maxLife: rand(16, 28),
        phase: rand(0, Math.PI * 2),
        freq: rand(0.25, 0.6),
        depth,
        kind: 'mist',
      };
    }

    // Default: rain
    const depth = rand(0.45, 1.25);
    const baseAlpha = rand(0.24, 0.68) * depth;
    return {
      x: rand(-sim.width * 0.2, sim.width * 1.2),
      y: initial ? rand(0, sim.height * 0.85) : rand(-90, -10),
      vx: 0,
      vy: rand(460, 820) * depth,
      size: rand(14, 28) * depth,
      alpha: initial ? clamp(baseAlpha, 0, 0.85) * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(0.5, 2) : 0,
      maxLife: 4,
      phase: rand(0, Math.PI * 2),
      freq: 1,
      depth,
      kind: 'rain',
      extra: rand(0.86, 0.99), // splash line factor
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'splash') {
      if (p.life >= p.maxLife) return false;
      const t = p.life / p.maxLife;
      p.size = (p.extra ?? 10) * (0.25 + t * 1.35);
      p.alpha = p.baseAlpha * (1 - t) * sim.opacity;
      return true;
    }

    if (p.kind === 'bubble') {
      const wobble = Math.sin(p.life * p.freq + p.phase) * 20 * p.depth;
      p.x += (p.vx + wobble + sim.wind * 25) * dt;
      p.y += p.vy * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 140 * (0.7 + strength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / radius) * 340 * strength * sim.dt;
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push * 0.45;
        }
      }
      p.vx *= Math.pow(0.2, dt);

      if (p.y < -p.size * 2) return false;
      if (p.x < -p.size * 2) p.x = sim.width + p.size;
      if (p.x > sim.width + p.size * 2) p.x = -p.size;

      const fadeIn = clamp(p.life * 2, 0, 1);
      p.alpha = p.baseAlpha * fadeIn * sim.opacity;
      return true;
    }

    if (p.kind === 'mist') {
      const windPush = sim.wind * 34 * p.depth;
      const baseDrift = sim.wind < 0 ? -Math.abs(p.vx) : p.vx;
      p.x += (baseDrift + windPush) * dt;
      p.y += (p.vy + Math.sin(p.life * p.freq + p.phase) * 5) * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 220 * (0.7 + strength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / radius) * 95 * strength * sim.dt;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        }
      }

      if (p.x > sim.width + p.size * 1.4) p.x = -p.size * 1.2;
      if (p.x < -p.size * 1.4) p.x = sim.width + p.size * 1.2;

      const breath = 0.72 + 0.28 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * breath * sim.opacity;
      return true;
    }

    // Rain
    const slantVx = sim.wind * 150 * p.depth;
    p.x += (slantVx + p.vx) * dt;
    p.y += p.vy * dt;

    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 120 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        p.vx += (dx / dist) * (1 - dist / radius) * 560 * strength * sim.dt;
      }
    }
    p.vx *= Math.pow(0.08, dt);

    const splashY = sim.height * (p.extra ?? 0.96);
    if (sim.dt > 0 && p.y >= splashY) {
      if (Math.random() < 0.38) {
        sim.spawnSecondary({
          x: p.x,
          y: splashY,
          vx: 0,
          vy: 0,
          size: 3,
          alpha: p.baseAlpha * 0.7,
          baseAlpha: p.baseAlpha * 0.65,
          color: p.color,
          rotation: 0,
          vRot: 0,
          life: 0,
          maxLife: rand(0.28, 0.5),
          phase: 0,
          freq: 1,
          depth: p.depth,
          kind: 'splash',
          extra: rand(7, 15) * p.depth,
        });
      }
      return false;
    }

    p.alpha = clamp(p.baseAlpha, 0, 0.85) * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.005) return;
    const isLight = sim.theme === 'light';

    if (p.kind === 'splash') {
      const a = clamp(p.alpha * (isLight ? 1.6 : 1), 0, 0.95);
      ctx.strokeStyle = hexToRgba(p.color, a);
      ctx.lineWidth = isLight ? 1.3 : 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (p.kind === 'bubble') {
      const a = clamp(p.alpha * (isLight ? 1.55 : 1), 0, 0.95);
      const r = p.size;
      const grad = ctx.createRadialGradient(
        p.x - r * 0.3,
        p.y - r * 0.3,
        r * 0.05,
        p.x,
        p.y,
        r
      );
      grad.addColorStop(0, hexToRgba('#ffffff', a * (isLight ? 0.65 : 0.45)));
      grad.addColorStop(0.55, hexToRgba(p.color, a * (isLight ? 0.22 : 0.14)));
      grad.addColorStop(1, hexToRgba(p.color, a * (isLight ? 0.68 : 0.55)));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(p.color, a * 0.9);
      ctx.lineWidth = Math.max(isLight ? 1.1 : 0.8, r * 0.09);
      ctx.stroke();

      // Specular highlight arc
      ctx.strokeStyle = hexToRgba('#ffffff', a * 0.9);
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.65, -Math.PI * 0.82, -Math.PI * 0.42);
      ctx.stroke();
      return;
    }

    if (p.kind === 'mist') {
      const a = clamp(p.alpha * (isLight ? 2.1 : 1), 0, 0.42);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, hexToRgba(p.color, a));
      grad.addColorStop(0.55, hexToRgba(p.color, a * 0.45));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 1.4, p.size * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Rain streak
    const a = clamp(p.alpha * (isLight ? 1.65 : 1), 0, 0.92);
    const slantDx = (sim.wind * 150 * p.depth + p.vx) * (p.size / Math.max(1, p.vy));
    const grad = ctx.createLinearGradient(p.x - slantDx, p.y - p.size, p.x, p.y);
    grad.addColorStop(0, hexToRgba(p.color, 0));
    grad.addColorStop(1, hexToRgba(p.color, a));

    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(isLight ? 1.25 : 0.9, p.depth * (isLight ? 1.5 : 1.25));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x - slantDx, p.y - p.size);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  },
};
