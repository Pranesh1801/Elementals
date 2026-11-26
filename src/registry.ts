import type { ElementDefinition, ElementPresetConfig } from './types.js';

const registry = new Map<string, ElementDefinition<any>>();

/**
 * Registers a custom or subpath-imported element definition so it can be referenced
 * by string name in `createElemental({ element: '...' })` or `<elemental-fx element="...">`.
 */
export function registerElement(def: ElementDefinition<any>): void {
  registry.set(def.name, def);
}

/**
 * Registers multiple element definitions at once.
 */
export function registerElements(defs: readonly ElementDefinition<any>[]): void {
  for (const def of defs) {
    registry.set(def.name, def);
  }
}

export function isElementName(value: string): boolean {
  return registry.has(value);
}

export function getRegisteredElementNames(): string[] {
  return Array.from(registry.keys());
}

export function getElementDefinition(nameOrDef: string | ElementDefinition<any>): ElementDefinition<any> {
  if (typeof nameOrDef !== 'string') {
    return nameOrDef;
  }
  const def = registry.get(nameOrDef);
  if (!def) {
    const available = getRegisteredElementNames();
    const hint =
      available.length > 0
        ? `Available elements: ${available.join(', ')}`
        : 'No elements registered yet. Import from "elementals" or call registerElement(...).';
    throw new Error(`[elementals] Unknown element "${String(nameOrDef)}". ${hint}`);
  }
  return def;
}

export function resolvePreset(
  element: string | ElementDefinition<any>,
  preset?: string
): ElementPresetConfig {
  const def = getElementDefinition(element);
  if (preset && Object.prototype.hasOwnProperty.call(def.presets, preset)) {
    return def.presets[preset as keyof typeof def.presets]!;
  }
  return def.presets[def.defaultPreset as keyof typeof def.presets]!;
}

export function listPresets(element: string | ElementDefinition<any>): ElementPresetConfig[] {
  const def = getElementDefinition(element);
  return Object.values(def.presets);
}
