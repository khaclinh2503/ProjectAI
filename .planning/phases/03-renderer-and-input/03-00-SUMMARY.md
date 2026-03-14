---
phase: 03-renderer-and-input
plan: "00"
subsystem: testing
tags: [typescript, vitest, scoring, combo, game-state]

requires:
  - phase: 02-core-game-logic
    provides: ComboSystem with multiplier/onCorrectTap/onWrongTap, FlowerFSM scores, FlowerTypes config
provides:
  - GameState class with score accumulation, wrong-tap penalty logic, session timing
  - WRONG_TAP_PENALTY constant (10)
  - GameState.test.ts covering GAME-01, GAME-02, GAME-03 scoring paths
affects:
  - 03-01-renderer (imports GameState for score wiring)
  - 03-02-input (imports GameState for tap handler wiring)

tech-stack:
  added: []
  patterns:
    - "GameState receives ComboSystem as method parameter (not constructor injection) for test isolation"
    - "Math.round() on score delta prevents floating-point accumulation"
    - "Score can go negative — no floor applied on wrong-tap penalty"

key-files:
  created:
    - BloomTap/assets/scripts/logic/GameState.ts
    - BloomTap/assets/scripts/logic/GameState.test.ts
  modified: []

key-decisions:
  - "ComboSystem passed per-method to GameState (not stored as field) — GameController owns combo instance in Phase 3 wiring"
  - "Score can go negative: plan explicitly states no floor at 0 for wrong-tap penalty"
  - "Math.round() applied to rawScore * multiplier delta to avoid float accumulation in score display"

patterns-established:
  - "GameState is stateless regarding combo — combo ownership stays with GameController"
  - "TDD mock pattern: vi.spyOn(performance, 'now') with fixed values for deterministic elapsed-time tests"

requirements-completed:
  - GAME-01
  - GAME-02
  - GAME-03

duration: 3min
completed: 2026-03-14
---

# Phase 3 Plan 00: GameState Summary

**Plain-TypeScript GameState scoring model with applyCorrectTap/applyWrongTap/reset/getElapsedMs, 15 new tests covering GAME-01/02/03 (88 total, 0 regressions)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T09:38:00Z
- **Completed:** 2026-03-14T09:40:56Z
- **Tasks:** 1 (TDD: RED + GREEN, no REFACTOR needed)
- **Files modified:** 2

## Accomplishments

- Created `GameState.ts` as pure TypeScript (no `cc` imports) — correct tap adds `Math.round(rawScore * multiplier)` to score, wrong tap subtracts `WRONG_TAP_PENALTY` (score can go negative)
- Exported `WRONG_TAP_PENALTY = 10` constant alongside the class
- Created `GameState.test.ts` with 15 tests covering GAME-01 (correct tap at multiplier=1), GAME-02 (FULL_BLOOM > BLOOMING score path), GAME-03 (penalty + multiplier reset), negative score, rising multiplier accumulation, and `getElapsedMs()`
- All 73 prior tests still passing — 88 total, 0 regressions

## Task Commits

Each TDD stage committed atomically:

1. **RED: Failing GameState tests** - `9a6ffe8` (test)
2. **GREEN: GameState implementation + test fix** - `3c9719a` (feat)

**Plan metadata:** pending (docs commit)

_TDD plan: 2 commits (test → feat). No REFACTOR needed — plain data class._

## Files Created/Modified

- `BloomTap/assets/scripts/logic/GameState.ts` - Score accumulation, penalty logic, session timing. Exports `GameState` class and `WRONG_TAP_PENALTY`.
- `BloomTap/assets/scripts/logic/GameState.test.ts` - 15 unit tests covering GAME-01, GAME-02, GAME-03 scoring paths plus edge cases.

## Decisions Made

- **ComboSystem passed per-method:** `applyCorrectTap(rawScore, combo)` and `applyWrongTap(combo)` receive combo as parameter rather than storing it — GameController will own the combo instance when wiring in Phase 3.
- **Score can go negative:** Plan explicitly states "floor at 0 is NOT applied" for `applyWrongTap`. This is intentional game design.
- **Math.round() on delta:** Applied to `rawScore * combo.multiplier` to avoid float accumulation that could cause display artefacts (e.g., 119.99999 instead of 120).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed floating-point precision in getElapsedMs test**

- **Found during:** GREEN phase (running tests)
- **Issue:** Test computed `state.sessionStartMs + 500` after `reset()` was called, but `sessionStartMs` was set by a real `performance.now()` call containing sub-millisecond precision; subtracting the mocked value yielded `499.9999999999999` not `500`.
- **Fix:** Changed test to mock `performance.now()` to a fixed integer (`1000`) before calling `reset()`, then mock to `1500` for the assertion — both values are clean integers, eliminating floating-point error.
- **Files modified:** `BloomTap/assets/scripts/logic/GameState.test.ts`
- **Verification:** All 88 tests pass after fix.
- **Committed in:** `3c9719a` (part of GREEN task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test precision)
**Impact on plan:** Necessary for test correctness. No scope creep.

## Issues Encountered

None beyond the float precision test issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `GameState` is ready to import in renderer plans (03-01, 03-02)
- `WRONG_TAP_PENALTY` exported for use in input wiring
- Wave 0 prerequisite satisfied — renderer plans can now reference `GameState` types and scoring constants
- No blockers for 03-01 (GridRenderer) or 03-02 (InputHandler)

---

*Phase: 03-renderer-and-input*
*Completed: 2026-03-14*
