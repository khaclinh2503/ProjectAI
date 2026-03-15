---
phase: 05-juice-and-polish
plan: "02"
subsystem: animation
tags: [juice, tap-pulse, score-float, combo, milestone, timer-urgency, tween, blink]

requires:
  - phase: 05-01
    provides: [playTapPulse, spawnScoreFloat, stopAllFloatAnimations, handleCorrectTap extended return, _stopAllJuiceAnimations, private state fields]
provides:
  - All four JUICE requirements wired end-to-end to game events
  - Wrong tap triggers red screen flash + combo label blink
  - Correct tap triggers combo label pulse + score float
  - Milestone celebration at combo x10/x25/x50 (once per session)
  - Timer urgency: yellow (≤60s), orange (≤30s), red+blink (≤10s)
affects: [GameController, GridRenderer, human-verification]

tech-stack:
  added: []
  patterns:
    - "Module-level pre-allocated Color constants (TIMER_COLOR_*) — zero per-frame allocation"
    - "Stage integer with early-out (if newStage === this._urgencyStage return) — avoids redundant DOM updates"
    - "Blink callback stored as instance field — enables unschedule() to work (anonymous arrow = new object)"
    - "Wrong tap penalty display constant WRONG_TAP_DISPLAY_PENALTY — matches GameState.WRONG_TAP_PENALTY without import"

key-files:
  created: []
  modified:
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scripts/GameController.ts

key-decisions:
  - "WRONG_TAP_DISPLAY_PENALTY = -10 (not -30 as plan assumed) — verified against GameState.WRONG_TAP_PENALTY = 10"
  - "Timer urgency stage transitions are instant (no color tween) per CONTEXT.md specification"
  - "Blink interval = 250ms per plan discretion guidance"
  - "Timer scale: normal=1.0x, urgency1=1.2x, urgency2=1.4x, urgency3=1.6x"

requirements-completed: [JUICE-01, JUICE-02, JUICE-03, JUICE-04]

duration: 6min
completed: "2026-03-15"
---

# Phase 05 Plan 02: Wire Juice Effects to Game Events Summary

**All four JUICE requirements wired end-to-end — tap pulse + score float on every tap, red flash + combo blink on wrong tap, milestone celebration at x10/x25/x50, timer urgency escalation through 3 color/scale stages with 250ms blink at ≤10s**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-15T10:23:37Z
- **Completed:** 2026-03-15T10:28:53Z
- **Tasks:** 3 auto + 1 human-verify checkpoint
- **Files modified:** 2

## Accomplishments

- GridRenderer._onCellTapped() now calls playTapPulse() + spawnScoreFloat() on all three tap paths (correct, wrong-with-flower, empty cell)
- GameController gains _playRedFlash(), _playComboBreak(), _pulseComboLabel(), _checkMilestone(), _playMilestoneCelebration() — all wired to their respective event callers
- Timer urgency via _updateTimerUrgency() + _applyUrgencyStage() with 3 stages of escalation, blink at stage 3, clean state on session reset

## Task Commits

1. **Task 1: Wire tap events in GridRenderer._onCellTapped()** - `5d97b19` (feat)
2. **Task 2: Wire combo events + milestone celebration in GameController** - `75ea288` (feat)
3. **Task 3: Implement timer urgency escalation in GameController** - `afc76c7` (feat)

## Files Created/Modified

- `BloomTap/assets/scripts/GridRenderer.ts` - Added WRONG_TAP_DISPLAY_PENALTY constant; wired playTapPulse + spawnScoreFloat into all three tap paths in _onCellTapped(); destructures rawScore/multiplier/isFullBloom from handleCorrectTap
- `BloomTap/assets/scripts/GameController.ts` - Added TIMER_COLOR_* module constants; added _playRedFlash, _playComboBreak, _pulseComboLabel, _checkMilestone, _playMilestoneCelebration, _updateTimerUrgency, _applyUrgencyStage; wired into handleWrongTap, handleCorrectTap, _updateHUD

## Decisions Made

- WRONG_TAP_DISPLAY_PENALTY set to -10, not -30 as plan examples assumed — verified against actual `GameState.WRONG_TAP_PENALTY = 10`
- Timer color/scale transitions are instant (no tween between stages) per CONTEXT.md
- Blink interval = 250ms, timer scale at urgency 3 = 1.6x (plan's discretion guidance applied)
- Blink callback stored as `_blinkCallback` instance field — required for `unschedule()` to correctly cancel the schedule (anonymous arrow creates new object reference each call)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong penalty display value: plan used -30, actual value is -10**
- **Found during:** Task 1 (Wire tap events in GridRenderer._onCellTapped())
- **Issue:** Plan specified `spawnScoreFloat(view.row, view.col, -30, 1)` but GameState.WRONG_TAP_PENALTY = 10, not 30
- **Fix:** Set WRONG_TAP_DISPLAY_PENALTY = -10 to match actual game state; added comment referencing GameState.WRONG_TAP_PENALTY
- **Files modified:** BloomTap/assets/scripts/GridRenderer.ts
- **Verification:** grep confirmed GameState.WRONG_TAP_PENALTY = 10 before writing constant
- **Committed in:** 5d97b19 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug — wrong hardcoded value)
**Impact on plan:** Critical correctness fix — score float display now matches actual penalty applied to game state.

## Issues Encountered

- tsc compile command via `npx tsc` unavailable (no global TypeScript install, npx resolves to deprecated `tsc` npm package). Resolved by locating Cocos Creator's bundled TypeScript at `C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/bin/tsc` and running from BloomTap/ directory — consistent with prior phases.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four JUICE requirements implemented and awaiting human verification checkpoint
- Human playtest required to confirm all scenarios in the verification checklist pass
- No architectural changes — direct wiring of existing animation primitives to game events

## Self-Check: PASSED

- BloomTap/assets/scripts/GridRenderer.ts — present, tap events wired
- BloomTap/assets/scripts/GameController.ts — present, juice methods added
- .planning/phases/05-juice-and-polish/05-02-SUMMARY.md — present
- Commit 5d97b19 — present (Task 1: GridRenderer tap events)
- Commit 75ea288 — present (Task 2: combo events + milestone)
- Commit afc76c7 — present (Task 3: timer urgency)

---
*Phase: 05-juice-and-polish*
*Completed: 2026-03-15*
