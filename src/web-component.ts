import { ElementalEngine } from './engine.js';
import { getRegisteredElementNames, isElementName } from './registry.js';
import type {
  ElementDefinition,
  ElementName,
  ElementalController,
  ElementalOptions,
  ElementalTheme,
} from './types.js';

const BaseHTMLElement: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

function parseNumberAttr(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolAttr(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return true;
}

function parseColorsAttr(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function parseThemeAttr(value: string | null): ElementalTheme {
  return value?.trim().toLowerCase() === 'light' ? 'light' : 'dark';
}

export class ElementalFxElement extends BaseHTMLElement {
  public static readonly observedAttributes = [
    'element',
    'preset',
    'density',
    'count',
    'speed',
    'wind',
    'opacity',
    'colors',
    'interactive',
    'interaction-strength',
    'theme',
    'paused',
    'respect-reduced-motion',
  ] as const;

  private _engine: ElementalEngine | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _syncingAttr = false;

  constructor() {
    super();
    if (typeof this.attachShadow === 'function') {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host {
            display: block;
            position: relative;
            overflow: hidden;
          }
          :host([fullscreen]) {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
          }
          canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
            pointer-events: none;
          }
          .slot-wrap {
            position: relative;
            z-index: 1;
            width: 100%;
            height: 100%;
          }
        </style>
        <canvas aria-hidden="true"></canvas>
        <div class="slot-wrap"><slot></slot></div>
      `;
      this._canvas = root.querySelector('canvas');
    }
  }

  public get controller(): ElementalController | null {
    return this._engine;
  }

  public connectedCallback(): void {
    if (!this._canvas) return;
    if (this._engine) {
      this._engine.destroy();
    }

    const opts = this.readOptions();
    this._engine = new ElementalEngine({
      ...opts,
      canvas: this._canvas,
      autoStart: !this.hasAttribute('paused'),
    });
  }

  public disconnectedCallback(): void {
    this._engine?.destroy();
    this._engine = null;
  }

  public attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (this._syncingAttr || oldValue === newValue || !this._engine) return;

    if (name === 'paused') {
      if (this.hasAttribute('paused')) {
        this._engine.pause();
      } else {
        const state = this._engine.getState();
        if (state.running) {
          this._engine.resume();
        } else {
          this._engine.start();
        }
      }
      return;
    }

    switch (name) {
      case 'element': {
        const nextEl = this.resolveElementAttr(newValue);
        this._engine.setElement(nextEl as ElementName, {
          preset: this.getAttribute('preset') ?? undefined,
          density: parseNumberAttr(this.getAttribute('density')),
          count: parseNumberAttr(this.getAttribute('count')) ?? null,
          speed: parseNumberAttr(this.getAttribute('speed')) ?? null,
          wind: parseNumberAttr(this.getAttribute('wind')) ?? null,
          opacity: parseNumberAttr(this.getAttribute('opacity')),
          colors: parseColorsAttr(this.getAttribute('colors')) ?? null,
          interactive: parseBoolAttr(this.getAttribute('interactive'), true),
          interactionStrength: parseNumberAttr(this.getAttribute('interaction-strength')),
          theme: parseThemeAttr(this.getAttribute('theme')),
          respectReducedMotion: parseBoolAttr(this.getAttribute('respect-reduced-motion'), true),
        });
        break;
      }
      case 'preset':
        if (newValue) {
          this._engine.setPreset(newValue);
        }
        break;
      case 'density':
        this._engine.update({ density: parseNumberAttr(newValue) ?? 1 });
        break;
      case 'count':
        this._engine.update({ count: parseNumberAttr(newValue) ?? null });
        break;
      case 'speed':
        this._engine.update({ speed: parseNumberAttr(newValue) ?? null });
        break;
      case 'wind':
        this._engine.update({ wind: parseNumberAttr(newValue) ?? null });
        break;
      case 'opacity':
        this._engine.update({ opacity: parseNumberAttr(newValue) ?? 1 });
        break;
      case 'colors':
        this._engine.update({ colors: parseColorsAttr(newValue) ?? null });
        break;
      case 'interactive':
        this._engine.update({ interactive: parseBoolAttr(newValue, true) });
        break;
      case 'interaction-strength':
        this._engine.update({ interactionStrength: parseNumberAttr(newValue) ?? 1 });
        break;
      case 'theme':
        this._engine.update({ theme: parseThemeAttr(newValue) });
        break;
      case 'respect-reduced-motion':
        this._engine.update({ respectReducedMotion: parseBoolAttr(newValue, true) });
        break;
    }
  }

  public setElement<E extends ElementName>(
    element: E | ElementDefinition<any>,
    options?: Omit<ElementalOptions<E>, 'element' | 'container' | 'canvas'>
  ): void {
    const elementName = typeof element === 'string' ? element : element.name;
    this._syncingAttr = true;
    try {
      this.setAttribute('element', elementName);
      if (options?.preset) {
        this.setAttribute('preset', String(options.preset));
      } else {
        this.removeAttribute('preset');
      }
    } finally {
      this._syncingAttr = false;
    }
    this._engine?.setElement(element, options);
  }

  public setPreset(preset: string): void {
    this._syncingAttr = true;
    try {
      this.setAttribute('preset', preset);
    } finally {
      this._syncingAttr = false;
    }
    this._engine?.setPreset(preset);
  }

  public start(): void {
    this._syncingAttr = true;
    try {
      this.removeAttribute('paused');
    } finally {
      this._syncingAttr = false;
    }
    this._engine?.start();
  }

  public stop(): void {
    this._engine?.stop();
  }

  public pause(): void {
    this._syncingAttr = true;
    try {
      this.setAttribute('paused', '');
    } finally {
      this._syncingAttr = false;
    }
    this._engine?.pause();
  }

  public resume(): void {
    this._syncingAttr = true;
    try {
      this.removeAttribute('paused');
    } finally {
      this._syncingAttr = false;
    }
    if (!this._engine) return;
    if (this._engine.getState().running) {
      this._engine.resume();
    } else {
      this._engine.start();
    }
  }

  private resolveElementAttr(rawValue: string | null): string {
    const candidate = rawValue?.trim() || 'cosmic';
    if (isElementName(candidate)) return candidate;
    if (isElementName('cosmic')) return 'cosmic';
    return getRegisteredElementNames()[0] ?? candidate;
  }

  private readOptions(): Omit<ElementalOptions, 'container' | 'canvas'> {
    const element = this.resolveElementAttr(this.getAttribute('element')) as ElementName;

    return {
      element,
      preset: this.getAttribute('preset') ?? undefined,
      density: parseNumberAttr(this.getAttribute('density')),
      count: parseNumberAttr(this.getAttribute('count')),
      speed: parseNumberAttr(this.getAttribute('speed')),
      wind: parseNumberAttr(this.getAttribute('wind')),
      opacity: parseNumberAttr(this.getAttribute('opacity')),
      colors: parseColorsAttr(this.getAttribute('colors')),
      interactive: parseBoolAttr(this.getAttribute('interactive'), true),
      interactionStrength: parseNumberAttr(this.getAttribute('interaction-strength')),
      theme: parseThemeAttr(this.getAttribute('theme')),
      respectReducedMotion: parseBoolAttr(this.getAttribute('respect-reduced-motion'), true),
    };
  }
}

export function registerElementalComponent(tagName = 'elemental-fx'): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return;
  }
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ElementalFxElement);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'elemental-fx': ElementalFxElement;
  }
}
