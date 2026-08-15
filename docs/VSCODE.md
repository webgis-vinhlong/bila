# VS Code integration

The VS Code extension deliberately reuses `core/compiler.mjs`, a generated copy of the DevKit compiler core. Run `npm run sync` after changing `src/compiler.mjs`; CI verifies that the two files remain byte-for-byte identical.

## Installation

1. Open **Extensions** in VS Code.
2. Select **… → Install from VSIX…**.
3. Choose `dist/bilascript-official-tools-0.1.0.vsix`.
4. Open a `.bila` file and use the command palette.

## Diagnostics

Opening or editing a `.bila` file runs the AST checker. Syntax errors are translated into VS Code diagnostics using the parser's line and column.

## Compile

`BilaScript: Compile current file` emits sibling `.js` and `.js.map` files.

## AST

`BilaScript: Show AST` opens the parser output as JSON in a side editor.

## Run

`BilaScript: Run current file` compiles to `.bilascript-debug/<name>.mjs` and launches the local Node executable, with stdout/stderr shown in the BilaScript output channel.

## Debug

`BilaScript: Debug current file` compiles the same debug artifact and calls VS Code's built-in Node debugger with source maps enabled.

This is a practical first debugger integration. Source mappings are statement-level in this preview; expression-level stepping can be improved later by emitting finer codegen marks.

## Distribution note

“BilaScript Official Tools” is the requested extension identity. The repository only claims a locally installable preview VSIX; it does not claim publication or verification on the Visual Studio Marketplace.
