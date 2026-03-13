# Architecture Research

**Domain:** HTML5 Casual Grid-Based Tapping Game (Bloom Tap)
**Researched:** 2026-03-13
**Confidence:** MEDIUM (training knowledge; WebSearch unavailable for verification — patterns are well-established in HTML5 game dev community)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
├───────────────┬──────────────────┬───────────────────────────────┤
│  Renderer     │   UI Overlay     │   Animation System            │
│  (Canvas 2D)  │   (DOM/Canvas)   │   (requestAnimationFrame)     │
└───────┬───────┴────────┬─────────┴───────────────┬───────────────┘
        │                │                         │
┌───────┴────────────────┴─────────────────────────┴───────────────┐
│                          Game Loop                               │
│   update(dt) → processInput → updateState → render              │
└───────┬──────────────────┬──────────────────────────────────────┘
        │                  │
┌───────┴───────┐  ┌───────┴─────────────────────────────────────┐
│ Input Handler │  │               Game State                    │
│ (Touch/Mouse) │  ├──────────────┬──────────────┬───────────────┤
└───────────────┘  │  Grid State  │ Session State│  Flower FSMs  │
                   │  (64 cells)  │ (score,timer,│  (per cell)   │
                   │              │  phase,combo)│               │
                   └──────────────┴──────────────┴───────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Game Loop | Drive updates at fixed logical rate; decouple update from render | `requestAnimationFrame` with delta-time accumulator |
| Renderer | Draw grid, flowers, UI elements each frame from current state | Canvas 2D API; clear → draw background → draw cells → draw UI |
| Input Handler | Capture touch/click events, translate pixel coords to grid coords | `touchstart` + `mousedown` listeners on canvas; debounce |
| Grid State | Store which cell holds which flower (or is empty) | Flat array `cells[64]` or `cells[row][col]` |
| Flower FSM | Manage individual flower lifecycle (5 states + timers) | Per-cell object with `state`, `timer`, `flowerType` |
| Session State | Track score, combo, elapsed time, current difficulty phase | Plain object; updated by game logic each tick |
| Spawn Manager | Schedule and place new flowers based on difficulty phase | Rate tables per phase; picks empty cells at random |
| Combo System | Track consecutive correct taps; apply multiplier | Counter + timeout reset; multiplier lookup table |
| Animation System | Play visual feedback (bloom burst, wilt, score popup) | Particle array or tween list; independent of game state |

---

## Recommended Project Structure

```
src/
├── core/                   # Platform-independent game logic
│   ├── GameLoop.js         # requestAnimationFrame driver with delta-time
│   ├── GameState.js        # Session state (score, timer, phase, combo)
│   ├── Grid.js             # 8x8 cell array; cell access helpers
│   ├── FlowerFSM.js        # Flower state machine class
│   ├── SpawnManager.js     # Wave/difficulty logic; places flowers on grid
│   └── ComboSystem.js      # Consecutive-tap tracking, multiplier calc
├── input/
│   └── InputHandler.js     # Touch + mouse unification; grid hit-test
├── render/
│   ├── Renderer.js         # Main draw pass: grid, flowers, UI
│   ├── AnimationSystem.js  # Short-lived effects: burst, wilt, score popup
│   └── SpriteSheet.js      # Asset loader; frame map for flower states
├── data/
│   ├── flowerTypes.js      # Config: cycle speed, score values per type
│   └── difficultyPhases.js # Spawn rates, intervals for each 40s phase
├── scenes/
│   ├── GameScene.js        # Wires core + input + render; owns game loop
│   └── ResultScene.js      # End-of-game screen: score, highscore display
├── utils/
│   ├── storage.js          # localStorage wrapper for highscore
│   └── math.js             # Grid-coord helpers, random empty cell picker
└── main.js                 # Entry point; canvas setup; scene bootstrap
```

### Structure Rationale

- **core/:** Contains all game logic with zero DOM/Canvas dependency. Makes unit-testing flower FSM and combo logic trivial without a browser.
- **input/:** Isolated translation layer. Changing from raw canvas touch to a framework (Phaser, etc.) only touches this folder.
- **render/:** All drawing knowledge lives here. The rest of the codebase never calls Canvas API directly.
- **data/:** Declarative config files. Tuning spawn rates or flower scores never touches logic code.
- **scenes/:** Scene objects own the lifecycle (init / update / destroy). Switching from game to result screen is a scene swap.

---

## Architectural Patterns

### Pattern 1: Fixed-Rate Update with Variable Render (delta-time game loop)

**What:** Accumulate real elapsed time; run logic updates in fixed steps; render as fast as the display allows.

**When to use:** Always. This is the standard HTML5 game loop. It decouples flower FSM timer accuracy from frame rate drops on low-end mobile.

**Trade-offs:** Slight implementation complexity over a naive `setInterval`; prevents timer drift and ensures consistent difficulty regardless of device speed.

**Example:**
```javascript
// GameLoop.js
let accumulator = 0;
const FIXED_STEP = 1000 / 60; // ms — 60 logic ticks/sec

function tick(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += Math.min(dt, 200); // cap spiral-of-death

  while (accumulator >= FIXED_STEP) {
    update(FIXED_STEP);   // deterministic, always 16.67ms
    accumulator -= FIXED_STEP;
  }

  render();
  requestAnimationFrame(tick);
}
```

### Pattern 2: Flower Finite State Machine (FSM) per Cell

**What:** Each occupied grid cell runs an independent FSM. State transitions are time-driven (timer expires) except `DEAD` which can also be triggered by a wrong tap.

**When to use:** Any entity with a defined lifecycle. Centralises transition logic; prevents scattered `if (state === 'blooming')` checks across the codebase.

**Trade-offs:** 64 FSM instances is trivial overhead. The benefit is testability and clarity.

**State diagram:**
```
EMPTY → SPROUT → BUDDING → BLOOMING → WILTING → DEAD → EMPTY
           ↑          |         |
       (spawn)    [tap OK]  [tap OK]    → harvest + score
                                ↓
                          [tap wrong] → penalty + skip to DEAD
```

**Example:**
```javascript
// FlowerFSM.js
class FlowerFSM {
  constructor(type) {
    this.type = type;   // references flowerTypes config
    this.state = 'SPROUT';
    this.timer = 0;
  }

  update(dt) {
    this.timer += dt;
    const cfg = flowerTypes[this.type];
    if (this.timer >= cfg.durations[this.state]) {
      this.timer = 0;
      this.state = NEXT_STATE[this.state]; // transition table
    }
  }

  tap() {
    if (this.state === 'BUDDING' || this.state === 'BLOOMING') {
      return { result: 'harvest', points: flowerTypes[this.type].points[this.state] };
    }
    return { result: 'penalty', points: -flowerTypes[this.type].penaltyPoints };
  }
}

const NEXT_STATE = {
  SPROUT: 'BUDDING', BUDDING: 'BLOOMING',
  BLOOMING: 'WILTING', WILTING: 'DEAD', DEAD: null
};
```

### Pattern 3: Event-Driven Score Pipeline (tap → score)

**What:** Input events emit a discrete `TapEvent` object. Game logic processes it synchronously: hit-test grid → query FSM → update score/combo → trigger animation. No side effects outside this pipeline.

**When to use:** Keeps the data flow explicit and testable. Avoids tightly coupling the input handler to scoring rules.

**Trade-offs:** One extra indirection. Worthwhile for this complexity level.

**Data flow:**
```
touchstart (canvas pixel x,y)
    ↓
InputHandler.pixelToCell(x, y) → (row, col)
    ↓
Grid.getCell(row, col) → FlowerFSM instance (or null)
    ↓
FlowerFSM.tap() → { result, points }
    ↓
ComboSystem.record(result) → multiplier
    ↓
GameState.applyScore(points * multiplier)
    ↓
AnimationSystem.spawn(type, x, y)   // visual feedback, non-blocking
```

### Pattern 4: Phase-Based Spawn Controller

**What:** A single elapsed-time value drives which of three difficulty configs is active. Spawn decisions are made by a rate timer, not frame-by-frame logic.

**When to use:** When difficulty progression is time-based without discrete level transitions.

**Example:**
```javascript
// SpawnManager.js
const PHASES = [
  { start: 0,   end: 40000,  spawnInterval: 2000 },  // 0-40s slow
  { start: 40000, end: 80000, spawnInterval: 1200 },  // 40-80s medium
  { start: 80000, end: 120000, spawnInterval: 600 },  // 80-120s fast
];

update(dt, elapsed, grid) {
  const phase = PHASES.find(p => elapsed >= p.start && elapsed < p.end);
  this.spawnTimer += dt;
  if (this.spawnTimer >= phase.spawnInterval) {
    this.spawnTimer = 0;
    const cell = grid.randomEmptyCell();
    if (cell) grid.spawn(cell, randomFlowerType());
  }
}
```

---

## Data Flow

### Tap Event Flow (full pipeline)

```
User finger / mouse
    ↓
touchstart / mousedown on <canvas>
    ↓
InputHandler
  - preventDefault() to block scroll
  - Translate clientX/Y → canvas-relative coords
  - Divide by cellSize → (col, row)
  - Emit TapEvent { row, col, timestamp }
    ↓
GameScene.handleTap(event)
  - Grid.getFlower(row, col) → flower | null
  - flower.tap() → { result, points }
  - ComboSystem.record(result) → comboMultiplier
  - GameState.score += points * comboMultiplier
  - if result === 'harvest': Grid.clear(row, col)
  - AnimationSystem.addEffect(result, canvasX, canvasY, points * multiplier)
    ↓
Next render frame: Renderer draws updated state
```

### State Update Flow (each logic tick)

```
GameLoop.update(dt)
    ↓
GameState.update(dt)
  - elapsed += dt
  - timeRemaining -= dt
  - if timeRemaining <= 0 → scene transition to ResultScene
    ↓
SpawnManager.update(dt, elapsed, grid)
  - may call grid.spawn(cell, type)
    ↓
for each occupied cell: FlowerFSM.update(dt)
  - state transitions on timer expiry
  - if transition to DEAD: Grid.clear(cell)
    ↓
ComboSystem.update(dt)
  - reset combo if tap gap timeout exceeded
    ↓
AnimationSystem.update(dt)
  - advance all active effects, remove expired ones
```

### Combo System State

```
ComboSystem
  streak: number        ← increments on correct tap
  multiplier: number    ← lookup: streak → multiplier
  gapTimer: number      ← resets on each tap, counts up each tick

On correct tap:
  streak++
  gapTimer = 0
  multiplier = MULTIPLIER_TABLE[min(streak, MAX_STREAK)]

On wrong tap or gapTimer > GAP_THRESHOLD:
  streak = 0
  multiplier = 1
  gapTimer = 0
```

---

## Mobile Touch Input Handling

### Critical requirements for mobile

1. **Use `touchstart` not `touchend`** — `touchend` fires 60-100ms later. For a reflex game, `touchstart` is the correct event. `touchend` should only cancel scroll, not fire game logic.

2. **`preventDefault()` on touchstart** — Required to suppress the 300ms click delay and prevent page scroll during gameplay. Must be called on the canvas element with `{ passive: false }`.

3. **Coordinate translation** — `touch.clientX/Y` is viewport-relative. Subtract `canvas.getBoundingClientRect()` to get canvas-relative coords, then divide by `cellSize`.

4. **Single-touch only for v1** — Multi-touch opens edge cases (two fingers, palm rejection). Track only `touches[0]`. Ignore subsequent touches.

5. **Unified mouse + touch handler** — Use a single `handlePointerDown(x, y)` function called from both `mousedown` and `touchstart`. Keeps logic DRY and simplifies testing.

**Example:**
```javascript
// InputHandler.js
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();  // MUST be non-passive
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  handlePointerDown(x, y);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  handlePointerDown(e.clientX - rect.left, e.clientY - rect.top);
});

function handlePointerDown(x, y) {
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  if (row >= 0 && row < 8 && col >= 0 && col < 8) {
    onTap({ row, col });
  }
}
```

### Canvas sizing for mobile

Scale the canvas to fill the viewport while maintaining the 8x8 grid aspect ratio. Use CSS `width: 100%; height: auto` on the canvas element, and compute `cellSize` from `canvas.clientWidth / 8` at runtime. Re-compute on `resize` events.

---

## Build Order (Component Dependencies)

```
Tier 1 — No dependencies (build first):
  flowerTypes.js         ← pure data
  difficultyPhases.js    ← pure data
  FlowerFSM.js           ← depends only on flowerTypes data
  math.js                ← pure utility

Tier 2 — Depends on Tier 1:
  Grid.js                ← depends on FlowerFSM
  ComboSystem.js         ← standalone logic
  GameState.js           ← standalone logic

Tier 3 — Depends on Tier 2:
  SpawnManager.js        ← depends on Grid + difficultyPhases
  InputHandler.js        ← depends on Grid geometry (cellSize)

Tier 4 — Depends on Tier 3:
  Renderer.js            ← depends on Grid + GameState + AnimationSystem
  AnimationSystem.js     ← standalone, feeds Renderer
  GameLoop.js            ← orchestrates all Tier 2-3 components

Tier 5 — Top of graph:
  GameScene.js           ← wires everything together
  ResultScene.js         ← depends on GameState (final score)
  main.js                ← entry point, scene bootstrap
```

**Implication for roadmap:** Build and test `FlowerFSM` + `Grid` + `ComboSystem` as pure logic first (no canvas required). Add `Renderer` once logic is verified. Add `InputHandler` last in the core pass since you can test logic with direct function calls.

---

## Anti-Patterns

### Anti-Pattern 1: Putting Game Logic in the Renderer

**What people do:** Call `FlowerFSM.update()` inside the draw function, or check `if (flower.state === 'DEAD') removeFlower()` inside the render pass.

**Why it's wrong:** The render function runs at display refresh rate (variable), not at game logic rate. Flower timers become frame-rate-dependent. On a 120Hz phone, flowers die twice as fast.

**Do this instead:** Strict separation — `update(dt)` mutates state, `render()` reads state and draws. Never mutate state in render.

### Anti-Pattern 2: Listening to `touchend` for Tap Detection

**What people do:** Wire tap logic to `touchend` because "that's when the tap is complete."

**Why it's wrong:** `touchend` fires ~100ms after `touchstart`. In a 120-second reflex game where BLOOMING windows can be 1-2 seconds, losing 100ms per tap matters. It also causes double-fire when combined with the synthesized `click` event.

**Do this instead:** Use `touchstart` with `preventDefault()`. Only use `touchend` if you need to distinguish tap from swipe (check that touch didn't move more than a threshold).

### Anti-Pattern 3: Mutable Global Game State

**What people do:** `window.score += points`, `window.combo++`, etc.

**Why it's wrong:** Impossible to reset state cleanly between games. End-of-game scene reads stale values. Testing is impossible.

**Do this instead:** All session state lives in a `GameState` instance created fresh at game start. Pass it through to components that need it, or use a minimal event bus.

### Anti-Pattern 4: Animating via setTimeout/setInterval

**What people do:** `setTimeout(() => drawExplosion(), 100)` for visual effects.

**Why it's wrong:** Timers fire off the render cycle. Effects render mid-frame or are skipped entirely. Results in visual tearing and desync.

**Do this instead:** Push effects to an `AnimationSystem` array. Each effect has its own timer. The render loop draws all active effects every frame.

### Anti-Pattern 5: Re-allocating Objects per Frame

**What people do:** `const flowers = grid.cells.filter(c => c.flower).map(c => ...)` inside the update or render loop.

**Why it's wrong:** On mobile, GC pauses from per-frame allocations cause visible hitches during intense spawn waves (exactly when it's worst for gameplay).

**Do this instead:** Pre-allocate fixed arrays. Mark cells as occupied/empty with a flag. Iterate the fixed `cells[64]` array directly.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| InputHandler → GameScene | Callback `onTap(row, col)` | InputHandler knows nothing about game rules |
| GameScene → FlowerFSM | Direct method call `flower.tap()` | FSM is owned by Grid cell |
| GameScene → Renderer | Pass current state snapshot each frame | Renderer is read-only consumer |
| GameScene → AnimationSystem | `addEffect(type, x, y, value)` push | AnimationSystem runs independently |
| GameLoop → GameScene | Calls `scene.update(dt)` and `scene.render()` | GameLoop owns the rAF handle |
| ResultScene ← GameState | Reads final score/highscore on construct | localStorage for highscore persistence |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| localStorage | Wrapper in `utils/storage.js` | Save/load highscore only; no session state persisted |
| FB Instant Games SDK (future) | Swap `storage.js` implementation | Core game logic untouched if storage is abstracted |

---

## Scaling Considerations

This is a single-player client-side game — "scaling" means device performance, not server load.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Low-end Android (60fps target) | Keep draw calls minimal; avoid shadow/blur filters; pool animation objects |
| Mid-range mobile (smooth gameplay) | Current architecture handles this well; profile GC pressure if hitches occur |
| FB Instant Games embed | Replace `localStorage` with FBInstant.getDataAsync; rest unchanged |

### Performance Priorities

1. **First bottleneck:** Canvas draw calls. Each flower is a sprite draw. 64 cells + animations is fine on any device. Only becomes an issue if particle effects are unbounded.
2. **Second bottleneck:** GC pauses from per-tap object creation. Pool `TapEvent` objects or use plain function args instead of objects.

---

## Sources

- HTML5 game loop patterns: well-established in gamedev community (Fix Your Timestep, Glenn Fiedler 2004 — canonical reference)
- Finite state machine for game entities: standard pattern documented in "Game Programming Patterns" (Nystrom)
- Mobile touch input `touchstart` vs `touchend` behavior: MDN Web Docs (Touch Events)
- Canvas coordinate transform for responsive sizing: MDN Web Docs (Canvas API)
- Confidence: MEDIUM — core architecture patterns are stable and well-established; specific implementation details are training knowledge, not verified against 2026 sources due to WebSearch being unavailable

---
*Architecture research for: HTML5 Casual Grid-Based Tapping Game*
*Researched: 2026-03-13*
