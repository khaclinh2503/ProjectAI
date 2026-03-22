---
phase: 10-special-flowers
plan: 03
subsystem: ui
tags: [power-up, hud, cocos-component, sprite, graphics, countdown-arc]

# Dependency graph
requires:
  - phase: 10-01
    provides: PowerUpState pure logic (isActive, getRemainingMs, activate, tick, shiftExpiry, reset)
  - phase: 10-02
    provides: GameController power-up wiring (spawn, effects, GridRenderer cell background swap)
provides:
  - PowerUpHUDRenderer Cocos Component: effect icon + circular countdown arc
  - BootController @property(GameController) + initPowerUpConfig call from JSON config
  - GameController @property(PowerUpHUDRenderer) + per-frame tick in update()
affects: [phase 11, any future HUD polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PowerUpHUDRenderer reads PowerUpState via tick(powerUpState, nowMs) — pure read, no mutation (D-15)
    - onLoad hides HUD node (active=false) to prevent first-frame flash (Pitfall 5)
    - Countdown arc drawn with Cocos Graphics: background circle (dim gray) + foreground arc (white, clockwise from top)
    - Cell sprites loaded via resources.load with SpriteFrame fallback to Texture2D (same pattern as GridRenderer)

key-files:
  created:
    - BloomTap/assets/scripts/PowerUpHUDRenderer.ts
  modified:
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/BootController.ts

key-decisions:
  - "PowerUpHUDRenderer hides immediately (node.active=false) when effect expires — no fade animation (D-16)"
  - "BootController passes powerUps config only when cfg.powerUps exists AND gameController is wired — falls back to hardcoded defaults otherwise"
  - "PowerUpHUD reset in _beginSession() ensures HUD hides on new session start"

patterns-established:
  - "Component tick pattern: GameController.update() calls component.tick(state, nowMs) — component owns its own render decisions"

requirements-completed: [SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 10 Plan 03: Special Flowers HUD + BootController Config Summary

**PowerUpHUDRenderer component wired into GameController (per-frame tick + icon/arc render) and BootController loads powerUps config from JSON.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T11:35:44Z
- **Completed:** 2026-03-22T11:41:00Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint — awaiting approval)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `PowerUpHUDRenderer` Cocos Component with Sprite icon + Graphics countdown arc
- Wired `GameController.update()` to tick `PowerUpHUDRenderer` each frame — pure read of `PowerUpState`
- Added `@property(GameController)` to `BootController` and call `initPowerUpConfig(cfg.powerUps)` after JSON load
- 220/220 tests passing (no regressions)

## Task Commits

1. **Task 1: Create PowerUpHUDRenderer + wire GameController + BootController** - `7a27c3e` (feat)

**Plan metadata commit:** pending (after human-verify checkpoint)

## Files Created/Modified

- `BloomTap/assets/scripts/PowerUpHUDRenderer.ts` — New Cocos Component: @ccclass, Sprite iconSprite, Graphics arcGraphics, tick() reads PowerUpState, _drawCountdownArc(), _loadCellSprites() loading cell_fire/cell_freeze/cell_grass
- `BloomTap/assets/scripts/GameController.ts` — Added import + @property(PowerUpHUDRenderer), tick call in update(), reset in _beginSession()
- `BloomTap/assets/scripts/BootController.ts` — Added import + @property(GameController), initPowerUpConfig call in _loadConfigs() when cfg.powerUps present

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — PowerUpHUDRenderer loads real sprites from resources/flowers/, reads live PowerUpState. No hardcoded empty values flowing to UI.

## Checkpoint: Human Verify

**Task 2 is a human-verify checkpoint.** The complete power-up system (Plans 01 + 02 + 03) must be verified in Cocos Creator:

1. Wire `@property` fields in editor (powerUpHUD on GameController node, gameController on BootController node, iconSprite + arcGraphics on HUD child node)
2. Verify special flowers spawn with correct cell sprites (cell_fire/cell_freeze/cell_grass)
3. Verify all 3 effects work: score multiplier, timer freeze, slow growth
4. Verify HUD shows icon + arc when active, hides immediately on expiry
5. Verify replacement semantics, pause/resume effect preservation

## Self-Check: PASSED

- `BloomTap/assets/scripts/PowerUpHUDRenderer.ts` — FOUND
- `BloomTap/assets/scripts/GameController.ts` — FOUND (contains import, @property, tick call)
- `BloomTap/assets/scripts/BootController.ts` — FOUND (contains import, @property, initPowerUpConfig call)
- Commit `7a27c3e` — FOUND
