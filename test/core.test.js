#!/usr/bin/env node
// Core game logic tests — `npm test`.
//
// The game ships as ES modules (no bundler). This harness runs against the
// BUILT output (dist/js/) so it tests exactly what the browser loads:
//   1. Syntax-check every dist/js file (`node --check`, ESM-aware via the
//      package.json "type": "module").
//   2. Version + cache-policy guards: the single module entry in index.html
//      carries ?v=<version> (matching CONFIG and package.json), and
//      src/_headers revalidates /js/* and /css/* by ETag.
//   3. Stub the one browser global the logic tier touches (localStorage),
//      then import the test body (core.tests.js), whose static imports pull
//      in the logic modules. UI modules need the DOM and are NOT imported.
//
// events.js is safe to import in Node: its top-level fetch is guarded by
// `typeof document`, and tests populate EVENTS directly.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'dist', 'js');

// 1. Syntax-check every built JS file (recursively — the tier folders).
function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? listJs(path.join(dir, e.name))
    : e.name.endsWith('.js') ? [path.join(dir, e.name)]
    : []);
}
for (const file of listJs(JS_DIR)) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0, `node --check failed for ${path.relative(ROOT, file)}:\n${res.stderr}`);
}
console.log('✓ syntax: all js files parse');

// 2. Version + cache-policy guards.
// The game shows CONFIG.version in its badge; package.json carries the same
// number for npm/CI. The module entry is the only asset with a ?v= literal —
// sub-resources are fetched by bare URL, so the _headers no-cache policy
// (revalidate by ETag) is what keeps them fresh across deploys.
const PACKAGE_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
).version;
const { CONFIG } = await import(pathToFileURL(path.join(JS_DIR, 'core', 'config.js')));
assert.strictEqual(
  CONFIG.version, PACKAGE_VERSION,
  `CONFIG.version (${CONFIG.version}) must match package.json (${PACKAGE_VERSION})`
);

// Check the BUILT index.html (dist/) — the assemble script rewrites Vite dev
// refs (/js/app.ts) to production refs (js/app.js?v=VERSION).
const distHtml = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const moduleEntries = [...distHtml.matchAll(/<script type="module" src="([^"]+)">/g)].map(m => m[1]);
assert.strictEqual(moduleEntries.length, 1, 'dist/index.html must load exactly one module entry');
const entryVersion = /v=([\d.]+)$/.exec(moduleEntries[0])?.[1];
assert.ok(entryVersion, `module entry must be versioned (got: ${moduleEntries[0]})`);
assert.strictEqual(
  entryVersion, PACKAGE_VERSION,
  `dist/index.html module entry ?v=${entryVersion} must match package.json (${PACKAGE_VERSION})`
);

const headers = fs.readFileSync(path.join(ROOT, 'src', '_headers'), 'utf8');
assert.ok(/\/js\/\*[\s\S]*?no-cache/.test(headers), '_headers must set no-cache for /js/*');
assert.ok(/\/css\/\*[\s\S]*?no-cache/.test(headers), '_headers must set no-cache for /css/*');
console.log('✓ version + cache policy: entry ?v=, _headers no-cache, all agree');

// 3. Tier discipline: the import graph must respect the layering
//    core ← data ← engine ← ui ← app. The rules below are the strict ones;
//    the two data→engine imports (perks/achievements reading SpecialSystem
//    against the live game) are a documented exception — see the notes in
//    those files.
function importsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  return [...src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map(m => m[1]);
}
const TIER_RULES = [
  { tier: 'core', forbidden: ['data', 'engine', 'ui'] },
  { tier: 'data', forbidden: ['ui'] },
  { tier: 'engine', forbidden: ['ui'] },
];
for (const { tier, forbidden } of TIER_RULES) {
  for (const file of listJs(path.join(JS_DIR, tier))) {
    for (const spec of importsOf(file)) {
      const target = path.resolve(path.dirname(file), spec);
      const rel = path.relative(JS_DIR, target);
      const targetTier = rel.split(path.sep)[0];
      assert.ok(!forbidden.includes(targetTier),
        `${path.relative(JS_DIR, file)} imports ${spec} (${targetTier} tier) — ${tier} must not import ${targetTier}`);
    }
  }
}
// data→engine: only the SpecialSystem reads are allowed.
for (const file of listJs(path.join(JS_DIR, 'data'))) {
  for (const spec of importsOf(file)) {
    if (!spec.includes('/engine/')) continue;
    assert.ok(/special\.js$/.test(spec),
      `${path.relative(JS_DIR, file)} imports ${spec} — data may only import engine/special.js`);
  }
}
console.log('✓ tier discipline: import graph respects core ← data ← engine ← ui');

// 4. Stub the browser global the logic tier touches, then run the tests.
// (No document stub: events.js's load guard checks `typeof document`, and
// skipping the fetch in Node is exactly what the guard is for.)
globalThis.localStorage = {
  _data: {},
  getItem(k) { return Object.hasOwn(this._data, k) ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
};

await import(pathToFileURL(path.join(__dirname, 'core.tests.js')));
console.log('\n✓ all core tests passed');
