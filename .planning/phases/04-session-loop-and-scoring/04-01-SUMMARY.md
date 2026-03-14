---
phase: 04-session-loop-and-scoring
plan: 01
subsystem: logic
tags: [tdd, game-state, grid, session-timer, reset]
dependency_graph:
  requires: []
  provides:
    - GameState.isGameOver(nowMs) — session timer check for game-over trigger
    - SESSION_DURATION_MS — exported constant (120_000) used by HUD countdown
    - Grid.clearAll() — in-place grid reset for restart flow
  affects:
    - GameController.update() — will call isGameOver() to detect session end
    - GameController.onRestartTapped() — will call clearAll() to reset grid
tech_stack:
  added: []
  patterns:
    - TDD (RED → GREEN) for pure logic tier additions
    - Timestamp-based session check (nowMs - sessionStartMs >= SESSION_DURATION_MS)
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/GameState.ts
    - BloomTap/assets/scripts/logic/GameState.test.ts
    - BloomTap/assets/scripts/logic/Grid.ts
    - BloomTap/assets/scripts/logic/Grid.test.ts
decisions:
  - isGameOver uses inclusive boundary (>=) — session ends at exactly 120_000ms elapsed, matching plan spec
  - clearAll() iterates _cells directly (not via getCells()) — avoids readonly cast, consistent with existing clearCell() pattern
metrics:
  duration_minutes: 5
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_modified: 4
  tests_added: 6
requirements:
  - SESS-01
  - SESS-05
---

# Phase 4 Plan 01: Session Logic Foundations (TDD) Summary

**One-liner:** GameState gains `isGameOver(nowMs)` + `SESSION_DURATION_MS` export; Grid gains `clearAll()` — both pure-logic additions tested TDD before any Cocos wiring.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add isGameOver() to GameState (TDD) | eddb012 | GameState.ts, GameState.test.ts |
| 2 | Add clearAll() to Grid (TDD) | e9adfc7 | Grid.ts, Grid.test.ts |

---

## What Was Built

### Task 1 — GameState.isGameOver() + SESSION_DURATION_MS

Added to `GameState.ts`:
- `export const SESSION_DURATION_MS: number = 120_000` — session duration constant, consumed by HUD countdown in Phase 4
- `isGameOver(nowMs: number): boolean` — returns `true` when `nowMs - sessionStartMs >= SESSION_DURATION_MS`

Added to `GameState.test.ts` (4 new tests in `describe('isGameOver()')`):
- Returns `false` when elapsed = 119,999ms (before boundary)
- Returns `true` at exactly 120,000ms elapsed (inclusive boundary)
- Returns `true` when elapsed = 121,000ms (after boundary)
- `SESSION_DURATION_MS` constant equals 120,000

### Task 2 — Grid.clearAll()

Added to `Grid.ts`:
```typescript
clearAll(): void {
    for (const cell of this._cells) {
        cell.flower = null;
    }
}
```

Added to `Grid.test.ts` (2 new tests in `describe('Grid.clearAll()')`):
- On a full 64-cell grid, all cells have `flower=null` after `clearAll()`
- After `clearAll()`, `getRandomEmptyCell()` returns non-null

---

## Test Results

Full suite: **111 tests across 7 files — all pass, zero failures.**

```
✓ FlowerTypes.test.ts    (10 tests)
✓ GameState.test.ts      (19 tests — includes 4 new isGameOver tests)
✓ Grid.test.ts           (15 tests — includes 2 new clearAll tests)
✓ SpawnManager.test.ts   (22 tests)
✓ TapHandler.test.ts     (17 tests)
✓ ComboSystem.test.ts    (17 tests)
✓ FlowerFSM.test.ts      (11 tests)
```

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

- [x] `BloomTap/assets/scripts/logic/GameState.ts` — modified, exists
- [x] `BloomTap/assets/scripts/logic/GameState.test.ts` — modified, exists
- [x] `BloomTap/assets/scripts/logic/Grid.ts` — modified, exists
- [x] `BloomTap/assets/scripts/logic/Grid.test.ts` — modified, exists
- [x] Commit eddb012 — exists (Task 1)
- [x] Commit e9adfc7 — exists (Task 2)
- [x] Full vitest suite passes (111/111)
