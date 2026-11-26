import {
  getElementDefinition,
  isElementName as isRegisteredElementName,
  listPresets,
  registerElements,
  resolvePreset,
} from '../registry.js';
import type { ElementDefinition, ElementName } from '../types.js';
import { auroraElement } from './aurora.js';
import { cosmicElement } from './cosmic.js';
import { fireElement } from './fire.js';
import { grassElement } from './grass.js';
import { iceElement } from './ice.js';
import { lightningElement } from './lightning.js';
import { sandElement } from './sand.js';
import { smokeElement } from './smoke.js';
import { voidElement } from './void.js';
import { waterElement } from './water.js';

export const ELEMENTS: { [K in ElementName]: ElementDefinition<K> } = {
  fire: fireElement,
  water: waterElement,
  ice: iceElement,
  grass: grassElement,
  sand: sandElement,
  cosmic: cosmicElement,
  lightning: lightningElement,
  aurora: auroraElement,
  smoke: smokeElement,
  void: voidElement,
};

export const ELEMENT_NAMES = Object.keys(ELEMENTS) as ElementName[];

// Register all built-in elements into the shared runtime registry
registerElements(Object.values(ELEMENTS));

export function isElementName(value: string): value is ElementName {
  return Object.prototype.hasOwnProperty.call(ELEMENTS, value) || isRegisteredElementName(value);
}

export { getElementDefinition, listPresets, resolvePreset };
export {
  fireElement,
  waterElement,
  iceElement,
  grassElement,
  sandElement,
  cosmicElement,
  lightningElement,
  auroraElement,
  smokeElement,
  voidElement,
};
