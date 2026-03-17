# Architecture Research

**Domain:** Casual tap game — Cocos Creator 3.8.8 + TypeScript, pure logic tier + renderer tier
**Researched:** 2026-03-17
**Confidence:** HIGH (full codebase read; all integration points derived directly from source)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COCOS RENDERER TIER                                  │
│  (cc imports allowed — Cocos lifecycle, tween, node manipulation)            │
├────────────────┬──────────────────────┬───────────────┬──────────────────────┤
│ GameController │    GridRenderer       │  (JuiceSystem)│   ResultsScreen      │
│ (orchestrator) │ (64 pooled nodes,     │  inline in GC │  (game-over overlay) │
│                │  sprites, touch)      │               │                      │
├────────────────┴──────────────────────┴───────────────┴──────────────────────┤
│              BOUNDARY: no cc imports below this line                          │
├──────────────┬──────────────┬──────────────┬───────────────┬──────────────────┤
│  FlowerFSM   │     Grid     │ ComboSystem  │ SpawnManager  │   GameState      │
│ (timestamp   │ (64 cells,   │ (multiplier  │ (phase config,│  (score, timing) │
│  state deriv)│  FlowerFSMs) │  streak)     │  type weights)│                  │
├──────────────┴──────────────┴──────────────┴───────────────┴──────────────────┤
│                         PURE LOGIC TIER                                        │
│  FlowerTypes.ts (configs)   JuiceHelpers.ts (pure math)   StorageService.ts  │
│  FlowerState.ts (enum)      GameConfig.ts (NEW — JSON-driven)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (v1.0 baseline)

| Component | Tier | Responsibility |
|-----------|------|----------------|
| `GameController` | Renderer | Session FSM (WAITING → COUNTDOWN → PLAYING → GAME_OVER), spawn tick in `update()`, tap routing, HUD writes, juice orchestration |
| `GridRenderer` | Renderer | 64 pooled cell nodes, per-frame FSM color poll, touch registration, score floats (8-slot pool), flash animations |
| `FlowerFSM` | Pure | Timestamp-based state derivation (`elapsed = nowMs - spawnTimestamp`), score interpolation, collect() flag |
| `Grid` | Pure | Flat 64-cell array, owns all FlowerFSM instances, spawn/clear/alive-count |
| `SpawnManager` | Pure | Phase-table-driven config lookup, weighted random flower type selection |
| `ComboSystem` | Pure | Multiplier/streak/step management, onCorrectTap()/onWrongTap() |
| `GameState` | Pure | Score accumulation, session timing, applyCorrectTap/applyWrongTap |
| `JuiceHelpers` | Pure | Stateless math: float label string, font size, float duration, urgency stage, milestone label |
| `StorageService` | Pure | localStorage abstraction (bloomtap_ prefix, silent-fail) |

---

## v1.1 Integration Architecture

### New and Modified Components

| Component | Status | Tier | Description |
|-----------|--------|------|-------------|
| `GameConfig.ts` | **NEW** | Pure | Typed interfaces + `parse()` for JSON config. Outputs `FlowerTypeConfig[]` and `SpawnPhaseConfig[]` |
| `SpecialFlowerDef.ts` | **NEW** | Pure | `SpecialFlowerType` enum (SCORE_MULTIPLIER, FREEZE_TIME, SLOW_GROWTH) + config interface |
| `PowerUpState.ts` | **NEW** | Pure | Pure data record: active type, `expiresAtMs`, magnitude; helper `isActive(nowMs)`, `applyOffset(ms)` |
| `PauseState.ts` | **NEW** | Pure | `{ isPaused, pauseStartMs, totalPausedMs }` — pure data, no cc |
| `FlowerTypes.ts` | **Modified** | Pure | Keep `FlowerTypeConfig` interface + `FlowerTypeId` enum; **remove** hardcoded `FLOWER_CONFIGS` constant |
| `FlowerFSM.ts` | **Modified** | Pure | Add `_pauseOffset: number` field + `addPauseOffset(ms)` method; modify elapsed: `(nowMs - spawnTimestamp) - pauseOffset` |
| `SpawnManager.ts` | **Modified** | Pure | Accept injected phase array in constructor; add `initialCount` + `specialSpawnChance` to `SpawnPhaseConfig`; add `pickSpecialSpawn()` |
| `Grid.ts` | **Modified** | Pure | Add `_specialTypes: Map<number, SpecialFlowerType>`; add `spawnSpecialFlower()`, `getSpecialType()`, `clearSpecialType()` |
| `JuiceHelpers.ts` | **Modified** | Pure | No functional change — wire `GameController` to call `getUrgencyStage()` and `getMilestoneLabel()` instead of duplicating them inline |
| `GameController.ts` | **Modified** | Renderer | Pause/resume handlers, power-up activation, config injection, initial-spawn burst, combo label fix (HUD-03), screen shake call |
| `GridRenderer.ts` | **Modified** | Renderer | Sprite render path alongside Graphics; special flower visual variant; `playScreenShake()` method |

---

## Pattern 1: Config-Driven Flower Data

**What:** A JSON asset file defines all `FlowerTypeConfig` records and `SpawnPhaseConfig` phases. The pure logic tier never reads JSON directly — it receives typed plain objects. Cocos handles asset loading.

**Where config loading lives:** Renderer tier only. `GameController.onLoad()` loads the JSON asset via `cc.resources.load()` and calls `GameConfig.parse(json)` to produce typed objects. The parsed arrays are stored on `GameController` and passed down to `SpawnManager` at construction.

**Integration point — GameController.onLoad():**
```
GameController.onLoad()
  → cc.resources.load('game-config', JsonAsset, callback)
  → GameConfig.parse(jsonAsset.json)   // pure, Vitest-testable
  → this._flowerConfigs = result.flowerTypes  // Record<FlowerTypeId, FlowerTypeConfig>
  → this._spawnManager = new SpawnManager(result.spawnPhases)
  → _configReady = true (enables start button)
```

**Integration point — spawn tick in GameController.update():**
```typescript
// v1.0:
const config = FLOWER_CONFIGS[typeId];       // module import

// v1.1:
const config = this._flowerConfigs[typeId];  // injected at onLoad()
```

**Integration point — SpawnManager constructor:**
```typescript
// v1.0: module-level PHASE_CONFIGS constant
// v1.1:
constructor(phases: SpawnPhaseConfig[]) {
    this._phases = phases;  // fully injected, no module constant
}
```

**Test coverage:** `GameConfig.parse()` is pure — add Vitest tests for malformed JSON, missing fields, wrong types, and boundary values without any Cocos dependency.

**SPAWN-01 (immediate initial flowers):** Add `initialCount: number` to `SpawnPhaseConfig`. In `GameController._beginSession()`, replace the 3-second first-spawn delay with a burst loop that runs synchronously before entering PLAYING state:
```typescript
// replaces: this._nextSpawnMs = now + firstInterval
const phase0 = this._spawnManager.getPhaseConfig(0);
while (this.grid.getAliveCount(nowMs) < phase0.initialCount) {
    // spawnOne() — same logic as update() spawn tick
}
this._nextSpawnMs = nowMs + phase0.intervalMs;
```

---

## Pattern 2: Special Power-Up Flower Architecture

**What:** Special flowers share the same `FlowerFSM` lifecycle as normal flowers. Their "specialness" is tracked separately in `Grid` via a parallel map. Power-up effects are tracked in `PowerUpState` on `GameController`.

**Data model (pure tier):**
```
SpecialFlowerType { SCORE_MULTIPLIER | FREEZE_TIME | SLOW_GROWTH }

PowerUpState {
    activeType: SpecialFlowerType | null
    expiresAtMs: number     // wall-clock expiry (adjusted on pause/resume)
    magnitude: number       // x2/x3/x5 for SCORE_MULTIPLIER, factor for SLOW_GROWTH
}
```

**Grid extension (pure tier, additive change):**
```typescript
private _specialTypes = new Map<number, SpecialFlowerType>();

spawnSpecialFlower(cell, config, type, nowMs): FlowerFSM {
    const fsm = this.spawnFlower(cell, config, nowMs);  // existing method unchanged
    this._specialTypes.set(cell.index, type);
    return fsm;
}
getSpecialType(cell): SpecialFlowerType | null {
    return this._specialTypes.get(cell.index) ?? null;
}
clearSpecialType(cell): void {
    this._specialTypes.delete(cell.index);
}
```

**Spawn integration — SpawnManager:** Add `pickSpecialSpawn(elapsedMs): boolean` — returns true with probability `SpawnPhaseConfig.specialSpawnChance` (new field, e.g. 0.05). Called by `GameController.update()` after the normal spawn decision:

```
if (shouldSpawn && spawnManager.pickSpecialSpawn(elapsedMs)) {
    grid.spawnSpecialFlower(cell, config, type, nowMs)
    gridRenderer.setCellTypeId(row, col, typeId, specialType)
} else {
    grid.spawnFlower(cell, config, nowMs)
    gridRenderer.setCellTypeId(row, col, typeId)
}
```

**Tap routing — GameController.handleCorrectTap():** After BLOOMING/FULL_BLOOM confirmed, check `grid.getSpecialType(cell)`. If non-null, call `_activatePowerUp(type)` before normal score path. Clear special type on collect: `grid.clearSpecialType(cell)`.

**Power-up effects by type:**

| Power-Up | Effect Location | Mechanism |
|----------|----------------|-----------|
| SCORE_MULTIPLIER | `GameState.applyCorrectTap()` | Pass `powerUpMultiplier` as additional factor: `rawScore * combo.multiplier * powerUpMultiplier` |
| FREEZE_TIME | `GameController._updateHUD()` + `GameState.isGameOver()` | Store `freezeEndsAtMs`; while active, do not advance displayed timer and extend `sessionStartMs` by frozen duration |
| SLOW_GROWTH | Spawn-time config copy | On activation, set `_growthSlowActive = true`; newly spawned flowers get `{ ...baseConfig, cycleDurationMs: base * slowFactor }` — existing live flowers not retroactively affected |

**SLOW_GROWTH recommendation:** Spawn-time config copy is the cleanest approach. It avoids mutating live `FlowerFSM` timestamps and keeps `FlowerFSM` unchanged. The effect reads as "new flowers grow slower" which is visually correct and simpler to test.

---

## Pattern 3: Pause/Resume — Timestamp-Based FSM Strategy

**This is the critical design constraint.** `FlowerFSM` derives state from `elapsed = nowMs - spawnTimestamp`. If the game pauses for N milliseconds, every live flower's `elapsed` advances by N even though gameplay was frozen — flowers skip states or die during pause.

**Solution: Accumulated Pause Offset per FlowerFSM**

Add `_pauseOffset: number = 0` to each `FlowerFSM`. On resume, propagate the pause duration to all live instances. The elapsed calculation becomes:

```typescript
// FlowerFSM.getState(nowMs) and getScore(nowMs) both use:
const elapsed = (nowMs - this._spawnTimestamp) - this._pauseOffset;
```

**New method (pure, testable):**
```typescript
addPauseOffset(ms: number): void {
    this._pauseOffset += ms;
}
```

Existing 150 tests pass unchanged — `_pauseOffset` starts at 0, so `elapsed` is identical to v1.0 when no pause occurs.

**PauseState (pure tier, no cc):**
```typescript
interface PauseState {
    isPaused: boolean;
    pauseStartMs: number;   // wall-clock time when current pause began
    totalPausedMs: number;  // sum of completed pause durations
}
```

**On pause — GameController._pauseSession():**
```
pauseState.isPaused = true
pauseState.pauseStartMs = performance.now()
SessionPhase → PAUSED               // update() early-returns on !== PLAYING
gridRenderer.setInputEnabled(false)
unschedule(this._blinkCallback)    // stop urgency blink
show pause overlay
```

**On resume — GameController._resumeSession():**
```
pauseDuration = performance.now() - pauseState.pauseStartMs
pauseState.totalPausedMs += pauseDuration
pauseState.isPaused = false

// Slide all time-anchored values forward by pauseDuration:
gameState.sessionStartMs += pauseDuration          // session clock
this._nextSpawnMs += pauseDuration                 // spawn scheduler
powerUpState.expiresAtMs += pauseDuration          // power-up expiry

// Propagate to all live FlowerFSMs:
for each cell in grid.getCells():
    if cell.flower !== null:
        cell.flower.addPauseOffset(pauseDuration)

SessionPhase → PLAYING
gridRenderer.setInputEnabled(true)
if urgencyStage === 3: reschedule blink callback
hide pause overlay
```

**New flowers spawned after a pause:** Their `_spawnTimestamp` is set to `performance.now()` at spawn time and `_pauseOffset` starts at 0. They do not inherit historical offsets — correct, because their lifecycle begins from the post-resume wall clock.

**GameState session clock:** `sessionStartMs += pauseDuration` on resume. `isGameOver()` and `getElapsedMs()` require zero changes — the sliding window absorbs all pause time transparently.

**Cocos scheduler and tweens during pause:**
- Blink callback: `unschedule` on pause; conditionally `reschedule` on resume (only if urgency stage 3)
- Float animations in progress: let them complete naturally (visual only, no logic impact)
- Active tweens on cells: leave running — the state poll in `GridRenderer.update()` will correct colors on next frame after resume anyway

---

## Pattern 4: Sprite Rendering in GridRenderer

**What:** Replace `Graphics.fillRect` color-coded cells with `Sprite` + `SpriteFrame` per cell node. The 64 pooled cell nodes already exist — the change adds a `Sprite` component alongside the existing `Graphics` component.

**CellView extension:**
```typescript
interface CellView {
    node: Node;
    graphics: Graphics;    // retained for flash overlays
    sprite: Sprite | null; // null when sprites not loaded
    row: number;
    col: number;
    typeId: FlowerTypeId | null;
    isFlashing: boolean;
}
```

**Sprite atlas structure (recommendation):** One `SpriteAtlas` per flower type (5 atlases) with frames named by `FlowerState` string value. Loaded once in `GridRenderer.onLoad()` via `cc.resources.load()`.

**Coexistence strategy:** `Sprite` renders the flower image; `Graphics` renders flash feedback (wrong-tap red, correct-tap yellow/white) on top. `Graphics` z-order higher than `Sprite`. This avoids clearing the sprite frame on each flash.

**Render path toggle:**
```typescript
private _useSprites: boolean = false;  // set true after atlas load success

// _paintState becomes:
private _paintState(view: CellView, state: FlowerState): void {
    if (this._useSprites && view.sprite && view.typeId) {
        view.sprite.spriteFrame = this._spriteFrames[view.typeId][state];
    } else {
        // existing Graphics color-coded fallback
        const color = FLOWER_COLORS[view.typeId!][state];
        this._paintCellColor(view, color);
    }
}
```

**Special flower visual:** `GridRenderer.setCellTypeId()` gains an optional `specialType?: SpecialFlowerType` parameter. When set, a child overlay node on the cell renders the special frame (e.g., a glow border or icon).

---

## Data Flow

### Tap Flow (v1.1)

```
User TOUCH_START
    ↓
GridRenderer._onCellTapped(view)
    guard: _inputEnabled, isFlashing, null checks
    ↓
cell.flower.getState(nowMs)
    [elapsed = (nowMs - spawnTimestamp) - pauseOffset]
    ↓
FlowerState === BLOOMING | FULL_BLOOM ?
    YES ↓
grid.getSpecialType(cell)  →  SpecialFlowerType | null
    ↓
GameController.handleCorrectTap(cell, flower, nowMs)
    1. rawScore = flower.getScore(nowMs)
    2. flower.collect()
    3. grid.clearSpecialType(cell) if special
    4. gameState.applyCorrectTap(rawScore, combo, powerUpMultiplier)
    5. if specialType → _activatePowerUp(type)
    ↓
GridRenderer: flash + pulse + scoreFloat(rawScore, combo.multiplier * powerUpMult)
```

### Spawn Flow (v1.1)

```
GameController.update()
    ↓
nowMs >= _nextSpawnMs?
    YES ↓
spawnManager.getPhaseConfig(elapsedMs)   [uses injected JSON-driven phases]
    ↓
grid.getAliveCount(nowMs) < phaseConfig.maxAlive?
    YES ↓
spawnManager.pickSpecialSpawn(elapsedMs)? [probabilistic, new method]
    YES → grid.spawnSpecialFlower(cell, config, type, nowMs)
    NO  → grid.spawnFlower(cell, config, nowMs)         [existing]
    ↓
gridRenderer.setCellTypeId(row, col, typeId, specialType?)
    ↓
_nextSpawnMs = nowMs + phaseConfig.intervalMs
```

### Config Load Flow (startup, runs once)

```
GameController.onLoad()
    ↓
cc.resources.load('game-config', JsonAsset, callback)
    ↓
GameConfig.parse(jsonAsset.json)    [pure — Vitest-testable]
    → { flowerTypes: Record<FlowerTypeId, FlowerTypeConfig>,
        spawnPhases: SpawnPhaseConfig[] }
    ↓
this._flowerConfigs = result.flowerTypes
this._spawnManager = new SpawnManager(result.spawnPhases)
    ↓
cc.resources.load sprite atlases     [separate load]
    ↓
_configReady = true   [start button enabled only after both complete]
```

### Pause Flow

```
User taps Pause button
    ↓
GameController._pauseSession()
    pauseState.isPaused = true
    pauseState.pauseStartMs = performance.now()
    SessionPhase → PAUSED
    gridRenderer.setInputEnabled(false)
    unschedule blink callback
    show pause overlay
    [update() returns early — no spawn, no HUD, no game-over check]

User taps Resume button
    ↓
GameController._resumeSession()
    pauseDuration = now - pauseState.pauseStartMs
    gameState.sessionStartMs += pauseDuration
    _nextSpawnMs += pauseDuration
    powerUpState.expiresAtMs += pauseDuration
    for each live FlowerFSM: addPauseOffset(pauseDuration)
    SessionPhase → PLAYING
    gridRenderer.setInputEnabled(true)
    if urgencyStage === 3: reschedule blink callback
    hide pause overlay
```

---

## Component Boundaries: New vs Modified

### New Files (pure logic tier — all Vitest-testable)

| File | Purpose | Key Test Surface |
|------|---------|-----------------|
| `logic/GameConfig.ts` | JSON parse + validation, typed output | parse() with valid/invalid/edge-case JSON |
| `logic/SpecialFlowerDef.ts` | `SpecialFlowerType` enum + `SpecialFlowerConfig` interface | Type-only; minimal tests |
| `logic/PowerUpState.ts` | Pure data record + `isActive(nowMs)`, `applyOffset(ms)` | isActive() expiry, offset propagation |
| `logic/PauseState.ts` | Pure data record — no methods needed | Trivial; data-only |

### Modified Files (pure logic tier)

| File | Change | Risk |
|------|--------|------|
| `logic/FlowerFSM.ts` | Add `_pauseOffset`, `addPauseOffset()`; modify elapsed formula | LOW — additive; existing 150 tests pass at offset=0 |
| `logic/FlowerTypes.ts` | Remove `FLOWER_CONFIGS` constant; keep interface + enum | MEDIUM — only `GameController` imports `FLOWER_CONFIGS`; one call site to update |
| `logic/SpawnManager.ts` | Constructor injection; add `initialCount`, `specialSpawnChance` fields; add `pickSpecialSpawn()` | LOW — constructor change only breaks `GameController` instantiation |
| `logic/Grid.ts` | Add `_specialTypes` map + three new methods | LOW — additive; existing tests unaffected |
| `logic/JuiceHelpers.ts` | No code change — wire callers | NONE — exports unchanged |

### Modified Files (renderer tier)

| File | Change | Risk |
|------|--------|------|
| `GameController.ts` | Add PAUSED phase; add `_pauseSession()`/`_resumeSession()`; add `_powerUpState`; modify `_beginSession()` for burst spawn; fix comboLabel (HUD-03); call `JuiceHelpers.getUrgencyStage()` and `getMilestoneLabel()` | MEDIUM — many small touch points; no pure tier logic added |
| `GridRenderer.ts` | Add `Sprite` to CellView; add atlas loader; add `_paintStateSprite()`; extend `setCellTypeId()` signature; add `playScreenShake()` | MEDIUM — parallel render path; Graphics fallback preserved |

---

## Build Order

Ordering ensures pure tier changes are verified before renderer tier touches them.

**Step 1 — Config infrastructure (pure tier, zero risk)**
- Create `logic/GameConfig.ts` with `parse()` returning typed config
- Create `resources/game-config.json` with v1.0 values (all 5 flower types, 3 phases)
- Add Vitest tests for `GameConfig.parse()`
- Modify `FlowerTypes.ts`: remove `FLOWER_CONFIGS` constant
- Modify `SpawnManager.ts`: constructor injection
- Update `GameController.onLoad()` to load JSON and inject — game behavior identical to v1.0
- Covers: CFG-01, CFG-02

**Step 2 — Spawn fix (pure + renderer, low risk)**
- Add `initialCount` to `SpawnPhaseConfig` in JSON (e.g. 4 for phase 1)
- Modify `GameController._beginSession()`: remove 3s delay, add initial burst
- Covers: SPAWN-01

**Step 3 — Pause system (pure tier first, then renderer)**
- Add `_pauseOffset` to `FlowerFSM`; run existing 150 tests — all pass (offset=0 baseline)
- Create `PauseState.ts`
- Add PAUSED to `SessionPhase` enum
- Implement `GameController._pauseSession()` / `_resumeSession()`, pause button node wiring
- Covers: PAUSE-01

**Step 4 — Special power-up flowers (pure tier, then renderer)**
- Create `SpecialFlowerDef.ts`, `PowerUpState.ts`
- Modify `Grid.ts`: add `_specialTypes` map + new methods
- Add `pickSpecialSpawn()` to `SpawnManager`; add `specialSpawnChance` field to phases in JSON
- Write Vitest tests for `PowerUpState.isActive()`, `Grid.getSpecialType()`
- Modify `GameController.handleCorrectTap()`: check special type, route to `_activatePowerUp()`
- Modify `GridRenderer`: special flower visual (overlay node or frame swap)
- Covers: SPECIAL-01 through SPECIAL-04

**Step 5 — Bug fixes (renderer tier only)**
- Fix `comboLabel`: show `multiplier.toFixed(1)` from first tap (HUD-03)
- Refactor `GameController._updateTimerUrgency()` to call `JuiceHelpers.getUrgencyStage()` (JuiceHelpers coupling)
- Refactor `GameController._checkMilestone()` to call `JuiceHelpers.getMilestoneLabel()` (JuiceHelpers coupling)
- Add `GridRenderer.playScreenShake()`; call from `GameController.handleWrongTap()` (JUICE-01)

**Step 6 — Art refresh (renderer only, zero logic impact)**
- Add sprite atlas assets
- Extend `CellView` with `Sprite` component in `GridRenderer._buildCellViews()`
- Implement `_paintStateSprite()` with `_useSprites` fallback flag
- Wire `GridRenderer.onLoad()` to load atlases and set `_useSprites = true`
- Covers: ART-01, ART-02, ART-03

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mutating spawnTimestamp to implement pause

**What:** Setting `flower._spawnTimestamp += pauseDuration` to slide the anchor forward.

**Why wrong:** `_spawnTimestamp` is `readonly` in the current FSM. Mutating it also changes the flower's historical position — score interpolation at any future `nowMs` would compute the wrong value.

**Do this instead:** Add `_pauseOffset` and `addPauseOffset()` as the additive approach described in Pattern 3.

### Anti-Pattern 2: Loading JSON config in the pure logic tier

**What:** Having `GameConfig.ts` call `cc.resources.load()` or `fetch()` internally.

**Why wrong:** Breaks the cc-free constraint. Vitest cannot run the file in Node because `cc` does not exist. It also makes the loader async in a tier that should be synchronous.

**Do this instead:** `GameConfig.parse(json: object)` is pure and synchronous. The Cocos asset load happens in `GameController.onLoad()` (renderer tier), which then passes the parsed result down.

### Anti-Pattern 3: Storing power-up state inside FlowerFSM

**What:** Adding `isSpecial: boolean` and `specialType` fields to `FlowerFSM`.

**Why wrong:** `FlowerFSM` models a single flower lifecycle. Power-up effects are session-scoped, not flower-scoped. Adding cross-session concerns to the FSM conflates two responsibilities.

**Do this instead:** `Grid._specialTypes` tracks spawn-time identity; `PowerUpState` on `GameController` tracks active effects. They are separate objects.

### Anti-Pattern 4: Applying SLOW_GROWTH by mutating live FlowerFSM timestamps

**What:** On SLOW_GROWTH activation, iterate all live flowers and multiply remaining cycle time by adjusting `_spawnTimestamp`.

**Why wrong:** Retroactively changes already-elapsed time, causing inconsistent lifecycle states mid-animation. It also requires exposing `_spawnTimestamp` as mutable.

**Do this instead:** Apply SLOW_GROWTH only to newly-spawned flowers via a modified config copy at spawn time. Effect reads as "future flowers grow slower" — visually equivalent and requires no changes to `FlowerFSM`.

### Anti-Pattern 5: Blocking the start screen until config loads

**What:** Showing a full-screen loading spinner and preventing scene interaction until `cc.resources.load()` completes.

**Why wrong:** The JSON config is small (< 2KB). On any reasonable connection this load completes in milliseconds. A blocking spinner adds perceived latency for no gain.

**Do this instead:** Load config during the 3-second countdown. If load fails, fall back silently to hardcoded defaults (same pattern as `StorageService` silent-fail). The fallback values are exactly the v1.0 `FLOWER_CONFIGS` and `PHASE_CONFIGS` constants.

---

## Integration Points Summary

| Boundary | v1.0 Communication | v1.1 Change |
|----------|--------------------|-------------|
| GameController → FlowerFSM | `getState(nowMs)`, `getScore(nowMs)`, `collect()` | Add `addPauseOffset(ms)` |
| GameController → Grid | `spawnFlower()`, `clearAll()`, `getAliveCount()` | Add `spawnSpecialFlower()`, `getSpecialType()`, `clearSpecialType()` |
| GameController → SpawnManager | `getPhaseConfig()`, `pickFlowerType()` | Constructor requires injected phases; add `pickSpecialSpawn()` |
| GameController → GridRenderer | `setCellTypeId()`, `setInputEnabled()`, juice calls | `setCellTypeId()` gains optional `specialType`; add `playScreenShake()` |
| GameController → GameState | `applyCorrectTap(rawScore, combo)` | Add `powerUpMultiplier` parameter |
| GameController → JuiceHelpers | Not called (logic duplicated inline in v1.0) | Refactor to call `getUrgencyStage()` + `getMilestoneLabel()` |
| Config JSON → GameConfig.parse() | n/a (hardcoded) | NEW boundary — Cocos asset load → pure parse |
| GameController pause state | n/a | NEW — `_pauseSession()` / `_resumeSession()` propagate offset to all live FSMs |

---

## Sources

- Full source read: `FlowerFSM.ts`, `Grid.ts`, `SpawnManager.ts`, `ComboSystem.ts`, `GameState.ts`, `GameController.ts`, `GridRenderer.ts`, `JuiceHelpers.ts`, `FlowerTypes.ts`, `StorageService.ts`
- `.planning/PROJECT.md` — v1.1 feature list and architectural constraints
- Cocos Creator 3.8.x Sprite/SpriteAtlas API (training data; HIGH confidence — standard Cocos patterns unchanged since 3.6)
- Pause offset strategy derived from timestamp-based FSM first principles (architectural reasoning; HIGH confidence)

---
*Architecture research for: Bloom Tap v1.1 — config-driven, power-ups, pause*
*Researched: 2026-03-17*
