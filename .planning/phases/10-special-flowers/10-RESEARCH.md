# Phase 10: Special Flowers - Research

**Researched:** 2026-03-21
**Domain:** Cocos Creator 3.x — power-up state machine, overlay spawning, per-frame timer effects, HUD circular progress
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Special flower identity**
- D-01: Special flower is an overlay on a regular flower — `Cell.isSpecial: boolean` flag. The underlying flower type (CHERRY, LOTUS, etc.) determines lifecycle and score.
- D-02: Tapping a special flower at correct bloom stage → player receives the regular flower's score plus activates the power-up effect.
- D-03: Tapping a special flower at wrong state (BUD/WILTING/DEAD) → same wrong-tap penalty + combo reset as a regular flower.
- D-04: `Cell.isSpecial` must be explicitly reset to `false` everywhere `cell.flower` is cleared (clearCell, clearAll, collect).

**Special flower spawning**
- D-05: Each flower spawn has a `specialChance`% probability to be marked special (configurable from JSON, e.g. 8%).
- D-06: Pity mechanic: if no special flower has appeared in the last 30s, the next spawn is guaranteed special. Pity timer resets each time a special flower spawns. (POLISH-03 pulled into Phase 10.)
- D-07: Effect type is assigned randomly at spawn time (1 of 3: SCORE_MULTIPLIER, TIME_FREEZE, SLOW_GROWTH). Player can see which effect via visual indicator from BUD state.

**Effect stacking (override of prior "never stack" decision)**
- D-08: Each effect type has its own independent slot — up to 3 effects active simultaneously (one SCORE_MULTIPLIER + one TIME_FREEZE + one SLOW_GROWTH).
- D-09: Tapping a special flower with the same effect type as an active effect → resets that effect's timer (does not add duration).
- D-10: Tapping a special flower with a different effect type → activates alongside existing effects.

**Effect: SCORE_MULTIPLIER**
- D-11: Multiplier value scales with game phase — Phase 1 → x2, Phase 2 → x3, Phase 3 → x5. Values configurable from JSON.
- D-12: Applied as an additional multiplier layer: `rawScore * combo.multiplier * powerUpMultiplier`. Duration ~6s (configurable).

**Effect: TIME_FREEZE**
- D-13: Only the countdown timer freezes — flowers continue cycling normally. Player gets extra real-world time to tap.
- D-14: Implementation approach: Claude decides the most appropriate technique consistent with the existing `_applyPauseOffset` pattern (rolling sessionStartMs or accumulator).

**Effect: SLOW_GROWTH**
- D-15: Only newly spawned flowers during the effect window receive a modified `cycleDurationMs` (spawn-time config copy). Live flowers are not mutated. Duration ~8s (configurable).

**Effect expiry**
- D-16: When an effect expires, HUD resets to no-effect state immediately — no expiry animation or notification.
- D-17: If the player pauses during active effects, all effect timers also pause. On resume, effects continue with their remaining duration.

**PowerUpState architecture**
- D-18: New pure logic class `PowerUpState` in `logic/` tier (no `cc` imports) — tracks active effects and expiry timestamps. GameController owns the instance. Fully testable with Vitest.

**HUD indicator**
- D-19: 3 icon slots in a horizontal row, each with a circular countdown timer rendered in code. Positioned directly below the grid, horizontally centered.
- D-20: Entire HUD effect area is hidden when no effects are active. Shown when at least 1 effect is active.
- D-21: Each icon shows: effect icon + circular timer only. No text label, no numeric countdown. Adjust after playtesting.
- D-22: Circular timer render technique: Claude decides (Cocos `ProgressBar` vs `Graphics` arc), consistent with codebase patterns.

### Claude's Discretion
- Exact `specialChance` default value in JSON
- Circular timer render technique (C-4, D-22)
- TIME_FREEZE timer-freeze technique (D-14) — rolling sessionStartMs preferred as it is consistent with `_applyPauseOffset`
- `PowerUpState` internal data structure (Map vs object fields)
- Visual color/icon distinguishing each effect type at BUD state (placeholder until Phase 12 art refresh)

### Deferred Ideas (OUT OF SCOPE)
- Hoa multi-tap: Tap vào không collect ngay, mỗi tap + điểm cho đến khi hết bloom window — mechanic mới, xem xét phase sau.
- Rarity tiers cho special flowers (nhiều loại special với xác suất khác nhau) — đã Out of Scope trong REQUIREMENTS.md, v2+.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPECIAL-01 | Hoa đặc biệt xuất hiện ngẫu nhiên trên bàn với visual riêng biệt, tần suất configurable từ JSON | D-05/D-06 spawn probability + pity; `Cell.isSpecial` overlay; GridRenderer reads flag for distinct color |
| SPECIAL-02 | Người chơi tap hoa đặc biệt để kích hoạt score multiplier (x2–x5) cho tất cả hoa trong khoảng thời gian configurable (~6 giây) | D-11/D-12 multiplier layer in `applyCorrectTap`; `PowerUpState.getScoreMultiplier()` queried per tap |
| SPECIAL-03 | Người chơi tap hoa đặc biệt để freeze đồng hồ đếm ngược trong khoảng thời gian configurable (~5 giây) | D-13/D-14 rolling `sessionStartMs` accumulator per frame while active; `isGameOver()` reads shifted value |
| SPECIAL-04 | Người chơi tap hoa đặc biệt để làm chậm tốc độ phát triển của hoa mới trong khoảng thời gian configurable (~8 giây) | D-15 spawn-time config copy with extended `cycleDurationMs`; existing `Grid.spawnFlower(cell, config, nowMs)` signature already accepts modified config |
| POLISH-03 | Pity mechanic — đảm bảo ít nhất 1 special flower mỗi 30s nếu chưa xuất hiện | D-06 pity window tracked in `PowerUpState`; forced special on next spawn if `timeSinceLastSpecialMs > pityWindowMs` |
</phase_requirements>

---

## Summary

Phase 10 adds three timed power-up effects triggered by tapping randomly-spawned "special" flowers. The design is an overlay pattern: `Cell` gains `isSpecial: boolean` and `specialEffect: SpecialEffectType | null` fields, layered on the existing FlowerFSM without mutating the FSM itself. All three effects (SCORE_MULTIPLIER, TIME_FREEZE, SLOW_GROWTH) are managed by a new pure-logic class `PowerUpState` in the `logic/` tier, keeping all timer math testable without Cocos dependencies.

The three effects integrate with existing systems at well-defined seams: SCORE_MULTIPLIER adds a multiplier layer in `GameState.applyCorrectTap()`; TIME_FREEZE rolls `sessionStartMs` forward each frame while active (exactly the same pattern as `_applyPauseOffset`); SLOW_GROWTH passes a modified `FlowerTypeConfig` copy to `Grid.spawnFlower()` at spawn time. The HUD power-up row is a new Cocos node subtree below the grid, rendered via `Graphics` arc (consistent with existing cell rendering, avoiding a new `ProgressBar` component type).

The pity mechanic (POLISH-03 pulled in) is a single counter in `PowerUpState`: if `timeSinceLastSpecialMs >= pityWindowMs` and the spawn loop is about to place a new flower, that flower is forced special. This counter must also pause/shift with `shiftExpiries()`.

**Primary recommendation:** Implement in three waves — (1) `Cell` extension + `PowerUpState` class + config schema + Vitest tests; (2) spawn integration + GridRenderer special visual; (3) HUD power-up indicator + GameController wiring.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.x (project-established) | Scene graph, Component, Graphics, tween | All existing code targets this runtime |
| Vitest | project-established (`npx vitest run`) | Unit tests for pure logic tier | All 186 existing tests use this; no alternatives needed |
| TypeScript | project-established | Type safety, enum-driven state | All source is `.ts`; enums for `SpecialEffectType` follow existing pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Cocos `Graphics` | built-in | Draw circular arc progress timer in HUD | Consistent with cell rendering — no new component types |
| Cocos `tween` | built-in | Power-up icon activation flash (optional juice) | Only if adding brief visual pop on activation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Graphics` arc timer | `ProgressBar` component | ProgressBar easier to configure in editor but adds a new component type not used elsewhere; Graphics arc is consistent with how all cell painting is already done |
| Object fields in `PowerUpState` | `Map<SpecialEffectType, number>` | Map is cleaner for iteration but object fields (one per effect type) are simpler and more explicit — preferred given only 3 fixed types |

**Installation:** No new packages needed. All required libraries are Cocos built-ins or already in the project.

---

## Architecture Patterns

### Recommended Project Structure
```
BloomTap/assets/scripts/
├── logic/
│   ├── PowerUpState.ts          # NEW — pure logic, no cc imports
│   ├── PowerUpState.test.ts     # NEW — Vitest tests
│   ├── Grid.ts                  # MODIFY — Cell interface (isSpecial, specialEffect)
│   ├── GameState.ts             # MODIFY — applyCorrectTap powerUpMultiplier param
│   └── GameConfig.ts            # MODIFY — powerUps section in schema
├── GameController.ts            # MODIFY — update(), handleCorrectTap(), _applyPauseOffset()
├── GridRenderer.ts              # MODIFY — special flower visual overlay
└── PowerUpHUDRenderer.ts        # NEW — Cocos Component, 3-slot row below grid
BloomTap/assets/resources/config/
└── flowers.json                 # MODIFY — add powerUps block
```

### Pattern 1: Cell Overlay (isSpecial flag)
**What:** `Cell` grows two new optional fields. The flower's identity, lifecycle, and score remain entirely owned by `FlowerFSM`. The special overlay is a boolean label + effect enum.
**When to use:** Any place that reads `cell.flower` and needs to know if power-up effects apply.
**Example:**
```typescript
// Grid.ts — extend Cell interface
export type SpecialEffectType = 'SCORE_MULTIPLIER' | 'TIME_FREEZE' | 'SLOW_GROWTH';

export interface Cell {
    index: number;
    row: number;
    col: number;
    flower: FlowerFSM | null;
    isSpecial: boolean;             // NEW
    specialEffect: SpecialEffectType | null; // NEW
}

// clearCell must reset both fields — D-04
clearCell(cell: Cell): void {
    cell.flower = null;
    cell.isSpecial = false;
    cell.specialEffect = null;
}
```

### Pattern 2: PowerUpState — Pure Logic Class
**What:** Owns expiry timestamps for each effect slot (one per effect type). Provides query API consumed by GameController. No `cc` imports — fully testable with Vitest.
**When to use:** All timer reads and writes go through `PowerUpState`; GameController never manually arithmetic on power-up timestamps.
**Example:**
```typescript
// logic/PowerUpState.ts
export class PowerUpState {
    private _scoreMultiplierExpiryMs: number = 0;
    private _timeFreezeExpiryMs: number = 0;
    private _slowGrowthExpiryMs: number = 0;
    private _lastSpecialSpawnMs: number = 0;  // for pity mechanic

    activate(effect: SpecialEffectType, nowMs: number, durationMs: number): void {
        // D-09: same type resets timer; D-10: different type stacks
        switch (effect) {
            case 'SCORE_MULTIPLIER': this._scoreMultiplierExpiryMs = nowMs + durationMs; break;
            case 'TIME_FREEZE':      this._timeFreezeExpiryMs      = nowMs + durationMs; break;
            case 'SLOW_GROWTH':      this._slowGrowthExpiryMs      = nowMs + durationMs; break;
        }
        this._lastSpecialSpawnMs = nowMs;
    }

    isActive(effect: SpecialEffectType, nowMs: number): boolean { ... }
    getActiveCount(nowMs: number): number { ... }
    getRemaining(effect: SpecialEffectType, nowMs: number): number { ... }

    // D-17: called by _applyPauseOffset(deltaMs) — shifts all expiries forward
    shiftExpiries(deltaMs: number): void {
        this._scoreMultiplierExpiryMs += deltaMs;
        this._timeFreezeExpiryMs      += deltaMs;
        this._slowGrowthExpiryMs      += deltaMs;
        this._lastSpecialSpawnMs      += deltaMs;
    }

    // Pity mechanic — D-06
    needsPitySpawn(nowMs: number, pityWindowMs: number): boolean {
        return (nowMs - this._lastSpecialSpawnMs) >= pityWindowMs;
    }

    reset(): void { /* zero all fields */ }
}
```

### Pattern 3: TIME_FREEZE via Rolling sessionStartMs
**What:** Each frame while TIME_FREEZE is active, `sessionStartMs` is advanced by `dt` so elapsed time (and thus `isGameOver()`) does not progress. Flowers, spawn timer, and power-up expiries are NOT shifted — only `sessionStartMs`.
**When to use:** Only during `update()` when `powerUpState.isActive('TIME_FREEZE', nowMs)`.
**Example:**
```typescript
// GameController.update() — inside the PLAYING guard, before game-over check
if (this.powerUpState.isActive('TIME_FREEZE', nowMs)) {
    // Roll sessionStartMs forward by dt so elapsed time stands still
    // dt in Cocos update() is in seconds — convert to ms
    this.gameState.sessionStartMs += dt * 1000;
}
// After rolling, game-over check and elapsed compute correctly:
if (this.gameState.isGameOver(nowMs)) { ... }
const elapsedMs = nowMs - this.gameState.sessionStartMs; // frozen elapsed
```
**Why this works:** `getElapsedMs()` and `isGameOver()` both derive from `nowMs - sessionStartMs`. If sessionStartMs moves forward at the same rate as `performance.now()`, elapsed stays constant. This is identical in mechanism to `_applyPauseOffset()` — just applied continuously per frame instead of once.

### Pattern 4: SLOW_GROWTH via Config Copy at Spawn Time
**What:** When SLOW_GROWTH is active, the spawn loop creates a shallow copy of the selected `FlowerTypeConfig` with a multiplied `cycleDurationMs` (and all sub-durations scaled proportionally). The modified config is passed to `Grid.spawnFlower()`. Live flowers are never touched.
**When to use:** Only inside the spawn batch loop in `GameController.update()`.
**Example:**
```typescript
// In spawn loop — when slowGrowth is active
const baseConfig = FLOWER_CONFIGS[typeId];
const config = powerUpState.isActive('SLOW_GROWTH', nowMs)
    ? applySlowGrowthConfig(baseConfig, slowGrowthFactor)
    : baseConfig;
this.grid.spawnFlower(emptyCell, config, nowMs);

// Pure helper — can live in PowerUpState or a small utility
function applySlowGrowthConfig(base: FlowerTypeConfig, factor: number): FlowerTypeConfig {
    return {
        ...base,
        cycleDurationMs: Math.round(base.cycleDurationMs * factor),
        budMs:           Math.round(base.budMs * factor),
        tapWindowMs:     Math.round(base.tapWindowMs * factor),
        bloomingMs:      Math.round(base.bloomingMs * factor),
        fullBloomMs:     Math.round(base.fullBloomMs * factor),
        wiltingMs:       Math.round(base.wiltingMs * factor),
        deadMs:          Math.round(base.deadMs * factor),
    };
}
```

### Pattern 5: SCORE_MULTIPLIER Layer in applyCorrectTap
**What:** `GameState.applyCorrectTap()` gains an optional `powerUpMultiplier` parameter (default 1). Score becomes `rawScore * combo.multiplier * powerUpMultiplier`.
**When to use:** GameController passes `powerUpState.getMultiplier(elapsedMs, phaseIndex)` when calling `applyCorrectTap`.
**Example:**
```typescript
// GameState.ts
applyCorrectTap(rawScore: number, combo: ComboSystem, powerUpMultiplier: number = 1): void {
    this.correctTaps += 1;
    this.score += Math.round(rawScore * combo.multiplier * powerUpMultiplier);
    combo.onCorrectTap();
    if (combo.tapCount > this.peakStreak) { this.peakStreak = combo.tapCount; }
}
```
Phase index (0/1/2) determines the multiplier value at activation time or query time. The CONTEXT.md decision (D-11) says multiplier scales by game phase at activation: phase 1→x2, phase 2→x3, phase 3→x5. Simplest: `PowerUpState.activate()` receives the resolved multiplier value (caller computes from `spawnManager.getPhaseConfig(elapsedMs)`), and stores it alongside expiry.

### Pattern 6: Special Flower Visual in GridRenderer
**What:** The `update()` loop already calls `_paintState(view, state)` for each cell. Add a branch: if `cell.isSpecial && !view.isFlashing`, draw a colored border or inner circle overlay after the base fill.
**When to use:** Inside the existing per-cell render loop when `state !== DEAD && state !== COLLECTED`.
**Example:**
```typescript
// After _paintState(view, state) — overlay for special flowers
if (cell.isSpecial && cell.specialEffect) {
    this._paintSpecialOverlay(view, cell.specialEffect);
}

// Color constants (placeholder — Phase 12 replaces with sprites)
const SPECIAL_OVERLAY_COLORS: Record<SpecialEffectType, Color> = {
    SCORE_MULTIPLIER: new Color(255, 215,   0, 200), // gold
    TIME_FREEZE:      new Color( 64, 164, 255, 200), // ice blue
    SLOW_GROWTH:      new Color( 80, 220,  80, 200), // green
};

private _paintSpecialOverlay(view: CellView, effect: SpecialEffectType): void {
    const g = view.graphics;
    // Draw inner circle centered on cell (radius ~12px)
    g.fillColor = SPECIAL_OVERLAY_COLORS[effect];
    g.circle(0, 0, 12);
    g.fill();
}
```

### Pattern 7: HUD Power-Up Row (PowerUpHUDRenderer)
**What:** A new Cocos Component class (separate from GridRenderer) owns 3 icon slot nodes. Each slot renders: a background circle, an effect color fill, and a `Graphics` arc shrinking from full to empty as the timer expires. Node subtree created in `onLoad()`.
**When to use:** GameController calls `powerUpHUD.update(powerUpState, nowMs)` each frame.
**Circular timer technique (D-22 — Claude's discretion):** Use `Graphics` arc, consistent with cell painting. `ProgressBar` is less flexible for circular shapes and isn't used anywhere in the codebase.
```typescript
// Arc from full circle to empty: angle = 2*PI * (remainingMs / totalDurationMs)
// Cocos Graphics.arc(cx, cy, radius, startAngle, endAngle, counterclockwise)
// startAngle = -PI/2 (12 o'clock), endAngle = startAngle + (fraction * 2*PI)
private _paintArcTimer(g: Graphics, fraction: number, color: Color): void {
    g.clear();
    // Background ring
    g.strokeColor = new Color(60, 60, 70, 255);
    g.lineWidth = 4;
    g.circle(0, 0, ICON_RADIUS);
    g.stroke();
    // Foreground arc (clockwise from top)
    if (fraction > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + fraction * Math.PI * 2;
        g.strokeColor = color;
        g.lineWidth = 4;
        g.arc(0, 0, ICON_RADIUS, startAngle, endAngle, false);
        g.stroke();
    }
}
```

### Pattern 8: Pity Mechanic in Spawn Loop
**What:** Immediately before deciding whether to mark a flower special by probability, check if pity is due. If `powerUpState.needsPitySpawn(nowMs, pityWindowMs)` returns true, force `isSpecial = true` regardless of probability roll.
**Critical:** Pity counter (`_lastSpecialSpawnMs`) must be initialized at session start to `sessionStartMs` (not 0) — otherwise pity fires on the very first spawn.

### Anti-Patterns to Avoid
- **Mutating live FlowerFSM for SLOW_GROWTH:** Do not call `shiftTimestamp()` or modify `_config` on in-flight flowers. Only new spawns receive the slow config (D-15).
- **Shifting power-up expiries during TIME_FREEZE:** TIME_FREEZE rolls `sessionStartMs` each frame, not `_timeFreezeExpiryMs`. Shifting the expiry itself would create a freeze loop that never expires.
- **Creating config copies after spawn:** The slow-growth config copy must be made at the moment of calling `Grid.spawnFlower()`. Storing a reference to the base config and modifying it later would corrupt FLOWER_CONFIGS.
- **Forgetting to reset `Cell.isSpecial` and `specialEffect`:** All three clear paths must reset both fields: `Grid.clearCell()`, `Grid.clearAll()`, and `GridRenderer.paintFlashAndClear()` (which calls `clearCell` via scheduleOnce).
- **Pity timer starting at 0:** Initialize `_lastSpecialSpawnMs` to `sessionStartMs` in `PowerUpState.reset()`, not to 0, otherwise pity will fire immediately on the first spawn of every session.
- **Storing `specialEffect` per-tap vs per-spawn:** Effect type is determined at spawn time (D-07). Do not re-roll on tap — read `cell.specialEffect` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular progress timer | Custom canvas loop / CSS arc hack | Cocos `Graphics.arc()` in a Component | Already used for all cell painting; same API, no new dependencies |
| Per-frame time accumulation | Custom dt accumulator in GameController | Roll `sessionStartMs` directly (existing pattern) | `_applyPauseOffset` already proves correctness; same mechanism, zero new state |
| Config copy for slow growth | Runtime JSON fetch / prototype chain hack | Plain object spread `{ ...base, cycleDurationMs: ... }` | FlowerTypeConfig is a plain data interface; spread is safe and explicit |
| Weighted random effect selection | Custom RNG class | `Math.random() * 3 \| 0` with switch | Three equal-weight effects, no bias needed; if weights are needed later, same pattern as SpawnManager |

**Key insight:** All three effects reuse patterns already proven in the codebase. The only genuinely new surface area is `PowerUpState` as a class, the `Cell` interface extension, and the HUD component. Everything else is configuration of existing machinery.

---

## Common Pitfalls

### Pitfall 1: TIME_FREEZE Creates Infinite Freeze Loop
**What goes wrong:** If `sessionStartMs` is rolled forward AND `_timeFreezeExpiryMs` is also rolled forward (e.g., inside `shiftExpiries` call during TIME_FREEZE active state), the expiry never arrives and the freeze never ends.
**Why it happens:** Developer calls `powerUpState.shiftExpiries(deltaMs)` unconditionally in `_applyPauseOffset`, but during live play with TIME_FREEZE active, `dt * 1000` is also being added to `sessionStartMs` — these interact.
**How to avoid:** `shiftExpiries()` is called ONLY from `_applyPauseOffset()` (i.e., pause/resume). During normal PLAYING frames, the per-frame `sessionStartMs += dt * 1000` for TIME_FREEZE does NOT call `shiftExpiries`. The expiry timestamp is absolute `performance.now()` time and will still be crossed when real-world time passes.
**Warning signs:** Timer freezes permanently or much longer than configured duration.

### Pitfall 2: Special Overlay Rendered on COLLECTED/DEAD Cells
**What goes wrong:** `_paintSpecialOverlay` fires on a cell that is about to be cleared, producing a visual glitch for one frame.
**Why it happens:** The `isSpecial` flag is reset inside `clearCell()`, but `clearCell()` is called from `scheduleOnce()` asynchronously — the flag may still be true during the flash frame.
**How to avoid:** Render the special overlay only when `!view.isFlashing` AND `state !== DEAD AND state !== COLLECTED`. The existing flash guard (`if (view.isFlashing) continue`) already protects the frame where `clearCell` is pending.

### Pitfall 3: isSpecial Not Reset After Wrong Tap on Special Flower
**What goes wrong:** Player taps a special flower at wrong state (BUD/WILTING/DEAD) → `handleWrongTap()` fires → but `cell.isSpecial` remains true → flower continues to display special visual and would re-activate effect if tapped again later.
**Why it happens:** Wrong-tap path does not clear the flower or reset `isSpecial`.
**How to avoid:** Per D-03, wrong tap on a special flower: same wrong-tap penalty + combo reset. No effect activation. `isSpecial` stays on the cell (flower is still alive). This is correct — the player missed the window, but the special flower remains on the board until it naturally dies. Only `clearCell()` / `clearAll()` reset `isSpecial`. This is intentional design.

### Pitfall 4: Pity Timer Not Paused During Pause
**What goes wrong:** Player pauses for 40s → pity fires immediately on resume (30s pity window was exceeded during pause).
**Why it happens:** `_lastSpecialSpawnMs` is an absolute `performance.now()` timestamp; pause doesn't shift it.
**How to avoid:** Include `_lastSpecialSpawnMs` in `shiftExpiries(deltaMs)` — this is already specified in the architecture. Verify the implementation shifts all five fields including `_lastSpecialSpawnMs`.

### Pitfall 5: SLOW_GROWTH Config Copy Shares Reference with FLOWER_CONFIGS
**What goes wrong:** `{ ...base }` creates a shallow copy, but if `FlowerTypeConfig` ever gains a nested object field, the copy would share the reference.
**Why it happens:** JavaScript spread is shallow.
**How to avoid:** `FlowerTypeConfig` is currently a flat interface (all primitive number/string fields). Verify it stays flat before using spread. Add a comment noting that if sub-objects are ever added, the copy helper must be updated.

### Pitfall 6: PowerUpState.activate() Receives Wrong Phase Index
**What goes wrong:** Score multiplier is always x2 regardless of game phase.
**Why it happens:** Caller passes `elapsedMs` phase index 0 even during Phase 2 or 3.
**How to avoid:** At activation time (inside `handleCorrectTap` in GameController), compute the current phase index from `elapsedMs` using `spawnManager.getPhaseConfig(elapsedMs)` — or add a `getPhaseIndex()` method to SpawnManager. Pass the resolved multiplier value to `powerUpState.activate()` rather than re-deriving it inside PowerUpState (keeps PowerUpState independent of SpawnManager).

### Pitfall 7: HUD Node Created After onLoad
**What goes wrong:** Runtime error or invisible nodes when `PowerUpHUDRenderer.onLoad()` creates nodes, but GameController references them before the scene is ready.
**Why it happens:** Cocos calls `onLoad()` in scene graph order; if GameController's `onLoad` fires before PowerUpHUDRenderer's, the HUD is not yet initialized.
**How to avoid:** Follow same pattern as `GridRenderer` — GameController calls `powerUpHUD.init(powerUpState)` from its own `onLoad()` after all `@property` wiring is verified. Build all 3 slot nodes inside `PowerUpHUDRenderer.onLoad()` before GameController can send updates.

---

## Code Examples

### Config Schema Extension (flowers.json powerUps block)
```json
"powerUps": {
    "specialChance": 0.08,
    "pityWindowMs": 30000,
    "scoreMultiplier": {
        "durationMs": 6000,
        "multiplierByPhase": [2, 3, 5]
    },
    "timeFreeze": {
        "durationMs": 5000
    },
    "slowGrowth": {
        "durationMs": 8000,
        "factor": 2.0
    }
}
```

### GameConfig.ts — PowerUpsConfig Interface Extension
```typescript
export interface PowerUpsConfig {
    specialChance: number;
    pityWindowMs: number;
    scoreMultiplier: {
        durationMs: number;
        multiplierByPhase: [number, number, number];
    };
    timeFreeze: {
        durationMs: number;
    };
    slowGrowth: {
        durationMs: number;
        factor: number;
    };
}
// Add to GameConfig interface:
powerUps: PowerUpsConfig;
```

### GameController.update() Integration Sketch
```typescript
update(dt: number): void {
    if (this._phase !== SessionPhase.PLAYING) return;
    const nowMs = performance.now();

    // TIME_FREEZE: roll sessionStartMs forward to keep elapsed frozen
    if (this.powerUpState.isActive('TIME_FREEZE', nowMs)) {
        this.gameState.sessionStartMs += dt * 1000;
    }

    // Game-over check (uses potentially-frozen elapsed)
    if (this.gameState.isGameOver(nowMs)) {
        this.powerUpState.reset();
        this._triggerGameOver();
        return;
    }

    const elapsedMs = nowMs - this.gameState.sessionStartMs;

    // Spawn loop
    if (nowMs >= this._nextSpawnMs) {
        const phaseConfig = this.spawnManager.getPhaseConfig(elapsedMs);
        for (let i = 0; i < phaseConfig.spawnBatch; i++) {
            if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;
            const emptyCell = this.grid.getRandomEmptyCell();
            if (!emptyCell) break;
            const typeId = this.spawnManager.pickFlowerType(elapsedMs);

            // Determine if this flower is special (D-05, D-06)
            const isSpecial = this.powerUpState.needsPitySpawn(nowMs, this._powerUpConfig.pityWindowMs)
                || Math.random() < this._powerUpConfig.specialChance;

            const effect = isSpecial ? this._pickRandomEffect() : null;

            // SLOW_GROWTH: pass modified config copy for newly spawned flowers only
            const baseConfig = FLOWER_CONFIGS[typeId];
            const config = (isSpecial && effect === 'SLOW_GROWTH') || this.powerUpState.isActive('SLOW_GROWTH', nowMs)
                ? applySlowGrowthConfig(baseConfig, this._powerUpConfig.slowGrowth.factor)
                : baseConfig;

            const fsm = this.grid.spawnFlower(emptyCell, config, nowMs);
            emptyCell.isSpecial = isSpecial;
            emptyCell.specialEffect = effect;

            if (isSpecial) {
                // Pity timer reset is handled inside PowerUpState.activate() at tap time,
                // but lastSpecialSpawnMs should be updated at spawn (not tap) for pity accuracy.
                this.powerUpState.recordSpecialSpawn(nowMs);
            }

            if (this.gridRenderer) {
                this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
            }
        }
        this._nextSpawnMs = nowMs + phaseConfig.intervalMs;
    }

    this.powerUpHUD?.tick(this.powerUpState, nowMs);
    this._updateHUD(elapsedMs);
}
```

### _applyPauseOffset() Extended
```typescript
private _applyPauseOffset(deltaMs: number): void {
    this.gameState.sessionStartMs += deltaMs;
    this.grid.shiftAllTimestamps(deltaMs);
    this._nextSpawnMs += deltaMs;
    this.powerUpState.shiftExpiries(deltaMs);  // NEW — D-17
}
```

### handleCorrectTap() with SCORE_MULTIPLIER
```typescript
public handleCorrectTap(cell: Cell, flower: FlowerFSM, nowMs: number) {
    const state    = flower.getState(nowMs);
    const rawScore = flower.getScore(nowMs) ?? 0;
    flower.collect();

    // Check special flower activation BEFORE applyCorrectTap
    if (cell.isSpecial && cell.specialEffect) {
        const elapsedMs = nowMs - this.gameState.sessionStartMs;
        const phaseIndex = this._getPhaseIndex(elapsedMs); // 0/1/2
        const durationMs = this._getDurationForEffect(cell.specialEffect);
        const multiplierValue = this._powerUpConfig.scoreMultiplier.multiplierByPhase[phaseIndex];
        this.powerUpState.activate(cell.specialEffect, nowMs, durationMs, multiplierValue);
        cell.isSpecial = false;         // consumed — visual returns to normal flower
        cell.specialEffect = null;
    }

    const powerUpMultiplier = this.powerUpState.isActive('SCORE_MULTIPLIER', nowMs)
        ? this.powerUpState.getScoreMultiplier()
        : 1;
    this.gameState.applyCorrectTap(rawScore, this.comboSystem, powerUpMultiplier);
    ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single effect slot (never stack) | 3 independent slots (D-08, Phase 10 decision override) | CONTEXT.md 2026-03-21 | PowerUpState needs 3 separate expiry fields, not 1 |
| No special flowers (v1.0) | isSpecial overlay on Cell (Phase 10) | Phase 10 | Cell interface must be extended; clearCell/clearAll must reset new fields |
| POLISH-03 deferred | Pity mechanic pulled into Phase 10 | CONTEXT.md 2026-03-21 | pityWindowMs in config; `_lastSpecialSpawnMs` in PowerUpState |

**Deprecated/outdated:**
- Prior STATE.md entry `[v1.1 Arch]: Power-up replacement semantics only` — overridden by D-08. Each effect type now has its own independent slot. The "replacement" rule still applies within a single effect type (D-09: same-type tap resets timer, not stacks).

---

## Open Questions

1. **Should `isSpecial` be cleared at tap time or only at clearCell?**
   - What we know: D-04 says reset `isSpecial = false` everywhere `cell.flower` is cleared.
   - What's unclear: If `isSpecial` is cleared at tap time (inside `handleCorrectTap`), the visual immediately reverts to a normal flower during the 300ms flash — which is fine. If it stays until `clearCell`, the special visual flashes before clearing. Either works.
   - Recommendation: Clear `isSpecial = false` and `specialEffect = null` inside `handleCorrectTap` immediately after activation — this is cleaner and avoids the special overlay being visible during the collect flash. This is what the code example above shows.

2. **Does the pity timer track time since last special spawn or last special tap?**
   - What we know: D-06 says "if no special flower has appeared in the last 30s" — "appeared" = spawned.
   - What's unclear: The CONTEXT says "pity timer resets each time a special flower spawns" — so spawning, not tapping, resets the timer. A special flower that spawns but the player never taps should still reset the pity counter.
   - Recommendation: `recordSpecialSpawn(nowMs)` is called from the spawn loop immediately when `isSpecial = true` is assigned, regardless of whether the player taps it. This matches D-06 wording.

3. **SLOW_GROWTH: should it apply to special flowers that spawn during the effect window?**
   - What we know: D-15 says "only newly spawned flowers during the effect window receive a modified cycleDurationMs."
   - What's unclear: A flower that spawns special during SLOW_GROWTH — should it get the slow config?
   - Recommendation: Yes — all new spawns during SLOW_GROWTH get the modified config, including special ones. The overlay and the cycle duration are independent properties of the same flower.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing — `vitest.config.ts` at project root) |
| Config file | `vitest.config.ts` — covers `BloomTap/assets/scripts/logic/**/*.test.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |
| Current suite | 186 tests passing across 10 test files |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPECIAL-01 | `PowerUpState.needsPitySpawn()` returns true after pityWindowMs | unit | `npx vitest run --reporter=verbose` | ❌ Wave 0 |
| SPECIAL-01 | `Cell.isSpecial` is reset in `Grid.clearCell()` and `clearAll()` | unit | `npx vitest run` | ❌ Wave 0 (Grid.test.ts exists but needs new cases) |
| SPECIAL-01 | Spawn probability: specialChance=1.0 always marks special, specialChance=0 never marks special | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-02 | `applyCorrectTap` with powerUpMultiplier=3 triples score correctly | unit | `npx vitest run` | ❌ Wave 0 (GameState.test.ts exists but needs new cases) |
| SPECIAL-02 | `PowerUpState.activate(SCORE_MULTIPLIER, ...)` stores correct expiry | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-02 | `PowerUpState.isActive()` returns false after expiry | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-02 | D-09: same-type re-activation resets timer, not stacks | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-03 | `PowerUpState.shiftExpiries(deltaMs)` shifts all four fields | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-04 | `applySlowGrowthConfig(base, 2.0)` returns config with doubled durations | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-04 | Slow-growth config copy does not mutate original FLOWER_CONFIGS | unit | `npx vitest run` | ❌ Wave 0 |
| POLISH-03 | Pity fires when elapsed since last spawn >= pityWindowMs | unit | `npx vitest run` | ❌ Wave 0 |
| POLISH-03 | Pity timer shifts with `shiftExpiries` (pause-resistant) | unit | `npx vitest run` | ❌ Wave 0 |
| SPECIAL-01 | HUD row is hidden when no effects active, shown when any active | manual (Cocos editor) | — | manual |
| SPECIAL-02–04 | Each effect type activates and expires visually in HUD | manual (Cocos editor) | — | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (186 + new tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BloomTap/assets/scripts/logic/PowerUpState.test.ts` — covers all PowerUpState unit tests (SPECIAL-01 through SPECIAL-04, POLISH-03)
- [ ] Extend `BloomTap/assets/scripts/logic/Grid.test.ts` — new cases for `isSpecial`/`specialEffect` reset in `clearCell` and `clearAll`
- [ ] Extend `BloomTap/assets/scripts/logic/GameState.test.ts` — new cases for `applyCorrectTap` with `powerUpMultiplier` parameter
- [ ] Extend `BloomTap/assets/scripts/logic/GameConfig.test.ts` — new cases for `powerUps` section parsing and validation

---

## Sources

### Primary (HIGH confidence)
- Direct source code analysis — `Grid.ts`, `FlowerFSM.ts`, `GameController.ts`, `GameState.ts`, `SpawnManager.ts`, `GridRenderer.ts`, `GameConfig.ts`, `FlowerTypes.ts` — all read directly from project
- `flowers.json` — current config structure confirmed
- `vitest.config.ts` — test framework confirmed

### Secondary (MEDIUM confidence)
- `STATE.md` accumulated decisions — confirms `_applyPauseOffset` pattern, confirmed `director.pause()` broken, confirms SLOW_GROWTH spawn-time config copy approach
- `10-CONTEXT.md` — all decisions D-01 through D-22 are locked

### Tertiary (LOW confidence)
- Cocos Creator `Graphics.arc()` API shape — based on training-data knowledge of Cocos 3.x. The pattern is consistent with how `Graphics` is used in `GridRenderer._paintEmpty()` (`roundRect`, `fill`, `stroke`). Verify arc signature in Cocos docs if unexpected behavior occurs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all technologies are project-established; no new dependencies
- Architecture: HIGH — all integration points read directly from source; patterns follow proven existing code
- Pitfalls: HIGH — derived from direct reading of existing code paths and decision history in STATE.md
- Validation: HIGH — test framework and file locations confirmed

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (30 days — stable stack; no external API dependencies)
