import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  alpha: number,
  flipScale: number
): void {
  ctx.scale(1, flipScale);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.65, size, 0);
  ctx.quadraticCurveTo(0, size * 0.65, -size, 0);
  ctx.closePath();

  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.fill();

  // Subtle leaf vein
  ctx.strokeStyle = hexToRgba('#ffffff', alpha * 0.32);
  ctx.lineWidth = Math.max(0.7, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(-size * 0.85, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.stroke();
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  alpha: number,
  flipScale: number
): void {
  ctx.scale(1, flipScale);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.8);
  ctx.bezierCurveTo(size * 0.85, -size * 0.4, size * 0.7, size * 0.65, 0, size * 0.85);
  ctx.bezierCurveTo(-size * 0.7, size * 0.65, -size * 0.85, -size * 0.4, 0, -size * 0.8);
  ctx.closePath();

  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.fill();
}

export const grassElement: ElementDefinition<'grass'> = {
  name: 'grass',
  label: 'Grass',
  description: 'Fluttering botanical leaves, drifting blossom petals, and glowing fireflies.',
  defaultPreset: 'leaves',
  presets: {
    leaves: {
      id: 'leaves',
      label: 'Leaves',
      description: 'Tumbling forest leaves catching gentle swaying wind gusts.',
      count: 55,
      colors: ['#52b788', '#74c69d', '#40916c', '#95d5b2', '#b7e4c7', '#a3b18a'],
      lightColors: ['#15803d', '#16a34a', '#22c55e', '#166534', '#4d7c0f'],
      blendMode: 'source-over',
      defaultWind: 0.45,
      defaultSpeed: 1,
      params: { mode: 'leaves' },
    },
    petals: {
      id: 'petals',
      label: 'Petals',
      description: 'Graceful meadow & cherry-blossom petals spiraling on a breeze.',
      count: 68,
      colors: ['#ffc8dd', '#ffafcc', '#fde2e4', '#d8f3dc', '#fff1f5'],
      lightColors: ['#ec4899', '#f472b6', '#fb7185', '#f43f5e', '#fda4af'],
      blendMode: 'source-over',
      defaultWind: 0.35,
      defaultSpeed: 0.9,
      params: { mode: 'petals' },
    },
    fireflies: {
      id: 'fireflies',
      label: 'Fireflies',
      description: 'Bioluminescent meadow fireflies wandering and pulsing softly.',
      count: 65,
      colors: ['#d9ed92', '#b5e48c', '#99d98c', '#ffe66d', '#e9ff70'],
      lightColors: ['#65a30d', '#84cc16', '#ca8a04', '#16a34a', '#eab308'],
      blendMode: 'lighter',
      defaultWind: 0.05,
      defaultSpeed: 0.85,
      params: { mode: 'fireflies' },
    },
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'leaves');
    const depth = rand(0.5, 1.25);

    if (mode === 'fireflies') {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(12, 34) * depth;
      const baseAlpha = rand(0.55, 0.95);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(2.2, 4.8) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: angle,
        vRot: rand(-0.9, 0.9),
        life: initial ? rand(1.5, 8) : 0,
        maxLife: rand(8, 16),
        phase: rand(0, Math.PI * 2),
        freq: rand(1.2, 2.8),
        depth,
        kind: 'firefly',
      };
    }

    const isPetals = mode === 'petals';
    const baseAlpha = rand(0.55, 0.92);
    return {
      x: initial ? rand(-30, sim.width + 30) : rand(-sim.width * 0.2, sim.width + 30),
      y: initial ? rand(-20, sim.height) : rand(-60, -15),
      vx: rand(-15, 25),
      vy: (isPetals ? rand(26, 58) : rand(34, 78)) * depth,
      size: (isPetals ? rand(5, 10) : rand(7, 15)) * depth,
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: rand(0, Math.PI * 2),
      vRot: rand(-1.8, 1.8),
      life: initial ? rand(1, 6) : 0,
      maxLife: 24,
      phase: rand(0, Math.PI * 2),
      freq: rand(1.4, 3.2),
      depth,
      kind: isPetals ? 'petal' : 'leaf',
      extra: rand(1.8, 3.8), // tumble speed
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'firefly') {
      // Smooth organic wandering
      p.rotation += (Math.sin(p.life * 0.9 + p.phase) * 1.4 + p.vRot * 0.35) * dt;
      const moveSpeed = 24 * p.depth;
      p.vx = Math.cos(p.rotation) * moveSpeed + sim.wind * 18;
      p.vy = Math.sin(p.rotation) * moveSpeed;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = sim.pointer.x - p.x;
        const dy = sim.pointer.y - p.y;
        const distSq = dx * dx + dy * dy;
        const radius = 195 * (0.7 + strength * 0.35);
        if (distSq > 25 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / radius;
          // Curious spiral orbit toward pointer
          const pull = (45 + 95 * falloff) * strength;
          p.vx += (dx / dist) * pull - (dy / dist) * pull * 0.35;
          p.vy += (dy / dist) * pull + (dx / dist) * pull * 0.35;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -20) p.x = sim.width + 20;
      if (p.x > sim.width + 20) p.x = -20;
      if (p.y < -20) p.y = sim.height + 20;
      if (p.y > sim.height + 20) p.y = -20;

      const pulse = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(p.life * p.freq + p.phase), 2);
      p.alpha = p.baseAlpha * pulse * sim.opacity;
      return true;
    }

    // Leaves & Petals
    const gust = Math.sin(sim.time * 0.75 + p.phase) * 38;
    const flutter = Math.cos(p.life * p.freq + p.phase) * 32 * p.depth;
    p.x += (p.vx + flutter + gust + sim.wind * 70 * p.depth) * dt;
    p.y += (p.vy + Math.sin(p.life * p.freq * 1.5 + p.phase) * 14) * dt;
    p.rotation += p.vRot * dt;

    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = p.x - sim.pointer.x;
      const dy = p.y - sim.pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = 165 * (0.7 + strength * 0.35);
      if (distSq > 1 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        const push = falloff * 520 * strength * sim.dt;
        p.vx += (dx / dist) * push + sim.pointer.vx * 18 * strength * falloff * sim.dt;
        p.vy += (dy / dist) * push * 0.4 + sim.pointer.vy * 8 * strength * falloff * sim.dt;
        p.vRot += (dx > 0 ? 1 : -1) * 6 * strength * sim.dt;
      }
    }

    p.vx *= Math.pow(0.2, dt);
    p.vRot = clamp(p.vRot * Math.pow(0.85, dt), -6, 6);

    if (p.y > sim.height + 40) return false;
    if (p.x > sim.width + 50) p.x = -35;
    if (p.x < -50) p.x = sim.width + 35;

    const fadeIn = clamp(p.life * 2, 0, 1);
    p.alpha = p.baseAlpha * fadeIn * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.01) return;
    const isLight = sim.theme === 'light';
    const alpha = clamp(p.alpha * (isLight ? 1.38 : 1), 0, 0.96);

    if (p.kind === 'firefly') {
      const glowR = p.size * (isLight ? 3.2 : 4.2);
      const coreColor = isLight ? p.color : '#ffffea';
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, hexToRgba(coreColor, alpha));
      grad.addColorStop(0.32, hexToRgba(p.color, alpha * 0.78));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      if (isLight) {
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.3, p.size * 0.65), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const flip = 0.28 + 0.72 * Math.abs(Math.cos(p.life * (p.extra ?? 2.4) + p.phase));

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.kind === 'petal') {
      drawPetal(ctx, p.size, p.color, alpha, flip);
    } else {
      drawLeaf(ctx, p.size, p.color, alpha, flip);
    }

    ctx.restore();
  },
};
