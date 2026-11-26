import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    'web-component': 'src/web-component-entry.ts',
    'elements/fire': 'src/elements/fire.ts',
    'elements/water': 'src/elements/water.ts',
    'elements/ice': 'src/elements/ice.ts',
    'elements/grass': 'src/elements/grass.ts',
    'elements/sand': 'src/elements/sand.ts',
    'elements/cosmic': 'src/elements/cosmic.ts',
    'elements/lightning': 'src/elements/lightning.ts',
    'elements/aurora': 'src/elements/aurora.ts',
    'elements/smoke': 'src/elements/smoke.ts',
    'elements/void': 'src/elements/void.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  target: 'es2020',
  treeshake: true,
});
