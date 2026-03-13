# Pitfalls Research

**Domain:** HTML5 casual tapping game — mobile web + Facebook Instant Games (Bloom Tap)
**Researched:** 2026-03-13
**Confidence:** MEDIUM (MDN official sources verified via WebFetch; FB Instant Games docs blocked; training knowledge for platform-specific items)

---

## Critical Pitfalls

### Pitfall 1: Touch Input Registered on touchend Instead of touchstart

**What goes wrong:**
Touch events bound to `touchend` or `click` introduce 100–300ms of latency on mobile (the browser's tap-delay for distinguishing tap from scroll). For a game where tap timing windows are measured in hundreds of milliseconds (Bloom Tap's "Nở Hé" vs "Nở Rực Rỡ"), this delay makes the game feel broken. Players tap a full-bloom flower and the system registers it as wilted because the event fires too late.

**Why it happens:**
Developers default to `click` events because they work everywhere. Mobile browsers historically add a 300ms delay before firing `click` to detect double-tap-to-zoom. Even with `touch-action: manipulation` in CSS (which removes the delay in modern browsers), `touchend` still fires after the touch sequence completes — not at the moment of contact.

**How to avoid:**
In Phaser 3, tap input must go through the Phaser Input Manager using pointer events, not raw DOM events. Phaser fires `pointerdown` (maps to `touchstart`) as the canonical tap event. Do not add DOM-level `addEventListener('click', ...)` to canvas cells. Verify Phaser's input is configured for `touchstart` equivalents:

```typescript
// Phaser input fires on pointer DOWN — correct for timing games
gameObject.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  handleFlowerTap(cell);
});
```

Additionally add to the game's HTML:
```css
canvas { touch-action: none; }
```

This prevents the browser from intercepting touch events for scrolling/zooming before Phaser can handle them.

**Warning signs:**
- Tap feedback animations appear visibly late relative to finger contact
- Testers report "I tapped it when it was blooming but got the wrong-tap penalty"
- On Android Chrome DevTools, `pointerdown` timestamp is significantly earlier than `click` timestamp

**Phase to address:** Core gameplay phase (flower state machines + tap registration). Must be verified before any timing balance work — wrong event binding invalidates all balance testing.

---

### Pitfall 2: Garbage Collection Spikes Killing 60fps During Heavy Flower Spawning

**What goes wrong:**
During Phase 3 (80–120s rapid wave), the game spawns and destroys many flowers rapidly. If flower objects — state machine instances, tween configurations, score pop-up text objects, particle emitters — are created with `new` on every spawn and thrown away on death, the JavaScript GC accumulates a large heap and triggers stop-the-world collection, causing 30–100ms frame freezes. This is catastrophic at the exact moment the game is supposed to feel most intense.

**Why it happens:**
JavaScript has no explicit memory management. Every `new FlowerState()`, every `new Phaser.GameObjects.Text()`, every score pop-up DOM element allocates heap memory. The GC runs when the heap threshold is hit — which correlates with peak spawn rate, i.e., exactly Phase 3.

**How to avoid:**
Implement an object pool for all frequently created/destroyed objects:

- **Flower GameObjects:** Pre-instantiate all 64 possible flower slots at game start. Mark slots active/inactive rather than destroying and recreating.
- **Score pop-up Text objects:** Pre-create a pool of ~10 Phaser Text objects. Recycle them when animations complete.
- **Tween configurations:** Use Phaser's built-in tween system (which pools internally) rather than custom animation timers.

Do not call `gameObject.destroy()` in the hot path. Instead call `gameObject.setActive(false).setVisible(false)` and return to pool.

**Warning signs:**
- Chrome DevTools Performance tab shows GC events (gray bars) spiking during Phase 3
- Frame time graph shows periodic spikes to 30–100ms coinciding with flower death/spawn clusters
- Game feels smooth in Phase 1, choppy in Phase 3 despite identical flower count logic

**Phase to address:** Core architecture phase (game object lifecycle design). The pool pattern must be in place before performance testing — retrofitting pooling after the fact requires touching every spawn/destroy callsite.

---

### Pitfall 3: Facebook Instant Games SDK Initialized After Game Rendering Begins

**What goes wrong:**
`FBInstant.initializeAsync()` is async and must resolve before any game logic or rendering starts. If the Phaser game boots before the SDK resolves — even by one frame — FB will throw errors, the game may fail submission review, and on some devices the loading screen will not appear, resulting in a black screen for users.

**Why it happens:**
The standard Phaser Vite bootstrap calls `new Phaser.Game(config)` in the module entry point, which immediately starts the game loop. Developers add the FB SDK script tag but forget that `FBInstant.initializeAsync()` is non-blocking — the module executes and Phaser boots while the SDK promise is still pending.

**How to avoid:**
Gate Phaser game instantiation behind `FBInstant.initializeAsync()`:

```typescript
// index.ts — correct ordering
async function bootstrap() {
  // STEP 1: Wait for FB SDK before anything else
  if (typeof FBInstant !== 'undefined') {
    await FBInstant.initializeAsync();
  }

  // STEP 2: Load Phaser and game assets
  const game = new Phaser.Game(config);

  // STEP 3: Report loading progress during asset load
  // (Inside Phaser scene's preload, call FBInstant.setLoadingProgress)

  // STEP 4: Only call startGameAsync after assets are ready
  if (typeof FBInstant !== 'undefined') {
    await FBInstant.startGameAsync();
  }
}

bootstrap();
```

Use the FB mock file (`fbinstant.6.3.mock.js`) for local development so this flow can be tested without a real FB context.

**Warning signs:**
- Game renders before the FB loading spinner disappears
- `FBInstant is not defined` errors in console during local dev
- FB submission review fails with "game does not implement loading progress"
- Black screen reported by testers on the FB platform (but works fine in browser)

**Phase to address:** FB Instant Games integration phase (post-v1 port). This is the first thing to implement when porting — the entire initialization architecture depends on getting this ordering right.

---

### Pitfall 4: Canvas Not Scaled for Device Pixel Ratio (DPR) — Blurry on Retina/High-DPI Mobile

**What goes wrong:**
On Retina and high-DPI Android screens (DPR 2–3x), an HTML5 canvas rendered at CSS pixel dimensions appears blurry because the canvas pixel buffer is smaller than the physical display pixels. For a game where players need to distinguish between 5 flower states at a glance on a small 8x8 grid, blurry cell rendering directly impairs gameplay.

**Why it happens:**
Setting `canvas.width = 480` creates a buffer with 480 logical pixels. On a DPR-2 device, the display renders this at 960 physical pixels, upscaling and blurring. Developers testing on desktop (DPR 1) never see the problem.

**How to avoid:**
Phaser 3 handles DPR scaling via the `resolution` config field. Set it correctly at game initialization:

```typescript
const config: Phaser.Types.Core.GameConfig = {
  resolution: window.devicePixelRatio,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 854,
  },
};
```

Alternatively, use the manual approach for the underlying canvas:
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = logicalWidth * dpr;
canvas.height = logicalHeight * dpr;
ctx.scale(dpr, dpr);
canvas.style.width = `${logicalWidth}px`;
canvas.style.height = `${logicalHeight}px`;
```

Always test on a real DPR-2 device (any modern iPhone or Pixel) before declaring graphics "done."

**Warning signs:**
- Flower sprites look pixelated/blurry on physical phone but sharp in desktop browser
- Text on score/timer is noticeably softer than native apps
- Testers mention "why does it look low quality?"

**Phase to address:** Project foundation / rendering setup. DPR scaling must be set at game creation — changing it later requires recalculating all coordinate systems.

---

### Pitfall 5: Flower State Machine State Drift From Accumulated Floating-Point Timer Errors

**What goes wrong:**
Each flower progresses through its growth cycle (Bud → Blooming → Full Bloom → Wilting → Dead) based on a timer. If this timer uses `Date.now()` or accumulates delta-time floats across frames without compensation, state transitions drift over a 120-second session. A flower that should spend exactly 1500ms in "Full Bloom" might spend 1480ms or 1520ms, making the game feel inconsistent — especially noticeable when players learn the timing of high-value flowers.

With 64 potential concurrent flowers across 3 phases, timer drift compounds: the endgame spawn wave can desynchronize from the expected difficulty curve.

**Why it happens:**
`Date.now()` returns milliseconds as an integer — imprecise for sub-millisecond timing. `performance.now()` is accurate to 0.001ms but floating-point accumulation errors build over many frames. Developers treat `elapsed += deltaTime` as exact when it is not.

**How to avoid:**
Use `performance.now()` for all timing (not `Date.now()`). Store each flower's `spawnTimestamp` as the absolute time when it was spawned, then compute current state as:

```typescript
const elapsed = performance.now() - flower.spawnTimestamp;
const state = getStateForElapsed(elapsed, flower.type); // pure function
```

This avoids accumulation entirely — state is always derived from a single subtraction, not from a running sum. The 120-second game timer should also be computed as `endTime - performance.now()` rather than accumulated.

**Warning signs:**
- Balance testers report flower timing "feels different each game" without spawn rate changes
- At high combo streaks in Phase 3, flowers seem to transition faster than documented
- Unit tests for flower state logic fail intermittently with timing-sensitive assertions

**Phase to address:** Core game loop / flower state machine design. Timestamp-based state derivation must be the architecture from day one — retrofitting it requires touching every flower timer callsite.

---

### Pitfall 6: AudioContext Not Unlocked on iOS Safari — Silent Game on iPhone

**What goes wrong:**
iOS Safari enforces a strict autoplay audio policy: the `AudioContext` is suspended until explicitly resumed from within a user gesture handler. If the game creates an `AudioContext` during initialization (or when Phaser boots), all sound effects will silently fail on iPhone. The game runs but feels dead — no tap sounds, no combo feedback, no phase transition audio.

**Why it happens:**
Web Audio autoplay policy applies to all browsers, but iOS Safari is the strictest enforcer. Developers test on desktop Chrome (which relaxed this policy) or Android Chrome (which unlocks on first interaction automatically) and never catch the iOS issue. Phaser's audio system creates an `AudioContext` during game boot — before any user gesture.

**How to avoid:**
Add an explicit AudioContext unlock on first tap. Phaser 3 has a built-in mechanism for this — ensure `AudioContext` unlock is triggered on the first `pointerdown` event that starts the game:

```typescript
// Phaser handles this internally if you configure it correctly:
const config = {
  audio: {
    disableWebAudio: false, // keep Web Audio enabled
  },
};

// Phaser will auto-unlock AudioContext on first user interaction
// But verify this is working on actual iOS by checking:
// this.sound.context.state === 'running' after first tap
```

For the v1 web build, add a "Tap to Start" splash screen as the first scene. This user gesture unlocks audio before the game loop starts, preventing the iOS issue.

**Warning signs:**
- All sound effects work on desktop and Android but are completely silent on iPhone
- `this.sound.context.state` logs as `'suspended'` after game start on iOS
- No errors thrown — silent failure is the symptom

**Phase to address:** Audio implementation phase. The "Tap to Start" screen that unlocks audio should be built alongside the first audio effects, not after.

---

### Pitfall 7: Viewport and Scroll Conflicts — Browser Chrome Appears / Game Scrolls on Mobile

**What goes wrong:**
On mobile browsers (especially Android Chrome), the browser's address bar and bottom navigation bar appear and disappear based on scroll behavior. If the game canvas is sized to `100vh`, the actual visible height changes as the browser chrome hides/shows, causing the game to resize, reflow, or jump. Separately, if `touch-action` is not set to `none` on the canvas, vertical swipes on the game board trigger browser scroll rather than registering as game input.

**Why it happens:**
`100vh` on mobile does not account for browser chrome. iOS Safari's `100vh` includes the address bar height (which hides on scroll), causing the canvas to be taller than the visible area. Android Chrome dynamically changes the viewport height. Developers test in desktop DevTools mobile emulation which does not replicate this behavior.

**How to avoid:**
Use `window.innerHeight` instead of `100vh` for canvas sizing, and re-compute on `resize` events with debouncing. Add the following CSS to the game root element:

```css
html, body {
  height: 100%;
  overflow: hidden;
  position: fixed; /* prevents scroll bounce on iOS */
}

canvas {
  touch-action: none; /* prevents scroll/zoom interference */
  display: block;
  user-select: none;
  -webkit-user-select: none;
}
```

Additionally use the Viewport API where available:
```typescript
// Use visual viewport height, not layout viewport
const gameHeight = window.visualViewport?.height ?? window.innerHeight;
```

**Warning signs:**
- On Android, the game canvas appears to shift vertically when the browser address bar hides
- Vertical swiping on the game grid causes the page to scroll instead of registering taps
- On iOS, there is a white space at the bottom of the game when the keyboard was previously open

**Phase to address:** Project foundation / mobile viewport setup. These CSS rules must be in place before any mobile UX testing — they affect every subsequent test session.

---

### Pitfall 8: Redrawing the Entire Canvas Every Frame Instead of Only Dirty Regions

**What goes wrong:**
Calling `ctx.clearRect(0, 0, canvas.width, canvas.height)` and redrawing all 64 cells every frame is unnecessary for cells that haven't changed. At 60fps on a mid-range Android device, full-canvas redraws with shadow effects, image draws, and text renders can consume 12–14ms of the 16.7ms frame budget, leaving almost no headroom for game logic. This is the leading cause of frame drops in the Phase 3 spawn wave when many flowers are active simultaneously.

**Why it happens:**
Full-canvas clear-and-redraw is the simplest approach and performs adequately on desktop. Mobile GPU/CPU bandwidth is 3–5x lower, and what costs 3ms on desktop costs 10ms on a mid-range phone.

**How to avoid:**
Two strategies, in order of preference:

1. **Layer separation:** Use Phaser's GameObjects with dirty tracking. Phaser only redraws Sprites/Images when their properties change. Do not use raw Canvas 2D API for game rendering — use Phaser GameObjects which handle dirty tracking internally via the WebGL renderer.

2. **If using Canvas 2D:** Maintain a dirty-cell set. Only `clearRect` and redraw cells whose flower state changed this frame. The background (empty grid) should be drawn to an offscreen canvas once and composited each frame with a single `ctx.drawImage(backgroundCanvas, 0, 0)`.

Avoid canvas state that is expensive on mobile:
- `shadowBlur` — never use in the game loop (extremely expensive on mobile GPU)
- Text rendering with `fillText` every frame — pre-render score text to offscreen canvas or use Phaser's Text GameObject (which caches the text raster)

**Warning signs:**
- Chrome DevTools Performance tab shows Paint taking >5ms per frame
- Frame rate drops from 60 to 45fps during Phase 3 with >30 active flowers
- Removing shadow effects dramatically improves frame rate (confirms shadow is the bottleneck)

**Phase to address:** Core rendering setup. The decision to use Phaser GameObjects (recommended) vs raw Canvas 2D must be made at architecture stage — switching later requires rewriting all rendering code.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded flower spawn rates per phase | Simpler code, no config system needed | Cannot tune balance without code changes; A/B testing requires deploys | Never — use a data config object from day 1; cost is minimal |
| `click` events instead of `pointerdown` for tap detection | Works immediately on desktop | 100–300ms tap latency on mobile; all timing balance invalid | Never — switch before any mobile testing |
| `Date.now()` for flower timers | Familiar API | Integer precision causes sub-ms timing drift across 120s session | Never — use `performance.now()` from the start |
| `localStorage` for all persistent data | Trivial implementation | Silently breaks in FB Instant Games WebView context for save data | Acceptable for v1 web-only build; must be replaced before FB port |
| DOM text elements for score/UI over canvas | Easy styling with CSS | DOM reflow on every score update at 60fps causes jank; FB Instant Games has DOM restrictions | Acceptable for static screens (results, menu); never for HUD updated per frame |
| `new Object()` in the game loop for event data | Readable code | Allocates heap memory 60 times/second; triggers GC during Phase 3 | Never for hot paths — use pre-allocated event objects or plain function calls |
| Canvas `shadowBlur` for flower glow effects | Visually polished quickly | Extremely expensive on mobile GPU; 5–10ms cost per frame | Never in the game loop; use pre-rendered glow sprites instead |
| All flower GameObjects in one Phaser Group | Simple structure | No draw-call optimization; harder to implement layered rendering | Acceptable for v1 with Phaser WebGL renderer (batching handles it); revisit if 64-flower Phase 3 drops below 45fps |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Facebook Instant Games SDK | Calling `FBInstant.player.getID()` before `initializeAsync()` resolves | All FB SDK calls must be after `await FBInstant.initializeAsync()` — gate everything behind the promise |
| Facebook Instant Games SDK | Using `localStorage` for `highscore` without a fallback strategy | Use `FBInstant.player.setDataAsync({ highscore })` in FB context; detect context and use appropriate storage: `typeof FBInstant !== 'undefined'` guard |
| Facebook Instant Games SDK | Loading game assets from an external CDN URL in Phaser's preload | FB Instant Games blocks external asset URLs; all assets must be bundled or served from the same origin |
| Facebook Instant Games SDK | Forgetting to call `FBInstant.setLoadingProgress(n)` during asset load | FB's loading screen will hang if progress is never reported; call it at each major asset batch load milestone (0, 25, 50, 75, 100) |
| Facebook Instant Games SDK | Not testing with the official FB mock file locally | Without the mock, `FBInstant` is undefined in local dev; developers skip the async init flow entirely and only discover issues during submission |
| Web Audio API (all mobile) | Creating `AudioContext` at game module load time | `AudioContext` must be created/resumed inside a user gesture; use a "Tap to Start" screen to trigger audio unlock before game loop |
| Phaser 3 + Vite | Not aliasing Phaser's optional peer dependencies | Vite tree-shaking may fail on Phaser's sound/spine optional imports without explicit `resolve.alias` in `vite.config.ts` |

---

## Performance Traps

Patterns that cause frame drops specifically in Bloom Tap's context.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Spawning/destroying Phaser GameObjects in the hot loop | Frame spikes coinciding with flower death events; GC shown in DevTools | Object pool: pre-create all 64 flower slots; activate/deactivate instead of create/destroy | Immediately at 20+ simultaneous flower deaths per second (Phase 3) |
| `shadowBlur` on canvas during game loop | Frame time jumps from 4ms to 12ms when flowers are in bloom state | Pre-render glow as sprite frame; never set `shadowBlur` in rAF callback | On any mobile device; desktop masks the cost |
| Sub-pixel coordinates in `drawImage` / Phaser sprite positions | Anti-aliasing artifacts on sprite edges; slight blurriness on some frames | Round all sprite positions to integers: `Math.round(x)`, `Math.round(y)` | Always on Canvas 2D renderer; WebGL is more forgiving |
| Allocating new objects in the rAF callback | Progressive heap growth; GC pauses increasing in frequency over 120s session | Pre-allocate all per-frame objects (state snapshots, event payloads) at game init | Usually manifests after 60+ seconds of play — just before Phase 3 peak |
| Score pop-up Text GameObjects created per tap | Memory pressure; pop-up pool exhausted in Phase 3 combo chains | Pre-create pool of 8–10 Text GameObjects; recycle when fade animation completes | Any sustained combo chain in Phase 3 |
| Full canvas clear + redraw every frame with Canvas 2D | Paint cost >8ms per frame on mid-range Android | Use Phaser WebGL renderer (default); if Canvas 2D needed, use dirty region tracking | Mid-range Android devices (Snapdragon 6xx series) at 30+ active flowers |
| Unthrottled `resize` event handler recalculating game layout | Jank when user rotates device or browser chrome hides | Debounce resize handler to 150ms minimum | Every time Android browser chrome hides/shows during play |

---

## UX Pitfalls

Common user experience mistakes specific to tapping games on mobile.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tap target = exact sprite bounds on 8x8 grid | Missed taps on small cells; frustration on small phone screens; adjacent cell misfires | Add minimum 44px tap target per cell (Apple HIG recommendation); use slightly larger hitbox than visual sprite |
| No visual feedback within 100ms of tap | Game feels unresponsive; players think tap didn't register and tap again (double-tap death) | Animate the tap response (scale pulse) on `pointerdown` — not `pointerup` — so feedback is immediate |
| Score pop-up text obscures adjacent flowers | Players can't see neighboring cells to plan their next tap | Float score pop-ups upward and fade quickly (600ms); ensure pop-up doesn't occlude more than one adjacent cell |
| Combo counter in a corner users don't look at | Combo system is invisible; removes all motivational value of the mechanic | Place combo counter in central-lower HUD position, inside the player's natural gaze zone on a phone (thumb area) |
| Timer displayed only as a number | Low urgency until it's too late; players don't internalize the round structure | Add color transition (green → yellow → red) below 30s; pulsing animation below 10s |
| No onboarding — first-time players tap buds and lose points without understanding why | Confusion about wrong-tap penalty; players quit before the mechanic clicks | The slow Phase 1 (0–40s) is the implicit tutorial — but add a brief visual hint on first wrong tap: "Too early! Tap when blooming" |
| Fullscreen canvas with no "exit/menu" affordance | Players can't pause or navigate away without using browser back (which loses game state) | Add a minimal pause/menu button in the HUD; Phaser's pause scene is straightforward |
| Results screen "Play Again" button too small or off-screen on some aspect ratios | Players cannot restart; session ends | Use Phaser.Scale.FIT and test on 9:16, 9:19.5, and 9:20 aspect ratios; verify CTA button is always visible |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in desktop testing but are broken or degraded on mobile.

- [ ] **Tap timing:** Works in browser with mouse but `click` event latency makes it 150ms slow on mobile — verify `pointerdown` is the trigger, not `click`
- [ ] **Audio:** Sounds work on desktop and Android but are silent on first launch on iPhone — verify `AudioContext.state === 'running'` after first user gesture on iOS
- [ ] **Flower state readability:** States are distinguishable at 100% zoom on desktop but indistinct on a 360px-wide phone screen — verify visual differentiation on a 375px iPhone SE viewport
- [ ] **Score persistence:** `localStorage` saves correctly in browser but silently fails or returns null in FB Instant Games WebView — verify storage layer abstraction is in place
- [ ] **Canvas sharpness:** Sprites look crisp on developer's Retina MacBook but blurry on Android test device — verify `devicePixelRatio` scaling is applied
- [ ] **Game loop pause/resume:** `requestAnimationFrame` pauses when tab is backgrounded; returning to the game may snap flower states forward by multiple seconds — verify tab-inactive handling (skip or cap elapsed time)
- [ ] **Phase 3 performance:** Frame rate is 60fps with 10 flowers in Phase 1 but drops to 45fps with 30+ flowers in Phase 3 — profile specifically under peak load conditions
- [ ] **Combo counter visibility:** Combo display is readable on desktop but obscured by browser chrome or system UI on notched phones (iPhone 14+, Samsung S-series) — test with safe area insets
- [ ] **FB mock flow:** Game boots and runs locally, but `FBInstant` init order was never tested — verify by loading the FB mock file and confirming async init/start flow works end-to-end before attempting submission

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Touch latency from `click` events discovered after balance tuning | HIGH | Audit all input callsites; replace `click`/`touchend` with Phaser `pointerdown`; all balance numbers collected before the fix are invalid and must be re-tested |
| GC spikes discovered in Phase 3 | MEDIUM | Profile to identify allocation source; implement object pool for the top 1–2 allocating systems; typically 1–2 days of refactoring |
| Canvas DPR scaling missing, game is blurry | LOW | Add `resolution: window.devicePixelRatio` to Phaser config; verify no coordinate calculations assumed DPR=1; re-test all sprite sizes |
| iOS audio silence | LOW | Add `AudioContext.resume()` call in the first `pointerdown` handler; add "Tap to Start" splash if not already present |
| FB Instant Games init order wrong | MEDIUM | Restructure `index.ts` bootstrap to gate `new Phaser.Game()` behind `initializeAsync()`; requires moving game config and verifying all preload hooks still fire correctly |
| `localStorage` highscore not persisting in FB context | LOW | Implement storage abstraction: `StorageService.set(key, value)` that routes to `FBInstant.player.setDataAsync()` in FB context and `localStorage` on web |
| Viewport scroll conflicts causing canvas to shift | LOW | Add `touch-action: none` to canvas CSS; set `position: fixed` on body; 30 minutes to implement and test |
| Flower timer drift after 90+ seconds discovered late | HIGH | Requires refactoring from delta-time accumulation to timestamp-based state derivation across all flower instances; retesting all timing balance |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Touch on `touchend` / `click` instead of `pointerdown` | Phase 1: Project Foundation (input architecture) | Test tap response latency on physical Android device; timestamp delta between touch contact and visual feedback must be <50ms |
| GC spikes from missing object pool | Phase 2: Core game loop architecture | Run Phase 3 simulation (high spawn rate) for 60s in Chrome DevTools Performance; no GC event should exceed 5ms |
| FB Instant Games init order | Phase N: FB Instant Games port | Load game with FB mock; confirm black screen never appears; `FBInstant.startGameAsync()` is called after all assets load |
| Canvas DPR not set | Phase 1: Project Foundation (rendering setup) | View game on physical DPR-2 device; sprites should appear sharp, not blurry |
| Flower state machine timer drift | Phase 2: Core game loop architecture | Run 10 consecutive games; flower in "Full Bloom" state must be within ±50ms of expected window duration |
| iOS AudioContext silence | Phase N: Audio implementation | Test sound effects on physical iPhone; all SFX must play on first tap |
| Viewport scroll conflicts | Phase 1: Project Foundation (mobile viewport) | On Android Chrome, vertical swipe on game canvas must not scroll the page |
| Full canvas redraw performance | Phase 2: Core rendering | 60fps must be maintained with 30+ simultaneous active flowers on mid-range Android (Snapdragon 665 or equivalent) |
| FB `localStorage` incompatibility | Phase N: FB Instant Games port | Storage abstraction must route correctly; verify highscore persists across FB game sessions |
| Score pop-up object allocation | Phase 2: Core game loop architecture | Score pop-up pool must be implemented alongside the feature; not as a later optimization |

---

## Sources

- MDN Web Docs — "Optimizing canvas" (official, verified via WebFetch 2026-03-13): https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- MDN Web Docs — "Anatomy of a video game" / game loop patterns (official, verified via WebFetch 2026-03-13): https://developer.mozilla.org/en-US/docs/Games/Anatomy
- MDN Web Docs — "Web Audio API best practices" (official, verified via WebFetch 2026-03-13): https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- MDN Web Docs — "Using Touch Events" (official, verified via WebFetch 2026-03-13): https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events
- MDN Web Docs — "Animation performance and frame rate" (official, verified via WebFetch 2026-03-13): https://developer.mozilla.org/en-US/docs/Web/Performance/Animation_performance_and_frame_rate
- Facebook Instant Games SDK documentation — training knowledge (MEDIUM confidence; WebFetch blocked during research session; verify at https://developers.facebook.com/docs/games/instant-games)
- Phaser 3 input / pointer event system — training knowledge through August 2025 (MEDIUM confidence)
- iOS Safari AudioContext autoplay policy — training knowledge, well-established behavior (HIGH confidence pattern, verified by MDN Web Audio best practices)
- Apple Human Interface Guidelines — 44px minimum tap target — https://developer.apple.com/design/human-interface-guidelines/buttons (training knowledge, stable standard)

---

*Pitfalls research for: HTML5 casual tapping game (Bloom Tap) — mobile web + Facebook Instant Games*
*Researched: 2026-03-13*
