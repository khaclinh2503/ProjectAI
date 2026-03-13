# Phase 1: Project Foundation - Research

**Researched:** 2026-03-14
**Domain:** Phaser 3 + TypeScript + Vite scaffold; mobile canvas scaling; touch input; scene wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canvas Sizing:**
- Orientation: Portrait-only — do not handle landscape
- Logical width: 390px (baseline iPhone 14)
- Logical height: Dynamic — computed from `window.innerHeight` minus safe area
- Safe area: CSS `env(safe-area-inset-*)` padding on container div
- Phaser scale mode: `Scale.FIT` with parent div occupying viewport minus safe area
- DPR: set `resolution: window.devicePixelRatio` in Phaser game config — mandatory, never omit
- Canvas CSS: `touch-action: none` — mandatory

**BootScene Behavior:**
- Splash type: Game name ("Bloom Tap") + text "Tap to Start" — text only, no graphics
- Asset loader: None in Phase 1 (no heavy assets)
- Scene transition: Camera fade out BootScene (300ms) → start GameScene → camera fade in (300ms)
- Audio unlock: Tap on "Tap to Start" is the user gesture; `AudioContext.resume()` / Phaser audio unlock happens here
- No loading bar in Phase 1

**Scene Structure:**
- BootScene: splash + audio unlock + transition to GameScene
- GameScene (Phase 1): empty placeholder scene only

**Touch Input:**
- Use `pointerdown` exclusively — never `touchend`, `touchstart`, or `click`
- Use `scene.input.on('pointerdown', ...)` via Phaser InputPlugin

**Tech stack:** Phaser 3 + TypeScript + Vite — locked

### Claude's Discretion

None specified for Phase 1 — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Visual style / animation of BootScene (deferred to Phase 5 Juice)
- Exact grid cell size (computed in Phase 3 from actual logical height)
- GameScene layout (grid vs HUD positioning — Phase 3)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Project runs in browser with Phaser 3 + TypeScript + Vite | Official template phaserjs/template-vite-ts provides the exact scaffold; npm install + npm run dev yields working Phaser canvas |
| FOUND-02 | Game canvas scales correctly on mobile (DPR scaling, viewport lock) | `resolution: window.devicePixelRatio` in Phaser config; `Scale.FIT` with parent div; `100dvh` + `env(safe-area-inset-*)` CSS; portrait-lock via meta tag |
| FOUND-03 | Touch input correct (no page scroll, pointerdown events, touch-action: none) | `touch-action: none` on canvas/container prevents scroll; Phaser InputPlugin `pointerdown` avoids passive-listener warnings; no `touchstart`/`click` |
</phase_requirements>

---

## Summary

Phase 1 creates the entire project from a blank repository. There is no existing code — the phase produces the Vite + TypeScript + Phaser 3 project scaffold, configures it for mobile-first portrait play, and wires two scenes (BootScene and a placeholder GameScene).

The official Phaser team publishes `phaserjs/template-vite-ts` which pins Phaser 3.90.0 (the final Phaser v3 release, May 2025), Vite 6.x, and TypeScript 5.7. This template is the correct starting point; the planner should use it as the structural reference rather than generating a custom scaffold.

The three locked decisions that most affect Phase 1 implementation detail are: (1) `resolution: window.devicePixelRatio` must be set in the Phaser game config at creation time — retrofitting it later requires coordinate system recalculation across all scenes; (2) `touch-action: none` must be on the canvas element (or its container) before the first touch event — omitting it causes the viewport to scroll on tap on both iOS Safari and Chrome Android; (3) the BootScene "Tap to Start" tap is the **only** user gesture before the game loop begins, making it the mandatory AudioContext unlock point for iOS Safari compatibility.

**Primary recommendation:** Scaffold from `phaserjs/template-vite-ts`, delete the example scenes, configure Phaser with the locked mobile parameters, then add BootScene and placeholder GameScene.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| phaser | ^3.90.0 | 2D game framework, scene system, input, scaling | Official final Phaser v3 release (May 2025); official TS types bundled; community standard for HTML5 casual games |
| typescript | ~5.7.2 | Type safety, IDE support | Bundled in official Phaser template; Phaser ships its own `.d.ts` |
| vite | ^6.3.1 | Dev server with HMR, production bundler | Official Phaser template uses Vite 6; fastest dev loop for Phaser |
| terser | ^5.39.0 | JS minification for production build | Included in official template for `npm run build` |

### Supporting (Phase 1 — no additional libraries needed)

Phase 1 is intentionally minimal: text-only BootScene, no asset loading, no audio playback yet. No additional libraries required.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Scale.FIT` | `Scale.RESIZE` | RESIZE gives full flex canvas but requires manual coordinate recalculation in all scenes; FIT with fixed logical size is simpler |
| `resolution: window.devicePixelRatio` | Multiply width/height by DPR and invert zoom | Both work; `resolution` property is the Phaser-native way on v3 |
| camera fade via `cameras.main.fadeOut()` | Phaser.Tweens on alpha | Camera fade is built-in, zero boilerplate, fires a completion event |

**Installation:**
```bash
npm create vite@latest bloom-tap -- --template vanilla-ts
# OR clone directly:
npx degit phaserjs/template-vite-ts bloom-tap
cd bloom-tap
npm install
```

Then add Phaser if not already present:
```bash
npm install phaser@^3.90.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
bloom-tap/
├── index.html              # viewport meta, container div, entry script
├── public/
│   └── assets/             # sprites, audio (empty in Phase 1)
├── src/
│   ├── main.ts             # createGame() — constructs Phaser.Game instance
│   ├── game/
│   │   ├── config.ts       # Phaser GameConfig object (width, scale, scenes, etc.)
│   │   └── scenes/
│   │       ├── BootScene.ts
│   │       └── GameScene.ts
├── vite/
│   ├── config.dev.mjs      # dev server config (port 8080, hot reload)
│   └── config.prod.mjs     # production build config
├── tsconfig.json
└── package.json
```

### Pattern 1: Mobile-First Phaser Config

**What:** Set `width`, `scale.mode`, `resolution`, `parent` correctly at game creation — cannot be changed without scene restarts.

**When to use:** Always; this is the singular Phaser game config.

```typescript
// src/game/config.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  // height is NOT fixed — computed from container at runtime
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  resolution: window.devicePixelRatio,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};
```

```typescript
// src/main.ts
import Phaser from 'phaser';
import { config } from './game/config';

const container = document.getElementById('game-container')!;
// Height is determined by the container, not hard-coded in Phaser config.
// Container height is set via CSS (100dvh minus safe-area insets).
new Phaser.Game(config);
```

### Pattern 2: Container CSS for Mobile Viewport

**What:** A `#game-container` div that fills the safe-area-aware viewport; Phaser's ScaleManager targets this div.

**When to use:** Always for mobile-first portrait games.

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #000;
    overflow: hidden;
  }
  #game-container {
    width: 100%;
    height: 100dvh;
    /* Push content inside safe area on notched devices */
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    /* Prevent any touch from scrolling the page */
    touch-action: none;
  }
  canvas {
    touch-action: none;
    display: block;
  }
</style>
```

Note: `viewport-fit=cover` is required for `env(safe-area-inset-*)` to have non-zero values on iPhones.

### Pattern 3: BootScene with Fade Transition and Audio Unlock

**What:** Text-only splash, tap-to-start, camera fade out/in, AudioContext unlock on tap.

**When to use:** This is the locked BootScene specification from CONTEXT.md.

```typescript
// src/game/scenes/BootScene.ts
// Source: Phaser docs + ourcade.co fade transition pattern
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.4, 'Bloom Tap', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const tapText = this.add.text(width / 2, height * 0.6, 'Tap to Start', {
      fontSize: '24px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Single tap handler — also serves as the user gesture for AudioContext unlock
    this.input.once('pointerdown', () => {
      // Unlock audio context (iOS Safari requires this before any sound can play)
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }

      this.cameras.main.fadeOut(300, 0, 0, 0);
    });

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start('GameScene');
      }
    );
  }
}
```

```typescript
// src/game/scenes/GameScene.ts
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Phase 1: empty placeholder
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Confirm scene is active — remove in Phase 3
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'GameScene placeholder',
      { fontSize: '18px', color: '#888888' }
    ).setOrigin(0.5);
  }
}
```

### Anti-Patterns to Avoid

- **Hardcoding height in Phaser config:** `height: 844` ignores safe area and real device height. Use the container-driven approach above.
- **Setting `resolution` after game creation:** The canvas dimensions are calculated once; late DPR setting requires full game restart or manual canvas resize.
- **Using `touchstart` / `touchend` / `click` instead of `pointerdown`:** Adds 100–300ms latency on mobile; breaks the timing model used in Phase 2+ game logic.
- **Missing `viewport-fit=cover` meta tag:** Without it, `env(safe-area-inset-top/bottom)` returns `0` on all devices, defeating safe-area handling.
- **Adding passive touch listeners outside Phaser:** If any other `addEventListener('touchstart', fn)` call exists without `{ passive: false }`, browsers may warn; Phaser's internal listeners handle this correctly when `touch-action: none` is set on the canvas.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scene lifecycle | Manual state machine with flags | Phaser Scene system (`scene.start`, `scene.pause`, `scene.stop`) | Handles init/preload/create/update/shutdown lifecycle; memory cleanup on scene stop |
| Canvas DPR scaling | Manual `canvas.width *= dpr` | `resolution: window.devicePixelRatio` in Phaser config | Phaser also scales its coordinate system; manual DPR misses internal pointer offset math |
| Touch-to-canvas coordinate mapping | Manual `getBoundingClientRect()` subtraction | Phaser InputPlugin pointer events | Phaser accounts for CSS scaling (FIT mode compresses canvas) in its coordinate transform |
| Camera transition animation | Tween on scene alpha | `this.cameras.main.fadeOut/fadeIn()` | Built-in; fires `FADE_OUT_COMPLETE` event; zero extra code |
| Audio context unlock | Custom `document.addEventListener('click', ...)` | Phaser's built-in `this.sound.unlock()` or `this.sound.context.resume()` inside pointer handler | Phaser tracks context state; manual listener can fire before Phaser is ready |

**Key insight:** In Phaser 3, the coordinate, scaling, and input systems are deeply coupled. Bypassing any one of them with custom DOM code causes coordinate mismatches, especially under `Scale.FIT` where the canvas is CSS-scaled down from its physical pixel size.

---

## Common Pitfalls

### Pitfall 1: DPR Not Set — Blurry Canvas on Retina Devices

**What goes wrong:** On any iPhone (all have DPR ≥ 2) or modern Android, the canvas renders at 1x and is CSS-upscaled, producing visibly blurry text and graphics.
**Why it happens:** Phaser defaults `resolution` to `1` if not specified.
**How to avoid:** Set `resolution: window.devicePixelRatio` in the top-level `GameConfig` object when calling `new Phaser.Game(config)`.
**Warning signs:** Game looks slightly soft/blurry on device but sharp in desktop browser DevTools at 1x zoom.

### Pitfall 2: Missing `touch-action: none` — Viewport Scrolls on Tap

**What goes wrong:** Tapping the game canvas scrolls the page on iOS Safari and Chrome Android. No `pointerdown` event fires in Phaser because the browser consumes the touch as a scroll gesture.
**Why it happens:** Browsers default to treating touch events as potential scroll gestures. Without `touch-action: none`, the browser intercepts before Phaser sees the event.
**How to avoid:** Apply `touch-action: none` to both `#game-container` and `canvas` in CSS.
**Warning signs:** Chrome DevTools shows "Added non-passive event listener" console warning; page visibly scrolls instead of firing game events.

### Pitfall 3: Missing `viewport-fit=cover` — Safe Area Returns Zero

**What goes wrong:** Notch area and home indicator overlap game HUD and action areas on iPhone X/11/12/13/14/15.
**Why it happens:** `env(safe-area-inset-*)` only returns non-zero values when the viewport meta includes `viewport-fit=cover`.
**How to avoid:** Use `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` in `index.html`.
**Warning signs:** Safe area padding appears to be applied in code but has no visual effect on notched devices.

### Pitfall 4: Hardcoded Canvas Height

**What goes wrong:** On devices shorter than the hardcoded value (e.g., iPhone SE at 667px logical height), the canvas is cropped or overflows; on taller devices, there are black bars. Cannot be adjusted per-device without a full game restart.
**Why it happens:** Setting `height: 844` in Phaser config locks the logical height.
**How to avoid:** Omit `height` from Phaser config; let the `#game-container` CSS (`100dvh` minus safe-area padding) define available height; Phaser's `Scale.FIT` fits within that container.
**Warning signs:** Game appears correct on one device but clipped or letterboxed on others.

### Pitfall 5: AudioContext Not Unlocked Before Phase 5 Sound Effects

**What goes wrong:** Phase 5 adds sound effects that are silent on iOS Safari. Tracing the bug back to Phase 1 reveals no user gesture unlocked the AudioContext.
**Why it happens:** iOS Safari requires a user gesture (tap/click) to resume an `AudioContext`. If BootScene passes through to GameScene without a user tap, the context stays suspended.
**How to avoid:** The "Tap to Start" interaction in BootScene must call `this.sound.context.resume()` (or check `this.sound.unlock()`). This is already specified in CONTEXT.md and must not be skipped even in a "just make it work" Phase 1.
**Warning signs:** No sound on iOS Safari; `this.sound.context.state` returns `'suspended'` at game start.

### Pitfall 6: Scene List Not Registered at Phaser.Game Construction

**What goes wrong:** `this.scene.start('GameScene')` throws "Scene not found" at runtime.
**Why it happens:** Scenes must be registered in the `scene: []` array of the initial Phaser game config. They cannot be added after `new Phaser.Game()` is called without explicit `this.scene.add()`.
**How to avoid:** Always pass all scenes (even placeholders) in the initial `config.scene` array.

---

## Code Examples

### Verified Phaser GameConfig Structure (from official template)

```typescript
// Source: phaserjs/template-vite-ts (Phaser 3.90.0)
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  parent: 'game-container',
  resolution: window.devicePixelRatio,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};

export default new Phaser.Game(config);
```

### Camera Fade Transition Between Scenes

```typescript
// Source: Phaser docs — Cameras.Scene2D.Events.FADE_OUT_COMPLETE
// In BootScene.create():
this.cameras.main.fadeOut(300, 0, 0, 0);   // 300ms, fade to black

this.cameras.main.once(
  Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
  () => {
    this.scene.start('GameScene');
  }
);

// In GameScene.create():
this.cameras.main.fadeIn(300, 0, 0, 0);    // 300ms, fade from black
```

### Vitest Config (for testing pure game logic in later phases)

```typescript
// vite.config.ts addition (for Vitest — needed from Phase 2 onward)
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',  // pure logic; no DOM needed for FSM/grid tests
  },
});
```

```bash
npm install vitest --save-dev
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.innerHeight` as Phaser height | Omit height; use `Scale.FIT` with CSS-sized container | Phaser 3.16+ (Scale Manager) | Eliminates viewport height mismatch bugs |
| `100vh` for full-screen canvas | `100dvh` | 2022 (browsers) | `dvh` tracks actual visible viewport as browser chrome shows/hides |
| Manual DPR: multiply width/height, invert zoom | `resolution: window.devicePixelRatio` | Phaser 3 (original) | Phaser handles DPR in its rendering pipeline natively |
| Webpack | Vite | 2022–2023 | 10–100x faster dev server HMR; no config for TypeScript |
| Phaser CE (community edition) | Phaser 3.90.0 | 2018 | Phaser CE deprecated; v3 is the maintained line |

**Deprecated/outdated:**
- `Phaser.Scale.NONE` with manual resize handlers: replaced by ScaleManager modes
- `game.canvas.style.width/height` manipulation: handled by Scale.FIT automatically
- Phaser v2 / Phaser CE: archived, not maintained

---

## Open Questions

1. **Exact height value passed to Phaser**
   - What we know: CONTEXT.md says "Dynamic — computed from `window.innerHeight` minus safe area"; `Scale.FIT` with a CSS-sized parent div handles this without passing `height` to Phaser config explicitly
   - What's unclear: Whether Phaser reads the parent container height at init or whether a JS-computed height should be passed
   - Recommendation: Use CSS-only approach (`100dvh` + safe-area padding on container), omit `height` from Phaser config, let `Scale.FIT` use the container dimensions. If rendering issues appear, fall back to JS-computed height: `document.getElementById('game-container').clientHeight`.

2. **Vitest setup timing**
   - What we know: Phase 1 has no pure logic to test; Vitest is not needed until Phase 2 (FlowerFSM, Grid)
   - What's unclear: Whether planner should add `vitest` devDependency in Phase 1 (Wave 0 prep) or Phase 2
   - Recommendation: Install Vitest in Phase 1 so Phase 2 can write tests immediately without environment setup overhead. Add `vitest --save-dev` and a `vitest.config.ts` stub in Phase 1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (to be installed in Phase 1) |
| Config file | `vitest.config.ts` — Wave 0 creates this |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Project starts with `npm run dev` and displays Phaser canvas, no console errors | smoke (manual browser check) | `npm run build` (build must succeed without TypeScript errors) | ❌ Wave 0 |
| FOUND-02 | Canvas fills viewport without blur on high-DPI devices | manual (requires device/DevTools) | `npm run build` (TypeScript type check covers config correctness) | ❌ Wave 0 |
| FOUND-03 | Touch fires `pointerdown` without scroll, no passive-listener warnings | manual (requires mobile device/DevTools emulation) | `npm run build` (structural verification) | ❌ Wave 0 |

Note: FOUND-01, FOUND-02, FOUND-03 are environment/browser-behaviour requirements that cannot be meaningfully validated by unit tests. The automated gate for Phase 1 is: TypeScript compilation succeeds (`npm run build` exits 0). Manual browser+device verification covers the rest.

### Sampling Rate

- **Per task commit:** `npm run build` (TypeScript type-check + Vite bundle)
- **Per wave merge:** `npm run build` + manual browser smoke test
- **Phase gate:** `npm run build` exits 0 AND manual checklist complete before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — stub for Phase 2 test infrastructure
- [ ] `package.json` with `"test": "vitest run"` script
- [ ] No unit test files needed in Phase 1 (no pure logic to test yet)

---

## Sources

### Primary (HIGH confidence)

- `phaserjs/template-vite-ts` GitHub repo — pinned versions: Phaser 3.90.0, Vite 6.3.1, TypeScript 5.7.2; project structure reference
- https://docs.phaser.io/phaser/concepts/scale-manager — Scale.FIT configuration, parent div, autoCenter
- https://docs.phaser.io/phaser/concepts/audio — AudioContext unlock, `sound.unlock()`, iOS Safari handling

### Secondary (MEDIUM confidence)

- https://blog.ourcade.co/posts/2020/phaser-3-fade-out-scene-transition/ — Camera fade transition TypeScript pattern (verified against Phaser event API)
- https://davidmorais.com/blog/testing-phaser-games-with-vitest — Vitest + Phaser setup (verified Vitest integrates via Vite config)
- https://phaser.io/news/2025/05/phaser-v390-released — v3.90.0 "Tsugumi" is the final Phaser v3 release
- MDN `env()` CSS function — `env(safe-area-inset-*)` requires `viewport-fit=cover`

### Tertiary (LOW confidence)

- Community forum posts on DPR/resolution config — superseded by official Scale Manager docs above

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official template confirms all versions (Phaser 3.90.0, Vite 6.3.1, TS 5.7.2)
- Architecture: HIGH — scale mode, DPR, touch-action all verified via official Phaser docs and known browser behavior
- Pitfalls: HIGH — DPR, touch-action, safe-area, AudioContext are documented bugs/pitfalls explicitly called out in STATE.md and verified independently
- Vitest setup: MEDIUM — pattern verified via community post; Vitest/Vite integration is well-established

**Research date:** 2026-03-14
**Valid until:** 2026-09-14 (Phaser 3 is now in maintenance mode — stable; Vite version may advance but breaking changes unlikely)
