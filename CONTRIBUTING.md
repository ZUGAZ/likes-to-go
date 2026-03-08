# 🤝 Contributing to Likes to Go

Thanks for your interest! This doc covers everything you need to get oriented and start contributing.

## 🚀 Getting started

```bash
# Clone the repo
git clone https://github.com/ZUGAZ/likes-to-go.git
cd likes-to-go

# Install dependencies (pnpm required)
pnpm install

# Generate WXT types
pnpm wxt prepare

# Start dev server with HMR
pnpm dev

# Run tests in watch mode
pnpm test
```

To load the extension in Chrome:

1. Run `pnpm dev`
2. Open `chrome://extensions/` and enable **Developer mode**
3. Click **Load unpacked** and select the `.output/chrome-mv3` directory

## 🏛️ Architecture

Four layers. Dependencies flow downward only. No circular imports.

```
┌─────────────────────────────────────────────┐
│  View          Solid.js + Tailwind          │
├─────────────────────────────────────────────┤
│  ViewModel     Solid signals + actions      │
├─────────────────────────────────────────────┤
│  Model         Effect (Schema, Stream)      │
├─────────────────────────────────────────────┤
│  Infrastructure   DOM reader, Chrome APIs   │
└─────────────────────────────────────────────┘
```

### Where things live

The folder layout is **context-based**: code is grouped by runtime context; the four architecture layers (View, ViewModel, Model, Infrastructure) live **inside** those contexts.

```
src/
  entrypoints/       WXT entrypoints (popup, background, content script)
  popup/             Popup UI + viewmodel (View + ViewModel)
  background/       Service worker orchestration
  content/           Content script (Model + Infrastructure: content/model/, content/infrastructure/)
  common/            Shared across contexts: common/model/, common/infrastructure/
  assets/            CSS (Tailwind)
```

**WXT entrypoints** are the extension's entry points -- they wire things together but contain minimal logic. The real work lives in the four architecture layers, nested under the context folders above.

### Runtime components

- **Popup** (View + ViewModel): Solid.js UI. Sends commands, displays progress.
- **Background service worker** (Orchestrator): Coordinates content script, accumulates data, triggers download.
- **Content script** (Model + Infrastructure): Injected into SoundCloud. Reads the DOM, collects track data, streams it to the background worker.

## 🧠 Technical decisions

### Why Effect (and where not)

[Effect](https://effect.website/) provides typed errors, schema validation, streaming with backpressure, and dependency injection. It lives in the **Model** and **Infrastructure** layers only.

Effect does **not** touch:

- Popup UI state (Solid signals handle that)
- Simple synchronous transforms (plain TypeScript functions)
- Chrome message passing wrappers (thin typed adapters)

### Why Solid.js

~7KB, signals-based reactivity, no virtual DOM, functional in spirit. Perfect for a popup that needs to be tiny and fast.

### Why WXT

[WXT](https://wxt.dev/) is the actively maintained successor to CRXJS and vite-plugin-web-extension. It provides HMR for all extension components, auto-generates the manifest, and handles the Chrome extension build pipeline.

### Why kebab-case

All file names use **kebab-case** -- no exceptions. Acronyms are lowercased and hyphenated (`dom-reader.ts`, not `DOMReader.ts`).

### Immutability and no classes

Data is immutable. No classes. Functions and plain objects. Effect handles the structured stuff.

## 📏 Code standards

### TypeScript

Strictest config: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`.

### File naming

kebab-case everything. `track-schema.ts`, `dom-reader.ts`, `popup-state.ts`.

### Formatting

Prettier with tabs, single quotes, trailing commas. Run `pnpm format` to auto-fix.

### Linting

ESLint with typescript-eslint (strict type-checked) and eslint-plugin-solid. Run `pnpm lint` to check, `pnpm lint:fix` to auto-fix.

### Emojis

Emojis are welcome in docs, commit messages, code comments, UI text, test descriptions, and log output. They should feel natural, not forced. The goal is warmth, not decoration.

## 📝 Documentation policy

- **Yes:** Non-obvious "why" decisions, workaround explanations, links to external quirks, JSDoc on public APIs at layer boundaries.
- **No:** Restating what code does, narrating control flow, explaining standard patterns.

## 🧪 Testing expectations

### Model layer (pure FP)

Vitest + fast-check property-based tests. Schema validation, stream accumulation/dedup, exporter output conformance.

### Infrastructure layer

Vitest with mocked DOM (happy-dom) and mocked Chrome APIs. Selector accuracy against HTML fixtures.

### View layer

Solid Testing Library integration tests. Correct state rendering, button actions, progress updates.

### When to use fast-check

Any function that transforms data or validates schemas benefits from property-based testing. If you can describe "for all valid inputs, this property holds," use fast-check.

## 📋 Commit and release process

### Conventional Commits

Enforced by commitlint + husky. Format:

```
type: emoji short-description
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`

Examples:

```
feat: ☕ export likes as json with format version
fix: 🎨 handle tracks without artwork url
refactor: 🎯 isolate selectors into single mapping module
test: 🧪 property-based validation for track schema
docs: 📖 readme with install and usage
chore: 🔧 wxt config for dev server
```

### Releases

- Semantic versioning: `MAJOR.MINOR.PATCH`
- Development: `0.x.0` series
- Automated by [release-please](https://github.com/googleapis/release-please) (GitHub Action)
- Each release includes a `.zip` for sideloading
