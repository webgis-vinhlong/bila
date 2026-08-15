import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../src/compiler.mjs', import.meta.url), 'utf8');
for (const target of ['../vscode-extension/core/compiler.mjs', '../site/compiler.mjs']) {
  const generated = await readFile(new URL(target, import.meta.url), 'utf8');
  assert.equal(generated, source, `${target} is stale; run npm run sync`);
}
console.log('generated compiler copies are synchronized');
