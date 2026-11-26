import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

export const fireElement: ElementDefinition<'fire'> = {
  name: 'fire',
  label: 'Fire',
  description: 'Rising glowing embers, fierce inferno sparks, and warm candlelight motes.',
  defaultPreset: 'embers',
  presets: {
    embers: {
      id: 'embers',
      label: 'Embers',
      description: 'Warm glowing sparks rising lazily from a hearth with subtle heat drift.',
      count: 95,
      colors: ['#fff3b0', '#ffbe0b', '#fb5607', '#ff6d00', '#e63946'],
      lightColors: ['#ea580c', '#dc2626', '#d97706', '#f97316', '#b91c1c'],
      blendMode: 'lighter',
      defaultWind: 0.15,
      defaultSpeed: 1,
      params: { minSize: 1.4, maxSize: 4.2, riseMin: 28, riseMax: 85, streak: false },
    },
    inferno: {
      id: 'inferno',
      label: 'Inferno',
      description: 'Fast, turbulent blaze sparks with glowing motion streaks.',
      count: 145,
      colors: ['#ffffff', '#ffe066', '#ff922b', '#ff5400', '#d00000'],
      lightColors: ['#dc2626', '#ea580c', '#c2410c', '#f59e0b', '#991b1b'],
      blendMode: 'lighter',
      defaultWind: 0.45,
      defaultSpeed: 1.35,
      params: { minSize: 1.5, maxSize: 4.8, riseMin: 75, riseMax: 210, streak: true },
    },
    candlelight: {
      id: 'candlelight',
      label: 'Candlelight',
      description: 'Soft, serene golden bokeh orbs drifting gently upward.',
      count: 45,
      colors: ['#fff6cc', '#ffd166', '#f4a261', '#ff9f1c'],
      lightColors: ['#f59e0b', '#d97706', '#ea580c', '#fb923c'],
      blendMode: 'lighter',
      defaultWind: 0,
      defaultSpeed: 0.65,
      params: { minSize: 4, maxSize: 13, riseMin: 10, riseMax: 32, streak: false },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const params = sim.preset.params ?? {};
    const minSize = Number(params.minSize ?? 1.4);
    const maxSize = Number(params.maxSize ?? 4.2);
    const riseMin = Number(params.riseMin ?? 28);
    const riseMax = Number(params.riseMax ?? 85);

    const depth = rand(0.4, 1.2);
    const maxLife = rand(3.2, 7.5);
    const baseAlpha = rand(0.45, 0.95);
    return {
      x: rand(-20, sim.width + 20),
      y: initial ? rand(0, sim.height) : sim.height + rand(6, 48),
      vx: rand(-14, 14),
      vy: -rand(riseMin, riseMax) * depth,
      size: rand(minSize, maxSize) * (0.65 + depth * 0.45),
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(maxLife * 0.2, maxLife * 0.75) : 0,
      maxLife,
      phase: rand(0, Math.PI * 2),
      freq: rand(1.4, 4.2),
      depth,
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;
    if (p.life >= p.maxLife || p.y < -40) {
      return false;
    }

    const sway = Math.sin(p.life * p.freq + p.phase) * 26 * p.depth;
    p.x += (p.vx + sway + sim.wind * 42 * p.depth) * dt;
    p.y += p.vy * dt;

    // Responsive thermal updraft swirl near pointer
    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 155 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        const force = falloff * 520 * strength * sim.dt;
        // Swirl + repel + follow cursor draft
        p.vx += (dx / dist) * force - (dy / dist) * force * 0.32 + sim.pointer.vx * 18 * strength * falloff * sim.dt;
        p.vy += (dy / dist) * force * 0.25 - force * 0.55 + sim.pointer.vy * 10 * strength * falloff * sim.dt;
      }
    }

    // Dampen extra horizontal impulses back to smooth drift
    p.vx *= Math.pow(0.18, dt);

    // Wrap horizontally
    if (p.x < -30) p.x = sim.width + 25;
    if (p.x > sim.width + 30) p.x = -25;

    const lifeRatio = p.life / p.maxLife;
    const fadeIn = clamp(lifeRatio * 5, 0, 1);
    const fadeOut = clamp((1 - lifeRatio) * 1.45, 0, 1);
    const flicker = 0.78 + 0.22 * Math.sin(p.life * (p.freq * 3.1) + p.phase);
    p.alpha = p.baseAlpha * fadeIn * fadeOut * flicker * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.01) return;

    const isLight = sim.theme === 'light';
    const alpha = clamp(p.alpha * (isLight ? 1.45 : 1), 0, 0.98);
    const lifeRatio = clamp(p.life / p.maxLife, 0, 1);
    const radius = Math.max(0.8, p.size * (1 - lifeRatio * 0.45));
    const isStreak = Boolean(sim.preset.params?.streak);
    const coreColor = isLight ? p.color : '#fff9e6';

    if (isStreak) {
      const tailLen = Math.min(28, Math.abs(p.vy) * 0.095);
      const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.06, p.y + tailLen);
      grad.addColorStop(0, hexToRgba(coreColor, alpha));
      grad.addColorStop(0.35, hexToRgba(p.color, alpha * 0.85));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(isLight ? 1.6 : 1.2, radius * 0.95);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx + sim.wind * 20) * 0.05, p.y + tailLen);
      ctx.stroke();
      return;
    }

    const glowRadius = radius * (isLight ? 2.6 : 3.2);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
    grad.addColorStop(0, hexToRgba(coreColor, alpha));
    grad.addColorStop(0.35, hexToRgba(p.color, alpha * 0.78));
    grad.addColorStop(1, hexToRgba(p.color, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    if (isLight) {
      ctx.fillStyle = hexToRgba(p.color, alpha * 0.9);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.1, radius * 0.65), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
