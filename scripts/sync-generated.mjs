import { copyFile, mkdir } from 'node:fs/promises';

const targets = [
  'vscode-extension/core/compiler.mjs',
  'site/compiler.mjs'
];

for (const target of targets) {
  await mkdir(new URL(`../${target.replace(/\/[^/]+$/, '')}/`, import.meta.url), { recursive: true });
  await copyFile(new URL('../src/compiler.mjs', import.meta.url), new URL(`../${target}`, import.meta.url));
  console.log(`synced src/compiler.mjs -> ${target}`);
}
