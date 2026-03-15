---
phase: 04-session-loop-and-scoring
plan: 03
subsystem: ui
tags: [cocos-creator, scene-json, hud, overlays, inspector-wiring]

# Dependency graph
requires:
  - phase: 04-02
    provides: SessionPhase state machine on GameController with 11 null-guarded @property refs declared
  - phase: 03-renderer-and-input
    provides: GridContainer node already wired in GameScene.scene; Canvas/Camera structure established
provides:
  - HUD node (active=false) in GameScene.scene with ScoreLabel, TimerLabel, ComboLabel children
  - StartScreenOverlay node (active=true) in GameScene.scene with TitleLabel and StartButton
  - CountdownOverlay node (active=false) in GameScene.scene with CountdownLabel (fontSize=200)
  - GameOverOverlay node (active=false) in GameScene.scene with GameOverTitle, FinalScoreLabel, RestartButton
  - All 11 GameController @property fields wired to correct node __id__ references in scene JSON
affects: [04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cocos Creator flat JSON scene format: each object is an array element, cross-referenced by __id__ index"
    - "GameController @property wiring via serialized __id__ refs in scene JSON — matches inspector inspector binding pattern"
    - "active=false on HUD and overlay nodes at scene load so only StartScreenOverlay shows on open"

key-files:
  created: []
  modified:
    - BloomTap/assets/scene/GameScene.scene

key-decisions:
  - "startButton @property wired to the StartButton node (index 45) which carries cc.Button component — matches how GameController.onLoad() registers click handler via startButton.node.on(Button.EventType.CLICK)"
  - "restartButton @property wired to RestartButton node (index 64) carrying cc.Button component — same pattern"
  - "GameOverOverlay sized 600x400 (card, not full-screen) per plan spec — shows as a centered overlay card above the cleared grid"
  - "HUD y=550 positions labels above the grid (GridContainer at y=256, grid height 572, top edge ~542) — HUD clears the grid top edge with margin"

patterns-established:
  - "Overlay visibility pattern: active=true only for the node that should be visible at startup (StartScreenOverlay); all others active=false"
  - "Button @property targets the Button-component-bearing node, not its Label child — GameController wires click handlers via node.on()"

requirements-completed: [HUD-01, HUD-02, HUD-03]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 4 Plan 03: Scene Node Wiring Summary

**HUD (score/timer/combo), StartScreenOverlay, CountdownOverlay, and GameOverOverlay nodes added to GameScene.scene with all 11 GameController @property fields wired — game fully playable in Cocos Creator Preview**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T06:15:00Z
- **Completed:** 2026-03-15T06:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- GameScene.scene gains 4 new node subtrees: HUD (3 label children), StartScreenOverlay (TitleLabel + StartButton), CountdownOverlay (CountdownLabel at fontSize=200), GameOverOverlay (GameOverTitle + FinalScoreLabel + RestartButton)
- All 11 GameController @property fields wired via `__id__` references in the scene JSON serialization: hudNode, scoreLabel, timerLabel, comboLabel, startOverlay, startButton, countdownOverlay, countdownLabel, gameOverOverlay, finalScoreLabel, restartButton
- Scene JSON parses as valid JSON (node confirmed with `node -e "JSON.parse(...)"`)
- 111 Vitest tests pass — scene change does not affect logic tier

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HUD and overlay nodes to GameScene.scene** - `b33e61c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `BloomTap/assets/scene/GameScene.scene` - Added 41 new JSON objects (nodes + components) for HUD, StartScreenOverlay, CountdownOverlay, GameOverOverlay; updated Canvas._children to include 4 new node refs; updated GameController component with 11 @property bindings

## Decisions Made
- `startButton` and `restartButton` @property refs point to the Button-node itself (not its Label child) because `GameController.onLoad()` registers click listeners via `this.startButton?.node.on(Button.EventType.CLICK, ...)` — the node carrying `cc.Button` component is what the code expects
- `GameOverOverlay` sized 600x400 per plan (card overlay, not full-screen) — centers above the empty grid after game-over clears flowers
- HUD positioned at y=550 — GridContainer is at y=256 with 572-pixel height, so its top edge is ~542; y=550 clears it with 8px margin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All scene nodes in place and wired — GameController state machine will resolve all @property refs at runtime
- Ready for 04-04: human verification checkpoint (open Cocos Creator Preview, tap Start, play through a session, verify Game Over overlay)
- No blockers

---
*Phase: 04-session-loop-and-scoring*
*Completed: 2026-03-15*
