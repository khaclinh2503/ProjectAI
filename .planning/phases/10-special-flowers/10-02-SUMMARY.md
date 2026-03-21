---
phase: 10-special-flowers
plan: "02"
subsystem: gameplay
tags: [power-ups, special-flowers, GameController, GridRenderer, rendering]
dependency_graph:
  requires: [10-01]
  provides: [SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04]
  affects: [GameController, GridRenderer]
tech_stack:
  added: []
  patterns:
    - "Power-up activation on correct tap before applyCorrectTap (D-02)"
    - "TIME_FREEZE rolls sessionStartMs per frame (dt*1000) to freeze elapsed time"
    - "SLOW_GROWTH passes modified config copy at spawn time — never mutates live FlowerFSM"
    - "shiftExpiries called in _applyPauseOffset for pause compatibility (D-17)"
    - "Special overlay rendered on top of _paintState using Graphics circle + stroke"
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/GridRenderer.ts
decisions:
  - "TIME_FREEZE per-frame: sessionStartMs += dt*1000; expiries NOT shifted during normal play (absolute performance.now timestamps)"
  - "powerUpMultiplier returned in handleCorrectTap result (combo.multiplier * powerUpMultiplier) for correct float label display"
  - "initPowerUpConfig() public method for BootController to override fallback defaults after JSON load"
  - "Special overlay drawn after _paintState so it renders on top of flower color"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 2
requirements: [SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04]
---

# Phase 10 Plan 02: GameController + GridRenderer Power-Up Integration Summary

GameController and GridRenderer fully wired with PowerUpState: spawn loop marks flowers special with probability + pity mechanic, TIME_FREEZE rolls sessionStartMs per frame, SLOW_GROWTH passes modified config copy, SCORE_MULTIPLIER applies via applyCorrectTap, special flowers render gold/blue/green overlay from BUD state onward.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire PowerUpState into GameController | 8035bf9 | BloomTap/assets/scripts/GameController.ts |
| 2 | GridRenderer special flower visual overlay | 4acf1ab | BloomTap/assets/scripts/GridRenderer.ts |

## What Was Built

### Task 1: GameController Power-Up Integration

**New imports:**
- `PowerUpState`, `SpecialEffectType`, `applySlowGrowthConfig` from `./logic/PowerUpState`
- `PowerUpsConfig` from `./logic/GameConfig`

**New fields:**
- `public readonly powerUpState = new PowerUpState()` — instance shared with GridRenderer (read-only)
- `private _powerUpConfig: PowerUpsConfig` — fallback defaults; overrideable via `initPowerUpConfig()`

**New public method:** `initPowerUpConfig(config: PowerUpsConfig)` — called by BootController after JSON load

**update() changes:**
- TIME_FREEZE: `sessionStartMs += dt * 1000` per frame when active (freezes elapsed time)
- Game-over: calls `powerUpState.reset(0)` before triggering game over
- Spawn loop: computes `isSpecial` via pity + random chance; picks random effect; applies SLOW_GROWTH config copy via `applySlowGrowthConfig`; sets `cell.isSpecial` and `cell.specialEffect`; calls `recordSpecialSpawn` when spawning special

**handleCorrectTap() changes:**
- After `flower.collect()`: activates power-up if `cell.isSpecial && cell.specialEffect`
- Applies SCORE_MULTIPLIER via `applyCorrectTap(rawScore, combo, powerUpMultiplier)`
- Returns `multiplier = combo.multiplier * powerUpMultiplier` for correct float label

**_applyPauseOffset():** Added `powerUpState.shiftExpiries(deltaMs)` for pause compatibility (D-17)

**_beginSession():** Added `powerUpState.reset(this.gameState.sessionStartMs)` after `gameState.reset()`

**_spawnInitialBurst():** Same special flower logic as update loop (pity + random, effect assignment, recordSpecialSpawn); SLOW_GROWTH config copy applied for consistency

**onRestartTapped():** Added `powerUpState.reset(0)` after `grid.clearAll()`

**New private helpers:**
- `_pickRandomEffect()`: randomly picks from 3 SpecialEffectType values
- `_getPhaseIndex(elapsedMs)`: 0/1/2 for 0-40s/40-80s/80-120s
- `_getDurationForEffect(effect)`: returns durationMs from _powerUpConfig per effect type

### Task 2: GridRenderer Special Flower Overlay

**New import:** `SpecialEffectType` from `./logic/PowerUpState`

**New constants:**
```typescript
const SPECIAL_OVERLAY_COLORS: Record<SpecialEffectType, Color> = {
    SCORE_MULTIPLIER: new Color(255, 215,   0, 200), // gold
    TIME_FREEZE:      new Color( 64, 164, 255, 200), // ice blue
    SLOW_GROWTH:      new Color( 80, 220,  80, 200), // green
};
```

**update() change:** After `_paintState(view, state)`, checks `cell.isSpecial && cell.specialEffect` and calls `_paintSpecialOverlay(view, cell.specialEffect)`

**New method `_paintSpecialOverlay()`:**
- Draws filled circle (r=12) at cell center
- Draws border ring (r=CELL_SIZE/2-4) with lineWidth=2
- Both use semi-transparent color (alpha=200) so flower color shows through

## Verification

- `npx vitest run` — 216/216 tests pass, 11 test files, 0 regressions
- All acceptance criteria met (verified via grep)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all power-up effects are fully wired. The visual overlay is a deliberate placeholder (Phase 12 replaces with sprites, as noted in code comments).

## Self-Check: PASSED

- BloomTap/assets/scripts/GameController.ts — FOUND (modified)
- BloomTap/assets/scripts/GridRenderer.ts — FOUND (modified)
- Commit 8035bf9 — FOUND
- Commit 4acf1ab — FOUND
- All 216 tests pass
