import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElemental as createCoreElemental } from '../src/core.js';
import { lightningElement } from '../src/elements/lightning.js';
import {
  ELEMENTS,
  ELEMENT_NAMES,
  colorWithAlpha,
  createElemental,
  getElementDefinition,
  hexToRgba,
  listPresets,
  registerElementalComponent,
  resolvePreset,
  type ElementName,
  type ElementalFxElement,
} from '../src/index.js';

function createMockContext2D(): CanvasRenderingContext2D {
  const grad = { addColorStop: vi.fn() };
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createRadialGradient: vi.fn(() => grad),
    createLinearGradient: vi.fn(() => grad),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D;
}

describe('elemental-avatars registry & presets', () => {
  beforeEach(() => {
    const mockCtx = createMockContext2D();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers all 10 core elements with 3 presets each', () => {
    expect(ELEMENT_NAMES).toEqual([
      'fire',
      'water',
      'ice',
      'grass',
      'sand',
      'cosmic',
      'lightning',
      'aurora',
      'smoke',
      'void',
    ]);
    for (const name of ELEMENT_NAMES) {
      const def = getElementDefinition(name);
      expect(def.name).toBe(name);
      const presets = listPresets(name);
      expect(presets.length).toBe(3);
      expect(def.presets[def.defaultPreset as keyof typeof def.presets]).toBeDefined();
    }
  });

  it('falls back to default preset when unknown preset is requested', () => {
    const resolved = resolvePreset('fire', 'nonexistent-preset');
    expect(resolved.id).toBe('embers');
  });

  it('throws a clear error for an unknown element', () => {
    expect(() => getElementDefinition('plasma' as ElementName)).toThrow(/Unknown element/);
  });

  it('spawns, updates, runs onFrame, and draws cleanly across all 30 elemental presets in dark and light themes', () => {
    const mockCtx = createMockContext2D();

    for (const theme of ['dark', 'light'] as const) {
      for (const name of ELEMENT_NAMES) {
        const def = ELEMENTS[name];
        for (const preset of listPresets(name)) {
          const secondary: any[] = [];
          const sim = {
            width: 1280,
            height: 720,
            dt: 0.016,
            time: 1.5,
            speed: 1,
            wind: preset.defaultWind ?? 0,
            opacity: 1,
            colors: theme === 'light' && preset.lightColors ? preset.lightColors : preset.colors,
            pointer: { x: 400, y: 300, vx: 12, vy: -8, active: true },
            interactive: true,
            interactionStrength: 1.5,
            theme,
            preset,
            spawnSecondary: (p: any) => secondary.push(p),
          };

          def.onFrame?.(sim);
          def.drawBackground?.(mockCtx, sim);

          for (let i = 0; i < 8; i++) {
            const particle = def.spawn(sim, i < 4);
            def.update(particle, sim);
            def.draw(mockCtx, particle, sim);
          }
          for (const sp of secondary) {
            def.update(sp, sim);
            def.draw(mockCtx, sp, sim);
          }
        }
      }
    }

    expect(mockCtx.beginPath).toHaveBeenCalled();
  });
});

describe('CSS color alpha utility', () => {
  it('supports hex, rgb/rgba, and hsl/hsla formats including transparent zero alpha', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.500)');
    expect(hexToRgba('#ff6d00', 0)).toBe('rgba(255, 109, 0, 0.000)');
    expect(hexToRgba('#00ff0080', 0.5)).toBe('rgba(0, 255, 0, 0.251)');
    expect(colorWithAlpha('rgb(10, 20, 30)', 0.4)).toBe('rgba(10, 20, 30, 0.400)');
    expect(colorWithAlpha('rgba(10, 20, 30, 0.5)', 0.5)).toBe('rgba(10, 20, 30, 0.250)');
    expect(colorWithAlpha('hsl(120, 100%, 50%)', 0.75)).toBe('rgba(0, 255, 0, 0.750)');
    expect(colorWithAlpha('hsl(240 100% 50% / 50%)', 0.5)).toBe('rgba(0, 0, 255, 0.250)');
  });
});

describe('ElementalEngine lifecycle, reduced-motion, theming, and layering', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMockContext2D();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('mounts a non-interactive canvas inside a container and cleans up on destroy', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const fx = createElemental({
      container,
      element: 'fire',
      preset: 'embers',
      count: 30,
      interactionStrength: 1.8,
    });

    expect(fx.canvas).not.toBeNull();
    expect(container.contains(fx.canvas)).toBe(true);
    expect(fx.canvas?.style.pointerEvents).toBe('none');
    expect(fx.canvas?.getAttribute('aria-hidden')).toBe('true');

    const state = fx.getState();
    expect(state.element).toBe('fire');
    expect(state.preset).toBe('embers');
    expect(state.particleCount).toBe(30);
    expect(state.interactionStrength).toBe(1.8);
    expect(state.running).toBe(true);

    fx.destroy();
    expect(container.contains(fx.canvas)).toBe(false);
    expect(fx.canvas).toBeNull();
  });

  it('renders visible particles on a static frame when prefers-reduced-motion is active', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    try {
      const fx = createElemental({ element: 'fire', preset: 'embers', count: 15 });
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
      fx.destroy();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('adapts blendMode and palette for light theme and supports resetting overrides with null', () => {
    const fx = createElemental({
      element: 'fire',
      preset: 'embers',
      theme: 'light',
      colors: ['rgb(255, 0, 128)'],
      wind: 2.2,
      speed: 2.4,
      count: 12,
    });

    expect(fx.getState().theme).toBe('light');
    expect(fx.getState().colors).toEqual(['rgb(255, 0, 128)']);

    fx.update({ colors: null, wind: null, speed: null, count: null });
    const reset = fx.getState();
    expect(reset.colors).toEqual(ELEMENTS.fire.presets.embers.lightColors);
    expect(reset.wind).toBe(ELEMENTS.fire.presets.embers.defaultWind);
    expect(reset.speed).toBe(ELEMENTS.fire.presets.embers.defaultSpeed);
    expect(reset.count).toBeUndefined();

    fx.setPreset('inferno');
    expect(fx.getState().speed).toBe(ELEMENTS.fire.presets.inferno.defaultSpeed);
    expect(fx.getState().wind).toBe(ELEMENTS.fire.presets.inferno.defaultWind);

    fx.destroy();
  });

  it('supports stacking multiple elemental layers in the same container cleanly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const rain = createElemental({ container, element: 'water', preset: 'rain', count: 10 });
    const storm = createElemental({ container, element: 'lightning', preset: 'storm', count: 10 });

    expect(container.querySelectorAll('canvas').length).toBe(2);
    rain.destroy();
    expect(container.querySelectorAll('canvas').length).toBe(1);
    storm.destroy();
    expect(container.querySelectorAll('canvas').length).toBe(0);
  });

  it('safely handles NaN or non-finite numeric options without corrupting state', () => {
    const fx = createElemental({
      element: 'fire',
      density: Number.NaN,
      speed: Number.POSITIVE_INFINITY,
      wind: Number.NaN,
      opacity: Number.NaN,
      interactionStrength: Number.NaN,
      count: Number.NaN,
    });

    const state = fx.getState();
    expect(Number.isFinite(state.density)).toBe(true);
    expect(Number.isFinite(state.speed)).toBe(true);
    expect(Number.isFinite(state.wind)).toBe(true);
    expect(Number.isFinite(state.opacity)).toBe(true);
    expect(Number.isFinite(state.interactionStrength)).toBe(true);
    expect(state.count).toBeUndefined();
    fx.destroy();
  });

  it('supports tree-shakable core API with a direct ElementDefinition object', () => {
    const fx = createCoreElemental({
      element: lightningElement,
      preset: 'arcs',
      count: 10,
    });

    expect(fx.getState().element).toBe('lightning');
    expect(fx.getState().preset).toBe('arcs');
    fx.destroy();
  });
});

describe('<elemental-fx> Web Component', () => {
  beforeEach(() => {
    const mockCtx = createMockContext2D();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    registerElementalComponent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('initializes from attributes, reacts to updates & removals, and handles paused start/unpause', () => {
    const el = document.createElement('elemental-fx') as ElementalFxElement;
    el.setAttribute('element', 'water');
    el.setAttribute('preset', 'bubbles');
    el.setAttribute('count', '20');
    el.setAttribute('colors', '#ff0000,#00ff00');
    el.setAttribute('interaction-strength', '2.2');
    el.setAttribute('theme', 'light');
    el.setAttribute('paused', '');
    document.body.appendChild(el);

    expect(el.controller).not.toBeNull();
    expect(el.controller?.getState().element).toBe('water');
    expect(el.controller?.getState().preset).toBe('bubbles');
    expect(el.controller?.getState().particleCount).toBe(20);
    expect(el.controller?.getState().interactionStrength).toBe(2.2);
    expect(el.controller?.getState().theme).toBe('light');
    expect(el.controller?.getState().running).toBe(false);

    // Removing paused starts the engine cleanly
    el.removeAttribute('paused');
    expect(el.controller?.getState().running).toBe(true);
    expect(el.controller?.getState().paused).toBe(false);

    // Removing colors resets back to the preset palette
    el.removeAttribute('colors');
    expect(el.controller?.getState().colors).toEqual(ELEMENTS.water.presets.bubbles.lightColors);

    el.setElement('aurora', { preset: 'silk' });
    expect(el.controller?.getState().element).toBe('aurora');
    expect(el.controller?.getState().preset).toBe('silk');

    el.setAttribute('paused', '');
    expect(el.controller?.getState().paused).toBe(true);

    el.remove();
    expect(el.controller).toBeNull();
  });
});
