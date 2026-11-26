import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, createPolygonPoints, hexToRgba, pick, rand, randInt } from '../utils/math.js';

export const sandElement: ElementDefinition<'sand'> = {
  name: 'sand',
  label: 'Sand & Stone',
  description: 'Sweeping desert sandstorms, sunlit dust motes, and tumbling mineral shards.',
  defaultPreset: 'desert',
  presets: {
    desert: {
      id: 'desert',
      label: 'Desert Storm',
      description: 'Wind-swept golden grains and fine horizontal sand ribbons.',
      count: 165,
      colors: ['#f6d59c', '#e9c46a', '#dda15e', '#d4a373', '#bc6c25'],
      lightColors: ['#b45309', '#92400e', '#c2410c', '#a16207', '#78350f'],
      blendMode: 'source-over',
      defaultWind: 1.5,
      defaultSpeed: 1,
      params: { mode: 'desert' },
    },
    dust: {
      id: 'dust',
      label: 'Sunlit Dust',
      description: 'Warm, lazy atmospheric dust motes drifting in golden light.',
      count: 85,
      colors: ['#faedcd', '#f4d58d', '#e9c46a', '#fefae0'],
      lightColors: ['#ca8a04', '#d97706', '#b45309', '#a16207'],
      blendMode: 'lighter',
      defaultWind: 0.15,
      defaultSpeed: 0.7,
      params: { mode: 'dust' },
    },
    pebbles: {
      id: 'pebbles',
      label: 'Stone Shards',
      description: 'Stylized angular stone and mineral polygons tumbling gently.',
      count: 50,
      colors: ['#a89f91', '#8d8273', '#c2b280', '#7f7979', '#b08968'],
      lightColors: ['#57534e', '#78716c', '#44403c', '#92400e', '#64748b'],
      blendMode: 'source-over',
      defaultWind: 0.2,
      defaultSpeed: 0.9,
      params: { mode: 'pebbles' },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'desert');
    const depth = rand(0.4, 1.25);

    if (mode === 'dust') {
      const baseAlpha = rand(0.22, 0.72);
      const maxLife = rand(8, 16);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: rand(-10, 16),
        vy: rand(-10, 10),
        size: rand(1.4, 4.5) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(maxLife * 0.25, maxLife * 0.7) : 0,
        maxLife,
        phase: rand(0, Math.PI * 2),
        freq: rand(0.8, 2.2),
        depth,
        kind: 'dust',
      };
    }

    if (mode === 'pebbles') {
      const radius = rand(4, 11) * depth;
      const baseAlpha = rand(0.55, 0.9);
      return {
        x: initial ? rand(-20, sim.width + 20) : rand(-40, sim.width + 40),
        y: initial ? rand(-20, sim.height) : rand(-60, -15),
        vx: rand(-15, 15),
        vy: rand(42, 115) * depth,
        size: radius,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: rand(0, Math.PI * 2),
        vRot: rand(-2.2, 2.2),
        life: initial ? rand(1, 5) : 0,
        maxLife: 20,
        phase: rand(0, Math.PI * 2),
        freq: 1,
        depth,
        kind: 'pebble',
        points: createPolygonPoints(randInt(5, 7), radius, 0.34),
      };
    }

    // Desert sandstorm
    const isStreak = Math.random() < 0.35;
    const baseAlpha = isStreak ? rand(0.18, 0.45) : rand(0.35, 0.85);
    return {
      x: initial ? rand(0, sim.width) : -rand(10, 80),
      y: rand(0, sim.height),
      vx: rand(140, 320) * depth,
      vy: rand(-14, 24) * depth,
      size: isStreak ? rand(10, 26) * depth : rand(1.1, 3.0) * depth,
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(1, 4) : 0,
      maxLife: 12,
      phase: rand(0, Math.PI * 2),
      freq: rand(1.5, 4.0),
      depth,
      kind: isStreak ? 'streak' : 'grain',
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'dust') {
      const driftX = Math.sin(p.life * p.freq + p.phase) * 14;
      const driftY = Math.cos(p.life * p.freq * 0.8 + p.phase) * 10;
      p.x += (p.vx + driftX + sim.wind * 28) * dt;
      p.y += (p.vy + driftY) * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 140 * (0.7 + strength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / radius) * 200 * strength * sim.dt;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        }
      }

      if (p.life >= p.maxLife) return false;
      if (p.x < -15) p.x = sim.width + 15;
      if (p.x > sim.width + 15) p.x = -15;
      if (p.y < -15) p.y = sim.height + 15;
      if (p.y > sim.height + 15) p.y = -15;

      const t = p.life / p.maxLife;
      const env = clamp(t * 4, 0, 1) * clamp((1 - t) * 4, 0, 1);
      p.alpha = p.baseAlpha * env * sim.opacity;
      return true;
    }

    if (p.kind === 'pebble') {
      p.x += (p.vx + sim.wind * 45 * p.depth) * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 135 * (0.7 + strength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / radius) * 420 * strength * sim.dt;
          p.vx += (dx / dist) * push;
          p.vRot += (dx > 0 ? 1 : -1) * 5 * strength * sim.dt;
        }
      }
      p.vx *= Math.pow(0.35, dt);

      if (p.y > sim.height + 35) return false;
      if (p.x > sim.width + 35) p.x = -25;
      if (p.x < -35) p.x = sim.width + 25;

      p.alpha = p.baseAlpha * sim.opacity;
      return true;
    }

    // Desert sandstorm
    const windFactor = sim.wind === 0 ? 0.4 : sim.wind;
    const waveY = Math.sin(p.x * 0.008 + sim.time * 2.1 + p.phase) * 28 * p.depth;
    const speedX =
      Math.abs(p.vx) * Math.sign(windFactor || 1) * clamp(Math.abs(windFactor), 0.35, 2.8);
    p.x += speedX * dt;
    p.y += (p.vy + waveY) * dt;

    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 145 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        p.y += (dy / dist) * falloff * 320 * strength * sim.dt;
        p.x += (dx / dist) * falloff * 120 * strength * sim.dt;
      }
    }

    if (windFactor >= 0 && p.x > sim.width + 40) p.x = -30;
    if (windFactor < 0 && p.x < -40) p.x = sim.width + 30;
    if (p.y < -20) p.y = sim.height + 15;
    if (p.y > sim.height + 20) p.y = -15;

    p.alpha = p.baseAlpha * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.01) return;
    const isLight = sim.theme === 'light';
    const alpha = clamp(p.alpha * (isLight ? 1.52 : 1), 0, 0.96);

    if (p.kind === 'dust') {
      const r = p.size * 2.2;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, hexToRgba(p.color, alpha));
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (p.kind === 'pebble' && p.points && p.points.length >= 3) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.beginPath();
      const first = p.points[0]!;
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < p.points.length; i++) {
        const pt = p.points[i]!;
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(isLight ? '#1c1917' : '#ffffff', alpha * 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (p.kind === 'streak') {
      const dir = sim.wind < 0 ? -1 : 1;
      const grad = ctx.createLinearGradient(p.x - p.size * dir, p.y, p.x, p.y);
      grad.addColorStop(0, hexToRgba(p.color, 0));
      grad.addColorStop(1, hexToRgba(p.color, alpha));
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(isLight ? 1.2 : 0.9, p.depth * (isLight ? 1.65 : 1.4));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * dir, p.y - 2);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }

    // Fine sand grain
    ctx.fillStyle = hexToRgba(p.color, alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (isLight ? 1.15 : 1), 0, Math.PI * 2);
    ctx.fill();
  },
};
