import type { ElementDefinition, Particle, SimulationContext } from '../types.js';
import { clamp, hexToRgba, pick, rand, randInt } from '../utils/math.js';

/**
 * Recursive fractal midpoint displacement — creates authentic multi-scale
 * jagged atmospheric lightning paths instead of chunky zigzags.
 */
function buildFractalBolt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace: number,
  depth: number
): Array<{ x: number; y: number }> {
  if (depth <= 0) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = rand(-displace, displace);
  const mx = (x1 + x2) * 0.5 + nx * offset;
  const my = (y1 + y2) * 0.5 + ny * offset;

  const left = buildFractalBolt(x1, y1, mx, my, displace * 0.53, depth - 1);
  const right = buildFractalBolt(mx, my, x2, y2, displace * 0.53, depth - 1);
  return [...left.slice(0, -1), ...right];
}

function createRealisticBolt(
  sim: SimulationContext,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  opts: { width: number; displace: number; depth: number; maxLife: number; branchDepth: number }
): Particle {
  const mainPoints = buildFractalBolt(startX, startY, endX, endY, opts.displace, opts.depth);
  const branches: Array<Array<{ x: number; y: number }>> = [];

  if (opts.branchDepth > 0 && mainPoints.length > 6) {
    const baseAngle = Math.atan2(endY - startY, endX - startX);
    const totalLen = Math.hypot(endX - startX, endY - startY);
    const numBranches = randInt(2, 4);

    for (let i = 0; i < numBranches; i++) {
      const frac = rand(0.18, 0.72);
      const idx = Math.floor(frac * (mainPoints.length - 1));
      const origin = mainPoints[idx]!;
      const side = Math.random() < 0.5 ? 1 : -1;
      const angle = baseAngle + side * rand(0.28, 0.78);
      const branchLen = totalLen * rand(0.2, 0.42) * (1 - frac * 0.45);
      const bx = origin.x + Math.cos(angle) * branchLen;
      const by = origin.y + Math.sin(angle) * branchLen;
      const branchPts = buildFractalBolt(origin.x, origin.y, bx, by, opts.displace * 0.38, Math.max(2, opts.depth - 1));
      branches.push(branchPts);

      // Fine tertiary hair-fork off a secondary branch
      if (opts.branchDepth > 1 && branchPts.length > 4 && Math.random() < 0.65) {
        const subOrigin = branchPts[Math.floor(branchPts.length * rand(0.3, 0.65))]!;
        const subAngle = angle + (Math.random() < 0.5 ? 1 : -1) * rand(0.25, 0.65);
        const subLen = branchLen * rand(0.35, 0.55);
        branches.push(
          buildFractalBolt(
            subOrigin.x,
            subOrigin.y,
            subOrigin.x + Math.cos(subAngle) * subLen,
            subOrigin.y + Math.sin(subAngle) * subLen,
            opts.displace * 0.18,
            2
          )
        );
      }
    }
  }

  return {
    x: startX,
    y: startY,
    vx: endX,
    vy: endY,
    size: opts.width,
    alpha: 0.75 * sim.opacity,
    baseAlpha: rand(0.68, 0.92),
    color: pick(sim.colors),
    rotation: 0,
    vRot: 0,
    life: 0,
    maxLife: opts.maxLife,
    phase: rand(0, Math.PI * 2),
    freq: rand(26, 40),
    depth: 1,
    kind: 'bolt',
    points: mainPoints,
    branches,
    extra: opts.branchDepth, // >0 also draws subtle cloud-sheet flash at origin
  };
}

/**
 * Strokes a polyline with natural tapering (thick near origin, razor-thin at tip).
 */
function strokeTaperedPolyline(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  startWidth: number,
  endWidth: number
): void {
  if (pts.length < 2) return;
  const segments = 4;
  const chunkSize = Math.max(1, Math.ceil((pts.length - 1) / segments));

  for (let s = 0; s < segments; s++) {
    const startIdx = s * chunkSize;
    if (startIdx >= pts.length - 1) break;
    const endIdx = Math.min(pts.length - 1, (s + 1) * chunkSize);
    const t = s / segments;
    ctx.lineWidth = Math.max(0.35, startWidth + (endWidth - startWidth) * t);
    ctx.beginPath();
    ctx.moveTo(pts[startIdx]!.x, pts[startIdx]!.y);
    for (let i = startIdx + 1; i <= endIdx; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.stroke();
  }
}

export const lightningElement: ElementDefinition<'lightning'> = {
  name: 'lightning',
  label: 'Lightning',
  description: 'Realistic fractal storm strikes, delicate Tesla arcs, and crisp static crackles.',
  defaultPreset: 'storm',
  presets: {
    storm: {
      id: 'storm',
      label: 'Distant Storm',
      description: 'Fine fractal branching sky-to-ground strikes with soft upper-cloud sheet illumination.',
      count: 16,
      colors: ['#dbeafe', '#93c5fd', '#bae6fd', '#c4b5fd', '#e0f2fe'],
      lightColors: ['#1d4ed8', '#2563eb', '#4338ca', '#0369a1', '#3730a3'],
      blendMode: 'lighter',
      defaultWind: 0.1,
      defaultSpeed: 1,
      params: { mode: 'storm' },
    },
    arcs: {
      id: 'arcs',
      label: 'Tesla Arcs',
      description: 'Razor-thin electric filaments flickering delicately between charged nodes.',
      count: 24,
      colors: ['#a5f3fc', '#60a5fa', '#818cf8', '#e0f2fe', '#c4b5fd'],
      lightColors: ['#0284c7', '#2563eb', '#4f46e5', '#0369a1', '#6d28d9'],
      blendMode: 'lighter',
      defaultWind: 0,
      defaultSpeed: 1,
      params: { mode: 'arcs' },
    },
    sparks: {
      id: 'sparks',
      label: 'Static Sparks',
      description: 'Crisp pinpoint electrostatic crackles and fine darting micro-arcs.',
      count: 60,
      colors: ['#ffffff', '#bae6fd', '#93c5fd', '#c4b5fd', '#fef08a'],
      lightColors: ['#1d4ed8', '#0284c7', '#4f46e5', '#b45309', '#6d28d9'],
      blendMode: 'lighter',
      defaultWind: 0.12,
      defaultSpeed: 1.05,
      params: { mode: 'sparks' },
    },
  },

  onFrame(sim: SimulationContext): void {
    const mode = String(sim.preset.params?.mode ?? 'storm');
    const dt = sim.dt * sim.speed;

    if (mode === 'storm') {
      // Natural atmospheric cadence (~1 bolt every 2.2 seconds)
      if (Math.random() < dt * 0.46) {
        const startX = rand(sim.width * 0.1, sim.width * 0.9);
        const startY = rand(-10, sim.height * 0.08);
        const attractPointer =
          sim.interactive &&
          sim.pointer.active &&
          sim.interactionStrength > 0 &&
          Math.random() < 0.38 * clamp(sim.interactionStrength, 0, 1.4);

        const endX = attractPointer
          ? sim.pointer.x + rand(-45, 45)
          : startX + rand(-160, 160) + sim.wind * 110;
        const endY = attractPointer
          ? clamp(sim.pointer.y, sim.height * 0.3, sim.height * 0.95)
          : rand(sim.height * 0.55, sim.height * 0.96);

        sim.spawnSecondary(
          createRealisticBolt(sim, startX, startY, endX, endY, {
            width: rand(1.15, 1.75),
            displace: rand(42, 82),
            depth: 5,
            maxLife: rand(0.24, 0.42),
            branchDepth: 2,
          })
        );
      }

      // Subtle static leader filament near fast cursor movement
      if (
        sim.interactive &&
        sim.pointer.active &&
        sim.interactionStrength > 0 &&
        Math.hypot(sim.pointer.vx, sim.pointer.vy) > 9 &&
        Math.random() < dt * 2.2 * sim.interactionStrength
      ) {
        const angle = rand(0, Math.PI * 2);
        const len = rand(38, 95) * (0.7 + sim.interactionStrength * 0.3);
        sim.spawnSecondary(
          createRealisticBolt(
            sim,
            sim.pointer.x,
            sim.pointer.y,
            sim.pointer.x + Math.cos(angle) * len,
            sim.pointer.y + Math.sin(angle) * len,
            {
              width: 0.9,
              displace: 16,
              depth: 3,
              maxLife: rand(0.11, 0.2),
              branchDepth: 0,
            }
          )
        );
      }
      return;
    }

    if (mode === 'arcs' && Math.random() < dt * 1.45) {
      const nearCursor =
        sim.interactive &&
        sim.pointer.active &&
        sim.interactionStrength > 0 &&
        Math.random() < 0.45 * clamp(sim.interactionStrength, 0, 1.4);

      const x1 = nearCursor ? sim.pointer.x + rand(-25, 25) : rand(sim.width * 0.08, sim.width * 0.92);
      const y1 = nearCursor ? sim.pointer.y + rand(-25, 25) : rand(sim.height * 0.12, sim.height * 0.88);
      const angle = rand(0, Math.PI * 2);
      const span = rand(85, 210);

      sim.spawnSecondary(
        createRealisticBolt(sim, x1, y1, x1 + Math.cos(angle) * span, y1 + Math.sin(angle) * span, {
          width: rand(0.85, 1.3),
          displace: rand(22, 40),
          depth: 4,
          maxLife: rand(0.16, 0.32),
          branchDepth: Math.random() < 0.45 ? 1 : 0,
        })
      );
    }
  },

  spawn(sim: SimulationContext, initial: boolean): Particle {
    const mode = String(sim.preset.params?.mode ?? 'storm');
    const depth = rand(0.5, 1.2);

    if (mode === 'sparks') {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(65, 190) * depth;
      const maxLife = rand(0.35, 1.2);
      const baseAlpha = rand(0.45, 0.85);
      return {
        x: rand(0, sim.width),
        y: rand(0, sim.height),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(0.9, 1.9) * depth,
        alpha: initial ? baseAlpha * sim.opacity : 0,
        baseAlpha,
        color: pick(sim.colors),
        rotation: angle,
        vRot: 0,
        life: initial ? rand(maxLife * 0.15, maxLife * 0.65) : 0,
        maxLife,
        phase: rand(0, Math.PI * 2),
        freq: rand(18, 32),
        depth,
        kind: 'spark',
        extra: rand(9, 22) * depth,
      };
    }

    // Seed 1 crisp atmospheric bolt for immediate reduced-motion static preview
    if (initial && Math.random() < 0.08) {
      const sx = rand(sim.width * 0.2, sim.width * 0.8);
      const sy = mode === 'storm' ? 0 : rand(sim.height * 0.2, sim.height * 0.7);
      const ex = sx + rand(-120, 120);
      const ey = mode === 'storm' ? rand(sim.height * 0.55, sim.height * 0.88) : sy + rand(-80, 80);
      const bolt = createRealisticBolt(sim, sx, sy, ex, ey, {
        width: 1.25,
        displace: 46,
        depth: 4,
        maxLife: 0.4,
        branchDepth: mode === 'storm' ? 2 : 1,
      });
      bolt.life = 0.06;
      bolt.alpha = 0.62 * sim.opacity;
      return bolt;
    }

    // Ultra-subtle ambient ionized specks
    const maxLife = rand(4, 9);
    const baseAlpha = rand(0.14, 0.36);
    return {
      x: rand(0, sim.width),
      y: rand(0, sim.height),
      vx: rand(-10, 10) * depth,
      vy: rand(-10, 8) * depth,
      size: rand(0.7, 1.5) * depth,
      alpha: initial ? baseAlpha * sim.opacity : 0,
      baseAlpha,
      color: pick(sim.colors),
      rotation: 0,
      vRot: 0,
      life: initial ? rand(maxLife * 0.2, maxLife * 0.7) : 0,
      maxLife,
      phase: rand(0, Math.PI * 2),
      freq: rand(3, 8),
      depth,
      kind: 'ion',
    };
  },

  update(p: Particle, sim: SimulationContext): boolean {
    const dt = sim.dt * sim.speed;
    p.life += dt;

    if (p.kind === 'bolt') {
      if (p.life >= p.maxLife) return false;
      const t = p.life / p.maxLife;
      // Authentic lightning restrike envelope: sharp initial peak, brief dip, subtle second flash, fast decay
      const restrike =
        t < 0.14
          ? 1
          : t < 0.28
            ? 0.38
            : t < 0.42
              ? 0.85
              : Math.pow(clamp(1 - (t - 0.42) / 0.58, 0, 1), 1.9);
      p.alpha = p.baseAlpha * restrike * sim.opacity;
      return true;
    }

    if (p.kind === 'spark') {
      if (p.life >= p.maxLife) return false;
      if (sim.dt > 0 && Math.random() < dt * 8) {
        const speed = Math.hypot(p.vx, p.vy) || 100;
        const nextAngle = Math.atan2(p.vy, p.vx) + rand(-1.2, 1.2);
        p.vx = Math.cos(nextAngle) * speed;
        p.vy = Math.sin(nextAngle) * speed;
      }

      if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
        const strength = sim.interactionStrength;
        const dx = sim.pointer.x - p.x;
        const dy = sim.pointer.y - p.y;
        const distSq = dx * dx + dy * dy;
        const radius = 175 * (0.7 + strength * 0.35);
        if (distSq > 25 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const pull = (1 - dist / radius) * 520 * strength * sim.dt;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
      }

      p.x += (p.vx + sim.wind * 38) * dt;
      p.y += p.vy * dt;
      p.rotation = Math.atan2(p.vy, p.vx);

      const t = p.life / p.maxLife;
      const flicker = 0.6 + 0.4 * Math.sin(p.life * p.freq + p.phase);
      p.alpha = p.baseAlpha * Math.pow(clamp(1 - t, 0, 1), 1.4) * flicker * sim.opacity;
      return true;
    }

    // Subtle atmospheric ions
    if (p.life >= p.maxLife) return false;
    p.x += (p.vx + sim.wind * 20) * dt;
    p.y += p.vy * dt;

    if (sim.interactive && sim.pointer.active && sim.interactionStrength > 0 && sim.dt > 0) {
      const strength = sim.interactionStrength;
      const dx = sim.pointer.x - p.x;
      const dy = sim.pointer.y - p.y;
      const distSq = dx * dx + dy * dy;
      const radius = 160 * (0.7 + strength * 0.35);
      if (distSq > 16 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const pull = (1 - dist / radius) * 260 * strength * sim.dt;
        p.vx += (dx / dist) * pull;
        p.vy += (dy / dist) * pull;
      }
    }
    p.vx *= Math.pow(0.25, dt);
    p.vy *= Math.pow(0.25, dt);

    if (p.x < -15) p.x = sim.width + 15;
    if (p.x > sim.width + 15) p.x = -15;
    if (p.y < -15) p.y = sim.height + 15;
    if (p.y > sim.height + 15) p.y = -15;

    const t = p.life / p.maxLife;
    const env = clamp(t * 4, 0, 1) * clamp((1 - t) * 3, 0, 1);
    p.alpha = p.baseAlpha * env * sim.opacity;
    return true;
  },

  draw(ctx: CanvasRenderingContext2D, p: Particle, sim: SimulationContext): void {
    if (p.alpha <= 0.006) return;
    const isLight = sim.theme === 'light';
    const coreColor = isLight ? p.color : '#ffffff';

    if (p.kind === 'bolt' && p.points && p.points.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Subtle distant cloud-sheet atmospheric glow near strike origin
      if ((p.extra ?? 0) > 1 && !isLight) {
        const cloudR = Math.min(sim.width, sim.height) * 0.42;
        const flashGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cloudR);
        flashGrad.addColorStop(0, hexToRgba(p.color, p.alpha * 0.14));
        flashGrad.addColorStop(0.5, hexToRgba(p.color, p.alpha * 0.05));
        flashGrad.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cloudR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Delicate atmospheric corona (NOT thick neon tubes)
      ctx.strokeStyle = hexToRgba(p.color, p.alpha * (isLight ? 0.25 : 0.22));
      strokeTaperedPolyline(ctx, p.points, p.size * 4.5, p.size * 1.4);

      // Inner electric halo
      ctx.strokeStyle = hexToRgba(p.color, p.alpha * (isLight ? 0.58 : 0.55));
      strokeTaperedPolyline(ctx, p.points, p.size * 1.8, p.size * 0.65);

      // Hair-thin white-hot core
      ctx.strokeStyle = hexToRgba(coreColor, clamp(p.alpha * (isLight ? 1.1 : 0.95), 0, 1));
      strokeTaperedPolyline(ctx, p.points, Math.max(0.8, p.size * 0.72), 0.35);

      // Tapered fractal branches
      if (p.branches) {
        for (const branch of p.branches) {
          ctx.strokeStyle = hexToRgba(p.color, p.alpha * 0.3);
          strokeTaperedPolyline(ctx, branch, p.size * 1.4, 0.35);

          ctx.strokeStyle = hexToRgba(coreColor, p.alpha * 0.68);
          strokeTaperedPolyline(ctx, branch, Math.max(0.55, p.size * 0.45), 0.25);
        }
      }

      ctx.restore();
      return;
    }

    if (p.kind === 'spark') {
      const len = p.extra ?? 14;
      const tailX = p.x - Math.cos(p.rotation) * len;
      const tailY = p.y - Math.sin(p.rotation) * len;
      const midX = (p.x + tailX) * 0.5 + Math.sin(p.phase + p.life * 32) * 2.5;
      const midY = (p.y + tailY) * 0.5 + Math.cos(p.phase + p.life * 32) * 2.5;

      ctx.strokeStyle = hexToRgba(p.color, p.alpha * 0.35);
      ctx.lineWidth = p.size * 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(coreColor, clamp(p.alpha * (isLight ? 1.25 : 0.95), 0, 1));
      ctx.lineWidth = Math.max(0.7, p.size * 0.65);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }

    // Subtle atmospheric ion
    ctx.fillStyle = hexToRgba(p.color, clamp(p.alpha * (isLight ? 1.4 : 1), 0, 1));
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  },
};
