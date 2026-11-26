import { getElementDefinition, resolvePreset } from './registry.js';
import type {
  ElementDefinition,
  ElementName,
  ElementPresetConfig,
  ElementalController,
  ElementalOptions,
  ElementalState,
  ElementalTheme,
  Particle,
  PointerState,
  SimulationContext,
} from './types.js';
import { clamp } from './utils/math.js';

const REFERENCE_AREA = 1280 * 720;
const MAX_SECONDARY_PARTICLES = 180;
const MAX_DT = 0.05;

function finiteNumber(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class ElementalEngine implements ElementalController {
  public canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private ownsCanvas = false;
  private isFullscreen = false;

  private elementDef: ElementDefinition<any>;
  private presetConfig: ElementPresetConfig;

  private density: number;
  private explicitCount?: number;
  private speed: number;
  private customSpeed = false;
  private wind: number;
  private customWind = false;
  private opacity: number;
  private customColors?: string[];
  private interactive: boolean;
  private interactionStrength: number;
  private theme: ElementalTheme;
  private respectReducedMotion: boolean;
  private zIndex: number | string;

  private width = 0;
  private height = 0;
  private dpr = 1;

  private particles: Particle[] = [];
  private secondaryParticles: Particle[] = [];

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private running = false;
  private paused = false;
  private destroyed = false;

  private pointer: PointerState = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
  private resizeObserver: ResizeObserver | null = null;
  private reducedMotionQuery: MediaQueryList | null = null;

  constructor(options: ElementalOptions = {}) {
    const elementTarget = options.element ?? 'cosmic';
    this.elementDef = getElementDefinition(elementTarget);
    this.presetConfig = resolvePreset(this.elementDef, options.preset);

    this.density = clamp(finiteNumber(options.density, 1), 0.1, 5);
    this.explicitCount =
      typeof options.count === 'number' && Number.isFinite(options.count) ? options.count : undefined;

    if (typeof options.speed === 'number' && Number.isFinite(options.speed)) {
      this.speed = clamp(options.speed, 0, 5);
      this.customSpeed = true;
    } else {
      this.speed = this.presetConfig.defaultSpeed ?? 1;
      this.customSpeed = false;
    }

    if (typeof options.wind === 'number' && Number.isFinite(options.wind)) {
      this.wind = options.wind;
      this.customWind = true;
    } else {
      this.wind = this.presetConfig.defaultWind ?? 0;
      this.customWind = false;
    }

    this.opacity = clamp(finiteNumber(options.opacity, 1), 0, 1);
    this.customColors =
      options.colors && options.colors.length > 0 ? [...options.colors] : undefined;
    this.interactive = options.interactive ?? true;
    this.interactionStrength = clamp(finiteNumber(options.interactionStrength, 1), 0, 3);
    this.theme = options.theme === 'light' ? 'light' : 'dark';
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    this.zIndex = options.zIndex ?? 0;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.setupCanvas(options);
    this.setupListeners();
    this.resize();
    this.seedParticles();

    if (options.autoStart !== false) {
      this.start();
    }
  }

  private setupCanvas(options: ElementalOptions): void {
    if (options.canvas) {
      this.canvas = options.canvas;
      this.container = options.canvas.parentElement;
      this.ownsCanvas = false;
      this.isFullscreen = false;
    } else {
      const target =
        typeof options.container === 'string'
          ? (document.querySelector(options.container) as HTMLElement | null)
          : (options.container ?? null);

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.dataset.elementals = this.elementDef.name;
      canvas.style.pointerEvents = 'none';
      canvas.style.display = 'block';
      canvas.style.zIndex = String(this.zIndex);

      if (target) {
        this.container = target;
        this.isFullscreen = false;
        const computed = window.getComputedStyle(target);
        if (computed.position === 'static') {
          target.style.position = 'relative';
        }
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        target.appendChild(canvas);
      } else {
        this.container = document.body;
        this.isFullscreen = true;
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        document.body.appendChild(canvas);
      }

      this.canvas = canvas;
      this.ownsCanvas = true;
    }

    this.ctx = this.canvas.getContext('2d');
  }

  private setupListeners(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', this.handlePointerLeave);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      const target = this.isFullscreen ? null : (this.container ?? this.canvas);
      if (target) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(target);
      }
    }

    if (typeof window.matchMedia === 'function') {
      this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotionQuery.addEventListener?.('change', this.handleReducedMotionChange);
    }
  }

  private isReducedMotionActive(): boolean {
    return Boolean(this.respectReducedMotion && this.reducedMotionQuery?.matches);
  }

  private getActiveColors(): readonly string[] {
    if (this.customColors && this.customColors.length > 0) {
      return this.customColors;
    }
    if (this.theme === 'light' && this.presetConfig.lightColors?.length) {
      return this.presetConfig.lightColors;
    }
    return this.presetConfig.colors;
  }

  private getEffectiveBlendMode(): GlobalCompositeOperation {
    const requested = this.presetConfig.blendMode ?? 'source-over';
    if (this.theme === 'light' && (requested === 'lighter' || requested === 'screen')) {
      return 'source-over';
    }
    return requested;
  }

  private computeTargetCount(): number {
    if (this.explicitCount !== undefined) {
      return Math.max(0, Math.round(this.explicitCount));
    }
    const area = Math.max(1, this.width * this.height);
    const areaScale = clamp(Math.sqrt(area / REFERENCE_AREA), 0.35, 1.85);
    return Math.max(4, Math.round(this.presetConfig.count * areaScale * this.density));
  }

  private createSimContext(dt: number, staticFrame = false): SimulationContext {
    return {
      width: Math.max(1, this.width),
      height: Math.max(1, this.height),
      dt,
      time: this.elapsedTime,
      speed: this.speed,
      wind: this.wind,
      opacity: this.opacity,
      colors: this.getActiveColors(),
      pointer: staticFrame
        ? { x: -9999, y: -9999, vx: 0, vy: 0, active: false }
        : this.pointer,
      interactive: staticFrame ? false : this.interactive,
      interactionStrength: this.interactionStrength,
      theme: this.theme,
      preset: this.presetConfig,
      spawnSecondary: (particle: Particle) => {
        if (this.secondaryParticles.length < MAX_SECONDARY_PARTICLES) {
          particle.secondary = true;
          this.secondaryParticles.push(particle);
        }
      },
    };
  }

  private seedParticles(): void {
    const targetCount = this.computeTargetCount();
    const sim = this.createSimContext(0, true);
    this.particles = [];
    this.secondaryParticles = [];
    for (let i = 0; i < targetCount; i++) {
      const p = this.elementDef.spawn(sim, true);
      // Ensure initial particles have valid visible alpha for static/reduced-motion frames
      if (p.alpha <= 0) {
        p.alpha = p.baseAlpha * this.opacity;
      }
      this.particles.push(p);
    }
  }

  private syncParticleCount(): void {
    const targetCount = this.computeTargetCount();
    const sim = this.createSimContext(0, true);
    if (this.particles.length < targetCount) {
      const toAdd = targetCount - this.particles.length;
      for (let i = 0; i < toAdd; i++) {
        const p = this.elementDef.spawn(sim, true);
        if (p.alpha <= 0) {
          p.alpha = p.baseAlpha * this.opacity;
        }
        this.particles.push(p);
      }
    } else if (this.particles.length > targetCount) {
      this.particles.length = targetCount;
    }
  }

  public resize(): void {
    if (!this.canvas || this.destroyed) return;

    let nextWidth = 0;
    let nextHeight = 0;

    if (this.isFullscreen) {
      nextWidth = window.innerWidth;
      nextHeight = window.innerHeight;
    } else {
      const rect = (this.container ?? this.canvas).getBoundingClientRect();
      nextWidth = rect.width || this.canvas.clientWidth || window.innerWidth;
      nextHeight = rect.height || this.canvas.clientHeight || window.innerHeight;
    }

    nextWidth = Math.max(1, Math.round(nextWidth));
    nextHeight = Math.max(1, Math.round(nextHeight));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

    const changed = nextWidth !== this.width || nextHeight !== this.height || nextDpr !== this.dpr;
    if (!changed) return;

    const prevW = this.width;
    const prevH = this.height;
    this.width = nextWidth;
    this.height = nextHeight;
    this.dpr = nextDpr;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    if (prevW > 0 && prevH > 0 && this.particles.length > 0) {
      const sx = this.width / prevW;
      const sy = this.height / prevH;
      for (const p of this.particles) {
        p.x *= sx;
        p.y *= sy;
      }
      this.syncParticleCount();
    }

    if (this.isReducedMotionActive() && this.running) {
      this.renderFrame(0);
    }
  }

  public start(): void {
    if (this.destroyed || !this.canvas) return;
    this.running = true;
    this.paused = false;

    if (this.particles.length === 0) {
      this.seedParticles();
    }

    if (this.isReducedMotionActive()) {
      this.renderFrame(0);
      return;
    }

    if (this.rafId === null) {
      this.lastTimestamp = performance.now();
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  }

  public stop(): void {
    this.running = false;
    this.paused = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  public pause(): void {
    if (!this.running) return;
    this.paused = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resume(): void {
    if (!this.running || this.destroyed) return;
    this.paused = false;
    if (this.isReducedMotionActive()) {
      this.renderFrame(0);
      return;
    }
    if (this.rafId === null) {
      this.lastTimestamp = performance.now();
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  }

  public setElement<E extends ElementName>(
    element: E | ElementDefinition<any>,
    options: Omit<ElementalOptions<E>, 'element' | 'container' | 'canvas'> = {}
  ): void {
    this.elementDef = getElementDefinition(element);
    this.presetConfig = resolvePreset(this.elementDef, options.preset);
    if (this.canvas) {
      this.canvas.dataset.elementals = this.elementDef.name;
    }

    if (options.density !== undefined) this.density = clamp(options.density, 0.1, 5);
    if (options.count !== undefined) {
      this.explicitCount = options.count === null ? undefined : options.count;
    }
    if (options.speed !== undefined && options.speed !== null) {
      this.speed = clamp(options.speed, 0, 5);
      this.customSpeed = true;
    } else {
      this.speed = this.presetConfig.defaultSpeed ?? 1;
      this.customSpeed = false;
    }
    if (options.wind !== undefined && options.wind !== null) {
      this.wind = options.wind;
      this.customWind = true;
    } else {
      this.wind = this.presetConfig.defaultWind ?? 0;
      this.customWind = false;
    }
    if (options.opacity !== undefined) this.opacity = clamp(options.opacity, 0, 1);
    if (options.colors !== undefined) {
      this.customColors =
        options.colors && options.colors.length > 0 ? [...options.colors] : undefined;
    } else {
      this.customColors = undefined;
    }
    if (options.interactive !== undefined) this.interactive = options.interactive;
    if (options.interactionStrength !== undefined) {
      this.interactionStrength = clamp(options.interactionStrength, 0, 3);
    }
    if (options.theme !== undefined) {
      this.theme = options.theme === 'light' ? 'light' : 'dark';
    }
    if (options.respectReducedMotion !== undefined) {
      this.respectReducedMotion = options.respectReducedMotion;
    }

    this.seedParticles();
    if (this.running && (this.paused || this.isReducedMotionActive())) {
      this.renderFrame(0);
    }
  }

  public setPreset(preset: string): void {
    this.presetConfig = resolvePreset(this.elementDef, preset);
    if (!this.customWind) {
      this.wind = this.presetConfig.defaultWind ?? 0;
    }
    if (!this.customSpeed) {
      this.speed = this.presetConfig.defaultSpeed ?? 1;
    }
    this.seedParticles();
    if (this.running && (this.paused || this.isReducedMotionActive())) {
      this.renderFrame(0);
    }
  }

  public update(options: Omit<ElementalOptions, 'container' | 'canvas'>): void {
    if (options.element) {
      const nextName =
        typeof options.element === 'string' ? options.element : options.element.name;
      if (nextName !== this.elementDef.name) {
        this.setElement(options.element, options);
        return;
      }
    }

    let reseed = false;

    if (options.preset && options.preset !== this.presetConfig.id) {
      this.presetConfig = resolvePreset(this.elementDef, options.preset);
      if (!this.customWind && options.wind === undefined) {
        this.wind = this.presetConfig.defaultWind ?? 0;
      }
      if (!this.customSpeed && options.speed === undefined) {
        this.speed = this.presetConfig.defaultSpeed ?? 1;
      }
      reseed = true;
    }

    if (options.density !== undefined) {
      this.density = clamp(options.density, 0.1, 5);
    }
    if (options.count !== undefined) {
      this.explicitCount = options.count === null ? undefined : options.count;
    }
    if (options.speed !== undefined) {
      if (options.speed === null) {
        this.customSpeed = false;
        this.speed = this.presetConfig.defaultSpeed ?? 1;
      } else {
        this.speed = clamp(options.speed, 0, 5);
        this.customSpeed = true;
      }
    }
    if (options.wind !== undefined) {
      if (options.wind === null) {
        this.customWind = false;
        this.wind = this.presetConfig.defaultWind ?? 0;
      } else {
        this.wind = options.wind;
        this.customWind = true;
      }
    }
    if (options.opacity !== undefined) {
      this.opacity = clamp(options.opacity, 0, 1);
    }
    if (options.colors !== undefined) {
      this.customColors =
        options.colors && options.colors.length > 0 ? [...options.colors] : undefined;
      reseed = true;
    }
    if (options.interactive !== undefined) {
      this.interactive = options.interactive;
    }
    if (options.interactionStrength !== undefined) {
      this.interactionStrength = clamp(options.interactionStrength, 0, 3);
    }
    if (options.theme !== undefined) {
      const nextTheme: ElementalTheme = options.theme === 'light' ? 'light' : 'dark';
      if (nextTheme !== this.theme) {
        this.theme = nextTheme;
        if (!this.customColors && this.presetConfig.lightColors?.length) {
          reseed = true;
        }
      }
    }
    if (options.respectReducedMotion !== undefined) {
      this.respectReducedMotion = options.respectReducedMotion;
      this.handleReducedMotionChange();
    }
    if (options.zIndex !== undefined && this.canvas && this.ownsCanvas) {
      this.zIndex = options.zIndex;
      this.canvas.style.zIndex = String(this.zIndex);
    }

    if (reseed) {
      this.seedParticles();
    } else {
      this.syncParticleCount();
    }

    if (this.running && (this.paused || this.isReducedMotionActive())) {
      this.renderFrame(0);
    }
  }

  public getState(): ElementalState {
    return {
      element: this.elementDef.name,
      preset: this.presetConfig.id,
      running: this.running,
      paused: this.paused,
      density: this.density,
      count: this.explicitCount,
      speed: this.speed,
      wind: this.wind,
      opacity: this.opacity,
      colors: this.getActiveColors(),
      interactive: this.interactive,
      interactionStrength: this.interactionStrength,
      theme: this.theme,
      respectReducedMotion: this.respectReducedMotion,
      particleCount: this.particles.length,
    };
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.stop();
    this.destroyed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerleave', this.handlePointerLeave);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.reducedMotionQuery?.removeEventListener?.('change', this.handleReducedMotionChange);
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.ownsCanvas && this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.particles = [];
    this.secondaryParticles = [];
    this.canvas = null;
    this.ctx = null;
  }

  private tick = (timestamp: number): void => {
    if (!this.running || this.paused || this.destroyed) {
      this.rafId = null;
      return;
    }

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = clamp(rawDt, 0, MAX_DT);

    this.renderFrame(dt);
    this.rafId = window.requestAnimationFrame(this.tick);
  };

  private renderFrame(dt: number): void {
    if (!this.ctx) return;

    const isStatic = dt <= 0;
    this.elapsedTime += dt * this.speed;
    const sim = this.createSimContext(dt, isStatic);

    if (!isStatic && this.elementDef.onFrame) {
      this.elementDef.onFrame(sim);
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalCompositeOperation = this.getEffectiveBlendMode();

    if (this.elementDef.drawBackground) {
      this.elementDef.drawBackground(ctx, sim);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      const alive = this.elementDef.update(p, sim);
      if (!isStatic && !alive) {
        this.particles[i] = this.elementDef.spawn(sim, false);
        continue;
      }
      this.elementDef.draw(ctx, p, sim);
    }

    for (let i = this.secondaryParticles.length - 1; i >= 0; i--) {
      const sp = this.secondaryParticles[i]!;
      const alive = this.elementDef.update(sp, sim);
      if (!isStatic && !alive) {
        this.secondaryParticles.splice(i, 1);
        continue;
      }
      this.elementDef.draw(ctx, sp, sim);
    }

    ctx.restore();

    if (!isStatic) {
      // Gently decay pointer velocity between frames
      this.pointer.vx *= 0.85;
      this.pointer.vy *= 0.85;
    }
  }

  private handleResize = (): void => {
    this.resize();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.canvas || !this.interactive) return;
    const rect = this.canvas.getBoundingClientRect();
    const nx = event.clientX - rect.left;
    const ny = event.clientY - rect.top;

    if (nx >= 0 && ny >= 0 && nx <= rect.width && ny <= rect.height) {
      this.pointer.vx = this.pointer.active ? nx - this.pointer.x : 0;
      this.pointer.vy = this.pointer.active ? ny - this.pointer.y : 0;
      this.pointer.x = nx;
      this.pointer.y = ny;
      this.pointer.active = true;
    } else {
      this.pointer.active = false;
    }
  };

  private handlePointerLeave = (): void => {
    this.pointer.active = false;
  };

  private handleVisibilityChange = (): void => {
    if (!this.running || this.paused) return;
    if (document.hidden) {
      if (this.rafId !== null) {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    } else if (!this.isReducedMotionActive() && this.rafId === null) {
      this.lastTimestamp = performance.now();
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  };

  private handleReducedMotionChange = (): void => {
    if (!this.running || this.paused) return;
    if (this.isReducedMotionActive()) {
      if (this.rafId !== null) {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.renderFrame(0);
    } else if (this.rafId === null) {
      this.lastTimestamp = performance.now();
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  };
}

export function createElemental<E extends ElementName = 'cosmic'>(
  options: ElementalOptions<E> = {}
): ElementalController {
  return new ElementalEngine(options);
}
