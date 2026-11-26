# Elementals

Lightweight, zero-dependency HTML5 Canvas 2D elemental effects for websites — **fire, water, ice, grass, sand/stone, cosmic, lightning, aurora, smoke, and void** — with **30 curated templates**, live toggling, adjustable pointer reactivity, dark/light theme adaptation, tree-shakable subpath exports, and a drop-in `<elemental-fx>` Web Component.

## Highlights

- **10 Elements · 30 Curated Presets** — distinct Canvas 2D physics and rendering per element (Arctic borealis vertical light rays, procedural volumetric smoke billows, recursive fractal lightning, event-horizon accretion streams, hexagonal ice crystals, fluttering leaves, and more).
- **Zero Runtime Dependencies** — pure TypeScript + Canvas 2D with HiDPI/Retina scaling and `ResizeObserver`.
- **Works Everywhere** — Vanilla JS/TS, plain HTML, React, Next.js, Vue, Svelte, and Astro.
- **Tree-Shakable Subpaths** — import everything or cherry-pick a single element via `/core` + `/<element>`.
- **Composable Layering** — stack 2+ templates (e.g., `water:rain` + `lightning:storm`) in the same container with zero extra setup.
- **Dark & Light Mode Ready** — `theme: 'light'` automatically adapts blend modes and palettes for bright backgrounds.
- **Accessible & Battery-Friendly** — pauses automatically on hidden tabs and renders a calm static frame under `prefers-reduced-motion`.

---

## Installation

```bash
npm install elementals
```

> **Note:** Replace `elementals` with the final published npm package name if using a scoped or alternate name.

---

## Usage Guides

### 1. Vanilla JavaScript / TypeScript (Fullscreen or Scoped Container)

```ts
import { createElemental } from 'elementals';

// Fullscreen fixed ambient background
const fx = createElemental({
  element: 'aurora',
  preset: 'northern',
  density: 1,
  speed: 1,
  interactionStrength: 1.2,
});

// Switch elements, presets, colors, or wind on the fly
fx.setElement('fire', { preset: 'embers' });
fx.update({ wind: 0.6, colors: ['#ffbe0b', '#fb5607', '#ff006e'] });

// Pause / resume / cleanup
fx.pause();
fx.resume();
fx.destroy();
```

Render inside a specific element (such as a hero banner or card):

```ts
const heroFx = createElemental({
  container: '#hero', // CSS selector or HTMLElement
  element: 'ice',
  preset: 'crystals',
  theme: 'light',     // Adapts contrast & blend mode for light backgrounds
});
```

---

### 2. Web Component (`<elemental-fx>`) — Plain HTML or Any Framework

Register once in your entry script:

```ts
import 'elementals/web-component';
```

Then drop `<elemental-fx>` anywhere in HTML:

```html
<!-- Scoped hero section or card -->
<elemental-fx
  element="aurora"
  preset="silk"
  opacity="0.85"
  interaction-strength="1.2"
  style="min-height: 420px;"
>
  <h1>Welcome to the Cosmos</h1>
</elemental-fx>

<!-- Fullscreen ambient overlay -->
<elemental-fx
  fullscreen
  element="grass"
  preset="fireflies"
  opacity="0.8"
></elemental-fx>

<!-- Custom RGB/hex color palette on a light-themed page -->
<elemental-fx
  element="fire"
  preset="embers"
  theme="light"
  colors="#ea580c,#dc2626,#f59e0b"
  style="min-height: 360px;"
></elemental-fx>
```

---

### 3. React / Next.js

```tsx
'use client'; // Required in Next.js App Router

import { useEffect, useRef } from 'react';
import { createElemental } from 'elementals';

export function HeroBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const fx = createElemental({
      container: containerRef.current,
      element: 'void',
      preset: 'singularity',
      interactionStrength: 1.3,
    });

    return () => fx.destroy();
  }, []);

  return (
    <section ref={containerRef} style={{ position: 'relative', minHeight: 480 }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1>Build with Elementals</h1>
      </div>
    </section>
  );
}
```

---

### 4. Vue 3

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createElemental, type ElementalController } from 'elementals';

const heroEl = ref<HTMLElement | null>(null);
let fx: ElementalController | null = null;

onMounted(() => {
  if (!heroEl.value) return;
  fx = createElemental({
    container: heroEl.value,
    element: 'cosmic',
    preset: 'meteors',
  });
});

onUnmounted(() => fx?.destroy());
</script>

<template>
  <section ref="heroEl" style="position: relative; min-height: 420px;">
    <div style="position: relative; z-index: 1;">
      <h1>Hello from Vue</h1>
    </div>
  </section>
</template>
```

---

### 5. Svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createElemental } from 'elementals';

  let host: HTMLElement;

  onMount(() => {
    const fx = createElemental({
      container: host,
      element: 'smoke',
      preset: 'incense',
    });
    return () => fx.destroy();
  });
</script>

<section bind:this={host} style="position: relative; min-height: 420px;">
  <div style="position: relative; z-index: 1;">
    <h1>Hello from Svelte</h1>
  </div>
</section>
```

---

### 6. Tree-Shakable Subpath Imports (Smallest Bundle)

Only using one or two elements? Import `elementals/core` and only the element(s) you need:

```ts
import { createElemental } from 'elementals/core';
import { auroraElement } from 'elementals/aurora';

const fx = createElemental({
  element: auroraElement,
  preset: 'northern',
});
```

Available subpaths: `elementals`, `elementals/core`, `elementals/web-component`, `elementals/fire`, `elementals/water`, `elementals/ice`, `elementals/grass`, `elementals/sand`, `elementals/cosmic`, `elementals/lightning`, `elementals/aurora`, `elementals/smoke`, `elementals/void`.

---

### 7. Layering Multiple Templates Together

Every canvas is transparent with `pointer-events: none`, so you can stack 2 or more templates inside the same container to build custom atmospheres (like a thunderstorm or volcanic ash):

```html
<div style="position: relative; min-height: 420px;">
  <elemental-fx element="water" preset="rain" opacity="0.75" style="position:absolute;inset:0;"></elemental-fx>
  <elemental-fx element="lightning" preset="storm" opacity="0.9" style="position:absolute;inset:0;"></elemental-fx>
</div>
```

Or in JS/TS:

```ts
import { createElemental } from 'elementals';

const rain = createElemental({ container: '#hero', element: 'water', preset: 'rain', opacity: 0.75 });
const storm = createElemental({ container: '#hero', element: 'lightning', preset: 'storm', opacity: 0.9 });
```

---

## Available Elements & Presets

| Element | Default Preset | All Presets |
| --- | --- | --- |
| `fire` | `embers` | `embers`, `inferno`, `candlelight` |
| `water` | `rain` | `rain`, `bubbles`, `mist` |
| `ice` | `crystals` | `crystals`, `frost`, `blizzard` |
| `grass` | `leaves` | `leaves`, `petals`, `fireflies` |
| `sand` | `desert` | `desert`, `dust`, `pebbles` |
| `cosmic` | `starfield` | `starfield`, `meteors`, `nebula` |
| `lightning` | `storm` | `storm`, `arcs`, `sparks` |
| `aurora` | `northern` | `northern`, `silk`, `polar` |
| `smoke` | `wisps` | `wisps`, `incense`, `fog` |
| `void` | `singularity` | `singularity`, `rifts`, `antimatter` |

---

## Options Reference

| Option (JS) | Attribute (`<elemental-fx>`) | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `element` | `element` | `ElementName \| ElementDefinition` | `'cosmic'` | Active elemental theme or custom definition |
| `preset` | `preset` | `string` | Element default | Named template within the active element |
| `container` | — | `HTMLElement \| string` | `document.body` | Target container (defaults to fixed fullscreen overlay) |
| `density` | `density` | `number` | `1` | Particle density multiplier (`0.1` – `5`) |
| `count` | `count` | `number \| null` | `undefined` | Explicit particle count override (`null` resets) |
| `speed` | `speed` | `number \| null` | Preset default | Animation speed multiplier (`0` – `5`, `null` resets) |
| `wind` | `wind` | `number \| null` | Preset default | Horizontal wind bias (`null` resets) |
| `opacity` | `opacity` | `number` | `1` | Global opacity (`0` – `1`) |
| `colors` | `colors` | `string[] \| null` | Preset palette | Custom hex, `rgb()`, `hsl()`, or CSS colors (comma-separated in HTML) |
| `interactive` | `interactive` | `boolean` | `true` | Enable mouse/pointer interaction |
| `interactionStrength` | `interaction-strength` | `number` | `1` | Pointer interaction sensitivity (`0` – `3`) |
| `theme` | `theme` | `'dark' \| 'light'` | `'dark'` | Adapts blend modes & palettes for light or dark pages |
| `respectReducedMotion` | `respect-reduced-motion` | `boolean` | `true` | Renders a calm static frame under reduced motion |
| `zIndex` | CSS `z-index` | `number \| string` | `0` | CSS `z-index` for auto-created overlay canvas |
| `autoStart` | `paused` | `boolean` | `true` | Start animating immediately (`paused` attribute starts paused) |

## Controller Methods

| Method | Description |
| --- | --- |
| `start()` / `stop()` | Start animation loop or stop and clear canvas |
| `pause()` / `resume()` | Freeze or resume animation in place |
| `setElement(name, options?)` | Switch to another element (with optional preset/options) |
| `setPreset(preset)` | Switch template preset within the current element |
| `update(options)` | Live-update options (`colors`, `wind`, `speed`, `density`, `opacity`, `theme`, `interactionStrength`, etc.) |
| `resize()` | Manually recalculate canvas size & DPR |
| `getState()` | Returns current reactive state snapshot & active particle count |
| `destroy()` | Stops animation, removes listeners/observers, and removes auto-created canvas |

---

## Local Development

```bash
npm install
npm run dev              # Launch interactive playground (/) & integration example (/demo.html)
npm run typecheck        # Type-check with TypeScript
npm run test             # Run unit tests with Vitest
npm run build            # Build ESM, CJS, subpath exports, and .d.ts bundles
npm run build:playground # Build static playground & demo site
```

---

## Author

Created by **Pranesh Rajeswaran** — [Portfolio](https://praneshrajeswaran.vercel.app/) · [GitHub](https://github.com/Pranesh1801)

## License

MIT
