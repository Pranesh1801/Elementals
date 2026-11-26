import {
  ELEMENTS,
  ELEMENT_NAMES,
  registerElementalComponent,
  type ElementName,
  type ElementalFxElement,
  type ElementalTheme,
} from 'elementals';

registerElementalComponent();

interface LayerCombo {
  title: string;
  a: { element: ElementName; preset: string; opacity: number };
  b: { element: ElementName; preset: string; opacity: number };
}

const LAYER_COMBOS: Record<string, LayerCombo> = {
  thunderstorm: {
    title: 'Thunderstorm',
    a: { element: 'water', preset: 'rain', opacity: 0.75 },
    b: { element: 'lightning', preset: 'storm', opacity: 0.9 },
  },
  volcanic: {
    title: 'Volcanic Ash',
    a: { element: 'fire', preset: 'inferno', opacity: 0.85 },
    b: { element: 'sand', preset: 'pebbles', opacity: 0.75 },
  },
  'frost-aurora': {
    title: 'Frozen Aurora',
    a: { element: 'aurora', preset: 'northern', opacity: 0.75 },
    b: { element: 'ice', preset: 'crystals', opacity: 0.85 },
  },
  'dark-mist': {
    title: 'Void Mist',
    a: { element: 'smoke', preset: 'wisps', opacity: 0.75 },
    b: { element: 'void', preset: 'singularity', opacity: 0.85 },
  },
};

const themeToggle = document.getElementById('theme-toggle')!;
const heroFx = document.getElementById('hero-fx') as ElementalFxElement;
const layerA = document.getElementById('layer-a') as ElementalFxElement;
const layerB = document.getElementById('layer-b') as ElementalFxElement;
const layerTitle = document.getElementById('layer-title')!;
const layerSub = document.getElementById('layer-sub')!;
const layerSnippet = document.getElementById('layer-snippet')!;
const toggleLayerA = document.getElementById('toggle-layer-a') as HTMLInputElement;
const toggleLayerB = document.getElementById('toggle-layer-b') as HTMLInputElement;

const ambientOverlay = document.getElementById('ambient-overlay') as ElementalFxElement;
const overlayEnable = document.getElementById('overlay-enable') as HTMLInputElement;
const overlayElement = document.getElementById('overlay-element') as HTMLSelectElement;
const overlayOpacity = document.getElementById('overlay-opacity') as HTMLInputElement;

let mode: ElementalTheme = 'dark';
let activeComboKey = 'thunderstorm';

function applyTheme(next: ElementalTheme): void {
  mode = next;
  document.body.dataset.mode = next;
  themeToggle.textContent = next === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

  for (const el of document.querySelectorAll<ElementalFxElement>('elemental-fx')) {
    el.setAttribute('theme', next);
  }
  renderLayerSnippet();
}

function renderLayerSnippet(): void {
  const combo = LAYER_COMBOS[activeComboKey]!;
  const themeAttr = mode === 'light' ? ' theme="light"' : '';
  layerSnippet.textContent = [
    `<div style="position: relative; min-height: 360px;">`,
    `  <elemental-fx element="${combo.a.element}" preset="${combo.a.preset}" opacity="${combo.a.opacity}"${themeAttr} style="position:absolute;inset:0;"></elemental-fx>`,
    `  <elemental-fx element="${combo.b.element}" preset="${combo.b.preset}" opacity="${combo.b.opacity}"${themeAttr} style="position:absolute;inset:0;"></elemental-fx>`,
    `</div>`,
  ].join('\n');
}

function applyCombo(key: string): void {
  const combo = LAYER_COMBOS[key];
  if (!combo) return;
  activeComboKey = key;

  layerA.setElement(combo.a.element, {
    preset: combo.a.preset,
    opacity: combo.a.opacity,
    theme: mode,
  });
  layerB.setElement(combo.b.element, {
    preset: combo.b.preset,
    opacity: combo.b.opacity,
    theme: mode,
  });

  layerTitle.textContent = combo.title;
  layerSub.textContent = `${combo.a.element}:${combo.a.preset} + ${combo.b.element}:${combo.b.preset}`;

  for (const btn of document.querySelectorAll<HTMLButtonElement>('.combo-btn')) {
    btn.classList.toggle('active', btn.dataset.combo === key);
  }
  renderLayerSnippet();
}

// Theme toggle
themeToggle.addEventListener('click', () => {
  applyTheme(mode === 'dark' ? 'light' : 'dark');
});

// Hero switcher chips
for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-hero]')) {
  chip.addEventListener('click', () => {
    const [element, preset] = (chip.dataset.hero ?? 'aurora:silk').split(':') as [
      ElementName,
      string,
    ];
    heroFx.setElement(element, { preset, theme: mode });
    for (const other of document.querySelectorAll('[data-hero]')) {
      other.classList.toggle('active', other === chip);
    }
  });
}

// Combo buttons
for (const btn of document.querySelectorAll<HTMLButtonElement>('.combo-btn')) {
  btn.addEventListener('click', () => {
    if (btn.dataset.combo) applyCombo(btn.dataset.combo);
  });
}

toggleLayerA.addEventListener('change', () => {
  layerA.style.display = toggleLayerA.checked ? 'block' : 'none';
  if (toggleLayerA.checked) layerA.resume();
  else layerA.pause();
});

toggleLayerB.addEventListener('change', () => {
  layerB.style.display = toggleLayerB.checked ? 'block' : 'none';
  if (toggleLayerB.checked) layerB.resume();
  else layerB.pause();
});

// Populate fullscreen overlay dropdown with all 10 elements
for (const name of ELEMENT_NAMES) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = ELEMENTS[name].label;
  if (name === 'cosmic') opt.selected = true;
  overlayElement.appendChild(opt);
}

overlayEnable.addEventListener('change', () => {
  if (overlayEnable.checked) {
    ambientOverlay.style.display = 'block';
    ambientOverlay.removeAttribute('paused');
    ambientOverlay.controller?.resize();
  } else {
    ambientOverlay.setAttribute('paused', '');
    ambientOverlay.style.display = 'none';
  }
});

overlayElement.addEventListener('change', () => {
  const name = overlayElement.value as ElementName;
  ambientOverlay.setElement(name, {
    preset: ELEMENTS[name].defaultPreset,
    opacity: Number(overlayOpacity.value),
    theme: mode,
  });
});

overlayOpacity.addEventListener('input', () => {
  ambientOverlay.setAttribute('opacity', overlayOpacity.value);
});

renderLayerSnippet();
