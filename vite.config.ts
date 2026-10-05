import { defineConfig } from 'vite';

// Vite is used for the dev server (HMR) only. Production builds still use
// tsc + assemble-dist.js (see package.json scripts). The dev server serves
// src/index.html and transpiles TS on the fly — no build step needed.
//
// The production build (tsc) emits individual ES modules to dist/js/, which
// the test harness imports directly. Vite's bundler would break that, so we
// keep the two pipelines separate.
export default defineConfig({
  root: 'src',
  server: {
    port: 8000,
    open: false,
  },
});
