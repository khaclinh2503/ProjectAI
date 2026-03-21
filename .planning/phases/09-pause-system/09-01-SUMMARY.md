---
phase: 09-pause-system
plan: 01
subsystem: pure-logic
tags: [pause, timestamp, FlowerFSM, Grid, tdd, vitest]
dependency_graph:
  requires: []
  provides: [FlowerFSM.shiftTimestamp, Grid.shiftAllTimestamps]
  affects: [FlowerFSM.ts, Grid.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, timestamp-shift for pause/resume]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/FlowerFSM.ts
    - BloomTap/assets/scripts/logic/FlowerFSM.test.ts
    - BloomTap/assets/scripts/logic/Grid.ts
    - BloomTap/assets/scripts/logic/Grid.test.ts
decisions:
  - "Remove readonly from _spawnTimestamp in FlowerFSM to allow mutation by shiftTimestamp"
metrics:
  duration: ~8 min
  completed: "2026-03-21T09:19:26Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 9 Plan 01: Timestamp Shift Foundation Summary

**One-liner:** Added `FlowerFSM.shiftTimestamp(deltaMs)` and `Grid.shiftAllTimestamps(deltaMs)` — pure-logic timestamp-shift methods enabling pause/resume by advancing stored spawn timestamps so all derived flower states resume from the same relative position.

## What Was Built

Two pure-logic methods (no Cocos imports) that form the mathematical foundation for the pause system:

1. **`FlowerFSM.shiftTimestamp(deltaMs: number): void`** — shifts `_spawnTimestamp` forward by `deltaMs`. Because `getState()` and `getScore()` are both derived from `nowMs - _spawnTimestamp`, shifting the timestamp by the pause gap restores the same relative elapsed time after resume.

2. **`Grid.shiftAllTimestamps(deltaMs: number): void`** — iterates all 64 cells, calls `cell.flower.shiftTimestamp(deltaMs)` for every non-null flower. Null cells are skipped safely.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add shiftTimestamp() to FlowerFSM with tests | 278d9e1 | FlowerFSM.ts, FlowerFSM.test.ts |
| 2 | Add shiftAllTimestamps() to Grid with tests | e3b178b | Grid.ts, Grid.test.ts |

## Test Results

- FlowerFSM: 16 tests pass (11 existing + 5 new in `describe('FlowerFSM.shiftTimestamp')`)
- Grid: 19 tests pass (15 existing + 4 new in `describe('Grid.shiftAllTimestamps')`)
- Full suite: **186/186 tests pass** across 10 test files

## Decisions Made

- **Remove `readonly` from `_spawnTimestamp`:** The field was `private readonly` in the original. Changed to `private` to allow `shiftTimestamp()` to mutate it. This is intentional and safe — `_spawnTimestamp` is only mutable via the controlled `shiftTimestamp()` API.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — both methods are fully implemented and tested. No placeholders or hardcoded empty values.

## Self-Check: PASSED
