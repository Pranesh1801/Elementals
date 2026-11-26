import { ELEMENTS } from './elements/index.js';
import { registerElements } from './registry.js';
import { ElementalFxElement, registerElementalComponent } from './web-component.js';

registerElements(Object.values(ELEMENTS));
registerElementalComponent();

export { ElementalFxElement, registerElementalComponent };
