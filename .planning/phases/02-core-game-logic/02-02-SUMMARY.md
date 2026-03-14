---
phase: 02-core-game-logic
plan: "02"
subsystem: testing
tags: [vitest, typescript, pure-logic, combo, spawn, weighted-random]

# Dependency graph
requires:
  - phase: 02-core-game-logic
    plan: "01"
    provides: FlowerTypeId enum from FlowerTypes.ts; Vitest test infrastructure at workspace root

provides:
  - ComboSystem class: multiplier streak counter with step halving at tap 10/50 thresholds, full reset on wrong tap
  - SpawnManager class: phase-table-driven spawn config lookup + weighted random flower type picker
  - SpawnPhaseConfig interface: startMs/endMs/intervalMs/maxAlive/weights fields

affects: [04-session-and-input, 05-juice]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Step-as-mutable-instance-variable (not derived from tapCount) — prevents post-reset step regression
    - Defensive fallback for phase boundary (>= 120000ms returns last config, never throws)
    - Weighted random selection via Object.entries + running total decrement

key-files:
  created:
    - BloomTap/assets/scripts/logic/ComboSystem.ts
    - BloomTap/assets/scripts/logic/ComboSystem.test.ts
    - BloomTap/assets/scripts/logic/SpawnManager.ts
    - BloomTap/assets/scripts/logic/SpawnManager.test.ts
  modified: []

key-decisions:
  - "Step tracked as mutable instance variable — resets to 0.5 on onWrongTap(), not recomputed from tapCount range"
  - "PHASE_CONFIGS defined as module-level constant (not class field) — shared across all SpawnManager instances, immutable"
  - "getPhaseConfig fallback returns PHASE_CONFIGS[2] at >= 120000ms — session loop can safely call without bounds check"

patterns-established:
  - "ComboSystem._step is mutated only at threshold crossings (tap 10 -> 0.25, tap 50 -> 0.125) — RESEARCH.md Pitfall 4 avoided"
  - "SpawnManager.pickFlowerType uses failsafe return of last entry — never returns undefined regardless of rounding errors"

requirements-completed: [FLOW-04, FLOW-01]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 2 Plan 02: ComboSystem + SpawnManager Summary

**ComboSystem (multiplier step-halving at taps 10/50, full reset on wrong tap) + SpawnManager (3-phase table with weighted random FlowerTypeId picker) — 39 new tests, 73 total passing, zero 'cc' imports**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T07:47:41Z
- **Completed:** 2026-03-14T07:50:28Z
- **Tasks:** 2
- **Files modified:** 4 created, 0 modified

## Accomplishments

- ComboSystem: multiplier starts at 1, increments by 0.5/tap until tap 10 (then 0.25/tap), until tap 50 (then 0.125/tap); onWrongTap() resets multiplier/step/tapCount to initial values; 17 tests
- SpawnManager: 3 locked phase configs (Phase 1: 3s/8alive, Phase 2: 2s/16alive, Phase 3: 1s/28alive); getPhaseConfig() returns Phase 3 as fallback at >= 120000ms; 22 tests
- Full test suite green: 73/73 tests across 5 files (FlowerTypes, FlowerFSM, Grid, ComboSystem, SpawnManager) in ~850ms
- Pure logic tier complete: 6 modules, zero 'cc' imports, all testable in Node without Cocos browser

## Task Commits

Each task was committed atomically:

1. **Task 1: ComboSystem — RED** - `bcb1f25` (test)
2. **Task 1: ComboSystem — GREEN** - `2993221` (feat)
3. **Task 2: SpawnManager — RED** - `266f00f` (test)
4. **Task 2: SpawnManager — GREEN** - `8d4b144` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits._

## Files Created/Modified

- `BloomTap/assets/scripts/logic/ComboSystem.ts` — Multiplier streak counter; onCorrectTap/onWrongTap/applyToScore; step halves at threshold crossings
- `BloomTap/assets/scripts/logic/ComboSystem.test.ts` — 17 tests: init state, step progression, threshold crossings at tap 10/50, wrong tap full reset, applyToScore
- `BloomTap/assets/scripts/logic/SpawnManager.ts` — SpawnPhaseConfig interface, PHASE_CONFIGS constant, getPhaseConfig/pickFlowerType methods; imports FlowerTypeId
- `BloomTap/assets/scripts/logic/SpawnManager.test.ts` — 22 tests: phase boundaries, intervalMs/maxAlive values, pickFlowerType returns valid FlowerTypeId, weight table sums

## Decisions Made

- **Step as mutable instance variable**: `_step` is initialized to 0.5 and mutated only when tapCount crosses 10 or 50. Computing step from tapCount ranges would produce wrong values after reset (post-reset tapCount = 0 would re-derive step = 0.5 correctly but after a second reset from a high tapCount the pattern breaks). Mutable field is simpler and matches RESEARCH.md Pitfall 4 guidance.
- **PHASE_CONFIGS as module-level constant**: Defined outside the class so it is initialized once and shared. No constructor overhead, no risk of mutation via class properties.
- **Defensive fallback at 120000ms**: Session loop calls getPhaseConfig() at exact session end. Returning last config instead of throwing prevents any crash at boundary.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Pure logic tier complete: FlowerTypes + FlowerState + FlowerFSM + Grid + ComboSystem + SpawnManager
- Phase 4 (session-and-input) can import all 6 modules from BloomTap/assets/scripts/logic/
- Phase 3 (renderer) reads FlowerFSM/Grid state only — no ComboSystem/SpawnManager interaction needed at that layer
- `npm run test:run` provides regression safety (73 tests) for all future changes

## Self-Check: PASSED

- ComboSystem.ts: exists at BloomTap/assets/scripts/logic/ComboSystem.ts
- SpawnManager.ts: exists at BloomTap/assets/scripts/logic/SpawnManager.ts
- Commits verified: bcb1f25, 2993221, 266f00f, 8d4b144
- `npm run test:run`: 73/73 tests pass across 5 files
- Zero 'cc' imports in BloomTap/assets/scripts/logic/

---
*Phase: 02-core-game-logic*
*Completed: 2026-03-14*
