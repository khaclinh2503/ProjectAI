---
phase: 10-special-flowers
plan: "01"
subsystem: power-up-logic
tags: [power-ups, tdd, pure-logic, game-state, grid, config]
dependency_graph:
  requires: []
  provides:
    - PowerUpState class with EffectType enum
    - Cell.isSpecial + Cell.specialEffect fields
    - GameState.applyCorrectTap powerUpMultiplier param
    - GameConfig.parsePowerUps + PowerUpConfig interface
    - flowers.json powerUps config block
  affects:
    - BloomTap/assets/scripts/logic/Grid.ts
    - BloomTap/assets/scripts/logic/GameState.ts
    - BloomTap/assets/scripts/logic/GameConfig.ts
    - BloomTap/assets/resources/config/flowers.json
tech_stack:
  added: []
  patterns:
    - Pure TypeScript class with expiry-timestamp tracking (no cc imports)
    - Replacement semantics for single-slot effect state machine
    - Spread-copy immutable config transform (applySlowGrowthConfig)
    - Vitest TDD RED-GREEN cycle per task
key_files:
  created:
    - BloomTap/assets/scripts/logic/PowerUpState.ts
    - BloomTap/assets/scripts/logic/PowerUpState.test.ts
  modified:
    - BloomTap/assets/scripts/logic/Grid.ts
    - BloomTap/assets/scripts/logic/Grid.test.ts
    - BloomTap/assets/scripts/logic/GameState.ts
    - BloomTap/assets/scripts/logic/GameState.test.ts
    - BloomTap/assets/scripts/logic/GameConfig.ts
    - BloomTap/assets/scripts/logic/GameConfig.test.ts
    - BloomTap/assets/resources/config/flowers.json
decisions:
  - "PowerUpState uses expiry timestamps — isActive = activeEffect !== null && nowMs < expiryMs"
  - "Replacement semantics (D-05): activate() replaces active effect regardless of type"
  - "D-06: activate() with same effect type resets timer (not additive)"
  - "applySlowGrowthConfig uses spread+Math.round — never mutates live config"
  - "powerUpMultiplier defaults to 1 in applyCorrectTap — full backward compatibility"
  - "parsePowerUps returns undefined when powerUps key absent from flowersData (optional config block)"
metrics:
  duration: "~15 min"
  completed_date: "2026-03-22"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 9
---

# Phase 10 Plan 01: Power-Up Logic Foundation Summary

**One-liner:** Pure-logic power-up foundation — PowerUpState with expiry timestamps, Cell special fields, GameState score multiplier param, and GameConfig powerUps JSON parser.

## What Was Built

Three TDD tasks established the complete pure-logic foundation for the power-up system, with zero Cocos imports — all testable via Vitest:

**Task 1 — PowerUpState class (ac6458d):**
- `EffectType` enum: `SCORE_MULTIPLIER`, `TIME_FREEZE`, `SLOW_GROWTH`
- `PowerUpState` class: `activate()`, `tick()`, `shiftExpiry()`, `getRemainingMs()`, `reset()`, `isActive()`
- Replacement semantics: `activate()` always replaces active effect (D-05)
- Timer reset: same effect type reactivation resets timer (D-06)
- `applySlowGrowthConfig(config, factor)` — returns new config with `cycleDurationMs * factor` (Math.round), no mutation
- 25 tests, all green

**Task 2 — Cell interface extension (1eb6af1):**
- `Cell` interface gains `isSpecial: boolean` and `specialEffect: EffectType | null`
- Constructor initializes all 64 cells with `isSpecial: false, specialEffect: null`
- `clearCell()` and `clearAll()` reset both new fields (D-04 discipline)
- 3 new Grid tests added, all 22 Grid tests green

**Task 3 — GameState + GameConfig + flowers.json (6cd5435):**
- `applyCorrectTap(rawScore, combo, powerUpMultiplier = 1)` — backward compatible
- Score formula: `Math.round(rawScore * combo.multiplier * powerUpMultiplier)`
- `PowerUpConfig` interface exported from GameConfig.ts
- `parsePowerUps()` validates all 4 sub-objects with `requirePositiveNumber` discipline
- `flowers.json` powerUps block: `specialChance: 0.08`, `scoreMultiplier`, `timeFreeze`, `slowGrowth`
- 4 new GameConfig tests + 2 new GameState tests, all green

## Test Suite Results

- Before: 186 tests (10 files)
- After: 220 tests (11 files)
- New tests added: 34 (25 PowerUpState + 3 Grid + 4 GameConfig + 2 GameState)
- All passing: 220/220

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | ac6458d | feat(10-01): PowerUpState class + applySlowGrowthConfig helper |
| Task 2 | 1eb6af1 | feat(10-01): extend Cell interface with isSpecial + specialEffect fields |
| Task 3 | 6cd5435 | feat(10-01): GameState powerUpMultiplier + GameConfig powerUps parser + flowers.json |

## Deviations from Plan

None — plan executed exactly as written. All three TDD cycles followed RED → GREEN pattern with no unexpected issues.

## Known Stubs

None — all logic is fully implemented and tested. Plan 02 (controller wiring) will integrate PowerUpState into GameController. Plan 03 (HUD renderer) will read PowerUpState for display.

## Self-Check: PASSED

- PowerUpState.ts: FOUND
- PowerUpState.test.ts: FOUND
- 10-01-SUMMARY.md: FOUND
- Commit ac6458d: FOUND
- Commit 1eb6af1: FOUND
- Commit 6cd5435: FOUND
- Full test suite: 220/220 passing
