---
phase: 14-lobby-leaderboard-ui
plan: "01"
subsystem: ui
tags: [cocos-creator, typescript, lobby, leaderboard, tween, UIOpacity, EditBox]

# Dependency graph
requires:
  - phase: 13-leaderboardservice
    provides: LeaderboardService with getPlayerName/setPlayerName/getEntries API
provides:
  - LobbyController.ts — full lobby scene controller with name overlay, 5 buttons, toast animation
  - LeaderboardController.ts — leaderboard scene controller with 10-row display and empty state
affects:
  - 14-02 (scene wiring in Cocos Editor — consumes @property bindings from both controllers)
  - 15 (Boot→Lobby→Game routing consumes LobbyController scene name 'LobbyScene')

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UIOpacity tween interruptible pattern (Tween.stopAllByTarget before every tween start)
    - isValid guard in tween .call() callbacks to prevent post-destroy errors
    - EditBox TEXT_CHANGED reactive validation pattern
    - Pre-allocated fixed row array (@property([Node]) rows) for list display without ScrollView

key-files:
  created:
    - BloomTap/assets/scripts/LobbyController.ts
    - BloomTap/assets/scripts/LeaderboardController.ts
  modified: []

key-decisions:
  - "LobbyController checks getPlayerName() in onLoad (not start) to avoid one-frame overlay flicker"
  - "Toast uses shared single Label node; Tween.stopAllByTarget enables interrupt-and-restart behavior"
  - "LeaderboardController pre-allocates 10 rows in Inspector; hides unused rows via row.active=false"
  - "nameEditBox.maxLength=12 set programmatically in addition to Inspector as belt-and-suspenders"

patterns-established:
  - "Scene controllers follow @ccclass/@property Component pattern from BootController.ts"
  - "Interruptible tween: always call Tween.stopAllByTarget(target) before starting new tween on same target"
  - "Tween .call() callbacks always guard with node.isValid before accessing destroyed scene objects"
  - "Row-based leaderboard: @property([Node]) array binding, child labels accessed by getChildByName"

requirements-completed:
  - LOBBY-01
  - "PLAYER-01 (UI side)"
  - "LB-01 (display side)"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 14 Plan 01: Lobby & Leaderboard UI Controllers Summary

**LobbyController (name overlay + 5 buttons + interruptible toast) and LeaderboardController (10-row fixed list + empty state) written as Cocos @ccclass Components ready for scene wiring**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T05:29:24Z
- **Completed:** 2026-03-28T05:31:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- LobbyController: checks stored player name on onLoad, activates name-input overlay on first run, confirms name with UIOpacity 0.3s fade, wires 5 buttons (Choi Ngay → GameScene, BXH → LeaderboardScene, 3 others → toast), interruptible toast animation
- LeaderboardController: reads getEntries() in onLoad, renders up to 10 rows with rank/name/score via getChildByName, hides unused rows, shows empty state label when no entries, Back button → LobbyScene
- All existing 262 tests pass — zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write LobbyController.ts** - `c67f557` (feat)
2. **Task 2: Write LeaderboardController.ts** - `36d873c` (feat)

## Files Created/Modified
- `BloomTap/assets/scripts/LobbyController.ts` — Lobby scene controller: name overlay with UIOpacity fade, 5 button handlers, EditBox reactive validation, interruptible shared toast
- `BloomTap/assets/scripts/LeaderboardController.ts` — Leaderboard scene controller: @property([Node]) rows array, row rendering loop, empty state toggle, Back button navigation

## Decisions Made
- `onLoad` used (not `start`) for name check and button wiring to ensure data is present before first frame renders — prevents overlay flicker (D-01)
- Toast uses a single shared Label node with UIOpacity; `Tween.stopAllByTarget` cancels the in-flight tween before restart, implementing D-15 interrupt behavior
- `nameEditBox.maxLength = 12` set programmatically in addition to Inspector (belt-and-suspenders per RESEARCH.md Pitfall 5)
- All tween `.call()` callbacks guard with `.isValid` check before accessing node properties (RESEARCH.md Pitfall 2)
- `uiOp.opacity = 0` set synchronously before toast tween `.start()` to avoid flash-of-full-opacity (anti-pattern from RESEARCH.md)
- LeaderboardController uses `@property([Node]) rows: Node[] = []` array binding — Inspector supports this in CC3, simpler than ScrollView for fixed 10-item list

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None — no hardcoded empty values or placeholder data. Both controllers read live data from LeaderboardService on each scene load. Scene node wiring (setting @property values in Cocos Inspector) is intentionally deferred to Plan 02.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both TypeScript controller files are complete and ready for Cocos Editor scene wiring (Plan 02)
- Scene files `LobbyScene.scene` and `LeaderboardScene.scene` do not yet exist — created in Plan 02
- @property Inspector wiring is Plan 02 scope (human checkpoint)
- Boot→Lobby→Game routing is Phase 15 scope

## Self-Check: PASSED

- FOUND: BloomTap/assets/scripts/LobbyController.ts
- FOUND: BloomTap/assets/scripts/LeaderboardController.ts
- FOUND: .planning/phases/14-lobby-leaderboard-ui/14-01-SUMMARY.md
- FOUND commit: c67f557 (Task 1 — LobbyController)
- FOUND commit: 36d873c (Task 2 — LeaderboardController)

---
*Phase: 14-lobby-leaderboard-ui*
*Completed: 2026-03-28*
