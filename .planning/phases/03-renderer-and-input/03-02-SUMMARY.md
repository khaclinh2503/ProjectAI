---
phase: 03-renderer-and-input
plan: "02"
subsystem: input-and-tap-logic
tags: [touch-input, tap-dispatch, flash-effects, game-controller, grid-renderer]
dependency_graph:
  requires: ["03-01"]
  provides: ["03-03"]
  affects: [GridRenderer, GameController, FlowerColors]
tech_stack:
  added: [FlowerColors.ts]
  patterns:
    - "Per-node TOUCH_START registration with UITransform for hit-testing"
    - "type-only import to break circular dependency at runtime"
    - "Read state+score before collect() — timestamp ordering critical path"
    - "isFlashing guard on cell prevents double-flash and NaN score"
key_files:
  created:
    - BloomTap/assets/scripts/FlowerColors.ts
    - BloomTap/assets/scripts/logic/TapHandler.test.ts
  modified:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/GridRenderer.ts
decisions:
  - "type-only import (import type) for GameController in GridRenderer avoids circular runtime dependency while preserving compile-time type safety"
  - "WRONG_FLASH_COLOR imported from FlowerColors in GridRenderer; removed module-level duplicate constants"
  - "TapHandler.test.ts tests pure logic contracts (FlowerFSM+GameState+ComboSystem) since GameController extends Cocos Component and cannot be instantiated in Vitest"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-14"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
  tests_before: 88
  tests_after: 105
  test_delta: 17
---

# Phase 03 Plan 02: Touch Input Wiring Summary

**One-liner:** TOUCH_START registered on all 64 pooled cell nodes; tap dispatch to GameController.handleCorrectTap/handleWrongTap with 300ms yellow/white and 150ms red flash effects via scheduleOnce.

---

## What Was Built

### FlowerColors.ts (new)
Extracted three Color constants shared between GridRenderer and GameController into a neutral module to prevent circular dependency:
- `CORRECT_FLASH_YELLOW` — Color(255, 220, 60) — BLOOMING correct tap
- `CORRECT_FLASH_WHITE` — Color(255, 255, 255) — FULL_BLOOM correct tap
- `WRONG_FLASH_COLOR` — Color(220, 50, 50) — wrong tap (BUD/WILTING/DEAD)

### GameController.ts (modified)
Added two public tap methods called by GridRenderer's TOUCH_START handler:

**handleCorrectTap(cell, flower, nowMs): { flashColor: Color }**
- Reads `flower.getState(nowMs)` BEFORE `collect()` (critical ordering — after collect, getState returns COLLECTED)
- Reads `flower.getScore(nowMs) ?? 0` BEFORE `collect()` (after collect, getScore returns null)
- Calls `flower.collect()` to transition the FSM
- Calls `gameState.applyCorrectTap(rawScore, comboSystem)` to update score + combo
- Returns `{ flashColor: CORRECT_FLASH_WHITE }` for FULL_BLOOM, `{ flashColor: CORRECT_FLASH_YELLOW }` for BLOOMING

**handleWrongTap(): void**
- Calls `gameState.applyWrongTap(comboSystem)` — deducts 10 points, resets combo to 1

### GridRenderer.ts (modified)
Added touch input wiring to the 64 pre-created cell nodes:

**_registerCellTouch(view)** — called in `_buildCellViews()` after `addChild()`:
```typescript
view.node.on(Node.EventType.TOUCH_START, () => {
    this._onCellTapped(view);
}, this);
```

**_onCellTapped(view)** — guard-first routing:
1. `if (view.isFlashing) return` — prevents double-flash and NaN score
2. `if (!this._grid || !this._controller) return` — null guards
3. `if (!cell.flower) return` — empty cell, silently ignored
4. Route by `cell.flower.getState(nowMs)`:
   - BLOOMING/FULL_BLOOM → `handleCorrectTap` + `paintFlashAndClear(300ms)`
   - BUD/WILTING/DEAD → `handleWrongTap` + `paintFlash(150ms, red)`

**init() signature updated:** `_controller: unknown` → `controller: GameController`, stored as `_controller` field.

**Import pattern:** `import type { GameController }` (type-only) avoids circular runtime dependency. Cocos resolves the actual reference through the scene graph at load time via `init()`.

---

## Tests

Added `TapHandler.test.ts` with 17 new behavior-contract tests (105 total, 0 regressions):
- Critical ordering: `getScore`/`getState` return correct values before `collect()`, null/COLLECTED after
- BLOOMING tap → score in [scoreBloom, scoreFull] range
- FULL_BLOOM rawScore > BLOOMING rawScore (validates GAME-02)
- Flash color selection: BLOOMING → not FULL_BLOOM (YELLOW), FULL_BLOOM → WHITE
- Null rawScore edge case: `?? 0` nullish coalesce used correctly
- Wrong tap: score decreases by exactly WRONG_TAP_PENALTY
- Wrong tap: combo resets to multiplier=1 regardless of streak
- BUD/WILTING/DEAD state detection: routes to wrong-tap branch

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicate flash color constants from GridRenderer**
- **Found during:** Task 2
- **Issue:** GridRenderer had module-level `WRONG_FLASH_COLOR`, `CORRECT_FLASH_YELLOW`, `CORRECT_FLASH_WHITE` that were identical to the new `FlowerColors.ts` constants. Leaving both would cause confusion about the canonical source.
- **Fix:** Removed the three duplicate module-level constants from `GridRenderer.ts`; imported `WRONG_FLASH_COLOR` from `FlowerColors.ts`. The static class properties `GridRenderer.WRONG_FLASH_COLOR` etc. were also removed as they became redundant.
- **Files modified:** `BloomTap/assets/scripts/GridRenderer.ts`
- **Commit:** fac8f89

**2. [Rule 2 - Missing critical functionality] Added type-only import for circular dep**
- **Found during:** Task 2
- **Issue:** GridRenderer needed to call `GameController` methods but GameController already imports GridRenderer. Runtime circular import would cause undefined at module load.
- **Fix:** Used `import type { GameController }` (erased at runtime by TypeScript) so the type is available for compile-time checking but the runtime module graph has no cycle. The actual instance arrives at runtime through `init(grid, controller)`.
- **Files modified:** `BloomTap/assets/scripts/GridRenderer.ts`
- **Commit:** fac8f89

**3. [Rule 1 - Simplification] Simplified redundant DEAD state branch in update()**
- **Found during:** Task 2 review
- **Issue:** The update() loop had an if/else that did the same thing (`_paintState`) for both DEAD and non-DEAD states.
- **Fix:** Collapsed to a single `this._paintState(view, state)` call.
- **Files modified:** `BloomTap/assets/scripts/GridRenderer.ts`
- **Commit:** fac8f89

---

## Self-Check: PASSED

- FOUND: BloomTap/assets/scripts/FlowerColors.ts
- FOUND: BloomTap/assets/scripts/logic/TapHandler.test.ts
- FOUND: .planning/phases/03-renderer-and-input/03-02-SUMMARY.md
- FOUND commit: 9d5a5e8 (Task 1)
- FOUND commit: fac8f89 (Task 2)
