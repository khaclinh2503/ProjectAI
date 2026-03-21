---
phase: 10-special-flowers
plan: 03
subsystem: ui
tags: [cocos, typescript, power-up, hud, graphics, timer]

# Dependency graph
requires:
  - phase: 10-special-flowers-02
    provides: PowerUpState with isActive/getRemaining/getActiveCount; GameController.initPowerUpConfig; GameController.powerUpState
  - phase: 10-special-flowers-01
    provides: PowerUpsConfig interface in GameConfig; special flower spawn logic foundation
  - phase: 07-config-infrastructure
    provides: BootController with resources.load config pipeline; parseGameConfig
provides:
  - PowerUpHUDRenderer Cocos Component with 3-slot circular arc timer row
  - GameController @property(PowerUpHUDRenderer) + tick/init/hide wiring
  - BootController initPowerUpConfig pass-through after config load
  - Human verification checkpoint for complete special flowers system
affects: [11-polish-fixes, future-art-refresh]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-allocate 3 slot nodes in onLoad (never create during gameplay, consistent with GridRenderer)
    - Hidden by default node pattern: node.active = false in onLoad, revealed in tick when active
    - Circular arc timer via Graphics.arc() with fraction = remaining/total
    - Separation: PowerUpHUDRenderer reads PowerUpState via tick(state, nowMs) — no direct GameController dependency

key-files:
  created:
    - BloomTap/assets/scripts/PowerUpHUDRenderer.ts
  modified:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/BootController.ts

key-decisions:
  - "PowerUpHUDRenderer reads PowerUpState via tick(powerUpState, nowMs) — pure read, no mutation"
  - "node.active toggled in tick() not per-frame set — only changes when activeCount crosses 0 boundary"
  - "BootController.gameController @property required for initPowerUpConfig call before scene load"

patterns-established:
  - "HUD component pattern: pre-allocate in onLoad, hide by default, reveal conditionally in tick"
  - "Arc timer pattern: g.arc(0, 0, r, -PI/2, -PI/2 + fraction*2PI, false) for clockwise countdown"

requirements-completed: [SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 10 Plan 03: PowerUpHUDRenderer + Wiring + Human Verify Summary

**3-slot circular arc HUD renderer created using Cocos Graphics API, wired into GameController tick loop and BootController config pipeline — awaiting human verification in Cocos Editor**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T17:16:56Z
- **Completed:** 2026-03-21T17:19:36Z
- **Tasks:** 1 of 2 complete (Task 2 is human-verify checkpoint — awaiting user)
- **Files modified:** 3

## Accomplishments

- PowerUpHUDRenderer.ts: 3-slot HUD row with pre-allocated nodes, circular arc timer per slot
- HUD hidden by default (D-20); auto-shows when any effect is active, hides when all expired
- Each slot renders: inactive ring, colored fill circle, shrinking arc timer (D-21)
- Effect colors consistent with GridRenderer overlay: gold (SCORE_MULTIPLIER), ice blue (TIME_FREEZE), green (SLOW_GROWTH)
- GameController wired: @property, init in onLoad, tick in update loop, hide on game-over/restart
- BootController: added GameController @property + initPowerUpConfig(cfg.powerUps) call after config load
- All 216 tests continue passing

## Task Commits

1. **Task 1: Create PowerUpHUDRenderer + wire GameController + BootController** - `cddce2e` (feat)
2. **Task 2: Human verify checkpoint** - awaiting approval

**Plan metadata:** (pending — awaiting checkpoint approval before final commit)

## Files Created/Modified

- `BloomTap/assets/scripts/PowerUpHUDRenderer.ts` - New Cocos Component: 3-slot power-up HUD with circular countdown timers
- `BloomTap/assets/scripts/GameController.ts` - Added @property(PowerUpHUDRenderer), tick call, init, hide logic
- `BloomTap/assets/scripts/BootController.ts` - Added GameController @property + initPowerUpConfig pass-through

## Decisions Made

- BootController needs GameController @property to call initPowerUpConfig before scene load — the plan noted this as conditional and it was indeed needed (BootController had no existing GameController reference)
- node.active toggled conditionally (only when crossing 0-boundary) to avoid redundant property sets each frame

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — PowerUpHUDRenderer reads live PowerUpState data; no hardcoded/placeholder values in rendering path.

## User Setup Required

**Cocos Editor wiring required:**
1. In the game scene hierarchy, create a new empty Node below the grid (name it "PowerUpHUD")
2. Add the PowerUpHUDRenderer component to it
3. Drag it into GameController's `powerUpHUD` property slot in the Inspector
4. Wire BootController's `gameController` property to the GameController node if not already wired

## Next Phase Readiness

- Special flowers system code complete (plans 01-03)
- Human verification in Cocos Editor required to confirm full visual + gameplay correctness
- After checkpoint approval: Phase 10 complete, ready for Phase 11 (polish-fixes)

---
*Phase: 10-special-flowers*
*Completed: 2026-03-21 (pending human checkpoint approval)*
