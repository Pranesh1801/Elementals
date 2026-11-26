import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand } from '../utils/math.js';

/**
 * Draws the subtle gravitational core + luminous photon ring for the Event Horizon preset.
 */
function drawSingularityCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  sim: SimulationContext
): void {
  const isLight = sim.theme === 'light';
  const alpha = clamp(0.88 * sim.opacity * (isLight ? 1.15 : 1), 0, 0.98);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.translate(x, y);

  // Outer gravitational lensing halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.72, 0, 0, r * 3.2);
  halo.addColorStop(0, hexToRgba(color, alpha * 0.42));
  halo.addColorStop(0.28, hexToRgba(color, alpha * 0.16));
  halo.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Tilted relativistic accretion sheen
  ctx.save();
  ctx.rotate(-0.24 + Math.sin(sim.time * 0.18) * 0.04);
  ctx.scale(1, 0.34);
  const diskGrad = ctx.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 2.85);
  diskGrad.addColorStop(0, hexToRgba(isLight ? color : '#f5f3ff', alpha * 0.82));
  diskGrad.addColorStop(0.32, hexToRgba(color, alpha * 0.44));
  diskGrad.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Event horizon shadow sphere (always source-over so it stays deeply dark even under additive blend)
  ctx.globalCompositeOperation = 'source-over';
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  coreGrad.addColorStop(0, hexToRgba(isLight ? '#0f0a1f' : '#020106', alpha * 0.97));
  coreGrad.addColorStop(0.84, hexToRgba(isLight ? '#1e1b4b' : '#05020d', alpha * 0.92));
  coreGrad.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Crisp photon ring rim
  ctx.strokeStyle = hexToRgba(isLight ? color : '#ede9fe', alpha * 0.84);
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export const voidElement: ElementDefinition<'void'> = {
  name: 'void',
  label: 'Void',
  description: 'Event-horizon black hole accretion, luminous dimensional rifts, and quantum fields.',
  defaultPreset: 'singularity',
  presets: {
    singularity: {
      id: 'singularity',
      label: 'Event Horizon',
      description: 'Luminous photon ring and Keplerian accretion streams bending smoothly around gravity.',
      count: 145,
      colors: ['#a855f7', '#818cf8', '#e879f9', '#38bdf8', '#f5f3ff'],
      lightColors: ['#581c87', '#4338ca', '#7e22ce', '#1e1b4b', '#6d28d9'],
      blendMode: 'lighter',
      defaultWind: 0,
      defaultSpeed: 1,
      params: { mode: 'singularity' },
    },
    rifts: {
      id: 'rifts',
      label: 'Dimensional Rifts',
      description: 'Razor-thin luminous spatial tears with dark obsidian cores leaking void embers.',
      count: 42,
      colors: ['#a855f7', '#6366f1', '#e879f9', '#38bdf8', '#c4b5fd'],
      lightColors: ['#4c1d95', '#3730a3', '#86198f', '#1e1b4b', '#6d28d9'],
      blendMode: 'source-over',
      defaultWind: 0.04,
      defaultSpeed: 0.85,
      params: { mode: 'rifts' },
    },
    antimatter: {
      id: 'antimatter',
      label: 'Quantum Field',
      description: 'Minimalist deep-space wave ripples and phasing antimatter motes.',
      count: 68,
      colors: ['#c084fc', '#818cf8', '#f0abfc', '#38bdf8', '#e0e7ff'],
      lightColors: ['#581c87', '#4338ca', '#7e22ce', '#0369a1', '#312e81'],
      blendMode: 'lighter',
      defaultWind: 0.03,
      defaultSpeed: 0.9,
      params: { mode: 'antimatter' },
    },
  },

  drawBackground(ctx: CanvasRenderingContext2D, sim: SimulationContext): void {
    if (sim.preset.params?.mode !== 'singularity') return;
    const cx =
      sim.interactive && sim.pointer.active && sim.interactionStrength > 0
        ? sim.width * 0.5 + (sim.pointer.x - sim.width * 0.5) * 0.16 * clamp(sim.interactionStrength, 0, 1.5)
        : sim.width * 0.5;
    const cy =
      sim.interactive && sim.pointer.active && sim.interactionStrength > 0
        ? sim.height * 0.5 + (sim.pointer.y - sim.height * 0.5) * 0.16 * clamp(sim.interactionStrength, 0, 1.5)
        : sim.height * 0.5;
    const radius = clamp(Math.min(sim.width, sim.height) * 0.095, 28, 72);
    drawSingularityCore(ctx, cx, cy, radius, sim.colors[0] ?? '#a855f7', sim);
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'singularity');
    const depth = rand(0.45, 1.3);

    if (mode === 'rifts') {
      // Mix of sleek spatial tears and subtle leaking void motes
      const isTear = Math.random() < 0.24;
      if (isTear) {
        const baseAlpha = rand(0.55, 0.92);
        const maxLife = rand(7, 15);
        return {
          x: rand(sim.width * 0.08, sim.width * 0.92),
          y: rand(sim.height * 0.1, sim.height * 0.9),
          vx: rand(-4, 4),
          vy: rand(-5, 5),
          size: rand(36, 98) * depth, // fissure length
          alpha: initial ? baseAlpha * sim.opacity : 0,
          baseAlpha,
          color: pick(sim.colors),
          rotation: rand(-0.65, 0.65),
          vRot: rand(-0.04, 0.04),
          life: initial ? rand(maxLife * 0.2, maxLife * 0.72) : 0,
          maxLife,
          phase: rand(0, Math.PI * 2),
          freq: rand(1.4, 3.1),
          depth,
          kind: 'tear',
          extra: rand(2.2, 5.2) * depth, // fissure thickness
        };
      }

      const maxLife = rand(4, 9);
      const baseAlpha = rand(0.35, 0.85);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: rand(-16, 16) * depth,
        vy: rand(-16, 16) * depth,
        size: rand(1.1, 2.8) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(maxLife * 0.2, maxLife * 0.75) : 0,
        maxLife,
        phase: rand(0, Math.PI * 2),
        freq: rand(1.8, 4.2),
        depth,
        kind: 'rift-mote',
      };
    }

    if (mode === 'antimatter') {
      const isPulse = Math.random() < 0.22;
      const maxLife = isPulse ? rand(3.5, 6.8) : rand(6, 13);
      const baseAlpha = isPulse ? rand(0.28, 0.58) : rand(0.4, 0.92);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: rand(-14, 14) * depth,
        vy: rand(-14, 14) * depth,
        size: isPulse ? rand(18, 48) * depth : rand(1.3, 3.0) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: 0,
        vRot: 0,
        life: initial ? rand(maxLife * 0.2, maxLife * 0.75) : 0,
        maxLife,
        phase: rand(0, Math.PI * 2),
        freq: rand(1.5, 3.6),
        depth,
        kind: isPulse ? 'wave-ring' : 'quantum-mote',
      };
    }

    // Keplerian accretion disk orbiter (elliptical tilted orbit + inner hot ring)
    const cx = sim.width * 0.5;
    const cy = sim.height * 0.5;
    const maxR = Math.hypot(cx, cy) * 0.95;
    const minR = clamp(Math.min(sim.width, sim.height) * 0.11, 34, 84);
    // Concentrate more luminous particles closer to the accretion disk
    const radialBias = Math.pow(Math.random(), 1.45);
    const orbitR = minR + radialBias * Math.max(80, maxR - minR);
    const angle = rand(0, Math.PI * 2);
    // Keplerian velocity: inner rings orbit faster than outer rings
    const angularSpeed = clamp(115 / Math.pow(orbitR, 0.75), 0.18, 2.2) * (0.75 + depth * 0.35);
    const tilt = 0.42 + radialBias * 0.48; // inner accretion disk flatter, outer halo rounder
    const baseAlpha = rand(0.32, 0.95) * (1.15 - radialBias * 0.45);

    return {
      x: cx + Math.cos(angle) * orbitR,
      y: cy + Math.sin(angle) * orbitR * tilt,
      vx: -Math.sin(angle) * orbitR * angularSpeed,
      vy: Math.cos(angle) * orbitR * tilt * angularSpeed,
      size: rand(1.0, 2.6) * (1.2 - radialBias * 0.35),
      alpha: initial ? clamp(baseAlpha, 0, 1) * sim.opacity : 0,
      baseAlpha: clamp(baseAlpha, 0.2, 0.98),
      color: radialBias < 0.22 ? sim.colors[sim.colors.length - 1] ?? pick(sim.colors) : pick(sim.colors),
      rotation: angle, // orbital angle
      vRot: angularSpeed, // orbital angular speed
      life: initial ? rand(1, 10) : 0,
      maxLife: rand(12, 24),
      phase: tilt, // store orbital eccentricity/tilt
      freq: rand(1.5, 3.8),
      depth,
      kind: 'orbiter',
      extra: orbitR, // orbital radius
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'tear') {
      if (p.life >= p.maxLife) return false;
      p.x += (p.vx + sim.wind * 12) * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const dx = p.x - sim.pointer.x;
        const dy = p.y - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const radius = 190 * (0.7 + sim.interactionStrength * 0.35);
        if (distSq > 1 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          p.rotation += (dx > 0 ? 1 : -1) * (1 - dist / radius) * 0.9 * sim.interactionStrength * sim.dt;
        }
      }

      const t = p.life / p.maxLife;
      const env = clamp(t * 4, 0, 1) * clamp((1 - t) * 3, 0, 1);
      const pulse = 0.78 + 0.22 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * env * pulse * sim.opacity;
      return true;
    }

    if (p.kind === 'rift-mote' || p.kind === 'quantum-mote' || p.kind === 'wave-ring') {
      if (p.life >= p.maxLife) return false;
      p.x += (p.vx + sim.wind * 18) * dt;
      p.y += p.vy * dt;

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = sim.pointer.x - p.x;
        const dy = sim.pointer.y - p.y;
        const distSq = dx * dx + dy * dy;
        const radius = 195 * (0.7 + strength * 0.35);
        if (distSq > 16 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / radius;
          const swirl = falloff * 260 * strength * sim.dt;
          // Subtle gravitational swirl around cursor
          p.x += ((dx / dist) * 0.45 - (dy / dist) * 0.75) * swirl;
          p.y += ((dy / dist) * 0.45 + (dx / dist) * 0.75) * swirl;
        }
      }

      if (p.x < -30) p.x = sim.width + 30;
      if (p.x > sim.width + 30) p.x = -30;
      if (p.y < -30) p.y = sim.height + 30;
      if (p.y > sim.height + 30) p.y = -30;

      const t = p.life / p.maxLife;
      const env = Math.sin(t * Math.PI);
      const shimmer = 0.65 + 0.35 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * env * shimmer * sim.opacity;
      return true;
    }

    // Keplerian accretion orbiter
    const cx =
      sim.interactive && sim.pointer.active && sim.interactionStrength > 0
        ? sim.width * 0.5 + (sim.pointer.x - sim.width * 0.5) * 0.16 * clamp(sim.interactionStrength, 0, 1.5)
        : sim.width * 0.5;
    const cy =
      sim.interactive && sim.pointer.active && sim.interactionStrength > 0
        ? sim.height * 0.5 + (sim.pointer.y - sim.height * 0.5) * 0.16 * clamp(sim.interactionStrength, 0, 1.5)
        : sim.height * 0.5;

    const orbitR = Math.max(24, (p.extra ?? 140) - dt * 5.5);
    const tilt = p.phase || 0.65;
    const diskTiltAngle = -0.24;
    const cosT = Math.cos(diskTiltAngle);
    const sinT = Math.sin(diskTiltAngle);

    if (sim.dt > 0) {
      p.extra = orbitR;
      p.rotation += p.vRot * dt;

      const localX = Math.cos(p.rotation) * orbitR;
      const localY = Math.sin(p.rotation) * orbitR * tilt;

      let nx = cx + localX * cosT - localY * sinT;
      let ny = cy + localX * sinT + localY * cosT;

      // Live local gravitational lensing around pointer
      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0) {
        const dx = nx - sim.pointer.x;
        const dy = ny - sim.pointer.y;
        const distSq = dx * dx + dy * dy;
        const lensR = 165 * (0.7 + sim.interactionStrength * 0.35);
        if (distSq > 9 && distSq < lensR * lensR) {
          const dist = Math.sqrt(distSq);
          const bend = Math.pow(1 - dist / lensR, 2) * 34 * sim.interactionStrength;
          nx += (dx / dist) * bend - (dy / dist) * bend * 0.45;
          ny += (dy / dist) * bend + (dx / dist) * bend * 0.45;
        }
      }

      p.vx = (nx - p.x) / Math.max(0.008, sim.dt);
      p.vy = (ny - p.y) / Math.max(0.008, sim.dt);
      p.x = nx;
      p.y = ny;

      const horizonR = clamp(Math.min(sim.width, sim.height) * 0.09, 26, 68);
      if (orbitR < horizonR || p.life >= p.maxLife) {
        return false;
      }
    }

    const t = p.life / p.maxLife;
    const env = clamp(t * 4, 0, 1) * clamp((1 - t) * 2.5, 0, 1);
    const shimmer = 0.72 + 0.28 * Math.sin(p.life * p.freq + p.rotation * 2);
    p.alpha = p.baseAlpha * env * shimmer * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.006) return;
    const isLight = sim.theme === 'light';
    const boost = isLight ? 1.4 : 1;
    const alpha = clamp(p.alpha * boost, 0, 0.98);

    if (p.kind === 'tear') {
      const halfLen = p.size * 0.5;
      const halfW = p.extra ?? 3.2;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Soft luminous outer aura
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, halfLen * 0.85);
      aura.addColorStop(0, hexToRgba(p.color, alpha * 0.34));
      aura.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW * 5.5, halfLen * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Razor-sharp lenticular spatial tear with dark obsidian center
      ctx.beginPath();
      ctx.moveTo(0, -halfLen);
      ctx.quadraticCurveTo(halfW, 0, 0, halfLen);
      ctx.quadraticCurveTo(-halfW, 0, 0, -halfLen);
      ctx.closePath();

      ctx.fillStyle = hexToRgba(isLight ? '#0f0a1f' : '#03010a', alpha * 0.92);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(p.color, alpha);
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Crisp inner highlight filament
      ctx.strokeStyle = hexToRgba(isLight ? p.color : '#ffffff', alpha * 0.72);
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, -halfLen * 0.72);
      ctx.lineTo(0, halfLen * 0.72);
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (p.kind === 'wave-ring') {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const r = p.size * (0.25 + t * 1.15);
      ctx.strokeStyle = hexToRgba(p.color, alpha * 0.78);
      ctx.lineWidth = Math.max(0.7, 1.3 * (1 - t * 0.5));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (p.kind === 'rift-mote' || p.kind === 'quantum-mote') {
      const glowR = p.size * 2.8;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, hexToRgba(isLight ? p.color : '#ffffff', alpha));
      grad.addColorStop(0.38, hexToRgba(p.color, alpha * 0.65));
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Accretion orbiter with silky velocity-aligned luminous arc trail
    const speed = Math.hypot(p.vx, p.vy);
    const trailScale = clamp(0.032, 0.015, 0.045);
    const tailX = p.x - clamp(p.vx * trailScale, -36, 36);
    const tailY = p.y - clamp(p.vy * trailScale, -36, 36);

    if (speed > 8) {
      const grad = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
      grad.addColorStop(0, hexToRgba(isLight ? p.color : '#ffffff', alpha));
      grad.addColorStop(0.35, hexToRgba(p.color, alpha * 0.78));
      grad.addColorStop(1, hexToRgba(p.color, 0));

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.85, p.size * 0.85);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }

    ctx.fillStyle = hexToRgba(isLight ? p.color : '#f5f3ff', alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.72, 0, Math.PI * 2);
    ctx.fill();
  },
};
