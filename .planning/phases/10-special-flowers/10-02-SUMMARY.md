---
phase: 10-special-flowers
plan: "02"
subsystem: game-controller-power-ups
tags: [power-ups, game-controller, grid-renderer, special-flowers, cocos-runtime]
dependency_graph:
  requires:
    - 10-01 (PowerUpState, EffectType, applySlowGrowthConfig, Cell.isSpecial, applyCorrectTap with multiplier)
  provides:
    - GameController.powerUpState (public readonly, integrated into game loop)
    - Special flower spawning with configurable probability
    - TIME_FREEZE per-frame sessionStartMs advance in update()
    - SLOW_GROWTH spawn-time config copy in both update loop and _spawnInitialBurst
    - SCORE_MULTIPLIER phase-indexed multiplier in handleCorrectTap
    - Pause offset propagates to powerUpState.shiftExpiry
    - GridRenderer._cellSpriteFrames for cell_fire/cell_freeze/cell_grass
    - GridRenderer.markCellDirty() public method
    - GridRenderer._refreshCellBg() special background swap
  affects:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/GridRenderer.ts
tech_stack:
  added: []
  patterns:
    - TIME_FREEZE rolling offset — sessionStartMs += dt*1000 per frame before elapsedMs calc
    - SLOW_GROWTH spawn-time config copy via applySlowGrowthConfig (never mutates live FlowerFSM)
    - SCORE_MULTIPLIER phase-indexed lookup from multiplierByPhase[0..2]
    - Dirty-tracked cell background swap — _lastIsSpecial[] prevents redundant spriteFrame writes
    - _refreshCellBg called in update loop for state-changed and empty cells
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/GridRenderer.ts
decisions:
  - "TIME_FREEZE advances sessionStartMs BEFORE elapsedMs calculation — timer display freezes correctly"
  - "SLOW_GROWTH applies at spawn time via config copy — live FlowerFSM timestamps are never mutated"
  - "Special flower isSpecial/specialEffect set in spawn loop; GridRenderer.markCellDirty() triggers repaint"
  - "_refreshCellBg uses _lastIsSpecial dirty check — avoids redundant spriteFrame writes each frame"
  - "DEAD state resets _lastIsSpecial directly (not via _refreshCellBg) to guarantee clean reset"
  - "paintFlashAndClear resets _lastIsSpecial in scheduleOnce callback after cell clear"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-22"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 10 Plan 02: Controller Wiring Summary

**One-liner:** Cocos runtime wiring — GameController integrates PowerUpState for all 3 effects (TIME_FREEZE/SLOW_GROWTH/SCORE_MULTIPLIER), GridRenderer swaps cell backgrounds for special flowers.

## What Was Built

Two tasks wired the pure-logic power-up foundation from Plan 01 into the Cocos runtime, making special flowers fully functional in gameplay.

**Task 1 — Wire PowerUpState into GameController (c9f8430):**

- Imports: `PowerUpState`, `EffectType`, `applySlowGrowthConfig` from `./logic/PowerUpState`; `PowerUpConfig` from `./logic/GameConfig`
- `public readonly powerUpState = new PowerUpState()` — readable by BootController / Plan 03 HUD
- `private _powerUpConfig` with hardcoded defaults (specialChance: 0.08, multiplierByPhase: [2,3,5], timeFreeze: 5s, slowGrowth: 8s×2.0)
- `public initPowerUpConfig(config: PowerUpConfig)` — allows BootController override after JSON load
- `update()` TIME_FREEZE block runs **before** `elapsedMs` calculation so countdown timer freezes correctly
- `update()` spawn loop: SLOW_GROWTH applies `applySlowGrowthConfig` at spawn time; `Math.random() < specialChance` decides `isSpecial`, assigns random `specialEffect`
- `powerUpState.tick(nowMs)` called after spawn loop each frame
- `_spawnInitialBurst()` mirrors all spawn changes (SLOW_GROWTH + special decision)
- `handleCorrectTap()`: activates power-up at FULL_BLOOM on special cell; applies SCORE_MULTIPLIER phase-indexed multiplier via `_getPhaseIndex(elapsedMs)`
- `_applyPauseOffset(deltaMs)`: adds `this.powerUpState.shiftExpiry(deltaMs)` — power-up timer survives pause
- `_beginSession()` and `onRestartTapped()`: both call `this.powerUpState.reset()`
- Helper methods: `_getDurationForEffect(effect)`, `_getPhaseIndex(elapsedMs)`

**Task 2 — Add special cell background sprite swap to GridRenderer (1921d6d):**

- Import `EffectType` from `./logic/PowerUpState`
- New fields: `_cellSpriteFrames: Partial<Record<EffectType, SpriteFrame>>`, `_defaultCellFrame: SpriteFrame | null`, `_lastIsSpecial: boolean[]`
- `_loadSprites()`: captures `_defaultCellFrame` from `cell_empty` load; loads `cell_fire` → SCORE_MULTIPLIER, `cell_freeze` → TIME_FREEZE, `cell_grass` → SLOW_GROWTH
- `markCellDirty(row, col)` public method — called by GameController when special flower spawns
- `_refreshCellBg(view, cell, index)` — dirty-tracked: only writes `bgSprite.spriteFrame` when `_lastIsSpecial` changes
- `update()` loop: calls `_refreshCellBg` in empty-cell path and in state-changed path (after `_paintState`)
- DEAD branch: directly resets `_lastIsSpecial[i] = false` and restores `_defaultCellFrame`
- `paintFlashAndClear`: resets `_lastIsSpecial[row * GRID_COLS + col] = false` in `scheduleOnce` callback

## Test Suite Results

- Before: 220 tests (11 files)
- After: 220 tests (11 files) — no new test files (Cocos renderer layer not unit-testable in Vitest)
- All passing: 220/220

## Commits

| Task | Commit  | Description                                                    |
|------|---------|----------------------------------------------------------------|
| Task 1 | c9f8430 | feat(10-02): wire PowerUpState into GameController           |
| Task 2 | 1921d6d | feat(10-02): add special cell background sprite swap to GridRenderer |

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed without requiring auto-fixes or architectural changes.

## Known Stubs

None — all effects are fully wired. Cell background sprites (cell_fire, cell_freeze, cell_grass) must exist in `assets/resources/flowers/` at runtime for the visual swap to appear (logged as warning if missing via existing `_loadAsSpriteFrame` fallback). Plan 03 will add the PowerUpHUDRenderer for the active effect indicator.

## Self-Check: PASSED

- GameController.ts: FOUND
- GridRenderer.ts: FOUND
- Commit c9f8430: FOUND
- Commit 1921d6d: FOUND
- Full test suite: 220/220 passing
