---
phase: 12-score-combo-effects
plan: 01
subsystem: juice-animations
tags: [juice, score, combo, animation, tdd]
requirements: [JUICE-02, JUICE-03]
dependency_graph:
  requires: []
  provides: [getScoreFlashColor, getComboStartScale, _punchScoreLabel, updated-_pulseComboLabel, updated-_playComboBreak]
  affects: [GameController, JuiceHelpers, FlowerColors]
tech_stack:
  added: []
  patterns: [pure-logic-helper, tween-scale-punch, tween-color-flash, punch-in-animation]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/JuiceHelpers.ts
    - BloomTap/assets/scripts/logic/JuiceHelpers.test.ts
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/assets/scripts/FlowerColors.ts
decisions:
  - "[12-01 D-02] getScoreFlashColor returns plain {r,g,b} object (no cc import) — caller constructs Color; maintains pure logic tier"
  - "[12-01 D-03] Combo label uses punch-IN (large+transparent to normal+opaque) instead of punch-OUT — more dynamic and communicates streak strength"
  - "[12-01 D-05] Combo break flash uses opacity 89/255 vs normal 51/255 — stronger visual distinguishes combo break from normal wrong tap"
  - "[12-01] handleWrongTap separates streak >= 2 (combo break with strong flash) from streak < 2 (normal soft flash) — no double-fire overlap"
metrics:
  duration: "~9 minutes"
  completed: "2026-03-25"
  tasks_completed: 3
  files_modified: 4
  tests_added: 12
  tests_total: 244
---

# Phase 12 Plan 01: Score and Combo Effects Summary

**One-liner:** Score label punch+color flash (white/yellow/orange by delta) and combo punch-IN animation (streak-proportional scale) with stronger combo break flash using testable pure helpers.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | TDD failing tests for getScoreFlashColor and getComboStartScale | 9a4bbbf | JuiceHelpers.test.ts |
| 1 (GREEN) | Implement getScoreFlashColor and getComboStartScale in JuiceHelpers | f56dd4e | JuiceHelpers.ts |
| 2 | Score HUD punch + color flash on every score increase (JUICE-02) | 8eae1d4 | GameController.ts, FlowerColors.ts |
| 3 | Combo punch-in with streak-scaled start + stronger combo break flash (JUICE-03) | 8af8d02 | GameController.ts |

---

## What Was Built

### JuiceHelpers.ts — Two new pure helper functions

**`getScoreFlashColor(scoreDelta: number): { r, g, b }`**
- delta < 50: white (255,255,255) — small score, no standout flash
- delta 50–99: yellow (255,220,60) — medium score matches CORRECT_FLASH_YELLOW palette
- delta >= 100: orange (255,160,0) — large score, premium visual feedback
- Returns plain object (no `cc` import) — pure logic tier maintained

**`getComboStartScale(streak: number): number`**
- streak < 2: 1.0 (no punch-in effect)
- streak = 2: 1.5 (minimum punch-in)
- Formula: `Math.min(1.5 + (streak - 2) * 0.1875, 3.0)` — clamped at 3.0
- streak = 10: exactly 3.0 (max)

### FlowerColors.ts — New constant

**`FLOAT_COLOR_MULTIPLIER`** = `new Color(255, 200, 50, 255)` — gold color for score float labels (used by Plan 02)

### GameController.ts — Three changes

**`_punchScoreLabel(scoreDelta: number)`** — New method after `_pulseComboLabel`:
- Scale tween: 1.2x (0.06s backOut) → 1.0x (0.08s cubicIn)
- Color flash: set flash color from `getScoreFlashColor`, reset to white after 0.15s
- Called from `handleCorrectTap` after combo pulse

**`_pulseComboLabel`** — Replaced punch-OUT with punch-IN animation:
- Sets label to startScale (large+transparent), shrinks to 1.0x while fading in opacity
- streak < 2: resets scale to 1.0 with no animation (no visible punch for early streaks)
- Uses `getComboStartScale()` to determine start scale proportional to streak

**`_playComboBreak`** — Upgraded with stronger visual:
- Scale burst: 1.8x (0.05s cubicOut) → 1.0x (0.10s cubicIn)
- Opacity blink: same 3-cycle pattern as before
- Red flash overlay: 89/255 opacity (~35%) instead of 51/255 (~20%) for normal wrong taps

**`handleWrongTap`** — Separates combo break vs normal:
- Saves `streakBeforeReset` before `applyWrongTap` resets the combo
- streak >= 2: calls `_playComboBreak()` only (stronger flash, no double-fire)
- streak < 2: calls `_playRedFlash()` only (softer original flash)

**`_stopAllJuiceAnimations`** — Added score label cleanup:
- Stops tweens on scoreLabel node
- Resets scale to 1.0 and color to white on session restart

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — all implementations are fully wired.

---

## Test Results

- **Before:** 232 tests passing (11 test files)
- **After:** 244 tests passing (11 test files)
- **Added:** 12 new tests (6 for getScoreFlashColor, 6 for getComboStartScale)
- **Regressions:** 0

---

## Self-Check: PASSED

- FOUND: BloomTap/assets/scripts/logic/JuiceHelpers.ts
- FOUND: BloomTap/assets/scripts/logic/JuiceHelpers.test.ts
- FOUND: BloomTap/assets/scripts/GameController.ts
- FOUND: BloomTap/assets/scripts/FlowerColors.ts
- FOUND: .planning/phases/12-score-combo-effects/12-01-SUMMARY.md
- FOUND commit 9a4bbbf: test(12-01): add failing tests
- FOUND commit f56dd4e: feat(12-01): implement helpers
- FOUND commit 8eae1d4: feat(12-01): score HUD punch
- FOUND commit 8af8d02: feat(12-01): combo punch-in
