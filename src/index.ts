export { ElementalEngine, createElemental } from './engine.js';
export {
  getRegisteredElementNames,
  registerElement,
  registerElements,
} from './registry.js';
export {
  ELEMENTS,
  ELEMENT_NAMES,
  auroraElement,
  cosmicElement,
  fireElement,
  getElementDefinition,
  grassElement,
  iceElement,
  isElementName,
  lightningElement,
  listPresets,
  resolvePreset,
  sandElement,
  smokeElement,
  voidElement,
  waterElement,
} from './elements/index.js';
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
