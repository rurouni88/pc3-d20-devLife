#!/usr/bin/env node
// Assemble the deployable site into dist/.
//
// The tsc build (npm run build) emits the compiled JS into dist/js/. But the
// runtime also loads three things that live under src/ and are NOT emitted by
// tsc:
//   - src/index.html              (the page itself)
//   - src/css/style.css           (the theme)
//   - src/data/                   (game content: events, future achievements — fetched at runtime)
//
// This script copies those into dist/ so it becomes a self-contained site root
// for GitHub Pages:
//   dist/index.html
//   dist/css/style.css
//   dist/js/*.js                  (from the build)
//   dist/data/                    (game content: events, future achievements)
//
// index.html already references its assets relative to the site root (js/,
// css/), so it is copied as-is — no path rewriting needed.
//
// Run after `npm run build`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const dist = path.join(root, 'dist');

function fail(message) {
  console.error(`[assemble] ${message}`);
  process.exit(1);
}

// The build must have run first.
if (!fs.existsSync(path.join(dist, 'js'))) {
  fail('dist/js/ not found — run "npm run build" first.');
}

// 1. src/index.html -> dist/index.html (rewrite Vite dev refs to production refs).
// Vite dev uses /js/app.ts and /css/style.css (absolute, no version).
// Production needs js/app.js?v=VERSION and css/style.css?v=VERSION (relative, cache-busted).
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
html = html.replace('/js/app.ts', `js/app.js?v=${version}`);
html = html.replace('/css/style.css', `css/style.css?v=${version}`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log(`[assemble] src/index.html -> dist/index.html (v${version})`);

// 1b. src/_headers -> dist/_headers (GitHub Pages cache policy: revalidate
//     js/ and css/ by ETag — the module graph is fetched by bare URL, so
//     per-file ?v= cache-busting doesn't apply to sub-resources).
fs.copyFileSync(path.join(srcDir, '_headers'), path.join(dist, '_headers'));
console.log('[assemble] src/_headers -> dist/_headers');

// 2. src/css/ -> dist/css/
copyDir(path.join(srcDir, 'css'), path.join(dist, 'css'));
console.log('[assemble] src/css/ -> dist/css/');

// 3. src/data/ -> dist/data/ (game content: events, future achievements — fetched at runtime)
copyDir(path.join(srcDir, 'data'), path.join(dist, 'data'));
console.log('[assemble] src/data/ -> dist/data/');

console.log('[assemble] done — dist/ is ready to deploy.');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
