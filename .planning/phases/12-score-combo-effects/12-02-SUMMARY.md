---
phase: 12-score-combo-effects
plan: 02
subsystem: juice-animations
tags: [juice, score-float, animation, zigzag, punch-in, multiplier, visual-polish]
requirements: [JUICE-04]
dependency_graph:
  requires: [12-01]
  provides: [enhanced-spawnScoreFloat, FLOAT_COLOR_MULTIPLIER-usage, zigzag-path, punch-in-spawn, CORRECT_FLASH_GREEN]
  affects: [GridRenderer, FlowerColors, GameController]
tech_stack:
  added: []
  patterns: [punch-in-animation, zigzag-tween-path, score-based-scale, position-offset-by-grid-side]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scripts/FlowerColors.ts
    - BloomTap/assets/scripts/GameController.ts
decisions:
  - "[12-02 D-01] All score floats (not just multiplier) use punch-in and zigzag — human feedback after initial implementation showed universal punch-in feels better than only multiplier branch"
  - "[12-02 D-02] Punch-in starts at opacity 160 (not 0) — text at opacity 0 was invisible; mờ/semi-transparent makes the slam effect clearly visible before shrink"
  - "[12-02 D-03] Punch-in scale by score value: <10 no punch (scale=1), <100 scale=5, >=100 scale=10 — proportional feedback based on score magnitude"
  - "[12-02 D-04] Float position offset 1 cell toward center: right-half cells offset left, left-half cells offset right — avoids floats going off-screen edge"
  - "[12-02 D-05] Multiplier float zigzag: 28px displacement; normal float zigzag: 16px — multiplier gets wider path to feel more special"
  - "[12-02 D-06] CORRECT_FLASH_GREEN added to FlowerColors; correct tap cell flash changed to green (80,220,80) — green better communicates 'correct' vs old yellow/white"
metrics:
  duration: "~90 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_modified: 3
  tests_added: 0
  tests_total: 244
---

# Phase 12 Plan 02: Score Float Enhancement Summary

**One-liner:** Score floats enhanced with score-proportional punch-in spawn (scale 5–10x), opacity 20%→100% fade-in, 1-cell position offset toward center, bold font, zigzag upward path (multiplier 28px / normal 16px), gold color for multiplier floats, and green cell flash for correct taps.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Score float gold color + punch-in + zigzag when multiplier active (initial) | 50b79b1 | GridRenderer.ts |
| 1 (fix) | Apply punch-in + zigzag to all floats, add bold font | a7d4eab | GridRenderer.ts |
| 1 (fix) | Make float punch-in visible — start at opacity 160 not 0 | 5c141c9 | GridRenderer.ts |
| 1 (refinement) | Score-based punch-in scale + 1-cell position offset | 590b74f | GridRenderer.ts |
| 1 (bonus) | Correct tap cell flash changed to green | fae504c | FlowerColors.ts, GameController.ts |
| 2 | Visual verification in Cocos Editor — human approved all 6 checks | (checkpoint) | — |

---

## What Was Built

### GridRenderer.ts — spawnScoreFloat enhanced

**Punch-in spawn animation (all floats):**
- Score < 10: no punch (scale = 1.0, opacity starts at 255) — tiny scores don't deserve fanfare
- Score < 100: scale = 5.0, opacity = 20% (51/255) → 100% (255/255)
- Score >= 100: scale = 10.0, opacity = 20% → 100%
- Scale shrinks to 1.0 over 0.14s with backOut easing
- Opacity fades in over 0.14s simultaneously

**Position offset toward center:**
- Cells in right half of grid: float spawns 1 cell-width to the left
- Cells in left half of grid: float spawns 1 cell-width to the right
- Prevents floats from drifting off-screen on edge cells

**Bold font:** `slot.label.isBold = true` for all floats — more readable at small scale

**Zigzag upward path (all floats):**
- 5 segments, each rising `riseY / 5` vertically
- Multiplier-active floats: 28px horizontal displacement per segment
- Normal floats: 16px horizontal displacement per segment
- Each segment direction (±X) is random — true zigzag feel
- Zigzag starts after 0.14s delay (punch-in settles first)

**Color assignment (unchanged from initial implementation):**
- Wrong tap (amount < 0): red (220, 60, 60)
- Multiplier active (powerUpMultiplier > 1): gold `FLOAT_COLOR_MULTIPLIER` (255, 200, 50)
- Normal correct tap: white (255, 255, 255)

### FlowerColors.ts — New constant

**`CORRECT_FLASH_GREEN`** = `new Color(80, 220, 80, 255)` — green flash for correct tap cells

### GameController.ts — Correct tap flash color

**`_flashCell()` calls updated:** Both normal correct tap and full bloom tap now use `CORRECT_FLASH_GREEN` instead of the old yellow/white — green unambiguously signals "correct".

---

## Deviations from Plan

### Auto-fixed / Human-requested Refinements

**1. [Rule 2 / Human feedback] Universal punch-in instead of multiplier-only**
- **Found during:** Task 1 initial review
- **Issue:** Initial implementation branched punch-in and zigzag only when `powerUpMultiplier > 1`. Human feedback requested all floats get the effect.
- **Fix:** Removed branch — all floats get punch-in + zigzag; multiplier floats still get wider displacement (28px vs 16px) and gold color.
- **Files modified:** BloomTap/assets/scripts/GridRenderer.ts
- **Commit:** a7d4eab

**2. [Rule 1 - Bug] Opacity 0 invisible punch-in**
- **Found during:** Task 1 visual testing
- **Issue:** Starting punch-in at opacity 0 made the large-scale text invisible — the "slam" effect was not visible at all.
- **Fix:** Changed initial opacity to 160 (semi-transparent / mờ) so the large text is clearly visible before it shrinks and becomes fully opaque.
- **Files modified:** BloomTap/assets/scripts/GridRenderer.ts
- **Commit:** 5c141c9

**3. [Human feedback] Score-proportional punch scale + grid-side position offset**
- **Found during:** Task 1 further refinement
- **Issue:** Uniform scale 1.8 felt the same regardless of score amount; floats on edge cells could drift off-screen.
- **Fix:** Scale based on score magnitude (<10 = no punch, <100 = scale 5, >=100 = scale 10); position offset 1 cell toward center based on grid side.
- **Files modified:** BloomTap/assets/scripts/GridRenderer.ts
- **Commit:** 590b74f

**4. [Rule 2 - UX clarity] Green correct tap flash (out-of-plan addition)**
- **Found during:** Visual verification pass
- **Issue:** Cell flash color for correct taps was not clearly distinguishable as "correct" feedback.
- **Fix:** Added `CORRECT_FLASH_GREEN` constant and updated both correct tap flash calls in GameController to use green.
- **Files modified:** BloomTap/assets/scripts/FlowerColors.ts, BloomTap/assets/scripts/GameController.ts
- **Commit:** fae504c

---

## Visual Verification Results (Human-approved)

All 6 checks passed in Cocos Creator Preview mode:

| Check | Requirement | Result |
|-------|-------------|--------|
| Score label punch + color flash on correct tap | JUICE-02 | Approved |
| Combo label punch-in starts large at high streak, shrinks to normal | JUICE-03 | Approved |
| Combo break flash visibly stronger than normal wrong tap | JUICE-03 | Approved |
| Multiplier-active score floats are gold with zigzag path | JUICE-04 | Approved |
| Normal score floats are white with zigzag (no regression) | JUICE-04 | Approved |
| Wrong-tap floats are red with zigzag (no regression) | JUICE-04 | Approved |

---

## Known Stubs

None — all implementations are fully wired.

---

## Test Results

- **Tests before:** 244 passing
- **Tests after:** 244 passing (no new tests needed — visual-only changes)
- **Regressions:** 0

---

## Self-Check: PASSED

- FOUND: BloomTap/assets/scripts/GridRenderer.ts
- FOUND: BloomTap/assets/scripts/FlowerColors.ts
- FOUND: BloomTap/assets/scripts/GameController.ts
- FOUND commit 50b79b1: feat(12-02): score float gold color + punch-in + zigzag when multiplier active
- FOUND commit a7d4eab: fix(12-02): apply punch-in + zigzag to all score floats, add bold font
- FOUND commit 5c141c9: fix(12-02): make float punch-in visible — start at opacity 160 not 0
- FOUND commit 590b74f: feat(12-02): score-based punch-in scale + 1-cell position offset
- FOUND commit fae504c: feat(12): correct tap cell flash changes to green
