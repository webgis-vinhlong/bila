# BilaScript AST engine

`src/compiler.mjs` is the canonical implementation used by the CLI, browser playground and VS Code extension. The parser emits an ESTree-like tree; this is a practical compatibility shape, not a claim that every ESTree or ECMAScript node is implemented.

## Pipeline

1. `detectProfile` removes the optional source directive and selects `bila`, `strict` or `js` behavior.
2. `lex` emits Unicode-aware tokens, diagnostics and source locations.
3. `Parser` builds the syntax tree with recursive-descent and precedence parsing.
4. `Codegen` lowers canonical BilaScript keywords and built-in aliases to JavaScript.
5. `compile` returns JavaScript, diagnostics, the AST and an optional Source Map v3 object.

## Node coverage

Important nodes include:

- `Program`
- `VariableDeclaration` / `VariableDeclarator`
- `FunctionDeclaration` / `FunctionExpression` / `ArrowFunctionExpression`
- `IfStatement`
- `ForStatement` / `ForOfStatement` / `ForInStatement`
- `WhileStatement` / `DoWhileStatement`
- `ReturnStatement`
- `BlockStatement`
- `CallExpression` / `MemberExpression` / `NewExpression`
- `BinaryExpression` / `LogicalExpression` / `AssignmentExpression`
- `ArrayExpression` / `ObjectExpression`
- `ArrayPattern` / `ObjectPattern` / `RestElement` / `SpreadElement`
- `ClassDeclaration`
- `TryStatement` / `ThrowStatement`
- `ImportDeclaration` / `ExportNamedDeclaration` / `ExportDefaultDeclaration`
- `SwitchStatement`

Bila type annotations are recorded as `BilaTypeAnnotation` during parsing and erased from generated JavaScript.

Source locations are retained on AST nodes and statement-level generated mappings are used to build a Source Map v3 file.

## Profiles

| Directive | Behavior |
|---|---|
| `---bila---` | BilaScript vocabulary with structural JavaScript syntax where supported |
| `---bila:strict---` | Requires BilaScript spellings when a canonical equivalent exists; emits `BILA-K001` otherwise |
| `---bila:js---` | JavaScript-oriented structural mode for migration and interoperability |

## Stability boundary

AST node names and fields may change during the DevKit preview. Consumers should pin the preview version, validate `result.version`, and avoid depending on undocumented fields.
