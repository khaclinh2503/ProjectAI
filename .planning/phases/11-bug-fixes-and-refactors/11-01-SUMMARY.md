---
phase: 11-bug-fixes-and-refactors
plan: "01"
subsystem: logic
tags: [power-up, refactor, tdd, juice]
dependency_graph:
  requires: []
  provides: [fixed-slow-growth-config, juice-helpers-integration, powerUpMultiplier-api]
  affects: [GameController, PowerUpState, PowerUpHUDRenderer-downstream]
tech_stack:
  added: []
  patterns: [TDD red-green, pure-function refactor, delegation-pattern]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/PowerUpState.ts
    - BloomTap/assets/scripts/logic/PowerUpState.test.ts
    - BloomTap/assets/scripts/GameController.ts
decisions:
  - "[11-01] applySlowGrowthConfig modifies budMs (×0.5), tapWindowMs/bloomingMs/fullBloomMs (×factor), recalculates cycleDurationMs — these are the fields FlowerFSM.getState() actually reads"
  - "[11-01] getMilestoneLabel() mutates the triggered Set, so _checkMilestone passes tapCount directly to _playMilestoneCelebration (tapCount IS the threshold when getMilestoneLabel returns non-null)"
  - "[11-01] MILESTONE_THRESHOLDS included in JuiceHelpers import per plan contract even though current _checkMilestone does not reference it directly"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-03-23"
  tasks_completed: 2
  files_modified: 3
---

# Phase 11 Plan 01: Fix applySlowGrowthConfig + Refactor GameController Summary

**One-liner:** Fixed SLOW_GROWTH config to modify FlowerFSM-read fields (budMs/tapWindowMs/bloomingMs/fullBloomMs), eliminated inline urgency/milestone duplicates in GameController, and exposed powerUpMultiplier in handleCorrectTap return value.

---

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix applySlowGrowthConfig to modify FlowerFSM-read fields | 14265a7 | PowerUpState.ts, PowerUpState.test.ts |
| 2 | Refactor GameController to use JuiceHelpers + return powerUpMultiplier | 424b3fa | GameController.ts |

---

## What Was Built

### Task 1: applySlowGrowthConfig fix (TDD)

The old implementation only scaled `cycleDurationMs`, which FlowerFSM never reads. FlowerFSM.getState() reads `budMs`, `tapWindowMs`, `bloomingMs`, and `wiltingMs` — so SLOW_GROWTH had zero visible effect.

New formula (factor=2.0 example with CHERRY config):
- `budMs`: 1350 × (1/2.0) = **675** (shorter bud wait)
- `tapWindowMs`: 900 × 2.0 = **1800** (wider tap window)
- `bloomingMs`: 600 × 2.0 = **1200** (longer blooming phase)
- `fullBloomMs`: 300 × 2.0 = **600** (longer full bloom)
- `wiltingMs`: 450 (unchanged)
- `deadMs`: 300 (unchanged)
- `cycleDurationMs`: 675 + 1800 + 450 + 300 = **3225** (recalculated)

Tests expanded from 5 to 14 assertions in `applySlowGrowthConfig()` describe block — each field individually tested.

### Task 2: GameController refactor (FIX-03)

Three structural changes:

**Import added:**
```typescript
import { getUrgencyStage, getMilestoneLabel, MILESTONE_THRESHOLDS } from './logic/JuiceHelpers';
```

**_updateTimerUrgency** replaced 4-branch if/else chain with single `getUrgencyStage(remainingSecs)` call.

**_checkMilestone** replaced `for (const m of [10, 25, 50])` loop with `getMilestoneLabel(tapCount, this._triggeredMilestones)` — getMilestoneLabel handles Set mutation and threshold lookup internally.

**handleCorrectTap** return type and return value now include `powerUpMultiplier: number` (was computed but discarded at line 253; now exposed for Plan 02 score float display).

---

## Verification

- 232 tests pass (11 test files)
- `getUrgencyStage` called in `_updateTimerUrgency` — confirmed
- `getMilestoneLabel` called in `_checkMilestone` — confirmed
- `powerUpMultiplier` appears 5 times in GameController.ts (import context + declaration + assignment + applyCorrectTap call + return) — confirmed
- `budMs` modified inside `applySlowGrowthConfig` — confirmed

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — all changes are fully wired logic corrections. powerUpMultiplier is now returned but not yet consumed; that is intentional (Plan 02 will consume it for score float rendering).

---

## Self-Check: PASSED

- PowerUpState.ts: FOUND
- GameController.ts: FOUND
- 11-01-SUMMARY.md: FOUND
- commit 14265a7 (Task 1): FOUND
- commit 424b3fa (Task 2): FOUND
