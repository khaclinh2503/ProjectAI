---
phase: 05-juice-and-polish
plan: "00"
subsystem: testing
tags: [vitest, pure-functions, juice, animation, tdd]

# Dependency graph
requires:
  - phase: 04-session-loop
    provides: GameController and GridRenderer that will import these helpers
provides:
  - Pure juice animation parameter functions in JuiceHelpers.ts
  - getFloatLabelString, getFloatFontSize, getFloatDuration, getUrgencyStage, getMilestoneLabel, MILESTONE_THRESHOLDS
  - 29 Vitest unit tests covering all boundary conditions
affects:
  - 05-01 (GridRenderer score floats will import getFloat* functions)
  - 05-02 (GameController urgency and milestone logic will import getUrgencyStage and getMilestoneLabel)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure logic extraction: animation parameters isolated from Cocos runtime into testable module"
    - "TDD red-green: test file committed failing, implementation committed separately passing"

key-files:
  created:
    - BloomTap/assets/scripts/logic/JuiceHelpers.ts
    - BloomTap/assets/scripts/logic/JuiceHelpers.test.ts
  modified: []

key-decisions:
  - "JuiceHelpers.ts has zero Cocos imports — pure TypeScript formulas importable from Node/Vitest without browser"
  - "getMilestoneLabel mutates the triggered Set in-place — caller owns the Set, function is idempotent on re-call"
  - "getFloatFontSize cap at 48 (not 46 or 50) — formula 24 + (7-1)*4 = 48 hits cap exactly at multiplier 7"
  - "getUrgencyStage uses <= boundaries (not <) — 60s triggers stage 1, 30s triggers stage 2, 10s triggers stage 3"

patterns-established:
  - "Pure logic tier: all game math/formulas go in /logic/, never inline in Cocos component classes"
  - "TDD for formulas: boundary conditions (cap, exact boundary, zero) all explicitly tested"

requirements-completed: [JUICE-01, JUICE-02, JUICE-03, JUICE-04]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 05 Plan 00: JuiceHelpers Pure Functions Summary

**5 pure TypeScript animation-parameter functions extracted to JuiceHelpers.ts with 29 Vitest tests covering all boundary conditions — zero Cocos imports, full TDD red-green cycle**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-15T10:10:00Z
- **Completed:** 2026-03-15T10:12:13Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Created `JuiceHelpers.ts` with 5 exported functions and `MILESTONE_THRESHOLDS` constant, zero Cocos imports
- Wrote 29 Vitest unit tests covering all boundary conditions (caps, exact boundaries, zero, large values)
- Full test suite remains green: 140 tests passing (111 existing + 29 new)
- Plans 05-01 and 05-02 can now import `{ getFloatLabelString, getFloatFontSize, getFloatDuration, getUrgencyStage, getMilestoneLabel, MILESTONE_THRESHOLDS }` from `./logic/JuiceHelpers`

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for JuiceHelpers** - `5280709` (test)
2. **Task 1 GREEN: JuiceHelpers implementation** - `403e010` (feat)

_Note: TDD tasks have multiple commits (test RED → feat GREEN)_

## Files Created/Modified

- `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — 5 pure functions + MILESTONE_THRESHOLDS, no Cocos imports
- `BloomTap/assets/scripts/logic/JuiceHelpers.test.ts` — 29 unit tests across 6 describe blocks

## Decisions Made

- `getMilestoneLabel` mutates the caller-owned `triggered` Set in-place so the function is naturally idempotent on re-call without needing internal state
- `getUrgencyStage` uses `<=` boundaries so that exactly 60s, 30s, and 10s remaining each trigger the next urgency stage (matching plan spec)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `JuiceHelpers.ts` is importable from any file in the project without Cocos runtime
- Plan 05-01 (score float animations in GridRenderer) can import `getFloatLabelString`, `getFloatFontSize`, `getFloatDuration`
- Plan 05-02 (timer urgency + milestone banners in GameController) can import `getUrgencyStage`, `getMilestoneLabel`, `MILESTONE_THRESHOLDS`
- No blockers.

---
*Phase: 05-juice-and-polish*
*Completed: 2026-03-15*
