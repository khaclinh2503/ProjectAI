# Phase 11: Bug Fixes and Refactors - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Three known bugs are fixed and GameController is decoupled from inline JuiceHelpers logic. Additionally, the SLOW_GROWTH power-up effect logic is corrected (currently does nothing), the score multiplier visual feedback is added, and a grid border glow indicates active power-up state.

</domain>

<decisions>
## Implementation Decisions

### FIX-01: Combo Label — streak count, not multiplier

- **D-01:** `comboLabel` shows `x{streak}` (integer consecutive tap count), NOT the multiplier value (1.0, 1.5...)
- **D-02:** Label is hidden when streak < 2 (not shown at x1)
- **D-03:** Multiplier is applied silently to score; it is never displayed directly to the player
- **D-04:** On each correct tap: scale punch + color flash (extend existing `_pulseComboLabel`)
- **D-05:** At milestone streaks (x10, x20, x30, x40...) — stronger visual effect: bigger scale punch, brighter flash
- **D-06:** Format: `x${streak}` — no prefix "Combo"

### FIX-02: Screen Shake on Wrong Tap

- **D-07:** Shake target: `gridRenderer.node` (not canvas/HUD)
- **D-08:** Intensity: 8px displacement, 200ms total duration, 2–3 oscillations
- **D-09:** Triggered by `handleWrongTap()` in GameController (covers both: empty cell tap and BUD/WILTING/DEAD tap)
- **D-10:** Use tween: move node ±8px on X axis in ~3 steps, return to origin

### FIX-03: Remove inline JuiceHelpers duplicates — full scan

- **D-11:** `_updateTimerUrgency()` → replace inline if-chain with `getUrgencyStage(remainingSecs)` from JuiceHelpers
- **D-12:** `_checkMilestone()` → replace hardcoded `[10, 25, 50]` and inline string with `getMilestoneLabel(tapCount, triggered)` + `MILESTONE_THRESHOLDS` from JuiceHelpers
- **D-13:** Full duplicate scan of GameController — any other logic that overlaps with JuiceHelpers exports must also be replaced
- **D-14:** JuiceHelpers must be imported in GameController (currently only GridRenderer imports it)

### SLOW_GROWTH Effect Fix

- **D-15:** Current `applySlowGrowthConfig` only changes `cycleDurationMs` — which FlowerFSM never reads → effect does nothing at all
- **D-16:** Correct fix: change `applySlowGrowthConfig` to modify the fields FlowerFSM actually uses:
  - `budMs × 0.5` — flower reaches blooming faster (less waiting)
  - `tapWindowMs × 2.0` — wider total tap window
  - `bloomingMs × 2.0` — BLOOMING phase lasts twice as long
  - `fullBloomMs × 2.0` — FULL_BLOOM phase lasts twice as long
  - `wiltingMs` and `deadMs`: unchanged
- **D-17:** `cycleDurationMs` field in the copy is also updated to reflect the new total (budMs + tapWindowMs + wiltingMs + deadMs) — keep config internally consistent even though FlowerFSM doesn't use it

### Score Multiplier Visual Feedback

- **D-18:** When `powerUpMultiplier > 1`, score float label appends `×{multiplier}` — e.g., "+240 ×3"
- **D-19:** `handleCorrectTap()` must return `powerUpMultiplier` (currently only returns combo `multiplier`) so GridRenderer can render it
- **D-20:** If both combo multiplier AND power-up multiplier are active, show both: e.g., "+240 ×3" where ×3 is the power-up value (combo multiplier already affects score size via `getFloatFontSize`)

### Grid Border Glow During Active Power-Up

- **D-21:** A colored border/glow is drawn around the grid node when a power-up is active
- **D-22:** Color per effect type:
  - SCORE_MULTIPLIER → red/orange glow
  - TIME_FREEZE → cyan/blue glow
  - SLOW_GROWTH → green glow
  - No effect active → no border (invisible/hidden)
- **D-23:** Implemented as a Graphics overlay on (or child of) the GridRenderer node — drawn each frame in `update()` or redrawn on state change
- **D-24:** Border disappears immediately when effect expires — no fade animation needed

### Claude's Discretion

- Exact tween easing for screen shake
- Exact scale/color values for combo milestone effect intensities (x10, x20, x30...)
- Border glow width in pixels and exact alpha
- Whether grid border uses a separate Graphics child node or reuses an existing node

</decisions>

<specifics>
## Specific Ideas

- Combo effect: "giống chém hoa quả" — Fruit Ninja style combo counter feeling: punchy, satisfying scale pop with flash
- SLOW_GROWTH intent: gives the player a WIDER window to tap flowers — bud phase is shorter (less waiting), but once blooming it stays longer (easier to catch)
- Grid border glow: subtle but visible — player should feel "something is happening to the board"

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files being modified
- `BloomTap/assets/scripts/GameController.ts` — Main file: FIX-01, FIX-02, FIX-03, screen shake, score multiplier return
- `BloomTap/assets/scripts/logic/PowerUpState.ts` — `applySlowGrowthConfig()` function (D-15 → D-17)
- `BloomTap/assets/scripts/GridRenderer.ts` — Score float rendering, border glow, tap handling

### Reference implementations
- `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — Exports to use: `getUrgencyStage`, `getMilestoneLabel`, `MILESTONE_THRESHOLDS`, `getFloatFontSize`, `getFloatDuration`
- `BloomTap/assets/scripts/logic/FlowerFSM.ts` — `getState()` reads `budMs`, `tapWindowMs`, `bloomingMs` directly (NOT `cycleDurationMs`)
- `BloomTap/assets/scripts/logic/FlowerTypes.ts` — `FlowerTypeConfig` interface: shows all fields that `applySlowGrowthConfig` must update

### Requirements
- `.planning/REQUIREMENTS.md` §Bug Fixes — FIX-01, FIX-02, FIX-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_pulseComboLabel()` (GameController:337): Existing scale tween on combo label — extend for milestone intensities
- `paintFlash()` / `spawnScoreFloat()` (GridRenderer): Score float already accepts `multiplier` param (for combo) — extend to also show powerUpMultiplier
- Tween/Vec3 already imported in GameController — screen shake needs no new imports

### Established Patterns
- Screen overlay tweens use `Tween.stopAllByTarget(node)` before starting new tween — must do the same for shake
- All tween targets stored as instance fields if unschedule is needed — shake target is a node, stopAllByTarget is sufficient
- `handleCorrectTap()` returns a result object `{ flashColor, rawScore, multiplier, isFullBloom }` — add `powerUpMultiplier` to this object

### Integration Points
- `GameController.handleWrongTap()` → add `this.gridRenderer?.shakeGrid()` (new method on GridRenderer, or inline the tween in GameController using `this.gridRenderer?.node`)
- `PowerUpState.ts` → `applySlowGrowthConfig` is a pure function, easy to change without side effects
- GridRenderer `_paintState()` loop → add border glow draw call after painting cells

</code_context>

<deferred>
## Deferred Ideas

- Milestone threshold change: user mentioned x10, x20, x30 for combo effect intensity — the mid-screen milestone celebration (`_playMilestoneCelebration`) currently triggers at MILESTONE_THRESHOLDS [10, 25, 50]; leaving that system unchanged; only the combo label pulse intensity uses multiples of 10
- Audio feedback for power-up effects — AUDIO-04 is a future requirement
- SLOW_GROWTH visual on cells (e.g., slowing animation) — out of scope for Phase 11

</deferred>

---

*Phase: 11-bug-fixes-and-refactors*
*Context gathered: 2026-03-23*
