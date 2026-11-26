import {
  ELEMENTS,
  ELEMENT_NAMES,
  listPresets,
  registerElementalComponent,
  resolvePreset,
  type ElementName,
  type ElementalFxElement,
  type ElementalTheme,
} from 'elemental-avatars';

registerElementalComponent();

const ELEMENT_ICONS: Record<ElementName, string> = {
  fire: '🔥',
  water: '💧',
  ice: '❄️',
  grass: '🌿',
  sand: '🏜️',
  cosmic: '✨',
  lightning: '⚡',
  aurora: '🌌',
  smoke: '🌫️',
  void: '🕳️',
};

const MOOD_PALETTES: Record<string, string[]> = {
  neon: ['#39ff14', '#00f5d4', '#ff2a85', '#fee440'],
  cyber: ['#00f0ff', '#ff00aa', '#9b5de5', '#f15bb5'],
  mono: ['#ffffff', '#cbd5e1', '#94a3b8', '#64748b'],
};

const stage = document.getElementById('stage') as ElementalFxElement;
const elementGrid = document.getElementById('element-grid')!;
const presetRow = document.getElementById('preset-row')!;
const presetDesc = document.getElementById('preset-desc')!;
const particleBadge = document.getElementById('particle-badge')!;
const codeOutput = document.getElementById('code-output')!;
const copyBtn = document.getElementById('copy-btn')!;
const panel = document.getElementById('panel')!;
const togglePanelBtn = document.getElementById('toggle-panel-btn')!;
const pauseBtn = document.getElementById('pause-btn')!;
const modeBtn = document.getElementById('mode-btn')!;

const swatchRow = document.getElementById('swatch-row')!;
const moodRow = document.getElementById('mood-row')!;
const resetColorsBtn = document.getElementById('reset-colors-btn') as HTMLButtonElement;

const densityInput = document.getElementById('density-input') as HTMLInputElement;
const speedInput = document.getElementById('speed-input') as HTMLInputElement;
const windInput = document.getElementById('wind-input') as HTMLInputElement;
const opacityInput = document.getElementById('opacity-input') as HTMLInputElement;
const interactiveInput = document.getElementById('interactive-input') as HTMLInputElement;
const sensitivityWrap = document.getElementById('sensitivity-wrap')!;
const sensitivityInput = document.getElementById('sensitivity-input') as HTMLInputElement;

const densityVal = document.getElementById('density-val')!;
const speedVal = document.getElementById('speed-val')!;
const windVal = document.getElementById('wind-val')!;
const opacityVal = document.getElementById('opacity-val')!;
const sensitivityVal = document.getElementById('sensitivity-val')!;

let currentElement: ElementName = 'cosmic';
let currentPreset: string = ELEMENTS.cosmic.defaultPreset;
let codeTab: 'js' | 'html' = 'js';
let isPaused = false;
let currentMode: ElementalTheme = 'dark';
let activeMood: string = 'default';
let customColors: string[] | null = null;

function getPresetBaseColors(): string[] {
  const preset = resolvePreset(currentElement, currentPreset);
  if (currentMode === 'light' && preset.lightColors?.length) {
    return [...preset.lightColors];
  }
  return [...preset.colors];
}

function getDisplayedColors(): string[] {
  return customColors ? [...customColors] : getPresetBaseColors();
}

function normalizeHexForPicker(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#a78bfa';
}

function applyColorsToStage(): void {
  if (customColors && customColors.length > 0) {
    stage.setAttribute('colors', customColors.join(','));
    resetColorsBtn.hidden = false;
  } else {
    stage.removeAttribute('colors');
    resetColorsBtn.hidden = true;
  }
}

function renderSwatches(): void {
  swatchRow.innerHTML = '';
  const colors = getDisplayedColors();

  colors.forEach((hex, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'swatch-item';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'swatch-picker';
    picker.value = normalizeHexForPicker(hex);
    picker.title = `Edit color ${hex}`;
    picker.addEventListener('input', () => {
      const next = customColors ? [...customColors] : getPresetBaseColors();
      next[index] = picker.value;
      customColors = next;
      activeMood = 'custom';
      syncMoodButtons();
      applyColorsToStage();
      renderSnippet();
    });

    wrap.appendChild(picker);

    if (colors.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'swatch-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove color';
      removeBtn.addEventListener('click', () => {
        const next = customColors ? [...customColors] : getPresetBaseColors();
        next.splice(index, 1);
        customColors = next;
        activeMood = 'custom';
        syncMoodButtons();
        applyColorsToStage();
        renderSwatches();
        renderSnippet();
      });
      wrap.appendChild(removeBtn);
    }

    swatchRow.appendChild(wrap);
  });

  if (colors.length < 7) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'swatch-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add color swatch';
    addBtn.addEventListener('click', () => {
      const next = customColors ? [...customColors] : getPresetBaseColors();
      const paletteExtras = ['#38bdf8', '#f472b6', '#34d399', '#facc15', '#c084fc'];
      next.push(paletteExtras[next.length % paletteExtras.length]!);
      customColors = next;
      activeMood = 'custom';
      syncMoodButtons();
      applyColorsToStage();
      renderSwatches();
      renderSnippet();
    });
    swatchRow.appendChild(addBtn);
  }
}

function syncMoodButtons(): void {
  for (const btn of moodRow.querySelectorAll<HTMLButtonElement>('.mood-btn')) {
    btn.classList.toggle('active', btn.dataset.mood === activeMood);
  }
}

function syncUI(): void {
  document.body.dataset.theme = currentElement;
  document.body.dataset.mode = currentMode;

  const presets = listPresets(currentElement);
  const activePreset = presets.find((p) => p.id === currentPreset) ?? presets[0]!;
  presetDesc.textContent = activePreset.description;

  const state = stage.controller?.getState();
  if (state) {
    particleBadge.textContent = `${state.particleCount} particles`;
  }

  for (const btn of elementGrid.querySelectorAll<HTMLButtonElement>('.el-btn')) {
    btn.classList.toggle('active', btn.dataset.element === currentElement);
  }
  for (const btn of presetRow.querySelectorAll<HTMLButtonElement>('.preset-btn')) {
    btn.classList.toggle('active', btn.dataset.preset === currentPreset);
  }

  syncMoodButtons();
  renderSwatches();
  renderSnippet();
}

function renderPresets(): void {
  presetRow.innerHTML = '';
  const presets = listPresets(currentElement);
  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.dataset.preset = preset.id;
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      currentPreset = preset.id;
      const defaultWind = preset.defaultWind ?? 0;
      const defaultSpeed = preset.defaultSpeed ?? 1;
      windInput.value = String(defaultWind);
      speedInput.value = String(defaultSpeed);
      windVal.textContent = defaultWind.toFixed(2);
      speedVal.textContent = `${defaultSpeed.toFixed(2)}x`;

      stage.setAttribute('preset', currentPreset);
      stage.setAttribute('wind', String(defaultWind));
      stage.setAttribute('speed', String(defaultSpeed));
      syncUI();
    });
    presetRow.appendChild(btn);
  }
}

function selectElement(name: ElementName): void {
  currentElement = name;
  const def = ELEMENTS[name];
  currentPreset = def.defaultPreset;
  const presetCfg = resolvePreset(name, currentPreset);

  const defaultWind = presetCfg.defaultWind ?? 0;
  const defaultSpeed = presetCfg.defaultSpeed ?? 1;
  windInput.value = String(defaultWind);
  speedInput.value = String(defaultSpeed);
  windVal.textContent = defaultWind.toFixed(2);
  speedVal.textContent = `${defaultSpeed.toFixed(2)}x`;

  if (activeMood === 'default') {
    customColors = null;
    stage.removeAttribute('colors');
    resetColorsBtn.hidden = true;
  }

  stage.setElement(currentElement, {
    preset: currentPreset,
    wind: defaultWind,
    speed: defaultSpeed,
    colors: customColors ?? undefined,
    theme: currentMode,
  });

  renderPresets();
  syncUI();
}

function renderSnippet(): void {
  const density = Number(densityInput.value);
  const speed = Number(speedInput.value);
  const wind = Number(windInput.value);
  const opacity = Number(opacityInput.value);
  const interactive = interactiveInput.checked;
  const sensitivity = Number(sensitivityInput.value);
  const presetCfg = resolvePreset(currentElement, currentPreset);
  const defaultSpeed = presetCfg.defaultSpeed ?? 1;
  const defaultWind = presetCfg.defaultWind ?? 0;

  if (codeTab === 'js') {
    const lines = [
      `import { createElemental } from 'elemental-avatars';`,
      ``,
      `const fx = createElemental({`,
      `  element: '${currentElement}',`,
      `  preset: '${currentPreset}',`,
      ...(currentMode === 'light' ? [`  theme: 'light',`] : []),
      ...(density !== 1 ? [`  density: ${density},`] : []),
      ...(Math.abs(speed - defaultSpeed) > 0.01 ? [`  speed: ${speed},`] : []),
      ...(Math.abs(wind - defaultWind) > 0.01 ? [`  wind: ${wind},`] : []),
      ...(opacity !== 1 ? [`  opacity: ${opacity},`] : []),
      ...(!interactive ? [`  interactive: false,`] : []),
      ...(interactive && sensitivity !== 1 ? [`  interactionStrength: ${sensitivity},`] : []),
      ...(customColors ? [`  colors: [${customColors.map((c) => `'${c}'`).join(', ')}],`] : []),
      `});`,
    ];
    codeOutput.textContent = lines.join('\n');
  } else {
    const attrs = [
      `fullscreen`,
      `element="${currentElement}"`,
      `preset="${currentPreset}"`,
      ...(currentMode === 'light' ? [`theme="light"`] : []),
      ...(density !== 1 ? [`density="${density}"`] : []),
      ...(Math.abs(speed - defaultSpeed) > 0.01 ? [`speed="${speed}"`] : []),
      ...(Math.abs(wind - defaultWind) > 0.01 ? [`wind="${wind}"`] : []),
      ...(opacity !== 1 ? [`opacity="${opacity}"`] : []),
      ...(!interactive ? [`interactive="false"`] : []),
      ...(interactive && sensitivity !== 1 ? [`interaction-strength="${sensitivity}"`] : []),
      ...(customColors ? [`colors="${customColors.join(',')}"`] : []),
    ];
    codeOutput.textContent = `import 'elemental-avatars/web-component';\n\n<elemental-fx ${attrs.join(' ')}></elemental-fx>`;
  }
}

// Build element selector grid
for (const name of ELEMENT_NAMES) {
  const def = ELEMENTS[name];
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'el-btn';
  btn.dataset.element = name;
  btn.innerHTML = `<span>${ELEMENT_ICONS[name]}</span><span>${def.label.split(' ')[0]}</span>`;
  btn.addEventListener('click', () => selectElement(name));
  elementGrid.appendChild(btn);
}

// Mood palette buttons
for (const btn of moodRow.querySelectorAll<HTMLButtonElement>('.mood-btn')) {
  btn.addEventListener('click', () => {
    const mood = btn.dataset.mood ?? 'default';
    activeMood = mood;
    if (mood === 'default') {
      customColors = null;
    } else if (MOOD_PALETTES[mood]) {
      customColors = [...MOOD_PALETTES[mood]!];
    }
    applyColorsToStage();
    syncMoodButtons();
    renderSwatches();
    renderSnippet();
  });
}

resetColorsBtn.addEventListener('click', () => {
  activeMood = 'default';
  customColors = null;
  applyColorsToStage();
  syncMoodButtons();
  renderSwatches();
  renderSnippet();
});

densityInput.addEventListener('input', () => {
  const val = Number(densityInput.value);
  densityVal.textContent = `${val.toFixed(1)}x`;
  stage.setAttribute('density', String(val));
  const state = stage.controller?.getState();
  if (state) particleBadge.textContent = `${state.particleCount} particles`;
  renderSnippet();
});

speedInput.addEventListener('input', () => {
  const val = Number(speedInput.value);
  speedVal.textContent = `${val.toFixed(2)}x`;
  stage.setAttribute('speed', String(val));
  renderSnippet();
});

windInput.addEventListener('input', () => {
  const val = Number(windInput.value);
  windVal.textContent = val.toFixed(2);
  stage.setAttribute('wind', String(val));
  renderSnippet();
});

opacityInput.addEventListener('input', () => {
  const val = Number(opacityInput.value);
  opacityVal.textContent = `${Math.round(val * 100)}%`;
  stage.setAttribute('opacity', String(val));
  renderSnippet();
});

interactiveInput.addEventListener('change', () => {
  const enabled = interactiveInput.checked;
  stage.setAttribute('interactive', enabled ? 'true' : 'false');
  sensitivityWrap.classList.toggle('hidden', !enabled);
  renderSnippet();
});

sensitivityInput.addEventListener('input', () => {
  const val = Number(sensitivityInput.value);
  sensitivityVal.textContent = `${val.toFixed(1)}x`;
  stage.setAttribute('interaction-strength', String(val));
  renderSnippet();
});

modeBtn.addEventListener('click', () => {
  currentMode = currentMode === 'dark' ? 'light' : 'dark';
  modeBtn.textContent = currentMode === 'dark' ? 'Light Mode' : 'Dark Mode';
  stage.setAttribute('theme', currentMode);
  syncUI();
});

for (const tabBtn of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  tabBtn.addEventListener('click', () => {
    codeTab = tabBtn.dataset.tab === 'html' ? 'html' : 'js';
    for (const t of document.querySelectorAll('.tab')) {
      t.classList.toggle('active', t === tabBtn);
    }
    renderSnippet();
  });
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(codeOutput.textContent ?? '');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 1400);
  } catch {
    copyBtn.textContent = 'Select & Copy';
  }
});

togglePanelBtn.addEventListener('click', () => {
  const hidden = panel.classList.toggle('hidden');
  togglePanelBtn.textContent = hidden ? 'Show Controls' : 'Hide Controls';
});

pauseBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  if (isPaused) {
    stage.pause();
    pauseBtn.textContent = 'Resume';
  } else {
    stage.resume();
    pauseBtn.textContent = 'Pause';
  }
});

renderPresets();
syncUI();
