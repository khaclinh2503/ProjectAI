---
phase: 09-pause-system
plan: 02
subsystem: ui
tags: [pause, resume, SessionPhase, timestamp-shift, GameController, countdown]

# Dependency graph
requires:
  - phase: 09-pause-system/01
    provides: FlowerFSM.shiftTimestamp, Grid.shiftAllTimestamps
provides:
  - GameController pause/resume logic
  - SessionPhase.PAUSED state
  - _applyPauseOffset() — shifts all session timestamps on resume
  - pauseButton and pauseOverlay @property nodes wired
affects: [GameController.ts, pause-system, special-flowers-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pause via SessionPhase.PAUSED enum value (not boolean flag)"
    - "_applyPauseOffset() centralized timestamp shift — sessionStartMs + all flower timestamps + _nextSpawnMs"
    - "urgency blink frozen via unschedule(_blinkCallback) — not _stopAllJuiceAnimations (avoids urgency stage reset)"
    - "resume via 3-2-1 reusing existing countdownOverlay"
    - "timestamp shift applied AFTER full 3-2-1 countdown (D-12) — includes 3s countdown in total pause delta"

key-files:
  created: []
  modified:
    - BloomTap/assets/scripts/GameController.ts

key-decisions:
  - "SessionPhase.PAUSED added to enum — not a boolean flag, consistent with existing state machine"
  - "_onPauseTapped does NOT call _stopAllJuiceAnimations — that resets _urgencyStage to 0, losing blink state"
  - "Only unschedule(_blinkCallback) on pause; _applyUrgencyStage(_urgencyStage) restores correct blink on resume"
  - "pauseButton is @property(Node) not @property(Button) — matches plan spec for simpler wiring"
  - "Timestamp shift covers full pause+countdown duration (pauseStartMs to end of countdown) per D-11/D-12"

patterns-established:
  - "Phase-change visibility: _updatePauseButtonVisibility() called after every _phase assignment"
  - "Pause/resume timestamp shift: single _applyPauseOffset(deltaMs) call shifts all timestamps in one pass"

requirements-completed: [PAUSE-01]

# Metrics
duration: ~10 min
completed: "2026-03-21"
---

# Phase 9 Plan 02: GameController Pause/Resume Summary

**Full pause/resume system wired into GameController — SessionPhase.PAUSED, freeze/restore urgency blink, 3-2-1 resume countdown, and _applyPauseOffset() timestamp shift preserving zero time-drift.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-21T09:21:02Z
- **Completed:** 2026-03-21T09:31:00Z
- **Tasks:** 1 of 2 complete (Task 2 blocked at human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- Added `SessionPhase.PAUSED` to enum — consistent with existing state machine pattern
- Implemented `_onPauseTapped()` — freezes update loop (PAUSED guard), unschedules urgency blink, stops tweens, disables grid input, shows pauseOverlay
- Implemented `_resumeSession()` — applies `_applyPauseOffset(deltaMs)`, re-enables grid input, restores urgency blink at correct stage
- Implemented `_applyPauseOffset(deltaMs)` — shifts `gameState.sessionStartMs`, all flower timestamps via `grid.shiftAllTimestamps(deltaMs)`, and `_nextSpawnMs` in one pass
- `_updatePauseButtonVisibility()` called after every phase assignment — pause button visible only during PLAYING
- 186/186 tests passing — no regressions

## Task Commits

1. **Task 1: Implement pause/resume logic in GameController** — `480a2ec` (feat)
2. **Task 2: Verify pause/resume in Cocos Editor** — AWAITING HUMAN VERIFICATION (checkpoint)

## Files Created/Modified

- `BloomTap/assets/scripts/GameController.ts` — Added SessionPhase.PAUSED, 4 new @property fields, 6 new private methods, _updatePauseButtonVisibility() calls in all phase-change methods

## Decisions Made

- **SessionPhase.PAUSED as enum value (not boolean):** Keeps state machine consistent; update() guard `!== PLAYING` already correctly blocks PAUSED frames without any code change.
- **Do NOT call _stopAllJuiceAnimations() on pause:** That method resets `_urgencyStage = 0` which would cause blink to resume at wrong rate. Instead, only `unschedule(_blinkCallback)` to freeze it; `_applyUrgencyStage(_urgencyStage)` on resume restores correct state.
- **Pause overlay touch listener on Node.EventType.TOUCH_START:** Covers full-screen touch for resume gesture (D-08/D-09).
- **Timestamp shift includes 3s countdown (D-12):** Total `pauseDeltaMs = performance.now() - _pauseStartMs` measured at end of countdown, so flowers and timer are synchronized when gameplay resumes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before testing in Cocos Editor, create two scene nodes (see Task 2 checkpoint for full instructions):
1. `pauseButton` node — Button component, Label "PAUSE", bottom-center position, wire to GameController.pauseButton
2. `pauseOverlay` node — UIOpacity 80, full-screen touch target, two Label children ("PAUSED" / "Chạm vào màn hình để tiếp tục"), wire to GameController.pauseOverlay

## Known Stubs

None — all new methods are fully implemented. The `pausedLabel` and `pausedSubLabel` @property fields are wired to scene nodes created by the user in Cocos Editor (Task 2 setup steps).

## Next Phase Readiness

- Pause logic is fully implemented in code — ready for scene wiring and visual verification
- Task 2 (human-verify checkpoint) requires creating two scene nodes in Cocos Editor then testing pause/resume flow
- After Task 2 approval, PAUSE-01 requirement is satisfied and Phase 09 is complete

---
*Phase: 09-pause-system*
*Completed: 2026-03-21*

## Self-Check: PASSED

- `E:\workspace\ProjectAI\BloomTap\assets\scripts\GameController.ts` — exists, contains all required methods
- Commit `480a2ec` — verified in git log
