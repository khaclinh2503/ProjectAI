---
phase: 05-juice-and-polish
plan: "01"
subsystem: animation
tags: [juice, tap-pulse, score-float, object-pool, tween, scene-setup]
dependency_graph:
  requires: [05-00]
  provides: [playTapPulse, spawnScoreFloat, stopAllFloatAnimations, RedFlashOverlay, MilestoneLabelNode]
  affects: [GridRenderer, GameController, GameScene]
tech_stack:
  added: [cc.tween, cc.Tween, cc.Vec3, cc.UIOpacity, cc.Label (float pool)]
  patterns: [object-pool for score floats, zigzag wobble via .by() chaining, Tween.stopAllByTarget for in-flight cleanup]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scene/GameScene.scene
    - BloomTap/assets/scripts/logic/JuiceHelpers.ts
decisions:
  - "Score float pool size = 8 — sufficient for normal tap rate per CONTEXT.md guidance"
  - "Float rise = 80px base + multiplier*10px (taller floats for bigger combos)"
  - "Wobble amplitude = 14px lateral with 3-step zigzag .by() chain"
  - "comboSystem.multiplier read AFTER applyCorrectTap() to reflect updated value"
  - "JuiceHelpers .includes() replaced with .indexOf() for ES2015 tsconfig compat"
metrics:
  duration_minutes: 25
  completed_date: "2026-03-15"
  tasks_completed: 3
  files_modified: 4
---

# Phase 05 Plan 01: Scene Infrastructure + Tap Pulse + Score Float Summary

JUICE-01 (tap pulse) and JUICE-02 (score float labels) implemented as animation primitives in GridRenderer, with supporting scene nodes and extended GameController wiring.

## What Was Built

### Task 1: Scene Infrastructure
- Added `cc.UIOpacity` component (opacity=255) to `ScoreLabel`, `TimerLabel`, and `ComboLabel` HUD nodes — required by Phase 5 animations so `node.getComponent(UIOpacity)` returns a valid component at runtime
- Created `RedFlashOverlay` node: full-screen (720x1280), red Sprite, UIOpacity=0, `active=false` — ready for combo-break flash in Plan 02
- Created `MilestoneLabelNode`: bold 72px gold Label, UIOpacity=255, `active=false` — ready for milestone celebration text in Plan 02
- Wired GameController @property fields: `redFlashOverlay`, `milestoneNode`, `milestoneLabel`

### Task 2: GameController Extensions
- Added `tween`, `Tween`, `Vec3`, `UIOpacity` to cc imports
- Added `@property` fields: `redFlashOverlay: Node`, `milestoneNode: Node`, `milestoneLabel: Label`
- Added private state: `_triggeredMilestones`, `_urgencyStage`, `_blinkVisible`, `_blinkCallback`
- Extended `handleCorrectTap()` return type from `{ flashColor }` to `{ flashColor, rawScore, multiplier, isFullBloom }` — allows GridRenderer to size and trigger floats correctly
- Added `_stopAllJuiceAnimations()` method: stops all tweens, clears blink scheduler, resets states, calls `gridRenderer.stopAllFloatAnimations()`
- Added `_stopAllJuiceAnimations()` calls to `_beginSession()` and `_triggerGameOver()`

### Task 3: GridRenderer Animation Engine
- Added `FloatSlot` interface and `_floatPool: FloatSlot[]` field
- Extended `onLoad()` to call `_buildFloatPool()` — 8 Label nodes created and parented to Canvas at scene load, never during gameplay
- `playTapPulse(row, col, isFullBloom)`: scale pulse 1.0→1.1→1.0 in 80ms (normal) or 120ms (FULL_BLOOM); FULL_BLOOM also triggers `_rippleNeighbors()` for 4 orthogonal cells (1.07x scale, 30ms delay)
- `_rippleNeighbors(row, col)`: bounds-checked loop over up/down/left/right neighbors
- `spawnScoreFloat(row, col, amount, multiplier)`: pool slot selected via `find(s => !s.inUse)`, positioned at cell worldPosition, text from `getFloatLabelString()`, fontSize from `getFloatFontSize()`, duration from `getFloatDuration()`, 3-step zigzag wobble via `.by()`, fade-out via UIOpacity tween with `call()` to release slot
- `stopAllFloatAnimations()`: stops all tweens and marks all slots inUse=false

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed JuiceHelpers.ts ES2015 incompatibility**
- **Found during:** Task 3 — TypeScript compilation check after importing JuiceHelpers in GridRenderer
- **Issue:** `MILESTONE_THRESHOLDS.includes(tapCount)` fails under ES2015 target — `Array.prototype.includes` is ES2016+
- **Fix:** Replaced `.includes(tapCount)` with `.indexOf(tapCount) === -1` — semantically identical, ES2015 compatible
- **Files modified:** BloomTap/assets/scripts/logic/JuiceHelpers.ts
- **Commit:** f224851

## Verification Results

TypeScript compilation: zero errors in modified files (`GameController.ts`, `GridRenderer.ts`, `JuiceHelpers.ts`). Pre-existing errors in test files and `SpawnManager.ts` are out of scope (ES2015 target vs ES2017 API usage — documented in prior phases).

Scene JSON: valid (81 objects), all cross-references verified via node-based validation script.

## Self-Check: PASSED

- BloomTap/assets/scripts/GridRenderer.ts — present, methods added
- BloomTap/assets/scripts/GameController.ts — present, extended
- BloomTap/assets/scene/GameScene.scene — present, 81 objects
- BloomTap/assets/scripts/logic/JuiceHelpers.ts — present, indexOf fix applied
- Commit f224851 — present (GameController + JuiceHelpers)
- Commit 9a60675 — present (GridRenderer)
- Commit d1c3acd — present (scene)
