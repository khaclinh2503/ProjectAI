# Phase 10: Special Flowers - Research

**Researched:** 2026-03-22
**Domain:** Cocos Creator 3.x TypeScript — power-up state machine, timestamp-based timers, sprite swapping, HUD rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Special flower identity**
- D-01: Special flower = cell transformation — `cell_empty.png` background is replaced by an effect-specific cell sprite. The flower itself (CHERRY, LOTUS, etc.) renders normally on top.
- D-02: 3 cell sprites, one per effect type: `cell_fire` → SCORE_MULTIPLIER, `cell_freeze` → TIME_FREEZE, `cell_grass` → SLOW_GROWTH
- D-03: Cell sprite appears at spawn time — visible from BUD state.
- D-04: `Cell` interface gains `isSpecial: boolean` and `specialEffect: EffectType | null`. Both reset to `false`/`null` in `clearCell()` and `clearAll()`.

**Effect stacking policy**
- D-05: Replacement semantics — tapping a new special flower replaces any currently active effect. Only 1 effect active at a time.
- D-06: Tapping same effect type while active → resets that effect's timer.

**Tap rules**
- D-07: Tapping a special flower at correct bloom stage (FULL_BLOOM) → regular score + activates power-up effect.
- D-08: Tapping a special flower at wrong state (BUD/BLOOMING/WILTING/DEAD) → same wrong-tap penalty + combo reset. Cell sprite stays visible until flower is cleared.

**Effect: SCORE_MULTIPLIER**
- D-09: Multiplier scales with spawn phase — Phase 1 → x2, Phase 2 → x3, Phase 3 → x5 (configurable from JSON). Duration ~6s configurable.
- D-10: Applied as extra layer: `rawScore * combo.multiplier * powerUpMultiplier`.

**Effect: TIME_FREEZE**
- D-11: Only the countdown timer freezes — flowers continue cycling normally.
- D-12: Implementation: shift `sessionStartMs` each frame while active (rolling offset, consistent with `_applyPauseOffset` pattern). Duration ~5s configurable.

**Effect: SLOW_GROWTH**
- D-13: Only newly spawned flowers during the effect window receive a modified `cycleDurationMs` (spawn-time config copy). Live flowers are not mutated.
- D-14: `slowGrowthFactor` multiplies `cycleDurationMs` at spawn time (e.g. 2.0 = double cycle). Duration ~8s configurable.

**HUD indicator**
- D-15: When an effect is active, show a single HUD element with: effect icon (cell sprite) + circular countdown timer. Hidden when no effect active.
- D-16: When effect expires, HUD hides immediately — no animation.
- D-17: Pause freezes effect timer; resume continues from remaining duration.

**Spawning**
- D-18: Each flower spawn has `specialChance`% probability to be marked special (configurable from JSON, default 8%). Effect type assigned randomly at spawn time.
- D-19: Pity mechanic (POLISH-03) is deferred — not in Phase 10.

### Claude's Discretion
- Circular timer render technique (ProgressBar vs Graphics arc)
- `PowerUpState` internal data structure
- Exact `specialChance` default value
- TIME_FREEZE rolling offset — `sessionStartMs += deltaPerFrame` each frame while active

### Deferred Ideas (OUT OF SCOPE)
- Pity mechanic (POLISH-03): guarantee 1 special every 30s — deferred to Phase 11 or later
- Tapping special at wrong stage: different feedback in future
- Effect stacking / 3 simultaneous slots: explicitly Out of Scope per REQUIREMENTS.md (v2+)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPECIAL-01 | Hoa đặc biệt xuất hiện ngẫu nhiên trên bàn với visual riêng biệt, tần suất configurable từ JSON | D-01 to D-04, D-18: cell sprite swap at spawn time; `specialChance` in `powerUps` JSON block |
| SPECIAL-02 | Người chơi tap hoa đặc biệt để kích hoạt score multiplier (x2–x5) cho tất cả hoa trong ~6s | D-09, D-10: `powerUpMultiplier` injected into `applyCorrectTap`; phase-indexed multiplier table |
| SPECIAL-03 | Người chơi tap hoa đặc biệt để freeze đồng hồ đếm ngược trong ~5s | D-11, D-12: per-frame `sessionStartMs += dt*1000` while TIME_FREEZE active |
| SPECIAL-04 | Người chơi tap hoa đặc biệt để làm chậm tốc độ phát triển của hoa mới trong ~8s — window tap rộng hơn | D-13, D-14: spawn-time config copy with `cycleDurationMs * slowGrowthFactor` |
</phase_requirements>

---

## Summary

Phase 10 adds the special flower power-up system to an existing Phase 9 codebase (186 tests green, no active Phase 10 code — a prior attempt was reverted). The implementation has three layers: pure logic (`PowerUpState` + `Cell` extension + `GameConfig` extension), controller wiring (`GameController.update()` + `handleCorrectTap()` + spawn loop + `_applyPauseOffset()`), and rendering (`GridRenderer` cell background swap + `PowerUpHUDRenderer` with countdown arc).

All technical decisions are locked in CONTEXT.md. No external dependencies are needed — the pattern reuses Cocos Creator APIs (Sprite, Graphics, UIOpacity, tween, resources.load) already present in `GridRenderer.ts` and `GameController.ts`. The main unknowns are discretion items (HUD timer render technique, PowerUpState internal structure) which are documented as research recommendations below.

**Primary recommendation:** Build `PowerUpState` as a pure TypeScript class (no `cc` imports) with expiry-timestamp semantics matching the existing `FlowerFSM` / `GameState` timestamp model. TIME_FREEZE rolling offset uses `dt * 1000` per frame (already confirmed in STATE.md). Use `Graphics` arc for the HUD countdown timer — it has no layout dependencies and is already imported in `GridRenderer.ts`.

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.x (project) | Component lifecycle, Sprite, Graphics, tween | Locked by project |
| Vitest | detected via `vitest.config.ts` | Pure-logic unit tests | Established in Phase 7+ |
| TypeScript | project tsconfig | Type safety, `enum` for EffectType | Already configured |

### No New Libraries
All required APIs (`Sprite`, `SpriteFrame`, `Graphics`, `UIOpacity`, `tween`, `resources.load`) are already imported in existing files.

---

## Architecture Patterns

### Recommended File Structure for Phase 10
```
BloomTap/assets/scripts/
├── logic/
│   ├── PowerUpState.ts          # NEW — pure TS, no cc imports
│   └── PowerUpState.test.ts     # NEW — Vitest unit tests
├── GameController.ts            # MODIFY — tick PowerUpState, wire spawning + tap
├── GridRenderer.ts              # MODIFY — cell bg sprite swap + overlay
├── BootController.ts            # MODIFY — initPowerUpConfig() after JSON load
└── PowerUpHUDRenderer.ts        # NEW — Cocos Component, reads PowerUpState
BloomTap/assets/scripts/logic/
├── Grid.ts                      # MODIFY — Cell interface + clearCell/clearAll
├── GameState.ts                 # MODIFY — applyCorrectTap powerUpMultiplier param
└── GameConfig.ts                # MODIFY — powerUps JSON section + interface
BloomTap/assets/resources/config/
└── flowers.json                 # MODIFY — add powerUps block
```

### Pattern 1: PowerUpState — Expiry Timestamp Model

**What:** Pure TypeScript class tracking active effect via absolute expiry timestamps. Same model as `FlowerFSM` (spawn timestamp + duration = expiry).

**When to use:** Any time-limited state that must survive pause/resume offset shifts.

```typescript
// PowerUpState.ts — NO 'cc' import
export enum EffectType {
    SCORE_MULTIPLIER = 'SCORE_MULTIPLIER',
    TIME_FREEZE      = 'TIME_FREEZE',
    SLOW_GROWTH      = 'SLOW_GROWTH',
}

export class PowerUpState {
    activeEffect: EffectType | null = null;
    expiryMs: number = 0;

    isActive(nowMs: number): boolean {
        return this.activeEffect !== null && nowMs < this.expiryMs;
    }

    activate(effect: EffectType, nowMs: number, durationMs: number): void {
        this.activeEffect = effect;
        this.expiryMs = nowMs + durationMs;
    }

    tick(nowMs: number): void {
        if (this.activeEffect !== null && nowMs >= this.expiryMs) {
            this.activeEffect = null;
            this.expiryMs = 0;
        }
    }

    /** Shift expiry forward by deltaMs — called by _applyPauseOffset */
    shiftExpiry(deltaMs: number): void {
        if (this.activeEffect !== null) {
            this.expiryMs += deltaMs;
        }
    }

    getRemainingMs(nowMs: number): number {
        if (!this.isActive(nowMs)) return 0;
        return this.expiryMs - nowMs;
    }
}
```

**Confidence:** HIGH — matches established codebase timestamp model.

### Pattern 2: Cell Interface Extension

**What:** Add `isSpecial: boolean` and `specialEffect: EffectType | null` to existing `Cell` interface in `Grid.ts`. Reset both fields in `clearCell()` and `clearAll()`.

```typescript
// Grid.ts additions
import { EffectType } from './PowerUpState';

export interface Cell {
    index: number;
    row: number;
    col: number;
    flower: FlowerFSM | null;
    isSpecial: boolean;            // NEW
    specialEffect: EffectType | null; // NEW
}

// In constructor, push:
this._cells.push({ index, row, col, flower: null, isSpecial: false, specialEffect: null });

// clearCell() addition:
cell.isSpecial = false;
cell.specialEffect = null;

// clearAll() addition:
cell.isSpecial = false;
cell.specialEffect = null;
```

**Confidence:** HIGH — direct implementation of D-04.

### Pattern 3: TIME_FREEZE Rolling Offset

**What:** Each frame while TIME_FREEZE is active, advance `sessionStartMs` forward by `dt * 1000` milliseconds. This makes `nowMs - sessionStartMs` (elapsed time) grow more slowly without touching any other state.

**When to use:** Only while `powerUpState.isActive(nowMs) && powerUpState.activeEffect === EffectType.TIME_FREEZE`.

```typescript
// GameController.ts — inside update(), before HUD update
if (this.powerUpState.isActive(nowMs) &&
    this.powerUpState.activeEffect === EffectType.TIME_FREEZE) {
    this.gameState.sessionStartMs += _dt * 1000;
}

// powerUpState.tick() called AFTER the rolling offset
this.powerUpState.tick(nowMs);
```

**Critical detail from STATE.md:** `[Phase 10-special-flowers]: TIME_FREEZE per-frame: sessionStartMs += dt*1000; expiries NOT shifted during normal play (absolute timestamps)`. The effect expiry is an absolute timestamp — it is not shifted. Only `sessionStartMs` is advanced per-frame.

**Confidence:** HIGH — confirmed in STATE.md accumulated decisions.

### Pattern 4: SLOW_GROWTH Config Copy at Spawn Time

**What:** When SLOW_GROWTH is active at spawn time, create a spread copy of the flower config with `cycleDurationMs` multiplied by `slowGrowthFactor` before passing to `grid.spawnFlower()`.

```typescript
// GameController.ts — inside spawn loop
function applySlowGrowthConfig(
    config: FlowerTypeConfig,
    factor: number
): FlowerTypeConfig {
    return { ...config, cycleDurationMs: Math.round(config.cycleDurationMs * factor) };
}

// In spawn loop:
const baseConfig = FLOWER_CONFIGS[typeId];
const effectiveConfig = (
    this.powerUpState.isActive(nowMs) &&
    this.powerUpState.activeEffect === EffectType.SLOW_GROWTH
) ? applySlowGrowthConfig(baseConfig, this._powerUpConfig.slowGrowthFactor)
  : baseConfig;
this.grid.spawnFlower(emptyCell, effectiveConfig, nowMs);
```

**From STATE.md:** "applySlowGrowthConfig returns spread+Math.round copy — never mutates live config." This is the confirmed approach.

**Confidence:** HIGH — confirmed in STATE.md accumulated decisions.

### Pattern 5: SCORE_MULTIPLIER Layer in applyCorrectTap

**What:** `GameState.applyCorrectTap()` gains an optional `powerUpMultiplier` parameter (defaults to 1 for full backward compatibility).

```typescript
// GameState.ts — modified signature
applyCorrectTap(rawScore: number, combo: ComboSystem, powerUpMultiplier: number = 1): void {
    this.correctTaps += 1;
    this.score += Math.round(rawScore * combo.multiplier * powerUpMultiplier);
    combo.onCorrectTap();
    if (combo.tapCount > this.peakStreak) {
        this.peakStreak = combo.tapCount;
    }
}
```

**From STATE.md:** "powerUpMultiplier defaults to 1 in applyCorrectTap for full backward compatibility." All existing tests continue to pass.

**Confidence:** HIGH — confirmed in STATE.md accumulated decisions.

### Pattern 6: Cell Background Sprite Swap in GridRenderer

**What:** `GridRenderer` loads the three special cell sprites at startup (`cell_fire`, `cell_freeze`, `cell_grass`) using the existing `_loadAsSpriteFrame` method. In `update()`, after `_paintState()` is called, check `cell.isSpecial` and swap `view.bgSprite.spriteFrame` accordingly.

```typescript
// GridRenderer.ts additions
private _cellSpriteFrames: Partial<Record<EffectType, SpriteFrame>> = {};
private _defaultCellFrame: SpriteFrame | null = null;

// In _loadSprites():
this._loadAsSpriteFrame('flowers/cell_empty', sf => {
    this._defaultCellFrame = sf;
    for (const view of this._cellViews) view.bgSprite.spriteFrame = sf;
});
this._loadAsSpriteFrame('flowers/cell_fire', sf => {
    this._cellSpriteFrames[EffectType.SCORE_MULTIPLIER] = sf;
});
this._loadAsSpriteFrame('flowers/cell_freeze', sf => {
    this._cellSpriteFrames[EffectType.TIME_FREEZE] = sf;
});
this._loadAsSpriteFrame('flowers/cell_grass', sf => {
    this._cellSpriteFrames[EffectType.SLOW_GROWTH] = sf;
});

// In update() — after _paintState call, add:
private _refreshCellBg(view: CellView, cell: Cell): void {
    const targetSf = cell.isSpecial && cell.specialEffect
        ? (this._cellSpriteFrames[cell.specialEffect] ?? this._defaultCellFrame)
        : this._defaultCellFrame;
    if (targetSf && view.bgSprite.spriteFrame !== targetSf) {
        view.bgSprite.spriteFrame = targetSf;
    }
}
```

**From CONTEXT.md:** "Special overlay drawn after _paintState in GridRenderer so it renders on top of flower color." This means the bg sprite swap must happen but the flower sprite renders on top — which is already the case given the layer order (bgNode is Layer 1, flowerNode is Layer 2).

**Important asset note:** Directory listing shows `cell_fozen.png.meta` (typo) alongside `cell_freeze.png` and `cell_freeze.png` (no meta). The correct asset to load is `flowers/cell_freeze` — the `.meta` file with the typo is not a concern as Cocos uses the non-meta filename.

**Confidence:** HIGH.

### Pattern 7: PowerUpHUDRenderer

**What:** Cocos Component parented to HUD Canvas. Each frame, reads `PowerUpState` via a `tick(powerUpState, nowMs)` method — pure read, no mutation. Shows effect icon sprite + `Graphics` arc countdown. Hidden when no effect active.

**Discretion decision: Graphics arc vs ProgressBar**

Use `Graphics` arc. Reasons:
1. `Graphics` is already imported in `GridRenderer.ts` — established usage pattern.
2. `ProgressBar` requires node hierarchy setup in the scene editor; `Graphics` draws procedurally.
3. Arc gives precise circular countdown. `ProgressBar` requires a circular sprite asset.

```typescript
// PowerUpHUDRenderer.ts — key tick method
tick(powerUpState: PowerUpState, nowMs: number): void {
    if (!powerUpState.isActive(nowMs)) {
        this.node.active = false;
        return;
    }
    this.node.active = true;
    // Update icon
    const effect = powerUpState.activeEffect!;
    if (this._iconSprite && this._cellSpriteFrames[effect]) {
        this._iconSprite.spriteFrame = this._cellSpriteFrames[effect]!;
    }
    // Draw arc
    const remaining = powerUpState.getRemainingMs(nowMs);
    const total = this._getDurationForEffect(effect); // from config
    const pct = Math.max(0, Math.min(1, remaining / total));
    this._drawCountdownArc(pct);
}

private _drawCountdownArc(fraction: number): void {
    if (!this._arcGraphics) return;
    const g = this._arcGraphics;
    g.clear();
    // Background circle
    g.strokeColor = new Color(80, 80, 80, 200);
    g.lineWidth = 4;
    g.circle(0, 0, this._arcRadius);
    g.stroke();
    // Foreground arc — clockwise from top (12 o'clock = -PI/2)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * fraction;
    g.strokeColor = new Color(255, 255, 255, 255);
    g.lineWidth = 4;
    g.arc(0, 0, this._arcRadius, startAngle, endAngle, false);
    g.stroke();
}
```

**Confidence:** HIGH for technique; MEDIUM for exact visual parameters (radius, line width — discoverable at runtime).

### Pattern 8: GameConfig powerUps Extension

**What:** Add `powerUps` key to `flowers.json` and parse it in `GameConfig.ts`.

```json
// flowers.json addition
"powerUps": {
  "specialChance": 0.08,
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

```typescript
// GameConfig.ts addition
export interface PowerUpConfig {
    specialChance: number;
    scoreMultiplier: { durationMs: number; multiplierByPhase: [number, number, number] };
    timeFreeze: { durationMs: number };
    slowGrowth: { durationMs: number; factor: number };
}

export interface GameConfig {
    flowers: Record<FlowerTypeId, FlowerTypeConfig>;
    spawnPhases: SpawnPhaseConfig[];
    settings: { session: { durationMs: number }; scoring: { wrongTapPenalty: number } };
    powerUps?: PowerUpConfig; // optional — fallback defaults used if absent
}
```

The `powerUps` section is **optional** in the config — `GameController` falls back to hardcoded defaults via `initPowerUpConfig()` if absent. This keeps existing `parseGameConfig` tests unaffected (they don't include `powerUps`).

**Confidence:** HIGH — follows established `requirePositiveNumber` / `requireNonNegativeNumber` validation pattern.

### Anti-Patterns to Avoid

- **Mutating live FlowerFSM timestamps for SLOW_GROWTH:** Create a config copy at spawn time — do NOT call `flower.shiftTimestamp()` after spawn. Confirmed by STATE.md.
- **Shifting effect expiry each frame during TIME_FREEZE:** Expiry is absolute. Only `sessionStartMs` advances per-frame during freeze. Shifting expiry would cause freeze to never expire.
- **Stacking effects:** No array of active effects. Only one `activeEffect` at a time — replacement semantics only.
- **Calling `clearCell()` without resetting `isSpecial`/`specialEffect`:** The cell bg would stay as `cell_fire/freeze/grass` for the next flower. Always reset in `clearCell()` and `clearAll()`.
- **Forgetting to shift `powerUpState.expiryMs` in `_applyPauseOffset()`:** The effect timer must pause with the game. Add `this.powerUpState.shiftExpiry(deltaMs)` to `_applyPauseOffset()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular countdown visual | Custom sprite animator | `Graphics.arc()` | Already imported, no layout dependencies |
| Sprite loading | Custom asset pipeline | `_loadAsSpriteFrame()` (existing) | Already handles SpriteFrame + Texture2D fallback |
| Effect timer | Cocos `schedule()` / `scheduleOnce()` | Expiry timestamp + `tick()` per frame | schedule() doesn't survive pause/resume offset; timestamps do |
| Config validation | Ad-hoc type checks | `requirePositiveNumber` / `requireNonNegativeNumber` (existing) | Consistent error messages, proven pattern |

---

## Common Pitfalls

### Pitfall 1: TIME_FREEZE Shifts Wrong Timestamp
**What goes wrong:** Developer shifts `powerUpState.expiryMs` each frame during TIME_FREEZE instead of (or in addition to) `sessionStartMs`.
**Why it happens:** Both are timestamps; it's tempting to "freeze" by not advancing expiry.
**How to avoid:** During TIME_FREEZE: advance `sessionStartMs += dt*1000`. Do NOT touch `expiryMs` during normal play. Only `shiftExpiry()` during pause offset.
**Warning signs:** Freeze effect never expires, or expires immediately on resume.

### Pitfall 2: SLOW_GROWTH Mutates Live Flowers
**What goes wrong:** `cycleDurationMs` is changed on the live `FlowerTypeConfig` object in `FLOWER_CONFIGS`, affecting all flowers of that type — including ones already on the board.
**Why it happens:** `FLOWER_CONFIGS` is a shared mutable object.
**How to avoid:** `applySlowGrowthConfig()` returns a spread copy — only affects the single `spawnFlower()` call.
**Warning signs:** All CHERRY flowers suddenly slow down when SLOW_GROWTH activates.

### Pitfall 3: Cell Background Not Reset After Flower Cleared
**What goes wrong:** After a special flower is cleared (DEAD state or collected), the cell still shows `cell_fire/freeze/grass` background for the next flower that spawns.
**Why it happens:** `GridRenderer.paintFlashAndClear()` calls `grid.clearCell(cell)` — if `clearCell()` doesn't reset `isSpecial`/`specialEffect`, the bg persists.
**How to avoid:** Add `cell.isSpecial = false; cell.specialEffect = null;` to `Grid.clearCell()` AND `Grid.clearAll()`.
**Warning signs:** Non-special flowers occasionally spawn with colored backgrounds.

### Pitfall 4: Score Multiplier Applied After Combo, Not With Combo
**What goes wrong:** `score += rawScore * powerUpMultiplier * combo.multiplier` — multiplication order doesn't matter mathematically, but if the developer forgets `powerUpMultiplier` defaults to 1 and breaks the signature, existing tests fail.
**Why it happens:** Changing `applyCorrectTap()` signature is a breaking change.
**How to avoid:** Add `powerUpMultiplier: number = 1` as a default parameter. All call sites not passing it continue to work.

### Pitfall 5: HUD Node Active State Race
**What goes wrong:** `PowerUpHUDRenderer.tick()` sets `this.node.active = false` when no effect is active — but if the node starts active in the scene, the first frame before any special flower tap shows a flash of the HUD.
**Why it happens:** HUD node `active` default is usually `true` in the scene.
**How to avoid:** Set HUD node `active = false` in `onLoad()` of `PowerUpHUDRenderer`, or in `GameController._beginSession()`.

### Pitfall 6: _applyPauseOffset Misses Effect Expiry
**What goes wrong:** After pause+resume, the effect timer jumps forward by the pause duration (expires too early).
**Why it happens:** `_applyPauseOffset(deltaMs)` shifts `sessionStartMs`, flower timestamps, and `_nextSpawnMs` — but doesn't shift `powerUpState.expiryMs`.
**How to avoid:** Add `this.powerUpState.shiftExpiry(deltaMs)` to `_applyPauseOffset()`.

### Pitfall 7: D-07 vs D-08 Tap Branching
**What goes wrong:** The tap handler treats FULL_BLOOM on a special cell as a wrong tap, or applies the power-up on BLOOMING (not FULL_BLOOM only).
**Why it happens:** D-07 locks activation to FULL_BLOOM only, but BLOOMING is also a "correct" tap for regular scoring.
**How to avoid:** In `GridRenderer._onCellTapped()`, after establishing `state === FULL_BLOOM`, check `cell.isSpecial` and call `powerUpState.activate()`. BLOOMING state on a special cell still scores but does NOT activate the power-up.

---

## Code Examples

### GameConfig powerUps parse skeleton
```typescript
// Source: GameConfig.ts — follows requirePositiveNumber pattern
function parsePowerUps(data: unknown): PowerUpConfig | undefined {
    if (!isRecord(data) || !('powerUps' in data)) return undefined;
    const pu = data['powerUps'];
    if (!isRecord(pu)) throw new Error('[GameConfig] powerUps must be a non-null object');
    const specialChance = requirePositiveNumber(pu as Record<string, unknown>, 'specialChance', 'powerUps');
    // ... validate sub-objects ...
    return { specialChance, scoreMultiplier: ..., timeFreeze: ..., slowGrowth: ... };
}
```

### Spawn loop special decision
```typescript
// GameController.ts — inside spawn batch loop, after pickFlowerType()
const typeId = this.spawnManager.pickFlowerType(elapsedMs);
const isSpecial = Math.random() < this._powerUpConfig.specialChance;
const specialEffect = isSpecial ? this._pickRandomEffect() : null;
emptyCell.isSpecial = isSpecial;
emptyCell.specialEffect = specialEffect;
```

### _pickRandomEffect() helper
```typescript
private _pickRandomEffect(): EffectType {
    const effects = [EffectType.SCORE_MULTIPLIER, EffectType.TIME_FREEZE, EffectType.SLOW_GROWTH];
    return effects[Math.floor(Math.random() * effects.length)];
}
```

### Correct tap branch for special flowers
```typescript
// GameController.handleCorrectTap() — extended
if (cell.isSpecial && state === FlowerState.FULL_BLOOM) {
    const phaseIndex = this.spawnManager.getPhaseIndex(elapsedMs); // 0, 1, or 2
    const durationMs = this._getDurationForEffect(cell.specialEffect!);
    this.powerUpState.activate(cell.specialEffect!, nowMs, durationMs);
}
const powerUpMultiplier = (
    cell.isSpecial === false &&
    this.powerUpState.isActive(nowMs) &&
    this.powerUpState.activeEffect === EffectType.SCORE_MULTIPLIER
) ? this._getScoreMultiplier(phaseIndex) : 1;
this.gameState.applyCorrectTap(rawScore, this.comboSystem, powerUpMultiplier);
```

### _applyPauseOffset with effect expiry
```typescript
private _applyPauseOffset(deltaMs: number): void {
    this.gameState.sessionStartMs += deltaMs;
    this.grid.shiftAllTimestamps(deltaMs);
    this._nextSpawnMs += deltaMs;
    this.powerUpState.shiftExpiry(deltaMs);  // NEW
}
```

---

## Validation Architecture

`nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected via `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |
| Current baseline | 186 tests passing, 10 test files |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPECIAL-01 | `PowerUpState.isActive()` returns false initially | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/PowerUpState.test.ts` | Wave 0 |
| SPECIAL-01 | `PowerUpState.activate()` sets correct expiry | unit | same | Wave 0 |
| SPECIAL-01 | `PowerUpState.tick()` clears expired effect | unit | same | Wave 0 |
| SPECIAL-01 | `PowerUpState.shiftExpiry()` advances expiry | unit | same | Wave 0 |
| SPECIAL-01 | `Grid.clearCell()` resets `isSpecial` + `specialEffect` | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/Grid.test.ts` | existing |
| SPECIAL-01 | `parseGameConfig` accepts valid `powerUps` block | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameConfig.test.ts` | existing |
| SPECIAL-01 | `parseGameConfig` allows missing `powerUps` (backward compat) | unit | same | existing |
| SPECIAL-02 | `applyCorrectTap(rawScore, combo, 2)` doubles score vs multiplier=1 | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameState.test.ts` | existing |
| SPECIAL-02 | `applyCorrectTap(rawScore, combo)` (no 3rd arg) unchanged | unit | same | existing |
| SPECIAL-03 | TIME_FREEZE per-frame offset proof: sessionStartMs advances slower | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/PowerUpState.test.ts` | Wave 0 |
| SPECIAL-04 | `applySlowGrowthConfig(config, 2.0)` doubles `cycleDurationMs` | unit | same | Wave 0 |
| SPECIAL-04 | `applySlowGrowthConfig` does not mutate original config | unit | same | Wave 0 |
| SPECIAL-02/03/04 | Cell sprite swap + HUD visible/hidden on activate/expire | manual | Cocos Editor play mode | N/A |
| SPECIAL-02/03/04 | Effect replaces active effect (D-05 replacement semantics) | manual | Cocos Editor play mode | N/A |
| D-17 | Effect timer freezes during pause, resumes after | manual | Cocos Editor play mode | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (186+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BloomTap/assets/scripts/logic/PowerUpState.test.ts` — covers PowerUpState unit tests (SPECIAL-01, SPECIAL-03, SPECIAL-04)
- [ ] `BloomTap/assets/scripts/PowerUpHUDRenderer.ts` — new Cocos Component file (Wave 0 scaffold, no tests needed — Cocos runtime)

*(Grid.test.ts, GameState.test.ts, GameConfig.test.ts already exist — extend with new cases)*

---

## Existing Asset Verification

**Cell sprites confirmed present** (from directory listing of `BloomTap/assets/resources/flowers/`):
- `cell_empty.png` — already loaded in `GridRenderer._loadSprites()`
- `cell_fire.png` — present, no `.meta` file yet (note: needs `.meta` or Cocos won't recognize it)
- `cell_freeze.png` — present
- `cell_grass.png` — present
- `cell_fozen.png.meta` — typo artifact from previous attempt; safe to ignore

**Meta file status:** `cell_fire.png`, `cell_freeze.png`, `cell_grass.png` may be missing `.meta` files (only `cell_grass.png.meta` and `cell_fozen.png.meta` confirmed). Cocos Creator auto-generates `.meta` files when the Editor imports the asset. If sprites fail to load in Editor, reimport via right-click → Re-Import.

**Confidence:** HIGH for asset existence; MEDIUM for meta file completeness (check in Editor).

---

## Open Questions

1. **Cell bg dirty tracking in GridRenderer**
   - What we know: `GridRenderer.update()` uses `_dirty[i]` and `_lastState[i]` to skip unchanged cells.
   - What's unclear: The special cell bg swap needs to trigger a repaint even if `FlowerState` hasn't changed (e.g., a special flower was just spawned — the bg needs to change from `cell_empty` to `cell_fire`, but `_lastState` might still be the same as last frame).
   - Recommendation: Track `cell.isSpecial` separately in a `_lastIsSpecial: boolean[]` array (64 entries), or force `_dirty[i] = true` whenever `cell.isSpecial` changes in the spawn loop via a `GridRenderer.markCellSpecial(row, col)` call. The latter is simpler and consistent with existing `setCellTypeId()` pattern.

2. **SCORE_MULTIPLIER phase index lookup**
   - What we know: `multiplierByPhase: [2, 3, 5]` is indexed by spawn phase (0, 1, 2).
   - What's unclear: `SpawnManager` doesn't currently expose a `getPhaseIndex()` method — only `getPhaseConfig(elapsedMs)`.
   - Recommendation: Add `getPhaseIndex(elapsedMs): number` to `SpawnManager`, or compute inline in `GameController` using `elapsedMs` thresholds (40000ms, 80000ms). Inline is simpler — no new SpawnManager API.

3. **PowerUpHUDRenderer Cocos scene wiring**
   - What we know: HUD node needs `@property(PowerUpHUDRenderer)` in `GameController`.
   - What's unclear: Whether PowerUpHUDRenderer should be a separate Canvas node or a child of the existing `hudNode`.
   - Recommendation: Child of existing `hudNode` so it hides automatically when `hudNode.active = false` during game-over/start states.

---

## Sources

### Primary (HIGH confidence)
- `BloomTap/assets/scripts/GameController.ts` — `_applyPauseOffset()`, `handleCorrectTap()`, `update()`, spawn loop, pause/resume pattern
- `BloomTap/assets/scripts/GridRenderer.ts` — `_loadAsSpriteFrame()`, `_buildCellViews()`, `_paintState()`, `CellView` interface, dirty tracking
- `BloomTap/assets/scripts/logic/Grid.ts` — `Cell` interface, `clearCell()`, `clearAll()`
- `BloomTap/assets/scripts/logic/GameState.ts` — `applyCorrectTap()`, `sessionStartMs`
- `BloomTap/assets/scripts/logic/GameConfig.ts` — `requirePositiveNumber`, `parseGameConfig()`, `isRecord()`
- `.planning/phases/10-special-flowers/10-CONTEXT.md` — all locked decisions D-01 through D-19
- `.planning/STATE.md` — accumulated Phase 10 decisions (TIME_FREEZE offset, applySlowGrowthConfig semantics, powerUpMultiplier default)
- `BloomTap/assets/resources/flowers/` directory listing — asset presence confirmed

### Secondary (MEDIUM confidence)
- `BloomTap/assets/resources/config/flowers.json` — current config structure (powerUps section to be added)
- `vitest.config.ts` detected presence — confirmed test runner

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all APIs confirmed present in existing files
- Architecture: HIGH — timestamp model verified in STATE.md, pattern consistent with Phases 7-9
- Pitfalls: HIGH — 4 of 7 pitfalls directly confirmed by STATE.md accumulated decisions; 3 inferred from codebase patterns
- Asset availability: MEDIUM — sprites confirmed present; .meta file completeness requires Editor verification

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable Cocos 3.x APIs; config-driven approach is project-locked)
