# Phase 2: Core Game Logic - Research

**Researched:** 2026-03-14
**Domain:** Pure TypeScript game logic — FlowerFSM, Grid, ComboSystem, SpawnManager — no Cocos engine dependency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**5 Flower Type Configs (all values locked, tune after Phase 4 playtesting)**

| Species | Type ID | Cycle | Tap Window | BLOOMING (2/3) | FULL_BLOOM (1/3) | WILTING | DEAD | Score Bud | Score Full |
|---------|---------|-------|-----------|----------------|------------------|---------|------|-----------|------------|
| Anh Dao | CHERRY | 3s | 30% (0.9s) | 0.6s | 0.3s | 0.45s | 0.3s | 80pts | 120pts |
| Sen | LOTUS | 4.5s | 40% (1.8s) | 1.2s | 0.6s | 0.63s | 0.36s | 60pts | 90pts |
| Cuc | CHRYSANTHEMUM | 6s | 50% (3s) | 2s | 1s | 0.78s | 0.42s | 40pts | 60pts |
| Hong | ROSE | 8s | 60% (4.8s) | 3.2s | 1.6s | 0.88s | 0.48s | 25pts | 40pts |
| Huong Duong | SUNFLOWER | 10s | 70% (7s) | 4.67s | 2.33s | 0.8s | 0.5s | 15pts | 25pts |

BUD duration = cycle - tap_window - wilting - dead.

**Score formula when tapping:**
```
score = scoreBloom + (t / tap_window) * (scoreFull - scoreBloom)
```
Where `t` = seconds elapsed since start of BLOOMING; `tap_window` = BLOOMING + FULL_BLOOM duration.

**Penalty formula for wrong tap:**
| Case | Formula |
|------|---------|
| Tap empty cell | -20 pts fixed |
| Tap BUD | -(seconds remaining until BLOOMING × scoreFull) |
| Tap WILTING/DEAD | -(seconds wilted × scoreFull) |

Score can go negative mid-session; floor to 0 at end-of-session summary.

**FlowerFSM — 6 States**
```
BUD -> BLOOMING -> FULL_BLOOM -> WILTING -> DEAD -> [auto-clear]
                      |
                  COLLECTED -> EMPTY
```
- Tap BLOOMING: cell clears immediately to EMPTY
- Tap FULL_BLOOM: transitions to COLLECTED (Phase 3 runs effect), then EMPTY
- COLLECTED does not allow new flower spawn on that cell
- After DEAD timer expires: cell marked cleared (Phase 3 handles fade-out), then EMPTY
- State derivation: `state = f(performance.now() - spawnTimestamp, flowerTypeConfig)` — NOT delta accumulation

**ComboSystem multiplier rules**
- Init: multiplier = 1x, step = 0.5, tapCount = 0
- Correct tap: `multiplier += currentStep`, `tapCount += 1`
- Step halving thresholds:
  - Taps 1-10: step = +0.5 (multiplier up to 6x)
  - Taps 11-50: step = +0.25 (multiplier up to 16x)
  - Taps 51-100: step = +0.125 (multiplier up to 22.25x)
  - Taps 101+: step = +0.125 (no further reduction)
- Wrong tap: multiplier -> 1x, step -> 0.5, tapCount -> 0
- Score application: `finalScore = interpolatedScore * currentMultiplier`

**SpawnManager — 3 phase configs**
| Phase | Time | Interval | Max Alive |
|-------|------|----------|-----------|
| Phase 1 | 0-40s | 3s | 8 flowers |
| Phase 2 | 40-80s | 2s | 16 flowers |
| Phase 3 | 80-120s | 1s | 28 flowers |

Mechanism: interval-based + max-alive cap. If alive >= N: skip, wait for next interval (no retry).

**Flower type weights per phase**
| Species | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| SUNFLOWER | 35% | 15% | 5% |
| ROSE | 30% | 20% | 10% |
| CHRYSANTHEMUM | 20% | 30% | 20% |
| LOTUS | 10% | 20% | 30% |
| CHERRY | 5% | 15% | 35% |

**Architecture constraints (from STATE.md)**
- All Phase 2 logic is pure TypeScript — no import from 'cc'
- FlowerFSM uses performance.now() — timestamp-based, never delta accumulation
- Grid is flat 64-cell array, no rendering dependency
- Pure logic tier is testable without a browser

### Claude's Discretion

None specified in CONTEXT.md — all Phase 2 logic values are locked.

### Deferred Ideas (OUT OF SCOPE)

| Decision | Notes |
|----------|-------|
| Combo reset when flower wilts without tap | Currently no effect — review after playtesting |
| Balance of spawn rate / max alive values | Tune after Phase 3 is running |
| COLLECTED state duration | Phase 3 decides based on animation duration |
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRID-01 | 8x8 grid with 64 individually tappable cells | Flat array of 64 Cell objects; `getRandomEmptyCell()` and `spawnFlower(cell, type)` / `clearCell(cell)` APIs; no Cocos import |
| GRID-02 | Grid scales responsively for mobile screens | Phase 2 delivers only data model (flat array, index math); visual scaling is Phase 3's concern |
| FLOW-01 | 5 flower types, each with distinct cycle speed and base score | FlowerTypeConfig lookup table with CHERRY/LOTUS/CHRYSANTHEMUM/ROSE/SUNFLOWER; all values locked in CONTEXT.md |
| FLOW-02 | Each flower has 5 states: Bud / Bloom / Full Bloom / Wilt / Dead | FlowerFSM.getState(now) derives BUD/BLOOMING/FULL_BLOOM/WILTING/DEAD/COLLECTED from timestamp |
| FLOW-03 | 5 states visually distinguishable without reading text | Data-model only in Phase 2; visual differentiation is Phase 3 renderer concern; Phase 2 must expose state clearly |
| FLOW-04 | Flowers spawn at configurable rate per phase | SpawnManager holds phase configs; `getPhaseConfig(elapsedMs)` returns active config object |
</phase_requirements>

---

## Summary

Phase 2 delivers all core game rules as pure, browser-independent TypeScript. The four systems — FlowerFSM, Grid, ComboSystem, SpawnManager — have no import from 'cc' and no canvas dependency. This is both a design choice (clean architecture) and a technical necessity: Cocos Creator 3.8 TypeScript cannot be imported in a test runner (Jest/Vitest cannot resolve the 'cc' module), so any code that imports Cocos types cannot be unit-tested outside the engine.

The central pattern is timestamp-based state derivation for FlowerFSM. Instead of accumulating delta-time and mutating state on each frame tick, FlowerFSM computes its state as a pure function of `(now - spawnTimestamp)`. This is unit-testable by injecting a fake `now` value, and eliminates timer drift over the 120-second session. All timing thresholds are derived from the locked FlowerTypeConfig table.

Test infrastructure for this phase requires a separate `package.json` and Vitest config outside the Cocos project assets/ folder, because the Cocos project root has its own TypeScript compilation pipeline that cannot be shared with a test runner. Game logic files must be importable as plain `.ts` files with no 'cc' imports.

**Primary recommendation:** Implement all four systems (FlowerFSM, Grid, ComboSystem, SpawnManager) as plain TypeScript classes in `assets/scripts/logic/`, with zero engine imports. Install Vitest in the project root with a `vitest.config.ts` pointing at `assets/scripts/logic/**/*.test.ts`. Each system gets one test file; tests inject fake timestamps to avoid real-time delays.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 4.1.0 (bundled with Cocos Creator 3.8) | Game logic implementation | Already in project; strict mode on; all logic files must be valid Cocos-compatible TS |
| Vitest | ^3.x (latest 2026) | Unit test runner for pure logic | Native ESM + TypeScript support out of the box; no ts-jest or Babel needed; Jest-compatible API; works without Vite project (uses `vitest/config` import) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vitest/coverage-v8` | Latest | Test coverage reports | Optional; use if coverage reporting is needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest requires ts-jest or Babel to handle TypeScript/ESM; more config; Vitest is zero-config for TS |
| Vitest | Bun test | Bun test is fast but requires Bun runtime; project uses Node + npm; adds toolchain dependency |
| Flat 64-cell array for Grid | 2D array `Cell[][]` | 2D array requires coordinate translation everywhere; flat array with index math `idx = row*8+col` is simpler and more cache-friendly |
| Timestamp-based FSM | Delta accumulator FSM | Delta accumulator drifts over 120s; cannot be unit-tested with a fake clock easily |

### Installation

Vitest is installed at the **project root** (same level as `assets/`), NOT inside `assets/`:

```bash
# From the Cocos Creator project root (where package.json lives)
npm install -D vitest
```

No additional peer dependencies needed for pure TypeScript testing without DOM.

---

## Architecture Patterns

### Recommended Project Structure

```
assets/
├── scripts/
│   ├── logic/               # Pure TypeScript — NO 'cc' imports here
│   │   ├── FlowerTypes.ts   # FlowerTypeId enum + FlowerTypeConfig table
│   │   ├── FlowerFSM.ts     # State machine: timestamp-based derivation
│   │   ├── FlowerState.ts   # FlowerState enum (BUD/BLOOMING/FULL_BLOOM/WILTING/DEAD/COLLECTED)
│   │   ├── Grid.ts          # 64-cell flat array, spawnFlower, clearCell, getRandomEmptyCell
│   │   ├── ComboSystem.ts   # Multiplier counter, correct/wrong tap handlers
│   │   └── SpawnManager.ts  # Phase configs, getPhaseConfig(elapsedMs), weighted random type
│   └── (Cocos components — Phase 3+)
└── (scenes, resources — Phase 3+)

# Test files co-located alongside logic files OR in a parallel test/ folder:
assets/scripts/logic/FlowerFSM.test.ts
assets/scripts/logic/Grid.test.ts
assets/scripts/logic/ComboSystem.test.ts
assets/scripts/logic/SpawnManager.test.ts

# Test runner config at project root:
vitest.config.ts
```

### Pattern 1: Timestamp-Based State Derivation (FlowerFSM)

**What:** FlowerFSM does not hold mutable state that ticks on every frame. Instead, `getState(nowMs: number)` is a pure function that computes the current state from elapsed time. The only stored value is `spawnTimestamp` (the `performance.now()` value at spawn time).

**When to use:** Any time-progressing state that must be testable without a running game loop.

**Why it works for testing:** Pass any fake `now` value to `getState()` to test any state at any elapsed time. No mocking of timers needed.

**Example:**
```typescript
// Source: Architecture decision from STATE.md + CONTEXT.md
// FlowerTypes.ts
export enum FlowerTypeId {
    CHERRY = 'CHERRY',
    LOTUS = 'LOTUS',
    CHRYSANTHEMUM = 'CHRYSANTHEMUM',
    ROSE = 'ROSE',
    SUNFLOWER = 'SUNFLOWER',
}

export interface FlowerTypeConfig {
    id: FlowerTypeId;
    cycleDurationMs: number;
    tapWindowMs: number;       // BLOOMING + FULL_BLOOM duration
    bloomingMs: number;        // 2/3 of tap window
    fullBloomMs: number;       // 1/3 of tap window
    wiltingMs: number;
    deadMs: number;
    budMs: number;             // cycle - tapWindow - wilting - dead
    scoreBloom: number;        // score at start of tap window
    scoreFull: number;         // score at end of tap window
}

// FlowerState.ts
export enum FlowerState {
    BUD = 'BUD',
    BLOOMING = 'BLOOMING',
    FULL_BLOOM = 'FULL_BLOOM',
    WILTING = 'WILTING',
    DEAD = 'DEAD',
    COLLECTED = 'COLLECTED',
}

// FlowerFSM.ts
import { FlowerTypeConfig } from './FlowerTypes';
import { FlowerState } from './FlowerState';

export class FlowerFSM {
    private _spawnTimestamp: number;
    private _config: FlowerTypeConfig;
    private _collected: boolean = false;

    constructor(spawnTimestamp: number, config: FlowerTypeConfig) {
        this._spawnTimestamp = spawnTimestamp;
        this._config = config;
    }

    getState(nowMs: number): FlowerState {
        if (this._collected) return FlowerState.COLLECTED;
        const elapsed = nowMs - this._spawnTimestamp;
        const cfg = this._config;
        if (elapsed < cfg.budMs) return FlowerState.BUD;
        if (elapsed < cfg.budMs + cfg.bloomingMs) return FlowerState.BLOOMING;
        if (elapsed < cfg.budMs + cfg.tapWindowMs) return FlowerState.FULL_BLOOM;
        if (elapsed < cfg.budMs + cfg.tapWindowMs + cfg.wiltingMs) return FlowerState.WILTING;
        return FlowerState.DEAD;
    }

    collect(): void {
        this._collected = true;
    }

    /** Returns interpolated score if tappable, null if not in tap window */
    getScore(nowMs: number): number | null {
        const state = this.getState(nowMs);
        if (state !== FlowerState.BLOOMING && state !== FlowerState.FULL_BLOOM) return null;
        const elapsed = nowMs - this._spawnTimestamp;
        const t = elapsed - this._config.budMs; // time since BLOOMING started
        const cfg = this._config;
        return cfg.scoreBloom + (t / cfg.tapWindowMs) * (cfg.scoreFull - cfg.scoreBloom);
    }
}
```

### Pattern 2: Flat 64-Cell Grid

**What:** Grid stores a flat array of 64 `Cell` objects. Each cell holds its row, column, index, and a reference to a `FlowerFSM | null`. Index math: `index = row * 8 + col`.

**When to use:** All grid state operations — spawn, clear, query, random-empty-pick.

**Example:**
```typescript
// Grid.ts — no 'cc' imports
import { FlowerFSM } from './FlowerFSM';
import { FlowerTypeConfig } from './FlowerTypes';

export interface Cell {
    index: number;
    row: number;
    col: number;
    flower: FlowerFSM | null;
}

export class Grid {
    private _cells: Cell[];

    constructor() {
        this._cells = Array.from({ length: 64 }, (_, i) => ({
            index: i,
            row: Math.floor(i / 8),
            col: i % 8,
            flower: null,
        }));
    }

    getCell(row: number, col: number): Cell {
        return this._cells[row * 8 + col];
    }

    getCells(): readonly Cell[] {
        return this._cells;
    }

    getRandomEmptyCell(): Cell | null {
        const empty = this._cells.filter(c => c.flower === null);
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }

    spawnFlower(cell: Cell, config: FlowerTypeConfig, nowMs: number): FlowerFSM {
        const fsm = new FlowerFSM(nowMs, config);
        cell.flower = fsm;
        return fsm;
    }

    clearCell(cell: Cell): void {
        cell.flower = null;
    }

    getAliveCount(nowMs: number): number {
        return this._cells.filter(c =>
            c.flower !== null && c.flower.getState(nowMs) !== 'DEAD'
        ).length;
    }
}
```

### Pattern 3: ComboSystem — Step-Threshold Counter

**What:** ComboSystem tracks consecutive correct taps with a multiplier that grows in steps. The step itself halves at defined tapCount thresholds. Any wrong tap resets everything.

**Example:**
```typescript
// ComboSystem.ts — no 'cc' imports
export class ComboSystem {
    private _multiplier: number = 1;
    private _step: number = 0.5;
    private _tapCount: number = 0;

    get multiplier(): number { return this._multiplier; }
    get tapCount(): number { return this._tapCount; }

    onCorrectTap(): void {
        this._multiplier += this._step;
        this._tapCount += 1;
        // Halve step at thresholds
        if (this._tapCount === 10) this._step = 0.25;
        else if (this._tapCount === 50) this._step = 0.125;
        // tapCount > 100: step stays 0.125
    }

    onWrongTap(): void {
        this._multiplier = 1;
        this._step = 0.5;
        this._tapCount = 0;
    }

    applyToScore(rawScore: number): number {
        return rawScore * this._multiplier;
    }
}
```

### Pattern 4: SpawnManager — Phase Config Lookup

**What:** SpawnManager holds the three phase configs and a weighted random flower-type picker. `getPhaseConfig(elapsedMs)` returns the active config. `pickFlowerType(elapsedMs)` does weighted random selection.

**Example:**
```typescript
// SpawnManager.ts — no 'cc' imports
import { FlowerTypeId } from './FlowerTypes';

export interface SpawnPhaseConfig {
    startMs: number;
    endMs: number;
    intervalMs: number;
    maxAlive: number;
    weights: Record<FlowerTypeId, number>;
}

const PHASE_CONFIGS: SpawnPhaseConfig[] = [
    {
        startMs: 0, endMs: 40_000, intervalMs: 3_000, maxAlive: 8,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 35,
            [FlowerTypeId.ROSE]: 30,
            [FlowerTypeId.CHRYSANTHEMUM]: 20,
            [FlowerTypeId.LOTUS]: 10,
            [FlowerTypeId.CHERRY]: 5,
        },
    },
    {
        startMs: 40_000, endMs: 80_000, intervalMs: 2_000, maxAlive: 16,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 15,
            [FlowerTypeId.ROSE]: 20,
            [FlowerTypeId.CHRYSANTHEMUM]: 30,
            [FlowerTypeId.LOTUS]: 20,
            [FlowerTypeId.CHERRY]: 15,
        },
    },
    {
        startMs: 80_000, endMs: 120_000, intervalMs: 1_000, maxAlive: 28,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 5,
            [FlowerTypeId.ROSE]: 10,
            [FlowerTypeId.CHRYSANTHEMUM]: 20,
            [FlowerTypeId.LOTUS]: 30,
            [FlowerTypeId.CHERRY]: 35,
        },
    },
];

export class SpawnManager {
    getPhaseConfig(elapsedMs: number): SpawnPhaseConfig {
        for (const cfg of PHASE_CONFIGS) {
            if (elapsedMs >= cfg.startMs && elapsedMs < cfg.endMs) return cfg;
        }
        // Past 120s: return last config (session should have ended)
        return PHASE_CONFIGS[PHASE_CONFIGS.length - 1];
    }

    pickFlowerType(elapsedMs: number): FlowerTypeId {
        const cfg = this.getPhaseConfig(elapsedMs);
        const entries = Object.entries(cfg.weights) as [FlowerTypeId, number][];
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let rand = Math.random() * total;
        for (const [typeId, weight] of entries) {
            rand -= weight;
            if (rand <= 0) return typeId;
        }
        return entries[entries.length - 1][0];
    }
}
```

### Pattern 5: FlowerTypeConfig Lookup Table

**What:** All five flower configs in a single exported constant. This is the single source of truth referenced by FlowerFSM constructor calls.

```typescript
// FlowerTypes.ts (continued)
import { FlowerTypeId, FlowerTypeConfig } from './FlowerTypes';

export const FLOWER_CONFIGS: Record<FlowerTypeId, FlowerTypeConfig> = {
    [FlowerTypeId.CHERRY]: {
        id: FlowerTypeId.CHERRY,
        cycleDurationMs: 3000,
        tapWindowMs: 900,
        bloomingMs: 600,
        fullBloomMs: 300,
        wiltingMs: 450,
        deadMs: 300,
        budMs: 3000 - 900 - 450 - 300, // = 1350ms
        scoreBloom: 80,
        scoreFull: 120,
    },
    [FlowerTypeId.LOTUS]: {
        id: FlowerTypeId.LOTUS,
        cycleDurationMs: 4500,
        tapWindowMs: 1800,
        bloomingMs: 1200,
        fullBloomMs: 600,
        wiltingMs: 630,
        deadMs: 360,
        budMs: 4500 - 1800 - 630 - 360, // = 1710ms
        scoreBloom: 60,
        scoreFull: 90,
    },
    [FlowerTypeId.CHRYSANTHEMUM]: {
        id: FlowerTypeId.CHRYSANTHEMUM,
        cycleDurationMs: 6000,
        tapWindowMs: 3000,
        bloomingMs: 2000,
        fullBloomMs: 1000,
        wiltingMs: 780,
        deadMs: 420,
        budMs: 6000 - 3000 - 780 - 420, // = 1800ms
        scoreBloom: 40,
        scoreFull: 60,
    },
    [FlowerTypeId.ROSE]: {
        id: FlowerTypeId.ROSE,
        cycleDurationMs: 8000,
        tapWindowMs: 4800,
        bloomingMs: 3200,
        fullBloomMs: 1600,
        wiltingMs: 880,
        deadMs: 480,
        budMs: 8000 - 4800 - 880 - 480, // = 1840ms
        scoreBloom: 25,
        scoreFull: 40,
    },
    [FlowerTypeId.SUNFLOWER]: {
        id: FlowerTypeId.SUNFLOWER,
        cycleDurationMs: 10000,
        tapWindowMs: 7000,
        bloomingMs: 4670,
        fullBloomMs: 2330,
        wiltingMs: 800,
        deadMs: 500,
        budMs: 10000 - 7000 - 800 - 500, // = 1700ms
        scoreBloom: 15,
        scoreFull: 25,
    },
};
```

### Anti-Patterns to Avoid

- **Importing 'cc' in logic files:** Any file under `assets/scripts/logic/` that contains `import { ... } from 'cc'` cannot be tested by Vitest. The separation is a hard boundary — logic files must have zero engine imports.
- **Delta-time accumulation for flower timers:** Accumulating `elapsed += deltaTime` in each `update()` frame drifts by 50-100ms over 120 seconds due to floating point rounding per frame. Always store `spawnTimestamp` and compute `now - spawnTimestamp`.
- **Mutating state on every update tick:** FlowerFSM should not have a `tick()` method that changes internal state. It derives state on demand from `getState(nowMs)`. This makes the class intrinsically testable.
- **Storing FlowerState as a mutable property:** If `_state: FlowerState` is stored and updated, race conditions emerge when multiple systems read/write it. Pure derivation eliminates this.
- **Random in constructor:** `getRandomEmptyCell()` uses `Math.random()` internally. Do not seed or call random in constructors — it makes tests non-deterministic. Tests that need determinism should mock `Math.random` or use dependency injection for a random source.
- **ComboSystem computing step from tapCount each call:** Compute `_step` incrementally (update on `onCorrectTap()`), not recalculated from `tapCount` each time. The halving thresholds are one-time events at specific counts, not range checks every call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript test runner | Custom test harness with console.assert | Vitest | Vitest gives describe/it/expect, watch mode, coverage, fast re-runs — building a test harness is weeks of work |
| Weighted random selection | Complex custom random library | Simple weighted-sum loop (see Pattern 4) | This specific use case (5 weights summing to 100) is simple enough that a 10-line function is correct; external libraries add unnecessary dependency |
| State machine library | XState, @edium/fsm | Custom FlowerFSM (see Pattern 1) | The FSM here has exactly one trigger (time), no events, and 6 fixed states — a full state machine library adds complexity with no benefit. The timestamp-derivation pattern is simpler and more testable than any transition-event library |
| Float-point-safe time comparison | Custom epsilon comparisons | Direct ms integer comparison | Store all durations as whole milliseconds (e.g., 3000 not 3.0). Integer arithmetic in ms avoids all float comparison edge cases |

**Key insight:** The logic in Phase 2 is simple by design. The value is in the clean separation from the engine, not in sophisticated patterns. Resist the urge to add abstraction layers (event buses, reactive state, state machine libraries) — they make the code harder to test and slower to iterate on.

---

## Common Pitfalls

### Pitfall 1: Importing Cocos Types in Logic Files

**What goes wrong:** Vitest (or any test runner) fails with `Cannot find module 'cc'` because 'cc' is a virtual module provided by the Cocos Creator runtime. No test runner can resolve it.

**Why it happens:** Developers reach for Cocos utility types (`Vec2`, `Color`, etc.) in logic files for convenience. Once any logic file imports from 'cc', the entire import chain becomes untestable.

**How to avoid:** Enforce a rule: files in `assets/scripts/logic/` must have zero `from 'cc'` imports. Use plain TypeScript types (`{x: number, y: number}` instead of `Vec2`, `number` for colors instead of `Color`). Cocos component files (Phase 3+) live in a separate folder and may import 'cc' — they translate between Cocos types and logic types.

**Warning signs:** `vitest run` fails with module resolution errors. Any logic file that makes the IDE suggest 'cc' auto-imports is in the wrong layer.

### Pitfall 2: Float Duration Storage Causing State Boundary Errors

**What goes wrong:** Flower state flickers at boundaries or reports wrong state due to floating point comparison. For example, a flower at exactly `elapsed === budMs` might oscillate between BUD and BLOOMING.

**Why it happens:** If durations are stored as floats (e.g., `budMs: 1.35` representing 1.35 seconds) and `elapsed` is computed in fractional ms, comparisons like `elapsed < budMs` become unreliable.

**How to avoid:** Store all durations as integer milliseconds. `performance.now()` returns floating-point ms but the comparison `elapsed < 1350` (integer) is stable. All values in the FlowerTypeConfig table are already expressible as whole milliseconds when multiplied by 1000 — use whole numbers throughout.

**Warning signs:** Unit tests that inject exact boundary timestamps fail intermittently. State transitions appear to happen a frame early or late in the engine preview.

### Pitfall 3: Vitest Config Interfering with Cocos TypeScript Compilation

**What goes wrong:** Adding `vitest.config.ts` at the project root (where Cocos' `package.json` and `tsconfig.json` live) causes Cocos Creator to pick up unexpected files or `vitest` type definitions pollute the Cocos compilation.

**Why it happens:** Cocos Creator 3.8 watches the project root's `tsconfig.json`. If `vitest/globals` types are added to that tsconfig, Cocos' compiler sees `describe`, `it`, `expect` as globals and may warn or error. Conversely, if the test tsconfig is separate, IDE type checking for test files may be incomplete.

**How to avoid:** Create a separate `tsconfig.test.json` at the project root that extends the base tsconfig but adds Vitest types. Point `vitest.config.ts` at this tsconfig. Do NOT add `"types": ["vitest/globals"]` to the main Cocos `tsconfig.json`.

```json
// tsconfig.test.json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "types": ["vitest/globals"]
    },
    "include": ["assets/scripts/logic/**/*.ts"]
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['assets/scripts/logic/**/*.test.ts'],
    },
});
```

**Warning signs:** Cocos Creator editor shows TypeScript errors in non-test files mentioning `describe` or `it`. Or: test files show type errors for `expect()` despite Vitest being installed.

### Pitfall 4: ComboSystem Step Recalculated From tapCount Instead of Tracked Incrementally

**What goes wrong:** Implementing `_step` as a computed property from `tapCount` using if/else ranges (e.g., `if (tapCount > 50 && tapCount <= 100) step = 0.125`) means the step is correct for new instances but breaks if `tapCount` is ever set directly or the logic is ported.

**Why it happens:** The threshold logic looks like it should be a derived value from `tapCount`. But it's actually a one-time event at threshold crossings — the step halves ONCE at tap 10, ONCE at tap 50.

**How to avoid:** Track `_step` as a mutable instance variable. Update it only in `onCorrectTap()` at the precise threshold crossings. Do not compute it from `tapCount` range checks.

**Warning signs:** After resetting combo (wrong tap), `tapCount` goes to 0 but the step stays correct — this is fine. What fails is if a test simulates 60 taps starting mid-session and the step comes out wrong because the range check sees tapCount=60 and assigns step=0.125 without the intermediate halving at tap 50.

### Pitfall 5: SpawnManager Not Guarding the 120s Boundary

**What goes wrong:** At exactly `elapsedMs = 120_000`, `getPhaseConfig()` falls off all three phase ranges (0-40k, 40-80k, 80-120k) and returns undefined or throws.

**Why it happens:** Phase 3 ends at 80,000ms but a strict `< 80_000` check means `elapsedMs = 80_000` falls to Phase 3's config check `>= 80_000 && < 120_000`, which works — but at exactly 120,000ms, all checks fail.

**How to avoid:** The fallback at the end of `getPhaseConfig()` should return the last config (Phase 3), not throw. The session should already be over at 120s, but defensive coding here prevents a crash if called slightly late.

**Warning signs:** Unit test that passes `elapsedMs = 120_000` to `getPhaseConfig()` throws or returns undefined.

---

## Code Examples

Verified patterns from architecture decisions:

### Vitest minimal config for logic-only testing
```typescript
// vitest.config.ts (project root)
// Source: https://vitest.dev/guide/
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['assets/scripts/logic/**/*.test.ts'],
    },
});
```

### Sample unit test for FlowerFSM
```typescript
// assets/scripts/logic/FlowerFSM.test.ts
import { describe, it, expect } from 'vitest';
import { FlowerFSM } from './FlowerFSM';
import { FLOWER_CONFIGS } from './FlowerTypes';
import { FlowerTypeId } from './FlowerTypes';
import { FlowerState } from './FlowerState';

describe('FlowerFSM - CHERRY', () => {
    const config = FLOWER_CONFIGS[FlowerTypeId.CHERRY];
    // CHERRY: bud=1350ms, blooming=600ms, fullBloom=300ms, wilting=450ms, dead=300ms

    it('returns BUD before tap window', () => {
        const fsm = new FlowerFSM(0, config);
        expect(fsm.getState(1000)).toBe(FlowerState.BUD);
    });

    it('returns BLOOMING at start of tap window', () => {
        const fsm = new FlowerFSM(0, config);
        expect(fsm.getState(1350)).toBe(FlowerState.BLOOMING);
    });

    it('returns FULL_BLOOM in last third of tap window', () => {
        const fsm = new FlowerFSM(0, config);
        expect(fsm.getState(1350 + 600)).toBe(FlowerState.FULL_BLOOM);
    });

    it('returns WILTING after tap window', () => {
        const fsm = new FlowerFSM(0, config);
        expect(fsm.getState(1350 + 900)).toBe(FlowerState.WILTING);
    });

    it('returns DEAD after wilting', () => {
        const fsm = new FlowerFSM(0, config);
        expect(fsm.getState(1350 + 900 + 450)).toBe(FlowerState.DEAD);
    });
});
```

### Sample unit test for ComboSystem
```typescript
// assets/scripts/logic/ComboSystem.test.ts
import { describe, it, expect } from 'vitest';
import { ComboSystem } from './ComboSystem';

describe('ComboSystem', () => {
    it('starts at 1x multiplier', () => {
        const combo = new ComboSystem();
        expect(combo.multiplier).toBe(1);
    });

    it('increments multiplier by 0.5 on first correct tap', () => {
        const combo = new ComboSystem();
        combo.onCorrectTap();
        expect(combo.multiplier).toBe(1.5);
    });

    it('resets to 1x on wrong tap', () => {
        const combo = new ComboSystem();
        combo.onCorrectTap();
        combo.onCorrectTap();
        combo.onWrongTap();
        expect(combo.multiplier).toBe(1);
        expect(combo.tapCount).toBe(0);
    });

    it('halves step to 0.25 after tap 10', () => {
        const combo = new ComboSystem();
        for (let i = 0; i < 10; i++) combo.onCorrectTap();
        const multiplierAt10 = combo.multiplier;
        combo.onCorrectTap();
        expect(combo.multiplier).toBe(multiplierAt10 + 0.25);
    });
});
```

### package.json test scripts
```json
{
    "scripts": {
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage"
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Logic in Cocos Components (update loop) | Pure TypeScript classes in `logic/` folder | Architecture decision (STATE.md) | Logic is testable without engine; prevents logic-in-renderer drift |
| Delta accumulator for timers | Timestamp-based derivation (`now - spawnTimestamp`) | Architecture decision (STATE.md) | No drift over 120s; fully unit-testable with fake timestamps |
| Jest for TypeScript | Vitest for TypeScript | 2024-2025 ecosystem shift | Vitest is zero-config for ESM+TS; Jest requires ts-jest or Babel |
| XState / state machine libraries | Custom minimal FSM | Phase 2 scoping | 6 fixed states driven by a single time variable; a library adds complexity without benefit |

**Deprecated/outdated:**
- Using `cc.js` module mock for Jest: Community attempts to mock 'cc' with `jest.mock('cc', ...)` exist but are fragile, unmaintained, and not needed if logic is properly separated from engine code.
- Delta accumulation pattern for game entity timers: Was common in older game code; timestamp-based is strictly better for testability and drift prevention.

---

## Open Questions

1. **Does Cocos Creator 3.8 project root `package.json` have an existing `scripts` section that conflicts with adding `"test": "vitest"`?**
   - What we know: Cocos generates a `package.json` at project root with engine dependencies. It may already have scripts.
   - What's unclear: Whether Cocos' generated scripts interfere with adding `test` and `test:run` entries.
   - Recommendation: In Wave 0 of the plan, read the generated `package.json` and add Vitest scripts without removing existing ones. There should be no conflict.

2. **Do Vitest's Node.js requirements (Node >= 20) match the developer environment?**
   - What we know: Vitest 3.x requires Node >= 20. Cocos Creator 3.8 has its own Node.js bundled for build tools but the project's package.json is managed with the system Node.
   - What's unclear: Whether the developer's system Node is >= 20.
   - Recommendation: Wave 0 task should verify `node --version` before installing Vitest. If < 20, use Vitest 2.x which supports Node >= 18.

3. **SUNFLOWER `bloomingMs` precision: 4.67s vs exact 2/3 of 7s**
   - What we know: CONTEXT.md states BLOOMING = 4.67s and FULL_BLOOM = 2.33s for SUNFLOWER (total = 7.00s — correct). These are rounded values.
   - What's unclear: Whether to use 4670ms + 2330ms (total 7000ms, exact) or 4666ms + 2334ms (exact 2/3 and 1/3).
   - Recommendation: Use 4670ms + 2330ms so the total equals exactly 7000ms. The 3ms rounding difference is imperceptible to players and keeps integer arithmetic clean. Document this explicitly in FlowerTypes.ts.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest 3.x) |
| Config file | `vitest.config.ts` at project root (Wave 0 — does not exist yet) |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run test:run -- --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRID-01 | Grid has 64 cells; `getRandomEmptyCell()` returns cell or null; `spawnFlower` and `clearCell` mutate state correctly | unit | `npm run test:run -- Grid.test.ts` | No — Wave 0 |
| GRID-02 | Grid data model exposes row/col/index correctly; responsive scaling is Phase 3 renderer concern | unit | `npm run test:run -- Grid.test.ts` | No — Wave 0 |
| FLOW-01 | All 5 FlowerTypeConfigs exist with correct values | unit | `npm run test:run -- FlowerTypes.test.ts` | No — Wave 0 |
| FLOW-02 | FlowerFSM.getState(now) returns correct state for any elapsed time | unit | `npm run test:run -- FlowerFSM.test.ts` | No — Wave 0 |
| FLOW-03 | State is clearly exposed for renderer to differentiate visually | unit | `npm run test:run -- FlowerFSM.test.ts` (state enum completeness) | No — Wave 0 |
| FLOW-04 | SpawnManager.getPhaseConfig(elapsedMs) returns correct config for 0-40s, 40-80s, 80-120s | unit | `npm run test:run -- SpawnManager.test.ts` | No — Wave 0 |

Additional test coverage (beyond requirements):
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| ComboSystem multiplier increments and resets correctly | unit | `npm run test:run -- ComboSystem.test.ts` | No — Wave 0 |
| FlowerFSM.getScore() interpolates correctly at BLOOMING start, midpoint, FULL_BLOOM end | unit | `npm run test:run -- FlowerFSM.test.ts` | No — Wave 0 |
| FlowerFSM.collect() transitions to COLLECTED and holds | unit | `npm run test:run -- FlowerFSM.test.ts` | No — Wave 0 |
| SpawnManager.pickFlowerType() returns only valid FlowerTypeIds | unit | `npm run test:run -- SpawnManager.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:run` — all tests must pass green
- **Per wave merge:** `npm run test:run -- --coverage` — verify coverage on all logic files
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — does not exist; create at project root
- [ ] `tsconfig.test.json` — does not exist; create to avoid polluting Cocos tsconfig with Vitest globals
- [ ] `assets/scripts/logic/FlowerTypes.ts` — does not exist
- [ ] `assets/scripts/logic/FlowerState.ts` — does not exist
- [ ] `assets/scripts/logic/FlowerFSM.ts` — does not exist
- [ ] `assets/scripts/logic/Grid.ts` — does not exist
- [ ] `assets/scripts/logic/ComboSystem.ts` — does not exist
- [ ] `assets/scripts/logic/SpawnManager.ts` — does not exist
- [ ] `assets/scripts/logic/FlowerFSM.test.ts` — does not exist
- [ ] `assets/scripts/logic/Grid.test.ts` — does not exist
- [ ] `assets/scripts/logic/ComboSystem.test.ts` — does not exist
- [ ] `assets/scripts/logic/SpawnManager.test.ts` — does not exist
- [ ] `assets/scripts/logic/FlowerTypes.test.ts` — does not exist (verify all 5 config shapes)
- [ ] Framework install: `npm install -D vitest` at project root

---

## Sources

### Primary (HIGH confidence)

- `STATE.md` — Architecture decisions: timestamp-based derivation, flat 64-cell array, pure logic tier; all treated as locked decisions
- `02-CONTEXT.md` — All flower type values, FSM state definitions, ComboSystem rules, SpawnManager phase configs — project-specific locked decisions
- `https://vitest.dev/guide/` — Vitest installation, config structure, key commands (fetched 2026-03-14)

### Secondary (MEDIUM confidence)

- Cocos Forum: `https://forum.cocosengine.org/t/how-to-run-jest-unit-tests-with-cocos-creator-version-3-8/59632` — confirms 'cc' module cannot be resolved by test runners; unresolved as of 2024; validates pure-logic separation as the correct architectural response
- `https://vitest.dev/config/` — `environment: 'node'`, `globals: true`, `include` pattern options (fetched 2026-03-14)
- `https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9` — Vitest recommended as default for new TypeScript projects in 2025

### Tertiary (LOW confidence)

- WebSearch result re: Vitest + pure TypeScript without Vite — confirms `import { defineConfig } from 'vitest/config'` is the correct import for non-Vite projects; not verified against official docs directly but consistent with fetched guide

---

## Metadata

**Confidence breakdown:**
- Standard stack (TypeScript + Vitest): HIGH — TypeScript is locked; Vitest verified via official docs fetch
- Architecture (timestamp FSM, flat grid, pure logic): HIGH — locked decisions from STATE.md and CONTEXT.md; no alternatives needed
- FlowerTypeConfig values: HIGH — all values are locked in CONTEXT.md by user decision
- Vitest/Cocos separation concern: HIGH — verified by Cocos forum thread showing 'cc' module resolution failure
- ComboSystem step-threshold logic: HIGH — fully specified in CONTEXT.md; code examples derived from spec directly
- SpawnManager weighted random: HIGH — algorithm is standard; values locked in CONTEXT.md

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (logic is project-specific and spec-locked; Vitest 30-day validity for version currency)
