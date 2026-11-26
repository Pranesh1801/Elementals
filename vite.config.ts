import { defineConfig } from 'vite';

function localPath(relativePath: string): string {
  return decodeURIComponent(new URL(relativePath, import.meta.url).pathname).replace(
    /^\/([A-Za-z]:)/,
    '$1'
  );
}

export default defineConfig({
  root: localPath('./playground'),
  resolve: {
    alias: {
      'elemental-avatars/core': localPath('./src/core.ts'),
      'elemental-avatars/web-component': localPath('./src/web-component-entry.ts'),
      'elemental-avatars': localPath('./src/index.ts'),
    },
  },
  build: {
    outDir: localPath('./dist-playground'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: localPath('./playground/index.html'),
        demo: localPath('./playground/demo.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
