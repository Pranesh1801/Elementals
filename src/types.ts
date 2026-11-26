export type ElementName =
  | 'fire'
  | 'water'
  | 'ice'
  | 'grass'
  | 'sand'
  | 'cosmic'
  | 'lightning'
  | 'aurora'
  | 'smoke'
  | 'void';

export type ElementalTheme = 'dark' | 'light';

export interface ElementPresetMap {
  fire: 'embers' | 'inferno' | 'candlelight';
  water: 'rain' | 'bubbles' | 'mist';
  ice: 'crystals' | 'frost' | 'blizzard';
  grass: 'leaves' | 'petals' | 'fireflies';
  sand: 'desert' | 'dust' | 'pebbles';
  cosmic: 'starfield' | 'meteors' | 'nebula';
  lightning: 'storm' | 'arcs' | 'sparks';
  aurora: 'northern' | 'silk' | 'polar';
  smoke: 'wisps' | 'incense' | 'fog';
  void: 'singularity' | 'rifts' | 'antimatter';
}

export type PresetNameFor<E extends ElementName> = ElementPresetMap[E];
export type AnyPresetName = ElementPresetMap[ElementName];

export interface PointerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export interface ElementPresetConfig {
  id: string;
  label: string;
  description: string;
  count: number;
  colors: readonly string[];
  /** Optional alternate palette for light backgrounds when `theme: 'light'` is active. */
  lightColors?: readonly string[];
  blendMode?: GlobalCompositeOperation;
  defaultWind?: number;
  defaultSpeed?: number;
  params?: Record<string, number | boolean | string>;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  phase: number;
  freq: number;
  depth: number;
  secondary?: boolean;
  kind?: string;
  points?: Array<{ x: number; y: number }>;
  branches?: Array<Array<{ x: number; y: number }>>;
  extra?: number;
}

export interface SimulationContext {
  width: number;
  height: number;
  dt: number;
  time: number;
  speed: number;
  wind: number;
  opacity: number;
  colors: readonly string[];
  pointer: PointerState;
  interactive: boolean;
  interactionStrength: number;
  theme: ElementalTheme;
  preset: ElementPresetConfig;
  spawnSecondary: (particle: Particle) => void;
}

export interface ElementDefinition<E extends string = string> {
  name: E;
  label: string;
  description: string;
  defaultPreset: E extends ElementName ? PresetNameFor<E> : string;
  presets: E extends ElementName
    ? Record<PresetNameFor<E>, ElementPresetConfig>
    : Record<string, ElementPresetConfig>;
  spawn: (sim: SimulationContext, initial: boolean) => Particle;
  update: (particle: Particle, sim: SimulationContext) => boolean;
  draw: (ctx: CanvasRenderingContext2D, particle: Particle, sim: SimulationContext) => void;
  /** Optional per-frame hook for global phenomena (e.g. lightning bolts, shooting stars). */
  onFrame?: (sim: SimulationContext) => void;
  /** Optional scene-level background layer rendered once per frame behind particles. */
  drawBackground?: (ctx: CanvasRenderingContext2D, sim: SimulationContext) => void;
}

export interface ElementalOptions<E extends ElementName = ElementName> {
  /** Which elemental effect to render — either a registered name or an ElementDefinition object. Defaults to `'cosmic'`. */
  element?: E | ElementDefinition<any>;
  /** Named template preset for the chosen element. */
  preset?: PresetNameFor<E> | string;
  /** Target container element or CSS selector. Defaults to a fullscreen overlay on `document.body`. */
  container?: HTMLElement | string | null;
  /** Existing canvas element to render into (used internally by `<elemental-fx>`). */
  canvas?: HTMLCanvasElement | null;
  /** Relative particle density multiplier (`0.1` – `5`). Defaults to `1`. */
  density?: number;
  /** Explicit particle count override (ignores automatic area scaling). Pass `null` in `update()` to reset. */
  count?: number | null;
  /** Animation speed multiplier (`0` – `5`). Pass `null` in `update()` to reset to preset default. */
  speed?: number | null;
  /** Horizontal wind bias (`-3` to `3` typical). Pass `null` in `update()` to reset to preset default. */
  wind?: number | null;
  /** Global effect opacity from `0` to `1`. Defaults to `1`. */
  opacity?: number;
  /** Custom hex or CSS color palette override. Pass `null` or `[]` in `update()` to reset to preset palette. */
  colors?: string[] | null;
  /** Enable pointer/mouse interaction. Defaults to `true`. */
  interactive?: boolean;
  /** Pointer interaction sensitivity multiplier (`0` – `3`). Defaults to `1`. */
  interactionStrength?: number;
  /** Surface theme hint (`'dark'` or `'light'`). Automatically adapts blend modes & contrast on light pages. Defaults to `'dark'`. */
  theme?: ElementalTheme;
  /** Respect `prefers-reduced-motion: reduce` by rendering a calm static frame. Defaults to `true`. */
  respectReducedMotion?: boolean;
  /** CSS z-index for auto-created overlay canvas. Defaults to `0`. */
  zIndex?: number | string;
  /** Start animating immediately on creation. Defaults to `true`. */
  autoStart?: boolean;
}

export interface ElementalState {
  element: string;
  preset: string;
  running: boolean;
  paused: boolean;
  density: number;
  count?: number;
  speed: number;
  wind: number;
  opacity: number;
  colors: readonly string[];
  interactive: boolean;
  interactionStrength: number;
  theme: ElementalTheme;
  respectReducedMotion: boolean;
  particleCount: number;
}

export interface ElementalController {
  readonly canvas: HTMLCanvasElement | null;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  setElement<E extends ElementName>(
    element: E | ElementDefinition<any>,
    options?: Omit<ElementalOptions<E>, 'element' | 'container' | 'canvas'>
  ): void;
  setPreset(preset: string): void;
  update(options: Omit<ElementalOptions, 'container' | 'canvas'>): void;
  resize(): void;
  getState(): ElementalState;
  destroy(): void;
}
