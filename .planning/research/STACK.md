# Stack Research

**Domain:** HTML5 casual tapping/clicker game — mobile web + Facebook Instant Games
**Researched:** 2026-03-13
**Confidence:** MEDIUM (all external tools denied; based on training knowledge through August 2025 — verify versions before pinning)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser 3 | 3.87.x (latest stable) | Game engine — rendering, input, scene management, animations | Industry standard for HTML5 casual games; Canvas + WebGL renderer with automatic fallback; has official Facebook Instant Games plugin; massive community; used by thousands of shipped Instant Games titles. Phaser 4 is in development but not production-ready as of mid-2025 — do not use. |
| TypeScript | 5.4.x | Type safety, IDE support, refactor confidence | Phaser 3 ships official TS definitions. Casual games grow in complexity faster than expected — TS catches state bugs (wrong flower phase enum, timer drift) at compile time rather than runtime. |
| Vite | 5.x | Dev server, HMR, bundling | Fastest dev loop for Phaser 3 projects; native ES modules; the official Phaser 3 community templates use Vite. Replaces webpack for Phaser projects as of 2023 onwards. |
| Facebook Instant Games SDK | 7.1 (load via CDN) | Platform API — leaderboards, context, payments, ads | Required for FB Instant Games distribution. Loaded via `<script>` tag from FB CDN, not npm. Must call `FBInstant.initializeAsync()` before any game init. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| phaser3-rex-plugins | 1.x (pick components) | UI components, virtual joystick, tweens, grid table | Use the `GridTable` plugin for the 8x8 board rendering if native Phaser GameObjects feel verbose. Optional — Phaser 3 native is sufficient for this game scope. |
| @capacitor/core | 6.x | Native mobile wrapper (future) | Only needed if you ship to App Store / Google Play via Capacitor. Out of scope for v1 but worth knowing — Capacitor wraps Phaser HTML5 games cleanly. |
| howler.js | 2.2.x | Audio management | Phaser's native audio is adequate for simple SFX. Use Howler only if you need advanced audio features (positional audio, audio sprites with precise timing). For a tapping game, Phaser native is sufficient. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite (with `vite-plugin-phaser`) | Dev server + production bundle | Use `vite build` to produce a `dist/` folder — this is what you zip and upload to FB Instant Games. Target `es2015` in tsconfig for FB Instant compatibility. |
| ESLint + `@typescript-eslint` | Linting | Catches enum misuse and unhandled promise chains (critical for async FB SDK calls). |
| Prettier | Code formatting | Set `tabWidth: 2`, no config contention with ESLint. |
| `vite-plugin-mkcert` | Local HTTPS | FB Instant Games SDK requires HTTPS context even in local testing. Without this, `FBInstant` calls will fail during dev. |
| FB Instant Games Mock (`fbinstant.6.3.mock.js`) | Local dev mock of FB SDK | Facebook provides a mock JS file to stub `FBInstant` calls during local development. Download from FB developer docs. |

---

## Installation

```bash
# Scaffold with official Phaser 3 Vite TypeScript template
npm create phaser3@latest bloom-tap -- --template vite-ts

# Core game engine (already in template, verify version)
npm install phaser@^3.87.0

# Dev dependencies
npm install -D typescript@^5.4.0 vite@^5.0.0 @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint prettier vite-plugin-mkcert

# Optional: Rex plugins (install only if needed)
npm install phaser3-rex-plugins
```

**Facebook Instant Games SDK — do NOT install via npm.**
Add to `index.html` before your game bundle:
```html
<script src="https://connect.facebook.net/en_US/fbinstant.7.1.js"></script>
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Phaser 3 | PixiJS 8.x | Pure rendering library, no game loop — use PixiJS if you need maximum rendering performance and are willing to build all game systems (input, scenes, timers) yourself. Not worth it for a casual tapping game. |
| Phaser 3 | Construct 3 | Visual/no-code game builder — valid for rapid prototyping without coding, but requires subscription and limits code customization. Use if the team is non-technical. |
| Phaser 3 | Unity WebGL | Massive payload (5-50MB) — FB Instant Games has a 200KB initial payload limit for the main bundle. Unity WebGL is incompatible with this constraint. |
| Phaser 3 | Phaser 4 (alpha) | Not production-ready as of mid-2025. Missing plugins, breaking API changes. Revisit in 2026. |
| Vite | Webpack 5 | Use Webpack only if you inherit a legacy Phaser project already on Webpack. Starting fresh: Vite is strictly better DX. |
| TypeScript | Plain JavaScript | Use JS only if the team is strongly opposed to TS. The Phaser TS types alone justify the setup cost. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Three.js / Babylon.js** | 3D engines — massive overhead for a 2D grid game. Bundle size bloat with no benefit. | Phaser 3 (2D-native) |
| **React / Vue for game UI** | DOM-based frameworks introduce layout reflow on every state change — unacceptable for 60fps tap games with rapid visual feedback. FB Instant Games also has DOM manipulation constraints. | Phaser 3 native UI (Text, Image, Container GameObjects) |
| **Unity WebGL export** | Initial payload exceeds FB Instant Games 200KB bundle limit. FB will reject submissions. Total bundle typically 5-50MB. | Phaser 3 (bundles to ~1-3MB for a casual game) |
| **Phaser CE (Community Edition)** | Abandoned fork of Phaser 2, no longer maintained, no TypeScript types, incompatible with modern bundlers. | Phaser 3 |
| **GameMaker HTML5 export** | Generates non-standard HTML5 output that is poorly optimized and hard to integrate with FB SDK. Runtime errors on mobile Safari. | Phaser 3 |
| **`npm install fbinstant`** (unofficial packages) | No official npm package exists. Unofficial packages are outdated and not maintained by Meta. | Load FB SDK via `<script>` tag from Meta CDN |
| **`localStorage` for highscore in FB context** | `localStorage` is sandboxed per game context in FB Instant Games — works for local web but may not persist correctly across FB game sessions. | Use `FBInstant.player.setDataAsync()` for persistent data in FB context; use `localStorage` only for pure web/local mode |

---

## Stack Patterns by Variant

**If targeting web-only (v1, no FB Instant):**
- Skip the FB SDK script tag entirely
- Use `localStorage` for highscore freely
- Use `vite-plugin-mkcert` is optional (HTTP is fine for local)
- Bundle size limit is not a concern

**If targeting Facebook Instant Games (post-v1):**
- Load FB SDK from CDN before game bundle
- Wrap game init in `FBInstant.initializeAsync().then(() => { startGame() })`
- Replace `localStorage.setItem('highscore')` with `FBInstant.player.setDataAsync({ highscore: score })`
- Test with official FB mock file locally
- Keep total compressed bundle under ~5MB for fast load (FB requires under 200KB for `index.html` + initial resources; subsequent assets can be lazy-loaded)
- Use `FBInstant.setLoadingProgress(percent)` to drive the loading bar during asset load

**If the team knows React/Vue:**
- Do NOT use them for the game canvas layer
- They can be used for a thin meta-UI shell (landing page, settings modal) rendered in DOM outside the canvas — but this adds complexity and should be deferred to v2+

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `phaser@3.87.x` | `typescript@5.x` | Phaser ships its own `types/phaser.d.ts` — do not install `@types/phaser` separately (package is stale). |
| `phaser@3.87.x` | `vite@5.x` | Compatible. Use `vite.config.ts` with `resolve.alias` for Phaser's optional dependencies (sound, spine). |
| FB Instant SDK `7.1` | Phaser `3.x` | No direct dependency — FB SDK is loaded globally (`window.FBInstant`). Phaser has zero knowledge of FB SDK. Integration is manual glue code. |
| `vite@5.x` | Node.js `18.x` / `20.x` | Node 18 is minimum. Node 20 LTS recommended. |

**CONFIDENCE NOTE:** Phaser version `3.87.x` is based on the latest stable I can confirm from training data (through August 2025). Verify the actual latest at https://github.com/phaserjs/phaser/releases before pinning. Phaser moves to patch releases frequently.

---

## FB Instant Games — Key Technical Constraints

These constraints shape architecture decisions and must be understood before starting:

1. **Initial payload limit**: The resources loaded before `FBInstant.startGameAsync()` must be minimal. Target under 200KB compressed for the bootstrap bundle. Phaser's core is ~1MB uncompressed (~300KB gzipped) — this is acceptable as long as game assets are lazy-loaded after `startGameAsync()`.

2. **No external CDN for game assets**: Assets (images, audio) must be bundled or served from the same origin. You cannot load sprites from an external CDN in Phaser's asset loader within FB context.

3. **HTTPS required**: FB Instant Games context enforces HTTPS. Local dev needs `vite-plugin-mkcert` or equivalent.

4. **Canvas-only rendering**: FB Instant Games runs in a WebView. WebGL is supported on modern devices. Phaser's automatic Canvas fallback handles older devices cleanly.

5. **Async init before any rendering**: The game must not render a single frame before `FBInstant.initializeAsync()` resolves. Structure: `FBInstant.initializeAsync() → load assets → FBInstant.startGameAsync() → begin game loop`.

---

## Sources

- Training knowledge of Phaser 3 ecosystem through August 2025 — MEDIUM confidence
- Training knowledge of Facebook Instant Games SDK v7.1 constraints — MEDIUM confidence (verify SDK version at https://developers.facebook.com/docs/games/instant-games/guides/sdk-reference)
- Phaser 3 official releases reference: https://github.com/phaserjs/phaser/releases — NOT fetched (tool denied), verify manually
- Vite + Phaser 3 template patterns: https://github.com/phaserjs/template-vite-ts — NOT fetched, verify manually
- FB Instant Games bundle size guidelines: https://developers.facebook.com/docs/games/instant-games/ — NOT fetched, verify manually

**Overall confidence note:** All external verification tools (WebSearch, WebFetch, Bash, Context7) were denied during this research session. All version numbers and API details are from training data (cutoff August 2025). Before implementation, manually verify:
- Phaser latest stable version
- FB Instant Games SDK current version (7.1 was correct as of mid-2025)
- FB bundle size limits (the 200KB figure was the documented limit as of my knowledge cutoff)

---

*Stack research for: HTML5 casual tapping game (Bloom Tap) — mobile web + Facebook Instant Games*
*Researched: 2026-03-13*
