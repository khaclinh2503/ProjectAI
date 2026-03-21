---
phase: 08-spawn-fix
plan: 01
subsystem: spawn-logic
tags: [spawn, config, initial-burst, tdd]
dependency_graph:
  requires: []
  provides: [SPAWN-01]
  affects: [GameController, SpawnManager, GameConfig, flowers.json]
tech_stack:
  added: []
  patterns: [TDD red-green, conditional spread for optional fields]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/SpawnManager.ts
    - BloomTap/assets/scripts/logic/GameConfig.ts
    - BloomTap/assets/scripts/logic/GameConfig.test.ts
    - BloomTap/assets/resources/config/flowers.json
    - BloomTap/assets/scripts/GameController.ts
key_decisions:
  - "initialCount is optional in SpawnPhaseConfig TypeScript type — required constraint enforced by GameConfig parser on phase index 0 only"
  - "Conditional spread { ...(initialCount !== undefined ? { initialCount } : {}) } ensures phases 1 and 2 return objects without the initialCount key"
  - "initialCount value 5 chosen per D-03 from RESEARCH.md (recommended for initial UX)"
  - "_spawnInitialBurst() called before _startCountdown() so flowers appear before countdown overlay"
metrics:
  duration_seconds: 99
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 5
requirements: [SPAWN-01]
---

# Phase 8 Plan 1: Initial Spawn Burst (SPAWN-01) Summary

**One-liner:** Initial flower burst via `initialCount` in flowers.json config — 5 flowers spawn on board the moment player taps Start, before the 3-2-1 countdown.

## What Was Built

### Task 1: Schema — initialCount validation (TDD)

**SpawnManager.ts** — `SpawnPhaseConfig` interface extended with optional `initialCount?: number` field. Optional at TypeScript level; required enforcement is done at parse time.

**GameConfig.ts** — `parseSpawnPhases()` now:
- On phase index 0: calls `requirePositiveNumber(phase, 'initialCount', ctx)` — throws if missing or <= 0
- On phases 1 and 2: `initialCount` is `undefined`, not included in returned object (conditional spread pattern)

**flowers.json** — `spawnPhases[0]` now has `"initialCount": 5`. Phases 1 and 2 unchanged.

**GameConfig.test.ts** — New `describe('initialCount validation')` block with 6 tests:
1. Valid initialCount=5 on phase 0 is returned as `spawnPhases[0].initialCount === 5`
2. Missing initialCount on phase 0 throws with message matching `/spawnPhases[0].initialCount must be a number/`
3. initialCount=0 on phase 0 throws with message matching `/spawnPhases[0].initialCount must be > 0/`
4. initialCount=-1 on phase 0 throws with message matching `/spawnPhases[0].initialCount must be > 0/`
5. Missing initialCount on phases 1 and 2 does NOT throw
6. Parsed phases 1 and 2 do NOT have initialCount property (undefined)

All 177 tests pass (171 pre-existing + 6 new).

### Task 2: Wire _spawnInitialBurst() in GameController

**GameController.ts** — Two changes:

1. New private method `_spawnInitialBurst()` added after `_beginSession()`:
   - Gets phase 0 config via `this.spawnManager.getPhaseConfig(0)`
   - Uses `phaseConfig.initialCount ?? 0` (defensive fallback)
   - Loop respects `maxAlive` cap and empty cell guard — identical pattern to `update()` spawn loop
   - Passes `elapsedMs=0` to `pickFlowerType` for phase 0 weights
   - `this.gridRenderer` null-guarded

2. `_onStartTapped()` updated to call `_spawnInitialBurst()` before `_startCountdown()`:
   ```typescript
   private _onStartTapped(): void {
       this._spawnInitialBurst();
       this._startCountdown();
   }
   ```

`_beginSession()` NOT modified — flowers spawned in `_onStartTapped()` persist through the countdown because `_beginSession()` does not call `grid.clearAll()`. The grid is clean at this point because `onRestartTapped()` calls `grid.clearAll()` before returning to the start screen.

## Verification

All 6 plan success criteria met:
1. `npx vitest run` exits 0 — 177 tests pass
2. GameConfig.test.ts has all 6 initialCount test cases
3. flowers.json spawnPhases[0] contains `"initialCount": 5`
4. SpawnPhaseConfig interface has `initialCount?: number`
5. GameController._onStartTapped() calls _spawnInitialBurst() before _startCountdown()
6. _spawnInitialBurst() mirrors update() spawn loop with maxAlive guard

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | c742ce2 | feat(08-01): add initialCount to SpawnPhaseConfig, parseSpawnPhases, and flowers.json |
| 2    | 5b7baa2 | feat(08-01): add _spawnInitialBurst() and call from _onStartTapped() |

## Known Stubs

None — all data wired end-to-end. `initialCount` flows from flowers.json → parseGameConfig → initPhaseConfigs → SpawnManager → GameController._spawnInitialBurst().
