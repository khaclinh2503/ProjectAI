---
phase: 11-bug-fixes-and-refactors
plan: "02"
subsystem: rendering/juice
tags: [combo-label, screen-shake, power-up, score-float, border-glow, animation]
dependency_graph:
  requires: ["11-01"]
  provides: ["FIX-01-visual", "FIX-02-visual", "D-07", "D-08", "D-10", "D-18", "D-20", "D-21", "D-22", "D-23", "D-24"]
  affects: ["GridRenderer.ts", "GameController.ts"]
tech_stack:
  added: []
  patterns: ["tween-counter-object", "parallel-tweens", "border-glow-graphics"]
key_files:
  created: []
  modified:
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scripts/GameController.ts
decisions:
  - "Score float count-up tween targets a plain JS object {value: amount} — Cocos tween supports any object with numeric properties, no Node required"
  - "Count-up tween runs in parallel with position/opacity tweens (separate targets) — no conflict"
  - "Score float removed ×N suffix approach; replaced with count-up from base to final score over 0.4s cubicOut — per user feedback after human-verify checkpoint"
metrics:
  duration: "~30 min (including human-verify cycle)"
  completed_date: "2026-03-23"
  tasks_completed: 3
  files_modified: 2
---

# Phase 11 Plan 02: Bug Fixes and Refactors (Part 2) Summary

**One-liner:** Combo label fixed to `x{N}` format, wrong-tap grid shake added (8px/200ms), score float count-up animation from base to multiplied score, and colored border glow around grid during active power-up effects.

---

## What Was Built

### Task 1 — Combo label + screen shake + milestone pulse (commit c555a5d)

**GameController.ts changes:**

- `_updateHUD`: Combo label now shows `x${streak}` (no "Combo " prefix), hidden when streak < 2 via `node.active = false`
- `_pulseComboLabel(streak?)`: Added streak parameter; milestone streaks (x10, x20…) get `peakScale = 1.6` vs normal `1.25`
- `handleWrongTap()`: Added `this.gridRenderer.shakeGrid()` call for screen shake on wrong tap
- `_onCellTapped`: Destructures `powerUpMultiplier` from `handleCorrectTap` result and passes it to `spawnScoreFloat`

### Task 2 — shakeGrid + score float multiplier display + grid border glow (commit 2ea279e)

**GridRenderer.ts additions:**

- `shakeGrid()`: 8px displacement, 4-step tween, ~200ms total. Uses `Tween.stopAllByTarget(gridNode)` before start.
- `spawnScoreFloat`: Added `powerUpMultiplier: number = 1` parameter. Originally added `×N` suffix (Task 2 as planned).
- `BORDER_GLOW_COLORS`: Module-level constant mapping each `EffectType` to a Color (red-orange/cyan-blue/green)
- `_buildBorderGlow()`: Creates a `Graphics` child node sized 576+16px, inactive by default
- `drawBorderGlow(effect)`: Draws colored rounded-rect stroke border; `_lastBorderEffect` guard skips redundant redraws

**GameController.ts additions (in Task 2):**

- `update()`: Calls `this.gridRenderer.drawBorderGlow(activeEffects[0] ?? null)` each frame
- `_beginSession()`: Calls `this.gridRenderer.drawBorderGlow(null)` to clear glow on new session

### Task 3 (continuation) — Score float count-up animation (commit 595635b)

After human verification, the `×N` suffix approach was replaced:

- Removed: `slot.label.string += \` ×${powerUpMultiplier}\``
- Added: When `powerUpMultiplier > 1`, a `tween(counter)` targeting a plain JS object `{ value: amount }` animates from base score to `Math.round(amount * powerUpMultiplier)` over 0.4s (`cubicOut`). Each `onUpdate` callback updates `slot.label.string = \`+${Math.round(counter.value)}\``.
- The initial label remains the base score (e.g., "+80"). The tween counts up to the final score (e.g., "+400" for ×5), giving a real-time multiplier visualization.

---

## Deviations from Plan

### Post-checkpoint Fix

**Task 3 visual verification surfaced score float UX issue.**

- **Found during:** Human verification checkpoint
- **Issue:** The `×N` suffix approach ("+240 ×3") was informative but not satisfying. User requested count-up animation instead.
- **Fix:** Replaced suffix append with a tween-counter pattern. A plain JS object `{value: amount}` is tweened from base to final score; `onUpdate` updates the label string each frame.
- **Files modified:** `BloomTap/assets/scripts/GridRenderer.ts`
- **Commit:** 595635b

No other deviations. Tasks 1 and 2 executed as planned.

---

## Known Stubs

None. All features are fully wired.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| BloomTap/assets/scripts/GridRenderer.ts | FOUND |
| BloomTap/assets/scripts/GameController.ts | FOUND |
| Commit c555a5d (Task 1) | FOUND |
| Commit 2ea279e (Task 2) | FOUND |
| Commit 595635b (Task 3 fix) | FOUND |
