# Phase 8: Spawn Fix — Research

**Researched:** 2026-03-21
**Domain:** Cocos Creator 3.8 GameController session flow / SpawnManager / GameConfig schema
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep the 3→2→1 countdown. Spawn the initial burst **immediately when player taps Start** (before countdown begins) — board is populated while countdown runs.
- **D-02:** Input remains locked during countdown (no change from current behavior). Player sees flowers cycling on the board but cannot tap until PLAYING phase begins.
- **D-03:** `initialCount` lives in `spawnPhases[0]` in `flowers.json` (alongside `startMs`, `endMs`, `intervalMs`, `maxAlive`, `spawnBatch`, `weights`).
- **D-04:** Only `spawnPhases[0]` needs `initialCount` — other phases don't use it. Schema validation must accept `initialCount` as optional on phases 1 and 2, required on phase 0.
- **D-05:** Initial burst uses `spawnPhases[0]` weights (random weighted selection) — same logic as regular phase 1 spawn. No special "easy flower" bias.
- **D-06:** Initial burst respects `maxAlive` from `spawnPhases[0]` — do not exceed the cap even if `initialCount` is larger.

### Claude's Discretion

- Where in `_onStartTapped()` or a new helper the initial burst call lives
- Whether initial burst is a loop calling existing `grid.spawnFlower()` or a new SpawnManager method
- Test coverage strategy for the new `initialCount` field in `parseGameConfig`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPAWN-01 | Hoa xuất hiện ngay khi game bắt đầu (không delay 3 giây), số lượng ban đầu configurable từ JSON | `initialCount` added to `SpawnPhaseConfig` and `flowers.json`; initial burst loop inserted in `_onStartTapped()` before `_startCountdown()`; `parseGameConfig` updated to read and require the field on phase 0 |
</phase_requirements>

---

## Summary

Phase 8 is a focused, low-risk change to three files: `flowers.json`, `GameConfig.ts`, and `GameController.ts`. The full infrastructure for spawn logic and config loading already exists from Phase 7. The work is:

1. **JSON** — add `"initialCount": 5` (or designer-chosen value) to `spawnPhases[0]` in `flowers.json`.
2. **Schema** — extend `SpawnPhaseConfig` interface with `initialCount?: number` and update `parseSpawnPhases()` in `GameConfig.ts` to require it on phase index 0, ignore it on other indices.
3. **Controller** — add an initial burst loop in `_onStartTapped()` (before `_startCountdown()`), mirroring the existing spawn loop in `update()`, using `PHASE_CONFIGS[0]` for weights and `maxAlive`.

The `grid.clearAll()` must be called before the burst (or confirmed that grid is already empty at that point) to avoid cumulative flowers across restarts. `onRestartTapped()` already calls `grid.clearAll()` so grid is empty when the start screen is shown again — the burst will always start into a clean grid.

**Primary recommendation:** Keep the initial burst as a private helper `_spawnInitialBurst()` in `GameController.ts`. This keeps `_onStartTapped()` readable and makes the helper independently testable via integration check in Cocos Editor.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | detected via `vitest.config.ts` | Unit test runner | Already used for all 171 existing tests |
| TypeScript | project-wide | Type safety | Existing codebase language |
| Cocos Creator | 3.8.8 | Engine / scene graph | Existing engine |

### Supporting (already present)

| Item | Purpose | Notes |
|------|---------|-------|
| `SpawnManager.getPhaseConfig(0)` | Returns `PHASE_CONFIGS[0]` for initial burst weights | Pass `elapsedMs = 0` |
| `SpawnManager.pickFlowerType(0)` | Weighted random flower type at phase 0 weights | Reuse directly |
| `Grid.getRandomEmptyCell()` | Find empty cell for each burst flower | Already used in `update()` loop |
| `Grid.getAliveCount(nowMs)` | Enforce `maxAlive` cap during burst | Already used in `update()` loop |
| `Grid.spawnFlower(cell, config, nowMs)` | Actually spawn a flower into grid state | Already used in `update()` loop |
| `GridRenderer.setCellTypeId(row, col, typeId)` | Update renderer for each spawned cell | Already used in `update()` loop |

**Installation:** None required. All dependencies already present.

---

## Architecture Patterns

### Recommended Change Locations

```
BloomTap/assets/scripts/
├── GameController.ts            # _onStartTapped() → add _spawnInitialBurst() call
│                                # + new private _spawnInitialBurst() helper
└── logic/
    ├── GameConfig.ts            # SpawnPhaseConfig interface + parseSpawnPhases() update
    └── GameConfig.test.ts       # New tests for initialCount validation

BloomTap/assets/resources/config/
└── flowers.json                 # spawnPhases[0] += "initialCount": 5
```

### Pattern 1: Initial Burst Loop (mirrors existing update() spawn loop exactly)

**What:** A `for` loop that spawns up to `initialCount` flowers, breaking early if `maxAlive` is reached or no empty cells remain.

**When to use:** Called once from `_onStartTapped()` before `_startCountdown()`.

**Pattern (mirrors lines 131–144 of GameController.ts):**
```typescript
// Source: GameController.ts update() lines 131–144 (existing spawn loop)
private _spawnInitialBurst(): void {
    const nowMs = performance.now();
    const phaseConfig = this.spawnManager.getPhaseConfig(0); // phase 0 weights
    const initialCount = (phaseConfig as SpawnPhaseConfig & { initialCount: number }).initialCount;
    for (let i = 0; i < initialCount; i++) {
        if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;
        const emptyCell = this.grid.getRandomEmptyCell();
        if (!emptyCell) break;
        const typeId = this.spawnManager.pickFlowerType(0);
        const config = FLOWER_CONFIGS[typeId];
        this.grid.spawnFlower(emptyCell, config, nowMs);
        if (this.gridRenderer) {
            this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
        }
    }
}
```

**Note on `initialCount` access:** Because `SpawnPhaseConfig` is exported from `SpawnManager.ts`, the cleanest approach is to extend the interface there (add `initialCount?: number`) so `getPhaseConfig(0)` returns the typed field without a cast. The planner should decide the exact typing strategy.

### Pattern 2: SpawnPhaseConfig Interface Extension

**What:** Add `initialCount?: number` to the existing `SpawnPhaseConfig` interface in `SpawnManager.ts`.

**When to use:** Required so `PHASE_CONFIGS[0].initialCount` is accessible without a type assertion in `GameController.ts`.

```typescript
// Source: SpawnManager.ts (current interface)
export interface SpawnPhaseConfig {
    startMs: number;
    endMs: number;
    intervalMs: number;
    maxAlive: number;
    spawnBatch: number;
    weights: Record<FlowerTypeId, number>;
    initialCount?: number;  // ADD: required on phase 0 by GameConfig, optional here for backward compat
}
```

### Pattern 3: GameConfig.ts parseSpawnPhases() — conditional field validation

**What:** On phase index 0, require `initialCount` via `requirePositiveNumber`. On indices 1+, skip silently (field may be absent).

**When to use:** Replacing the current `return` statement in `parseSpawnPhases()` map callback.

```typescript
// Source: GameConfig.ts parseSpawnPhases() (extend existing return object)
const initialCount = index === 0
    ? requirePositiveNumber(phase, 'initialCount', ctx)
    : undefined;

return { startMs, endMs, intervalMs, maxAlive, spawnBatch, weights, ...(initialCount !== undefined ? { initialCount } : {}) };
```

### Pattern 4: _onStartTapped() call order

**What:** Insert `_spawnInitialBurst()` call before `_startCountdown()` so flowers appear on the board while the countdown overlay is running.

```typescript
// Source: GameController.ts _onStartTapped() (current: line 401–403)
private _onStartTapped(): void {
    this._spawnInitialBurst(); // ADD: populate board before countdown starts
    this._startCountdown();
}
```

### Pattern 5: flowers.json schema extension

```json
// Source: flowers.json spawnPhases[0] (add initialCount field)
{
  "startMs": 0, "endMs": 40000, "intervalMs": 3000, "maxAlive": 8,
  "spawnBatch": 3, "initialCount": 5,
  "weights": { ... }
}
```

### Anti-Patterns to Avoid

- **Spawning in `_beginSession()` instead of `_onStartTapped()`:** `_beginSession()` fires after the countdown completes — board would still be empty during the 3-second countdown. Decision D-01 is explicit: burst happens before countdown.
- **Resetting grid in `_beginSession()` after burst:** `_beginSession()` calls `gameState.reset()` only — it does NOT call `grid.clearAll()`. Flowers spawned in `_onStartTapped()` persist through the countdown and are alive when PLAYING begins. This is the intended behavior (flowers visible during countdown per D-01). Do not call `grid.clearAll()` in `_beginSession()`.
- **Calling `_nextSpawnMs = performance.now()` to handle initial burst:** Current code already does this in `_beginSession()` so the first `update()` frame spawns a regular batch immediately. The initial burst is separate — it populates the board during the countdown, before the session timer starts.
- **Requiring `initialCount` on all phases:** Decision D-04 explicitly scopes it to phase 0 only. Phases 1 and 2 must not fail validation if the field is absent.
- **Ignoring `maxAlive` cap during initial burst:** Decision D-06 is explicit. The loop must break when `aliveCount >= maxAlive`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted random flower selection | Custom picker | `spawnManager.pickFlowerType(0)` | Already correct, tested, handles edge cases |
| Phase 0 config lookup | Hardcoded index | `spawnManager.getPhaseConfig(0)` | Consistent with runtime spawn loop |
| Grid cell selection | Custom empty-cell finder | `grid.getRandomEmptyCell()` | Already handles null (no cells left) |
| Alive count enforcement | Manual count | `grid.getAliveCount(nowMs)` | Already handles FSM state transitions |
| Schema validation | Custom assertion | `requirePositiveNumber()` in GameConfig.ts | Existing helper, consistent error messages |

**Key insight:** Every primitive needed for the initial burst already exists and is tested. The task is assembly, not invention.

---

## Common Pitfalls

### Pitfall 1: Grid not cleared between sessions on restart path

**What goes wrong:** If `grid.clearAll()` is not called before `_spawnInitialBurst()`, a restarted session could have leftover flowers from the previous session.

**Why it happens:** `onRestartTapped()` calls `grid.clearAll()` and shows the start screen. When Start is tapped again, `_onStartTapped()` fires — grid IS empty at this point. No extra `clearAll()` is needed in `_spawnInitialBurst()`.

**How to avoid:** Verify the existing restart path: `onRestartTapped()` → `grid.clearAll()` → `_showStartScreen()` — grid is always clean before `_onStartTapped()` fires. No extra clearing required.

**Warning signs:** Seeing more flowers than `initialCount` on the board when restarting.

### Pitfall 2: `initialCount` field absent from JSON causes silent default

**What goes wrong:** If `parseGameConfig` doesn't require `initialCount` on phase 0, a typo or missing field results in `undefined`, and the burst loop runs 0 times (or `NaN` times), giving an empty board silently.

**Why it happens:** Optional fields with `undefined` default cause `for (let i = 0; i < undefined; i++)` — the condition is false immediately, 0 flowers spawn.

**How to avoid:** Use `requirePositiveNumber(phase, 'initialCount', ctx)` on `index === 0` in `parseSpawnPhases()`. This throws at load time with a clear message if the field is missing or non-positive.

**Warning signs:** Board appears empty at game start despite decision D-01.

### Pitfall 3: `nowMs` timestamp mismatch between burst and subsequent spawns

**What goes wrong:** Using different `performance.now()` calls for burst vs. `_beginSession()` timer start creates a small offset in flower birth timestamps.

**Why it happens:** Each `performance.now()` call returns a slightly different value. The burst happens during countdown (potentially 3000ms before `_beginSession()`), so flower timestamps will be ~3s old when PLAYING begins.

**How to avoid:** This is expected and correct behavior. Flowers spawned during countdown will have aged by ~3 seconds when PLAYING starts — some may already be in BLOOMING or later states, which is the intended "flowers already in motion" feel. No special handling needed; the FSM handles this automatically via elapsed-time-based state calculation.

**Warning signs:** Confusion about why flowers spawned in `_onStartTapped()` look "more advanced" than fresh spawns — this is by design.

### Pitfall 4: `gridRenderer.setCellTypeId()` called without null check

**What goes wrong:** `this.gridRenderer` could theoretically be null (if inspector wiring is incomplete), causing a runtime crash during `_spawnInitialBurst()`.

**Why it happens:** `@property` decorators don't guarantee inspector wiring.

**How to avoid:** Mirror the null-guard pattern from `update()` — wrap `setCellTypeId` in `if (this.gridRenderer) { ... }` just as line 140 does. The `grid.spawnFlower()` call (pure logic) proceeds regardless; only the renderer call is guarded.

---

## Code Examples

### Existing spawn loop in update() — reference for initial burst pattern

```typescript
// Source: GameController.ts lines 131–144 (current code)
if (nowMs >= this._nextSpawnMs) {
    const phaseConfig = this.spawnManager.getPhaseConfig(elapsedMs);
    for (let i = 0; i < phaseConfig.spawnBatch; i++) {
        if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;
        const emptyCell = this.grid.getRandomEmptyCell();
        if (!emptyCell) break;
        const typeId = this.spawnManager.pickFlowerType(elapsedMs);
        const config = FLOWER_CONFIGS[typeId];
        this.grid.spawnFlower(emptyCell, config, nowMs);
        if (this.gridRenderer) {
            this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
        }
    }
    this._nextSpawnMs = nowMs + phaseConfig.intervalMs;
}
```

### Existing parseSpawnPhases() return object — reference for adding initialCount

```typescript
// Source: GameConfig.ts lines 119–143 (current code)
return { startMs, endMs, intervalMs, maxAlive, spawnBatch, weights };
// EXTEND: add initialCount for index === 0
```

### Existing requirePositiveNumber() — available for initialCount validation

```typescript
// Source: GameConfig.ts lines 18–28
function requirePositiveNumber(obj: Record<string, unknown>, key: string, context: string): number {
    const val = obj[key];
    if (typeof val !== 'number' || isNaN(val)) {
        throw new Error(`[GameConfig] ${context}.${key} must be a number, got ${String(val)}`);
    }
    if (val <= 0) {
        throw new Error(`[GameConfig] ${context}.${key} must be > 0, got ${val}`);
    }
    return val;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Empty board for 3s at game start | Initial burst populates board before countdown | Phase 8 (this phase) | Player sees live flowers immediately; better UX from first frame |
| `initialCount` hardcoded | `initialCount` in `spawnPhases[0]` JSON | Phase 8 (this phase) | Designer can tune initial density without recompile |

---

## Open Questions

1. **What should the default `initialCount` value be in `flowers.json`?**
   - What we know: Current `maxAlive` for phase 0 is 8. `spawnBatch` is 3.
   - What's unclear: Designer preference — 3 (one batch equivalent) vs. 5 (half of maxAlive) vs. 8 (full cap).
   - Recommendation: Default to 5 (≈60% of maxAlive). Planner can confirm with designer or pick any value; the JSON is easily tuned.

2. **Should `initPhaseConfigs()` propagate `initialCount` automatically?**
   - What we know: `initPhaseConfigs()` in SpawnManager.ts replaces `PHASE_CONFIGS` with the parsed array from `parseGameConfig`. If `SpawnPhaseConfig` interface includes `initialCount?: number` and `parseSpawnPhases()` sets it on index 0, then `PHASE_CONFIGS[0].initialCount` will be populated automatically after `initPhaseConfigs()` runs.
   - What's unclear: Whether the planner wants `GameController` to access `initialCount` via `PHASE_CONFIGS[0]` (through `spawnManager.getPhaseConfig(0)`) or via a separate accessor. Both work; the simpler is via `getPhaseConfig(0)`.
   - Recommendation: Access via `this.spawnManager.getPhaseConfig(0).initialCount`. No new accessor needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (detected via `vitest.config.ts` at project root) |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npx vitest run` (from project root) |
| Full suite command | `npx vitest run` (same — all tests in one command) |

**Current baseline:** 171 tests, 10 test files, all passing.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPAWN-01 (schema) | `parseGameConfig` reads `initialCount` from `spawnPhases[0]` and validates it as a positive number | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameConfig.test.ts` | ✅ (extend existing file) |
| SPAWN-01 (schema) | `parseGameConfig` throws if `initialCount` is missing from `spawnPhases[0]` | unit | same | ✅ (extend existing file) |
| SPAWN-01 (schema) | `parseGameConfig` throws if `initialCount` is 0 or negative on phase 0 | unit | same | ✅ (extend existing file) |
| SPAWN-01 (schema) | `parseGameConfig` does NOT throw when `initialCount` is absent on phases 1 and 2 | unit | same | ✅ (extend existing file) |
| SPAWN-01 (board visible) | Flowers appear on board before countdown ends | manual/integration | Cocos Editor play mode | N/A — Cocos runtime |
| SPAWN-01 (count matches) | Flower count on board matches `initialCount` from JSON | manual/integration | Cocos Editor play mode — count cells | N/A — Cocos runtime |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** All 171+ tests green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. The `GameConfig.test.ts` file exists and will receive additional test cases (not a new file). No new conftest or framework setup needed.

---

## Sources

### Primary (HIGH confidence)

- Direct source read: `BloomTap/assets/scripts/GameController.ts` — `_onStartTapped()` (line 401), `_startCountdown()` (line 405), `_beginSession()` (line 423), spawn loop (lines 131–144)
- Direct source read: `BloomTap/assets/scripts/logic/SpawnManager.ts` — `SpawnPhaseConfig` interface, `getPhaseConfig()`, `pickFlowerType()`, `initPhaseConfigs()`
- Direct source read: `BloomTap/assets/scripts/logic/GameConfig.ts` — `parseSpawnPhases()`, `requirePositiveNumber()`, `requireNonNegativeNumber()`
- Direct source read: `BloomTap/assets/resources/config/flowers.json` — current `spawnPhases[0]` structure (no `initialCount` field yet)
- Direct source read: `BloomTap/assets/scripts/logic/GameConfig.test.ts` — existing test patterns and fixture structure
- Direct test run: `npx vitest run` — 171/171 passing confirmed 2026-03-21

### Secondary (MEDIUM confidence)

- `.planning/phases/08-spawn-fix/08-CONTEXT.md` — locked decisions, integration points, reusable asset inventory (authored from prior discussion session)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly, no inference required
- Architecture: HIGH — patterns copied from existing working code in same codebase
- Pitfalls: HIGH — derived from reading actual implementation and understanding data flow
- Test map: HIGH — test file structure confirmed, existing pattern clear

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable — Cocos Creator 3.8.x, no fast-moving dependencies)
