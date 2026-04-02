---
phase: 14-lobby-leaderboard-ui
plan: "02"
subsystem: ui
tags: [cocos-creator, cocos-scene, lobby, leaderboard, BootController, scene-wiring]

# Dependency graph
requires:
  - phase: 14-lobby-leaderboard-ui/14-01
    provides: LobbyController.ts and LeaderboardController.ts with all @property declarations
provides:
  - LobbyScene.scene — fully wired Cocos scene with LobbyController @property bindings
  - LeaderboardScene.scene — fully wired Cocos scene with LeaderboardController @property bindings
  - BootController routes app entry through LobbyScene (not GameScene)
affects:
  - 15 (game routing — BootController already loads LobbyScene, game flow is wired end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cocos scene files created in Editor; @property bindings wired via Inspector drag-and-drop
    - BootController loadScene target updated when routing changes between phases

key-files:
  created:
    - BloomTap/assets/scene/LobbyScene.scene
    - BloomTap/assets/scene/LeaderboardScene.scene
  modified:
    - BloomTap/assets/scripts/BootController.ts

key-decisions:
  - "BootController changed to load 'LobbyScene' as first scene — GameScene is now reached only through lobby"
  - "NameInputOverlay requires Layer=UI_2D and UIOpacity component — both are mandatory for camera visibility and fade-out logic"

patterns-established:
  - "Cocos scene node Layer must be set to UI_2D when using Camera with UI visibility mask — omission makes nodes invisible"
  - "UIOpacity component is required on any node that uses opacity-based tween hide/show — missing it causes early return in _confirmName()"

requirements-completed:
  - LOBBY-01
  - "PLAYER-01 (UI side)"
  - "LB-01 (display side)"

# Metrics
duration: ~45min (human checkpoint + fix cycle)
completed: 2026-04-02
---

# Phase 14 Plan 02: Lobby & Leaderboard Scene Wiring Summary

**LobbyScene and LeaderboardScene created in Cocos Editor, all @property bindings wired to controllers, three runtime bugs found and fixed during human play-test, all 9 Phase 14 success criteria verified in Cocos Preview**

## Performance

- **Duration:** ~45 min (human checkpoint: scene creation + verification)
- **Started:** 2026-04-02T00:00:00Z
- **Completed:** 2026-04-02T00:45:00Z
- **Tasks:** 2 (1 human-action, 1 human-verify)
- **Files modified:** 9

## Accomplishments
- LobbyScene.scene created with full node hierarchy, all 11 LobbyController @property bindings wired in Inspector
- LeaderboardScene.scene created with 10-row list, all 4 LeaderboardController @property bindings wired in Inspector
- BootController patched to route app entry to LobbyScene (was incorrectly targeting GameScene)
- All 9 Phase 14 success criteria (SC-1 through SC-5) verified and passed in Cocos Preview

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LobbyScene and LeaderboardScene** - `aff389e` (feat) — scenes, meta files, BootController fix

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `BloomTap/assets/scene/LobbyScene.scene` — Lobby scene: Canvas with LobbyController component, full node tree (title, greeting, 5 buttons, toast, name overlay), all @property bindings wired
- `BloomTap/assets/scene/LobbyScene.scene.meta` — Cocos meta file for LobbyScene
- `BloomTap/assets/scene/LeaderboardScene.scene` — Leaderboard scene: Canvas with LeaderboardController component, title, back button, 10 rows (Row0–Row9), empty state label, all @property bindings wired
- `BloomTap/assets/scene/LeaderboardScene.scene.meta` — Cocos meta file for LeaderboardScene
- `BloomTap/assets/scripts/BootController.ts` — Changed `director.loadScene('GameScene')` to `director.loadScene('LobbyScene')`
- `BloomTap/assets/scripts/LobbyController.ts.meta` — Cocos meta
- `BloomTap/assets/scripts/LeaderboardController.ts.meta` — Cocos meta
- `BloomTap/assets/scripts/logic/LeaderboardService.ts.meta` — Cocos meta
- `BloomTap/assets/scripts/logic/LeaderboardService.test.ts.meta` — Cocos meta

## Decisions Made
- BootController entry point changed to LobbyScene — app now boots into lobby, not directly into game. GameScene is reached via "Choi Ngay" button. This is the intended post-Phase-14 flow.
- NameInputOverlay must have Layer=UI_2D for Cocos Camera to render it — discovered during testing that default layer caused invisible overlay.
- NameInputOverlay must carry UIOpacity component — LobbyController._confirmName() calls `uiOp.opacity = 0` and `tween(uiOp)`, both require the component to exist or the guard returns early.

## Deviations from Plan

### Issues Found and Fixed During Human Testing

**1. [Rule 1 - Bug] BootController loading wrong scene**
- **Found during:** Task 2 (human play-test)
- **Issue:** BootController called `director.loadScene('GameScene')` — LobbyScene was never reached; the lobby was completely bypassed
- **Fix:** Changed target to `director.loadScene('LobbyScene')` in BootController.ts
- **Files modified:** BloomTap/assets/scripts/BootController.ts
- **Verification:** App now boots to LobbyScene; name overlay appears on first run
- **Committed in:** aff389e (task commit)

**2. [Rule 3 - Blocking] NameInputOverlay missing Layer=UI_2D**
- **Found during:** Task 2 (human play-test)
- **Issue:** Overlay node was invisible — Cocos Camera only renders nodes on UI_2D layer; overlay had default layer and was not rendered
- **Fix:** User set NameInputOverlay node Layer to UI_2D in Cocos Editor Inspector
- **Files modified:** BloomTap/assets/scene/LobbyScene.scene (Editor save)
- **Verification:** Overlay now visible when active=true on first run
- **Committed in:** aff389e (task commit, scene file contains the fix)

**3. [Rule 1 - Bug] NameInputOverlay missing UIOpacity component**
- **Found during:** Task 2 (human play-test)
- **Issue:** `_confirmName()` calls `this.nameInputOverlay.getComponent(UIOpacity)` — without the component this returns null, the null-guard `if (!uiOp) return` fired, and the overlay never hid after name entry
- **Fix:** User added UIOpacity component to NameInputOverlay node in Cocos Editor Inspector
- **Files modified:** BloomTap/assets/scene/LobbyScene.scene (Editor save)
- **Verification:** Confirming a name now fades the overlay out correctly; greeting updates with entered name
- **Committed in:** aff389e (task commit, scene file contains the fix)

---

**Total deviations:** 3 issues found and fixed during human play-test (2 bugs, 1 blocking missing component)
**Impact on plan:** All three fixes were required for basic functionality. No scope creep — fixes applied only to scene wiring and boot routing.

## Issues Encountered
- Cocos Editor scene creation is not automatable by Claude — both scenes were created manually by the user via the Editor's node hierarchy builder and Inspector wiring. This is expected for .scene files which are serialized Editor output.
- The three issues above were discovered during verification play-test and resolved before final approval.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 14 fully complete: lobby, leaderboard, name overlay, navigation, and persistence all verified
- Phase 15 can now implement game result flow (score → ResultsScreen → rank display → BXH navigation) knowing lobby and boot routing are stable
- BootController already loads LobbyScene — Phase 15 only needs to handle Choi Ngay → GameScene transition and post-game return to Lobby

## Known Stubs
None — all UI elements are wired to live data. Leaderboard reads from LeaderboardService.getEntries(), name reads from LeaderboardService.getPlayerName(). No placeholder data.

## Self-Check: PASSED

- FOUND: BloomTap/assets/scene/LobbyScene.scene
- FOUND: BloomTap/assets/scene/LeaderboardScene.scene
- FOUND: BloomTap/assets/scripts/BootController.ts
- FOUND commit: aff389e (task commit — scenes + BootController fix)

---
*Phase: 14-lobby-leaderboard-ui*
*Completed: 2026-04-02*
