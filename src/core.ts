export { ElementalEngine, createElemental } from './engine.js';
export {
  getElementDefinition,
  getRegisteredElementNames,
  isElementName,
  listPresets,
  registerElement,
  registerElements,
  resolvePreset,
} from './registry.js';
export { ElementalFxElement, registerElementalComponent } from './web-component.js';
export { colorWithAlpha, hexToRgba } from './utils/math.js';
export type {
  AnyPresetName,
  ElementDefinition,
  ElementName,
  ElementPresetConfig,
  ElementPresetMap,
  ElementalController,
  ElementalOptions,
  ElementalState,
  ElementalTheme,
  Particle,
  PointerState,
  PresetNameFor,
  SimulationContext,
} from './types.js';
