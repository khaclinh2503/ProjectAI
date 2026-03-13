# Phase 1: Project Foundation - Research

**Researched:** 2026-03-14
**Domain:** Cocos Creator 3.8.x project setup, mobile canvas scaling, touch input for web mobile export
**Confidence:** MEDIUM-HIGH (Cocos Creator 3.8 official docs verified via WebFetch; some platform-specific CSS behavior inferred from community sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Screen Orientation and Design Resolution**
- Orientation: Portrait — phone held vertically, natural thumb reach for 8x8 grid
- Design resolution: 720 x 1280
- Fit mode: FIXED_WIDTH — keep width at 720px, scale height per screen; fits 16:9, 19.5:9, 20:9 ratios
- DPR scaling: Cocos Creator 3.8.x handles automatically via `cc.view.enableRetina(true)` — no manual intervention needed

**BootScene Behavior**
- BootScene does one thing: call `director.loadScene("GameScene")` immediately
- Screen is dark during Cocos load — no handling needed in v1
- No asset preload in BootScene (no art yet; add in Phase 5)
- GameScene in Phase 1 is placeholder — one Label "Bloom Tap" to confirm scene transition works

**Cocos Creator Version**
- Use exactly 3.8.8 — no upgrade, no downgrade
- TypeScript strict mode on from the start (`"strict": true` in tsconfig)
- Target web build (HTML5) for v1 — export via `Build & Publish → Web Mobile`

**Touch Input**
- Use `pointerdown` (not `touchend` or `click`) — avoids 100-300ms mobile latency
- Canvas needs `touch-action: none` in CSS web export to disable scroll
- Cocos Creator 3.8.x uses `EventTouch` / `Node.on(Node.EventType.TOUCH_START)` — maps to pointerdown behavior

**Minimal Scene Structure (Phase 1)**
- Only enough to pass success criteria — no game logic in this phase
- `BootScene`: on load → transition to GameScene immediately
- `GameScene`: placeholder — Label "Bloom Tap" + dark background

### Claude's Discretion

None specified — all Phase 1 decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

| Decision | Notes |
|----------|-------|
| Audio unlock ("Tap to Start" splash) | Needed for iOS Safari — defer to Phase 4/5 when sound exists |
| Asset preloading strategy | No art yet — decide in Phase 5 |
| GameScene background color | No visual style yet — use neutral dark (#1a1a2e or similar) |
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Project runs in browser with Cocos Creator + TypeScript | Cocos Creator 3.8 TypeScript template; `@ccclass` / `Component` pattern; `director.loadScene` API |
| FOUND-02 | Game canvas scales correctly on mobile (DPR scaling, viewport lock) | Cocos Web Mobile build fills viewport by default; Retina ON by default in web builds; design resolution set in Project Settings; fit mode via canvas config |
| FOUND-03 | Touch input correct (no page scroll, pointerdown events, touch-action: none) | `Node.EventType.TOUCH_START` maps to pointerdown; `touch-action: none` must be injected via build template or game init script |
</phase_requirements>

---

## Summary

Phase 1 establishes the Cocos Creator 3.8.8 project so the canvas boots in a browser, fills the mobile viewport without blur on high-DPI screens, and registers touch without page scroll. No game logic is written in this phase — only the shell that future phases build on.

The stack decision is already locked: Cocos Creator 3.8.8 with TypeScript. The engine handles DPR scaling natively for web builds (Retina is ON by default). Design resolution (720x1280 portrait, FIXED_WIDTH) is set via Project Settings. Scene management uses `director.loadScene("GameScene")` called from `onLoad()` in a BootScene component. Touch input uses `Node.EventType.TOUCH_START` (which Cocos maps to pointerdown, not touchend), but `touch-action: none` on the canvas element must be verified manually in the generated web export — Cocos does not guarantee it by default and it is the key guard against mobile page scroll.

The project is a clean slate (no files exist yet). Phase 1 creates the Cocos project via the editor UI (HelloWorld TypeScript template), configures design resolution, creates two scenes, and verifies the three success criteria on a physical device or DevTools emulation.

**Primary recommendation:** Create the project in the Cocos Creator 3.8.8 editor using the 2D HelloWorld TypeScript template. Configure design resolution to 720x1280 with Fit Width enabled in Project Settings. Create BootScene and GameScene. Verify touch-action:none is present in the web export HTML by inspecting the built index.html, and add it via a custom build template if absent.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.8 (installed) | Game engine — scene management, rendering, input, TypeScript compilation | Already decided; v3.8 is LTS; handles mobile web export with canvas scaling and Retina natively |
| TypeScript | 4.1.0 (bundled with CC 3.8) | Type safety | CC 3.8 bundles TS 4.1; `isolatedModules` is forcibly enabled; `strict` mode can be added in tsconfig |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Cocos Creator Web Mobile export template | Built-in | Generates index.html with canvas viewport fill | Use for all v1 web builds; fills browser window by default |
| Custom build template (`build-templates/web-mobile/`) | N/A — project folder | Patch generated index.html to add touch-action:none if not present | Use if Cocos-generated HTML does not include `touch-action: none` on canvas |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FIXED_WIDTH fit mode | SHOW_ALL | SHOW_ALL adds black bars on non-16:9 screens — wrong for a fullscreen mobile game |
| FIXED_WIDTH fit mode | FIXED_HEIGHT | FIXED_HEIGHT crops width on phones wider than 9:16 — wrong for portrait where width is the constraint |

### Installation

Cocos Creator 3.8.8 creates projects through the editor dashboard — there is no npm install step. After project creation:

```bash
# No CLI creation — use Cocos Creator 3.8.8 Dashboard:
# New Project → 2D → Hello World (TypeScript template)
# Name: bloom-tap (or project name)
```

The generated project includes `package.json`, `assets/`, `settings/`, `tsconfig.json` (extending `./tmp/tsconfig.cocos.json`), and `build-templates/` if customized.

---

## Architecture Patterns

### Recommended Project Structure

```
assets/
├── scenes/
│   ├── BootScene.scene         # Cocos scene file
│   └── GameScene.scene         # Cocos scene file
├── scripts/
│   ├── BootController.ts       # Component attached to BootScene root node
│   └── GameController.ts       # Component attached to GameScene root node (placeholder)
└── resources/                  # (empty in Phase 1 — no art yet)

settings/
└── v2/
    └── packages/
        └── project.json        # Design resolution, fit mode, orientation set here

build-templates/
└── web-mobile/
    └── index.html              # Custom HTML template (only if touch-action:none needs patching)
```

### Pattern 1: BootScene Immediate Transition

**What:** BootScene loads, runs `onLoad()`, immediately calls `director.loadScene("GameScene")`. No delay, no preload, no splash.

**When to use:** Phase 1 only. Future phases will add asset preload before the transition.

**Example:**
```typescript
// Source: https://docs.cocos.com/creator/3.8/manual/en/scripting/scene-managing.html
import { _decorator, Component } from 'cc';
import { director } from 'cc';
const { ccclass } = _decorator;

@ccclass('BootController')
export class BootController extends Component {
    onLoad() {
        director.loadScene('GameScene');
    }
}
```

**Scene must be in build list:** Both `BootScene` and `GameScene` must be added to the scene list in `Build & Publish` settings, or added to `Project Settings → Build → Scenes` so they are included in the web build.

### Pattern 2: Cocos Creator Component Lifecycle

**What:** Components extend `Component` and use `onLoad` (before scene starts) or `start` (before first frame). `onLoad` is the correct hook for scene transitions because it fires as soon as the component is ready, before any rendering occurs.

**When to use:** `onLoad` — initialization that must happen before the scene renders. `start` — initialization that may depend on other components being initialized first.

**Example:**
```typescript
// Source: Cocos Creator 3.8 docs - Components and Execution Order
import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    onLoad() {
        if (this.titleLabel) {
            this.titleLabel.string = 'Bloom Tap';
        }
    }
}
```

### Pattern 3: Design Resolution Configuration (Project Settings)

**What:** Design resolution in Cocos Creator 3.8 is set once at the project level in `Project → Project Settings → General → Default canvas setting`. All Canvas components in all scenes inherit this.

**When to use:** Set once at project creation, before creating any scenes.

**Settings to configure:**
- Design Resolution Width: `720`
- Design Resolution Height: `1280`
- Fit Width: `enabled` (this is FIXED_WIDTH behavior — scales by width ratio)
- Fit Height: `disabled`
- Orientation: `Portrait`

**What Fit Width does:** The engine scales all content so that the design width (720) maps exactly to the device screen width. Height may be cropped on shorter screens or show empty space on taller screens. For a portrait mobile game with an 8x8 grid centered in the screen, this is the correct mode — the grid width is always exactly predictable.

### Pattern 4: Touch-Action CSS Injection

**What:** The Cocos Creator Web Mobile build generates an `index.html`. If the generated canvas element does not have `touch-action: none`, mobile browsers intercept touch events for scrolling before Cocos can handle them.

**How to verify:** After building with `Build & Publish → Web Mobile`, inspect `build/web-mobile/index.html` and search for `touch-action` in the canvas or body CSS.

**If absent — add via build template:**
```
assets/../build-templates/web-mobile/index.html
```
Or create a `build-templates/web-mobile/` folder at the project root and add a custom `index.html` extending the default template. The alternative (for Phase 1 verification only) is to add it programmatically at game init:

```typescript
// In BootController.onLoad() — temporary verification method
// Source: Web standard CSS, verified by PITFALLS.md pattern
const canvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
if (canvas) {
    canvas.style.setProperty('touch-action', 'none');
    canvas.style.setProperty('user-select', 'none');
}
```

Note: The canvas element ID in Cocos Creator web exports is `GameCanvas` by default.

**Permanent solution:** Add to `build-templates/web-mobile/index.html` in a `<style>` block:
```css
#GameCanvas {
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
}

html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
}
```

### Anti-Patterns to Avoid

- **Loading scenes in `start()` instead of `onLoad()`:** `start()` runs before the first frame update but after all `onLoad()` calls complete — this is fine, but `onLoad()` is more predictable for scene transitions. Use `onLoad()` for BootScene.
- **Not adding GameScene to build scene list:** Cocos will fail silently or throw a runtime error if `director.loadScene("GameScene")` is called but GameScene is not in the build config. Both scenes must be explicitly listed.
- **Setting design resolution per-Canvas instead of in Project Settings:** Cocos 3.8 requires design resolution to be set in Project Settings, not per-Canvas node. The Canvas component in 3.8 does not expose resolution directly.
- **Using `touchend` events instead of `TOUCH_START`:** In Cocos, `Node.EventType.TOUCH_START` maps to the correct pointerdown-equivalent behavior. Never use `TOUCH_END` for tap detection in a timing game.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Device pixel ratio scaling | Custom canvas DPR code | Cocos built-in Retina support | Cocos Web Mobile builds have Retina ON by default via `view.enableRetina(true)`; manual DPR canvas scaling will conflict with Cocos' renderer |
| Viewport fill for mobile | CSS hacks, window.innerHeight logic | Cocos Web Mobile export | Web Mobile build fills viewport automatically; no custom sizing code needed |
| Scene lifecycle (update loop, component attach) | Custom game loop | Cocos Component system (`onLoad`, `start`, `update`) | Cocos handles the rAF loop, component initialization order, and scene destruction |
| TypeScript compilation | Custom tsconfig target/module | Cocos' implied compiler options | CC 3.8 forcibly sets `target: ES2015`, `module: ES2015`, `isolatedModules: true`, `experimentalDecorators: true` — overriding these causes IDE/runtime mismatch |

**Key insight:** Cocos Creator 3.8 handles DPR, viewport fill, and the render loop natively for web mobile exports. Phase 1 configuration is almost entirely done through the editor UI (Project Settings), not code. The only code written is the BootController transition component and a placeholder GameController.

---

## Common Pitfalls

### Pitfall 1: GameScene Not In Build Scene List

**What goes wrong:** `director.loadScene("GameScene")` throws a runtime error or silently fails because the scene asset is not included in the build.

**Why it happens:** Cocos only bundles scenes that are explicitly listed in the scene build list. New scenes created in the editor are not automatically added.

**How to avoid:** After creating `GameScene.scene`, open `Build & Publish`, add both `BootScene` and `GameScene` to the Scene list. Also ensure both scenes exist in the `settings/v2/packages/project.json` scene list.

**Warning signs:** Console error "Scene 'GameScene' not found" or blank screen after BootScene loads.

### Pitfall 2: touch-action Not Set — Page Scrolls Instead of Tapping

**What goes wrong:** On mobile web, vertical swipes on the canvas cause the browser to scroll the page rather than register as game input. Cocos TOUCH_START events may not fire or fire unreliably.

**Why it happens:** Without `touch-action: none` on the canvas, the browser claims scroll behavior before touch events reach Cocos' input system. This is especially severe on Android Chrome where the browser intercepts vertical touch sequences.

**How to avoid:** Verify `touch-action: none` is on the `#GameCanvas` element after building. Add via build template or runtime CSS injection (see Pattern 4 above).

**Warning signs:** On DevTools mobile emulation, tapping the canvas triggers page scroll. Cocos touch events fire inconsistently or with delay.

### Pitfall 3: Design Resolution Set Per-Canvas Instead of Project Settings

**What goes wrong:** The Canvas node's size doesn't match the design resolution, leading to UI elements placed at wrong positions and scaling behaving unexpectedly.

**Why it happens:** In Cocos Creator 3.8, design resolution is controlled globally from `Project Settings → General → Default canvas setting`. The Canvas component in a scene does not expose resolution dimensions directly. Attempting to set it via node size or Canvas component properties has no effect on the actual resolution policy.

**How to avoid:** Set design resolution in Project Settings only. Verify the Canvas node's Width/Height read-only display shows 720x1280 after configuration.

**Warning signs:** Canvas node shows unexpected dimensions, or UI anchored to screen edges appears at wrong positions.

### Pitfall 4: tsconfig `target` or `module` Overridden

**What goes wrong:** TypeScript errors in IDE don't match runtime behavior, or runtime failures occur that the IDE didn't flag.

**Why it happens:** Cocos Creator 3.8 implies `target: ES2015` and `module: ES2015` internally — these are NOT read from `tsconfig.json`. If a developer adds them explicitly to tsconfig with different values (e.g., `ES5` for compatibility), the IDE will check against ES5 rules while CC compiles to ES2015, causing a mismatch.

**How to avoid:** In `tsconfig.json`, only add options that are safe to modify (`strict`, `noImplicitAny`, `skipLibCheck`). Do not set `target`, `module`, `isolatedModules`, or `experimentalDecorators`.

**Correct tsconfig.json for Phase 1:**
```json
{
    "extends": "./tmp/tsconfig.cocos.json",
    "compilerOptions": {
        "strict": true,
        "skipLibCheck": true
    }
}
```

**Warning signs:** IDE shows errors that don't appear at runtime, or code that passes IDE check fails in CC's compiler.

### Pitfall 5: BootScene Transitions Before Scene Is Fully Loaded

**What goes wrong:** A race condition where the BootScene's `onLoad` fires before Cocos has fully initialized, causing `director.loadScene` to fail silently.

**Why it happens:** Rare in practice, but can occur if BootScene's component has multiple `onLoad` methods or if `director.loadScene` is called in the constructor rather than `onLoad`.

**How to avoid:** Always call `director.loadScene` in the `onLoad()` lifecycle method, never in the component constructor or at module load time.

---

## Code Examples

Verified patterns from official sources:

### BootController — Minimal Scene Transition

```typescript
// Source: https://docs.cocos.com/creator/3.8/manual/en/scripting/scene-managing.html
import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('BootController')
export class BootController extends Component {
    onLoad(): void {
        director.loadScene('GameScene');
    }
}
```

### GameController — Placeholder with Label

```typescript
// Source: Cocos Creator 3.8 component pattern
import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    onLoad(): void {
        if (this.titleLabel) {
            this.titleLabel.string = 'Bloom Tap';
        }
    }
}
```

### Touch Input Registration (for future phases — document the correct pattern now)

```typescript
// Source: https://docs.cocos.com/creator/3.8/manual/en/engine/event/event-input.html
// CORRECT — TOUCH_START fires at contact (pointerdown equivalent)
import { _decorator, Component, Node, EventTouch } from 'cc';
const { ccclass } = _decorator;

@ccclass('InputReceiver')
export class InputReceiver extends Component {
    onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    private onTouchStart(event: EventTouch): void {
        const location = event.getUILocation();
        // location.x, location.y are in UI/design-space coordinates
    }
}
```

### CSS for touch-action (build template addition)

```html
<!-- build-templates/web-mobile/index.html <style> block -->
<style>
    html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        height: 100%;
        background: #000;
    }
    #GameCanvas {
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
        display: block;
    }
</style>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phaser 3 + Vite (prior research) | Cocos Creator 3.8.8 | Stack switch commit 0ae857d (2026-03-13) | All prior STACK.md, PITFALLS.md, ARCHITECTURE.md research is for the old stack — do not use for Cocos |
| Manual DPR canvas scaling | Cocos built-in `view.enableRetina(true)` | Cocos 3.x throughout | No custom DPR code needed for web builds |
| `touchstart` + `preventDefault()` on raw DOM | `Node.EventType.TOUCH_START` on Cocos node | Cocos 3.x throughout | Cocos abstracts raw DOM touch handling |
| `cc.view.setDesignResolutionSize()` in code | Project Settings UI | Cocos 3.x | Design resolution is a project-level config, not a runtime call for new projects |

**Deprecated/outdated from prior research:**
- STACK.md, PITFALLS.md, ARCHITECTURE.md in `.planning/research/` — written for Phaser 3 + Vite; Cocos Creator has replaced this stack. Do not reference for implementation details.
- `ResolutionPolicy.FIXED_WIDTH` as a code-level enum — in Cocos 3.8, fit mode is set via Project Settings UI checkboxes (Fit Width / Fit Height), not via `cc.view.setResolutionPolicy()` calls in new projects. The API exists but the editor-driven approach is standard.

---

## Open Questions

1. **Does Cocos Creator 3.8 Web Mobile build include `touch-action: none` by default?**
   - What we know: The build fills viewport. Cocos intercepts touch internally. Community sources (pre-3.x era) suggest it may not set this CSS property.
   - What's unclear: Whether Cocos 3.8 now sets this automatically in the generated HTML, or whether the application-level touch interception is sufficient without explicit CSS.
   - Recommendation: After first build, open `build/web-mobile/index.html` in a text editor and grep for `touch-action`. If absent, add via build template. This is a 10-minute verification task in Wave 1 of the plan.

2. **Boot scene as initial scene in build settings**
   - What we know: Cocos builds require a scene list. The first scene in the list is typically the initial scene.
   - What's unclear: Whether `BootScene` needs to be the first entry, or whether `project.json` has a separate "start scene" field.
   - Recommendation: Set BootScene as the first/only entry in the initial scene list in Build settings. Add GameScene to the included scenes list so it can be loaded at runtime.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Cocos Creator 3.8 TypeScript projects have no built-in test runner; browser preview is the validation mechanism for Phase 1 |
| Config file | None — see Wave 0 |
| Quick run command | `Open browser preview in Cocos Creator editor (Ctrl+P)` |
| Full suite command | `Build & Publish → Web Mobile → open build/web-mobile/index.html in mobile-emulated browser` |

**Note on automated testing:** Phase 1 requirements (FOUND-01, FOUND-02, FOUND-03) are infrastructure/integration requirements that cannot be meaningfully unit-tested with a headless test runner. They require visual and browser-based verification. Automated testing infrastructure (Jest, Vitest, or Cocos test adapter) is not standard for Cocos Creator and would require significant custom setup. The validation for this phase is manual + DevTools emulation + physical device.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Project opens in Cocos Creator, previews in browser with no console errors | smoke | Manual: CC editor preview → check console | ❌ Wave 0 |
| FOUND-02 | Canvas fills viewport without blur on high-DPI screens (DPR scaling) | manual | Manual: open on Retina display or DevTools device emulation at DPR 2 | ❌ Wave 0 |
| FOUND-03 | Touch on canvas does not scroll page; touch events fire correctly | manual | Manual: DevTools mobile emulation → touch-drag on canvas | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Open editor preview, check browser console is clean, verify canvas visible.
- **Per wave merge:** Full Web Mobile build, open in DevTools with mobile device emulation (iPhone 12 Pro, 390px viewport, DPR 3), verify all three success criteria.
- **Phase gate:** All three success criteria manually verified on physical device or DevTools emulation before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] No test files exist — Phase 1 validation is browser-based, not file-based
- [ ] No test framework installed — Cocos Creator projects do not have a test runner by default; Phase 1 does not require one
- [ ] Verification checklist should be created as part of Phase 1 plan to guide manual testing

*(Wave 0 for this phase: create the Cocos project itself via the editor. No test infrastructure to add — validation is manual per above.)*

---

## Sources

### Primary (HIGH confidence)
- `https://docs.cocos.com/creator/3.8/manual/en/scripting/scene-managing.html` — `director.loadScene` API, scene switching patterns
- `https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/engine/multi-resolution.html` — Fit Width / Fit Height adaptation modes, design resolution
- `https://docs.cocos.com/creator/3.8/manual/en/scripting/tsconfig.html` — tsconfig.json configuration, implied options, what can be modified
- `https://docs.cocos.com/creator/3.8/manual/en/scripting/language-support.html` — TypeScript 4.1.0, isolatedModules, forced options
- `https://docs.cocos.com/creator/3.8/manual/en/scripting/component.html` — Component lifecycle, onLoad vs start, executionOrder
- `https://docs.cocos.com/creator/3.8/manual/en/engine/event/event-input.html` — TOUCH_START, EventTouch, input.on vs node.on
- `https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-web.html` — Web Mobile build, viewport fill, Retina default ON
- `https://docs.cocos.com/creator/3.8/manual/en/editor/publish/custom-project-build-template.html` — build-templates/ structure, index.ejs vs index.html
- `https://docs.cocos.com/creator/3.8/manual/en/getting-started/project-structure/` — project folder layout, assets/, settings/

### Secondary (MEDIUM confidence)
- Forum discussion confirming Cocos intercepts canvas touch events (prevents page scroll via engine internals), though CSS `touch-action: none` is still recommended belt-and-suspenders
- Prior project research in `.planning/research/PITFALLS.md` — Pitfall 7 (viewport/scroll conflicts) and touch-action pattern translated from Phaser context to Cocos

### Tertiary (LOW confidence)
- Cocos Creator 3.8.8 specific patch notes — not fetched; using 3.8.x general docs. The 3.8 LTS branch is stable and 3.8.8 is a patch release unlikely to have changed any of the above APIs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Cocos Creator 3.8 is installed and the version decision is locked; official docs confirm API
- Architecture (scene transition, component lifecycle): HIGH — verified against official 3.8 docs
- Design resolution config: HIGH — official docs confirm Project Settings is the correct location
- touch-action CSS behavior: MEDIUM — Cocos intercepts touch internally but whether the built HTML includes `touch-action: none` was not definitively confirmed; manual verification required
- tsconfig configuration: HIGH — official docs explicitly document what can and cannot be modified

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (Cocos Creator 3.8 LTS is stable; 30-day validity is conservative)
