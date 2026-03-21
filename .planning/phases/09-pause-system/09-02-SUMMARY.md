---
phase: 09-pause-system
plan: 02
subsystem: ui
tags: [pause, resume, SessionPhase, timestamp-shift, GameController, countdown, GridRenderer]

# Dependency graph
requires:
  - phase: 09-pause-system/01
    provides: FlowerFSM.shiftTimestamp, Grid.shiftAllTimestamps
provides:
  - GameController pause/resume logic
  - SessionPhase.PAUSED state
  - _applyPauseOffset() — shifts all session timestamps on resume
  - pauseButton and pauseOverlay @property nodes wired in scene
  - GridRenderer.freezeAt(nowMs|null) — pins visual render timestamp during pause
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
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scene/GameScene.scene

key-decisions:
  - "SessionPhase.PAUSED added to enum — not a boolean flag, consistent with existing state machine"
  - "_onPauseTapped does NOT call _stopAllJuiceAnimations — that resets _urgencyStage to 0, losing blink state"
  - "Only unschedule(_blinkCallback) on pause; _applyUrgencyStage(_urgencyStage) restores correct blink on resume"
  - "pauseButton is @property(Node) not @property(Button) — matches plan spec for simpler wiring"
  - "Timestamp shift covers full pause+countdown duration (pauseStartMs to end of countdown) per D-11/D-12"
  - "GridRenderer.freezeAt() added post-UAT — Cocos render loop runs independently of update(); flowers kept progressing visually without this fix"

patterns-established:
  - "Phase-change visibility: _updatePauseButtonVisibility() called after every _phase assignment"
  - "Pause/resume timestamp shift: single _applyPauseOffset(deltaMs) call shifts all timestamps in one pass"
  - "Renderer freeze pattern: freezeAt(nowMs) pins render time; freezeAt(null) restores live rendering"

requirements-completed: [PAUSE-01]

# Metrics
duration: ~45 min
completed: "2026-03-21"
---

# Phase 9 Plan 02: GameController Pause/Resume Summary

**Full pause/resume system wired into GameController — SessionPhase.PAUSED, freeze/restore urgency blink, 3-2-1 resume countdown, _applyPauseOffset() timestamp shift, and GridRenderer.freezeAt() for visual freeze during pause.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-21T09:21:02Z
- **Completed:** 2026-03-21T10:10:00Z
- **Tasks:** 2 of 2 complete (human-verified and approved)
- **Files modified:** 3

## Accomplishments

- Added `SessionPhase.PAUSED` to enum — consistent with existing state machine pattern
- Implemented `_onPauseTapped()` — freezes update loop (PAUSED guard), unschedules urgency blink, stops tweens, disables grid input, shows pauseOverlay
- Implemented `_resumeSession()` — applies `_applyPauseOffset(deltaMs)`, re-enables grid input, restores urgency blink at correct stage
- Implemented `_applyPauseOffset(deltaMs)` — shifts `gameState.sessionStartMs`, all flower timestamps via `grid.shiftAllTimestamps(deltaMs)`, and `_nextSpawnMs` in one pass
- `_updatePauseButtonVisibility()` called after every phase assignment — pause button visible only during PLAYING
- Added `freezeAt(nowMs|null)` to GridRenderer after UAT revealed flowers progressing visually despite PAUSED guard in update()
- Human-verified all 12 UAT steps in Cocos Editor — pause, resume countdown, urgency blink, game over flow all correct
- 186/186 tests passing — no regressions

## Task Commits

1. **Task 1: Implement pause/resume logic in GameController** — `480a2ec` (feat)
2. **Task 2: Verify pause/resume in Cocos Editor** — Human approved (scene nodes created, all 12 UAT steps passed)
3. **Bug fix (UAT): freeze GridRenderer visual updates during pause** — `b514cfc` (fix)

## Files Created/Modified

- `BloomTap/assets/scripts/GameController.ts` — Added SessionPhase.PAUSED, 4 new @property fields, 6 new private methods, _updatePauseButtonVisibility() calls in all phase-change methods; added freezeAt() calls on pause/resume
- `BloomTap/assets/scripts/GridRenderer.ts` — Added `_frozenNowMs: number | null` field and `freezeAt(nowMs|null)` method; `update()` uses `_frozenNowMs ?? performance.now()`
- `BloomTap/assets/scene/GameScene.scene` — pauseButton and pauseOverlay nodes created and wired to GameController @property slots

## Decisions Made

- **SessionPhase.PAUSED as enum value (not boolean):** Keeps state machine consistent; update() guard `!== PLAYING` already correctly blocks PAUSED frames without any code change.
- **Do NOT call _stopAllJuiceAnimations() on pause:** That method resets `_urgencyStage = 0` which would cause blink to resume at wrong rate. Instead, only `unschedule(_blinkCallback)` to freeze it; `_applyUrgencyStage(_urgencyStage)` on resume restores correct state.
- **Pause overlay touch listener on Node.EventType.TOUCH_START:** Covers full-screen touch for resume gesture (D-08/D-09).
- **Timestamp shift includes 3s countdown (D-12):** Total `pauseDeltaMs = performance.now() - _pauseStartMs` measured at end of countdown, so flowers and timer are synchronized when gameplay resumes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GridRenderer renders flowers visually even when update() is guarded by PAUSED**
- **Found during:** Task 2 (UAT human-verify — step 5: flowers kept changing state visually after pause)
- **Issue:** The PAUSED guard in `GameController.update()` stops game logic, but Cocos renders GridRenderer independently. `GridRenderer.update()` still evaluated `performance.now()` on every frame and updated flower visual states.
- **Fix:** Added `_frozenNowMs: number | null` to GridRenderer. Added `freezeAt(nowMs|null)` method that pins or clears the render timestamp. In `update()`, replaced `performance.now()` with `this._frozenNowMs ?? performance.now()`. GameController calls `freezeAt(performance.now())` on pause and `freezeAt(null)` on resume (before `setInputEnabled(true)` so shifted timestamps take effect immediately).
- **Files modified:** `BloomTap/assets/scripts/GridRenderer.ts`, `BloomTap/assets/scripts/GameController.ts`
- **Verification:** Human-verified in Cocos Editor — flowers frozen visually during pause, resume from correct state after countdown
- **Committed in:** `b514cfc` (fix commit post-UAT)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix. Without it, pause felt broken because flowers kept progressing visually. No scope creep.

## Issues Encountered

- Cocos render loop independence from `update()` was a known risk flagged in STATE.md blockers (MEDIUM confidence) — confirmed empirically during UAT and resolved with `freezeAt()` pattern. `schedule()`/`unschedule()` for blink callback worked correctly as expected.

## User Setup Required

None - scene nodes (pauseButton, pauseOverlay) were created in Cocos Editor during execution and are committed in GameScene.scene.

## Known Stubs

None — all new methods are fully implemented and scene nodes are wired.

## Next Phase Readiness

- PAUSE-01 requirement fully satisfied — pause/resume verified by human UAT
- Phase 09 complete — both plans done; ready for Phase 10 (special-flowers)
- `_applyPauseOffset()` pattern confirmed working — Phase 10 TIME_FREEZE power-up can use same pattern (shift timestamps per-frame while effect active)
- Known Cocos behavior documented: render loop is independent of update(); use freezeAt() pattern for any future rendering-freeze requirements

---
*Phase: 09-pause-system*
*Completed: 2026-03-21*

## Self-Check: PASSED

- `E:\workspace\ProjectAI\BloomTap\assets\scripts\GameController.ts` — exists, contains all required methods
- `E:\workspace\ProjectAI\BloomTap\assets\scripts\GridRenderer.ts` — exists, contains freezeAt() method
- `E:\workspace\ProjectAI\BloomTap\assets\scene\GameScene.scene` — committed with pauseButton and pauseOverlay nodes
- Commit `480a2ec` (feat: pause/resume logic) — verified in git log
- Commit `b514cfc` (fix: freeze GridRenderer visual updates) — verified in git log
