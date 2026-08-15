# Contributing to BilaScript

Thank you for helping improve BilaScript. This preview favors small, test-backed language changes and explicit compatibility boundaries.

## Development setup

1. Install Node.js 20 or newer.
2. Run `npm test`.
3. Make focused changes in `src/compiler.mjs`.
4. Add or update a regression test in `test/`.
5. Run `npm run sync` and then `npm run verify`.

The compiler is copied into the VS Code extension and browser playground. CI rejects a change when either generated copy is stale.

## Pull requests

- Explain the syntax or behavior being changed.
- Include a minimal `.bila` example and the expected JavaScript output.
- Do not describe the preview as ECMAScript/Test262 complete.
- Keep diagnostics actionable and include source line/column data where possible.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
