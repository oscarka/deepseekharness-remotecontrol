import { defineConfig } from 'vite';

export default defineConfig({
  root: 'hub/web',
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'Fragment',
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
    minify: false,
  },
});
