---
phase: 10-special-flowers
plan: 01
subsystem: game-logic
tags: [vitest, tdd, power-ups, special-flowers, typescript]

# Dependency graph
requires:
  - phase: 09-pause-system
    provides: FlowerFSM.shiftTimestamp, Grid.shiftAllTimestamps, pause offset pattern
  - phase: 07-config-infrastructure
    provides: GameConfig, FlowerTypeConfig, parseGameConfig, FlowerTypes

provides:
  - PowerUpState class tracking 3 independent effect expiry timestamps (SCORE_MULTIPLIER, TIME_FREEZE, SLOW_GROWTH)
  - SpecialEffectType union type
  - applySlowGrowthConfig helper for scaling FlowerTypeConfig duration fields
  - Cell interface extended with isSpecial + specialEffect fields
  - GameState.applyCorrectTap with optional powerUpMultiplier param (backward compatible)
  - PowerUpsConfig interface + parsePowerUps validation in GameConfig
  - flowers.json powerUps config block (specialChance 8%, pity 30s, 3 effect durations)

affects:
  - 10-special-flowers (Wave 2 — GameController wiring + GridRenderer)
  - 10-special-flowers (Wave 3 — UI/HUD for active effects)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD red-green with Vitest for pure-logic tier
    - Expiry-timestamp pattern for time-bounded effects (same as pause offset)
    - Spread + override for immutable config copies (applySlowGrowthConfig)
    - Optional param with default=1 for backward-compatible multiplier

key-files:
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

key-decisions:
  - "PowerUpState uses expiry timestamps (not durations) — same pattern as FlowerFSM; isActive = expiry > nowMs"
  - "shiftExpiries shifts all 4 fields (3 expiries + lastSpecialSpawnMs) — ensures pause compatibility via same offset pass"
  - "applySlowGrowthConfig returns new object (spread + Math.round) — never mutates live FlowerFSM or base config"
  - "powerUpMultiplier defaults to 1 in applyCorrectTap — zero changes to existing callers, no migration needed"
  - "parsePowerUps validates specialChance with requireNonNegativeNumber (0 is valid = feature disabled)"
  - "multiplierByPhase validated as exactly-length-3 array of positive numbers — errors if missing or wrong length"

patterns-established:
  - "Expiry timestamp pattern: effect active when expiryMs > nowMs (exclusive boundary)"
  - "Immutable config copy: spread base + override only the fields that change"
  - "Optional param with default=1 for backward-compatible score multiplier chaining"

requirements-completed: [SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04]

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 10 Plan 01: Special Flowers — Logic Foundation Summary

**PowerUpState class + SpecialEffectType + applySlowGrowthConfig + Cell.isSpecial + GameState multiplier + PowerUpsConfig schema validated by 30 new Vitest tests (216 total, all green)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T17:03:06Z
- **Completed:** 2026-03-22T17:18:00Z
- **Tasks:** 1 (TDD task with RED + GREEN commits)
- **Files modified:** 9

## Accomplishments

- PowerUpState class fully implemented with activate/isActive/getActiveCount/getRemaining/shiftExpiries/needsPitySpawn/recordSpecialSpawn/reset behaviors — all 20 unit tests passing
- Cell interface extended with isSpecial/specialEffect fields; Grid constructor, clearCell, clearAll all initialize/reset them — 3 new Grid tests passing
- GameState.applyCorrectTap accepts optional powerUpMultiplier (default=1) — backward compatible, 2 new tests passing
- PowerUpsConfig interface and parsePowerUps added to GameConfig with full validation — 5 new GameConfig tests passing
- flowers.json updated with powerUps config block consumed by parseGameConfig
- applySlowGrowthConfig helper tested for immutability and Math.round behavior

## Task Commits

TDD commits (atomically per RED then GREEN):

1. **RED — Failing tests for all behaviors** - `5dcd436` (test)
2. **GREEN — Full implementation** - `ec4b268` (feat)

## Files Created/Modified

- `BloomTap/assets/scripts/logic/PowerUpState.ts` — PowerUpState class + SpecialEffectType + applySlowGrowthConfig (no cc imports)
- `BloomTap/assets/scripts/logic/PowerUpState.test.ts` — 20 Vitest tests covering all PowerUpState behaviors and applySlowGrowthConfig
- `BloomTap/assets/scripts/logic/Grid.ts` — Cell interface extended with isSpecial/specialEffect; clearCell/clearAll reset both fields
- `BloomTap/assets/scripts/logic/Grid.test.ts` — 3 new tests for Cell.isSpecial/specialEffect initialization and reset
- `BloomTap/assets/scripts/logic/GameState.ts` — applyCorrectTap adds powerUpMultiplier param with default=1
- `BloomTap/assets/scripts/logic/GameState.test.ts` — 2 new tests for powerUpMultiplier behavior
- `BloomTap/assets/scripts/logic/GameConfig.ts` — PowerUpsConfig interface + parsePowerUps + parseGameConfig updated
- `BloomTap/assets/scripts/logic/GameConfig.test.ts` — validFlowersData fixture updated with powerUps block; 5 new powerUps tests
- `BloomTap/assets/resources/config/flowers.json` — powerUps block added with specialChance, pityWindowMs, 3 effect configs

## Decisions Made

- PowerUpState uses expiry timestamps rather than durations — matches FlowerFSM pattern; isActive = expiry > nowMs (exclusive boundary same as FlowerFSM getState)
- shiftExpiries shifts all 4 fields including lastSpecialSpawnMs — ensures pity timer remains correct after pause resume, consistent with Grid.shiftAllTimestamps approach
- applySlowGrowthConfig uses spread + override with Math.round — immutable copy, no mutation of live config or original object
- powerUpMultiplier defaults to 1 in applyCorrectTap — all existing callers unchanged, no migration needed
- specialChance validated via requireNonNegativeNumber (0 disables special flowers, valid use case)
- multiplierByPhase requires exactly 3 elements matching the 3 spawn phases (0-40s, 40-80s, 80-120s)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Wave 2 (10-02) can now consume:
- `PowerUpState` for effect tracking in GameController
- `Cell.isSpecial` / `Cell.specialEffect` for GridRenderer to render special flower visuals
- `applyCorrectTap(rawScore, combo, powerUpMultiplier)` for score multiplier wiring
- `applySlowGrowthConfig(base, factor)` for slow growth effect on spawn
- `GameConfig.powerUps` parsed and validated from flowers.json

All 216 tests green — no regressions.

## Self-Check: PASSED

- All 9 files verified present on disk
- Commits 5dcd436 (RED) and ec4b268 (GREEN) verified in git log
- 216/216 tests pass (`npx vitest run` exit code 0)
- STATE.md advanced to plan 2 of 3
- ROADMAP.md phase 10 updated (1 summary / 3 plans)
- Requirements SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04 marked complete

---
*Phase: 10-special-flowers*
*Completed: 2026-03-22*
