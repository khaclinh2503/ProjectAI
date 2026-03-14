---
phase: 02-core-game-logic
plan: "01"
subsystem: testing
tags: [vitest, typescript, pure-logic, fsm, grid]

# Dependency graph
requires:
  - phase: 01-project-foundation
    provides: Cocos Creator project structure with BloomTap/ subfolder and TypeScript config

provides:
  - Vitest test runner configured for pure TypeScript logic tier
  - FlowerState enum (6 states: BUD/BLOOMING/FULL_BLOOM/WILTING/DEAD/COLLECTED)
  - FlowerTypeId enum + FlowerTypeConfig interface + FLOWER_CONFIGS (all 5 types, locked values)
  - FlowerFSM class with timestamp-based getState/getScore/collect
  - Grid class with 64-cell flat array, spawnFlower/clearCell/getRandomEmptyCell/getAliveCount

affects: [03-renderer, 04-session-and-input, 05-juice]

# Tech tracking
tech-stack:
  added: [vitest@^3]
  patterns:
    - Timestamp-based state derivation (no delta accumulation) — getState(nowMs) computes state from elapsed time
    - Pure TypeScript logic tier — zero imports from 'cc'; testable in Node without browser
    - TDD red-green cycle for all logic modules

key-files:
  created:
    - package.json (workspace root npm config with test scripts)
    - vitest.config.ts (vitest@^3, node environment, targets BloomTap/assets/scripts/logic/**/*.test.ts)
    - tsconfig.test.json (vitest/globals types, logic-only include, no Cocos pollution)
    - .gitignore (node_modules, dist, coverage)
    - BloomTap/assets/scripts/logic/FlowerState.ts
    - BloomTap/assets/scripts/logic/FlowerTypes.ts
    - BloomTap/assets/scripts/logic/FlowerFSM.ts
    - BloomTap/assets/scripts/logic/Grid.ts
    - BloomTap/assets/scripts/logic/FlowerTypes.test.ts
    - BloomTap/assets/scripts/logic/FlowerFSM.test.ts
    - BloomTap/assets/scripts/logic/Grid.test.ts
  modified: []

key-decisions:
  - "npm project root at E:/workspace/ProjectAI (git root), not BloomTap/ — BloomTap/package.json is Cocos Creator metadata, not npm package"
  - "getScore() uses inclusive tap window boundary [0, tapWindowMs] to allow score at exact end-of-window timestamp"
  - "tsconfig.test.json does not extend Cocos tsconfig — standalone compiler options prevent Cocos virtual module pollution"

patterns-established:
  - "Logic tier is pure TypeScript: no 'cc' imports, testable in Node with Vitest"
  - "FlowerFSM stores only spawnTimestamp + config + _collected flag — all state derived on demand"
  - "Grid owns all FlowerFSM instances; renderer reads but never mutates"

requirements-completed: [FLOW-01, FLOW-02, GRID-01, GRID-02]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 2 Plan 01: Pure Logic Tier Summary

**Vitest@3 test infrastructure + FlowerFSM (timestamp-based FSM for 5 flower types) + 64-cell Grid — 34 tests pass in under 1 second, zero 'cc' imports**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T05:14:08Z
- **Completed:** 2026-03-14T05:17:54Z
- **Tasks:** 3
- **Files modified:** 11 created, 0 modified

## Accomplishments

- Vitest@3 configured at workspace root targeting BloomTap/assets/scripts/logic — `npm run test:run` passes in ~500ms
- FlowerFSM: timestamp-based state derivation for all 6 states; getScore() interpolates linearly across tap window; collect() marks as COLLECTED permanently
- FLOWER_CONFIGS: all 5 types (CHERRY/LOTUS/CHRYSANTHEMUM/ROSE/SUNFLOWER) with locked integer ms values; budMs+tapWindowMs+wiltingMs+deadMs === cycleDurationMs for all 5
- Grid: 64-cell flat array; getRandomEmptyCell() returns null when full; spawnFlower/clearCell mutate cell state; getAliveCount() excludes DEAD flowers

## Task Commits

Each task was committed atomically:

1. **Task 1: Vitest infrastructure setup** - `b6a09b2` (chore)
2. **Task 2: FlowerTypes/FlowerState/FlowerFSM — RED** - `947195e` (test)
3. **Task 2: FlowerTypes/FlowerState/FlowerFSM — GREEN** - `5d40bb0` (feat)
4. **Task 3: Grid — RED** - `960cbc8` (test)
5. **Task 3: Grid — GREEN** - `e814fa2` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits._

## Files Created/Modified

- `package.json` — npm workspace root with test/test:run/test:coverage scripts, vitest@^3 devDependency
- `vitest.config.ts` — vitest config: node environment, globals true, include BloomTap/assets/scripts/logic/**/*.test.ts
- `tsconfig.test.json` — standalone tsconfig for logic tier (no Cocos extends), adds vitest/globals types
- `.gitignore` — node_modules/, dist/, coverage/
- `BloomTap/assets/scripts/logic/FlowerState.ts` — 6-value enum
- `BloomTap/assets/scripts/logic/FlowerTypes.ts` — FlowerTypeId enum, FlowerTypeConfig interface, FLOWER_CONFIGS (5 types)
- `BloomTap/assets/scripts/logic/FlowerFSM.ts` — timestamp-based FSM class
- `BloomTap/assets/scripts/logic/Grid.ts` — 64-cell grid with Cell interface
- `BloomTap/assets/scripts/logic/FlowerTypes.test.ts` — 10 tests
- `BloomTap/assets/scripts/logic/FlowerFSM.test.ts` — 11 tests
- `BloomTap/assets/scripts/logic/Grid.test.ts` — 13 tests

## Decisions Made

- **npm root at workspace root, not BloomTap/**: BloomTap/package.json is a Cocos Creator metadata file (no scripts, no devDependencies). Creating a proper npm package.json at E:/workspace/ProjectAI keeps git history unified and vitest.config.ts at the natural root.
- **tsconfig.test.json does not extend Cocos tsconfig**: Cocos tsconfig extends `./temp/tsconfig.cocos.json` which includes Cocos virtual modules. A standalone tsconfig for tests avoids resolution errors.
- **getScore() uses inclusive boundary at tapWindowMs**: Plan test `getScore(1350 + 900)` expects ~120 (scoreFull), but elapsed=tapEnd means getState() returns WILTING. Score logic uses direct elapsed comparison [0, tapWindowMs] inclusive, independent of getState(), to honor this boundary correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getScore() boundary condition at tap window end**
- **Found during:** Task 2 (FlowerFSM GREEN phase)
- **Issue:** Plan test expects `getScore(1350 + 900) ≈ 120`, but at elapsed=tapEnd, `getState()` returns WILTING (closed interval), so score was null
- **Fix:** Made getScore() compute score directly from elapsed time using `[0, tapWindowMs]` inclusive range, independent of getState()
- **Files modified:** `BloomTap/assets/scripts/logic/FlowerFSM.ts`
- **Verification:** All 11 FlowerFSM tests pass including the boundary test
- **Committed in:** `5d40bb0`

---

**Total deviations:** 1 auto-fixed (Rule 1 - boundary bug)
**Impact on plan:** Fix was necessary to pass the plan's own test assertions. No scope creep.

## Issues Encountered

None beyond the boundary condition documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pure logic tier complete: FlowerFSM, Grid, and all type definitions are ready
- Phase 3 (renderer) can import FlowerFSM, Grid, Cell, FlowerState from logic/ — no changes needed here
- Phase 3 must NOT modify logic/ files — renderer is a read-only consumer
- `npm run test:run` provides regression safety for any future changes to logic tier

## Self-Check: PASSED

- All 7 source files exist at expected paths
- All 5 commits verified in git log (b6a09b2, 947195e, 5d40bb0, 960cbc8, e814fa2)
- `npm run test:run` exits green: 34/34 tests pass
- Zero 'cc' imports in BloomTap/assets/scripts/logic/

---
*Phase: 02-core-game-logic*
*Completed: 2026-03-14*
