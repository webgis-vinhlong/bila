import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('GitHub Pages entry point is self-contained and accessible', async () => {
  const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="vi">/);
  assert.match(html, /id="playground"/);
  assert.match(html, /type="module" src="app\.js"/);
  assert.match(html, /aria-label=/);
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:js|css)/i);
});

test('playground imports the synchronized compiler core', async () => {
  const app = await readFile(new URL('../site/app.js', import.meta.url), 'utf8');
  assert.match(app, /from '\.\/compiler\.mjs'/);
  assert.match(app, /new Worker/);
  assert.match(app, /2000/);
});
