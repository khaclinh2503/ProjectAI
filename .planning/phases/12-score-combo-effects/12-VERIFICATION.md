---
phase: 12-score-combo-effects
verified: 2026-03-25T14:41:00Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Score label punch + color flash on correct tap (JUICE-02)"
    expected: "Score HUD label visibly scales up to 1.2x then back to 1.0x; color changes to white/yellow/orange based on score delta; resets to white after 0.15s"
    why_human: "Tween animation and color flash require Cocos Creator Preview mode to observe — cannot be verified via grep or unit tests"
  - test: "Combo label punch-in scales proportionally to streak level (JUICE-03)"
    expected: "At streak 2, combo label starts at ~1.5x and shrinks to normal; at streak 10 it starts at 3.0x; streaks below 2 show no punch-in"
    why_human: "Scale-proportional animation behavior requires live runtime observation in Cocos Creator Preview"
  - test: "Combo break flash visibly stronger than normal wrong tap (JUICE-03)"
    expected: "Wrong tap with streak >= 2 triggers 89/255 (~35%) red flash overlay; wrong tap with streak 0-1 triggers 51/255 (~20%) red flash — perceptibly different"
    why_human: "Opacity difference (35% vs 20%) requires human visual judgment in Preview mode to confirm perceptibility"
  - test: "Multiplier-active score floats appear gold with zigzag path (JUICE-04)"
    expected: "When SCORE_MULTIPLIER power-up is active, score floats are gold colored (255,200,50), zigzag 28px horizontally; normal floats are white, zigzag 16px"
    why_human: "Color distinction and animation path shape require Cocos Creator Preview mode with active power-up"
  - test: "Score float punch-in slam effect is visible (JUICE-04)"
    expected: "Floats with score >= 10 start large (scale 5x or 10x) at opacity ~20%, slam-shrink to normal over 0.14s — 'slam from sky' feel"
    why_human: "Animation feel and visual clarity require live runtime observation; cannot be verified from code alone"
  - test: "Normal float regression check (JUICE-04)"
    expected: "Normal correct-tap floats (no multiplier) are white, travel upward with 16px zigzag, no regression from previous behavior"
    why_human: "Regression for unchanged-path floats requires visual comparison in Preview mode"
---

# Phase 12: Score & Combo Effects Verification Report

**Phase Goal:** Add satisfying score and combo visual feedback — score HUD punch+flash, combo punch-in with streak scaling, stronger combo break, and enhanced multiplier score floats.
**Verified:** 2026-03-25T14:41:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Score label visibly punches (scales up then back) and flashes color every time score increases from a tap | VERIFIED (code) / ? HUMAN | `_punchScoreLabel(scoreDelta)` at line 415, called from `handleCorrectTap` at line 276; scale tween 1.2x → 1.0x; color flash via `getScoreFlashColor` |
| 2 | Combo label punch-in starts at a large scale proportional to streak level and shrinks to normal on each streak increase | VERIFIED (code) / ? HUMAN | `_pulseComboLabel` at line 380 calls `getComboStartScale(effectiveStreak)`, sets `labelNode.setScale(startScale, startScale, 1)` then tweens to 1.0 |
| 3 | Combo break (wrong tap with streak >= 2) triggers a stronger flash than a normal wrong tap | VERIFIED (code) / ? HUMAN | `handleWrongTap` line 288 branches on `streakBeforeReset >= 2`; `_playComboBreak` uses opacity 89 vs `_playRedFlash` opacity 51 |
| 4 | Normal wrong taps (streak 0 or 1) still show the original softer red flash | VERIFIED (code) / ? HUMAN | `handleWrongTap` else-branch at line 292 calls `_playRedFlash()` only; no double-fire overlap |
| 5 | Score float with active multiplier shows gold color, punch-in spawn, count-up animation, and zigzag path upward | VERIFIED (code) / ? HUMAN | `spawnScoreFloat` branches on `powerUpMultiplier > 1`: assigns `FLOAT_COLOR_MULTIPLIER`, runs count-up tween (lines 434-444), zigzagX=28 at line 479 |
| 6 | Normal score float (no multiplier) still goes upward with white color and narrower zigzag — no regression | VERIFIED (code) / ? HUMAN | else-branch in color assignment uses `new Color(255,255,255,255)`; `zigzagX = 16` for normal floats at line 479 |
| 7 | Wrong-tap float still shows red color — no regression | VERIFIED (code) / ? HUMAN | `isWrong` branch at line 447-448 assigns `new Color(220, 60, 60, 255)` unchanged |

**Score:** 7/7 truths verified in code. All 7 require human confirmation of visual feel.

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/logic/JuiceHelpers.ts` | `getScoreFlashColor` and `getComboStartScale` pure helpers | VERIFIED | Both functions present at lines 63-76; no `cc` import |
| `BloomTap/assets/scripts/logic/JuiceHelpers.test.ts` | Unit tests for new helpers | VERIFIED | `describe('getScoreFlashColor')` at line 133, `describe('getComboStartScale')` at line 154; both imported at line 10-11 |
| `BloomTap/assets/scripts/FlowerColors.ts` | `FLOAT_COLOR_MULTIPLIER` constant | VERIFIED | `export const FLOAT_COLOR_MULTIPLIER = new Color(255, 200, 50, 255)` at line 14 |
| `BloomTap/assets/scripts/GameController.ts` | Score punch, combo punch-in, stronger combo break | VERIFIED | `_punchScoreLabel` at line 415, `_pulseComboLabel` (updated) at line 380, `_playComboBreak` (upgraded) at line 337 |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/GridRenderer.ts` | Enhanced `spawnScoreFloat` with multiplier-active branch | VERIFIED | `ZIGZAG_SEGMENTS = 5` at line 478; `FLOAT_COLOR_MULTIPLIER` used at line 450; punch-in scale at lines 461-475 |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GameController.ts handleCorrectTap()` | `_punchScoreLabel()` | direct call after score update | WIRED | Line 276: `this._punchScoreLabel(Math.round(rawScore))` |
| `GameController.ts _pulseComboLabel()` | `JuiceHelpers.getComboStartScale()` | import call | WIRED | Line 15 imports `getComboStartScale`; line 389 calls `getComboStartScale(effectiveStreak)` |
| `GameController.ts _punchScoreLabel()` | `JuiceHelpers.getScoreFlashColor()` | import call | WIRED | Line 15 imports `getScoreFlashColor`; line 426 calls `getScoreFlashColor(scoreDelta)` |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GridRenderer.ts spawnScoreFloat()` | `FlowerColors.FLOAT_COLOR_MULTIPLIER` | import and color assignment when `powerUpMultiplier > 1` | WIRED | Line 5 imports `FLOAT_COLOR_MULTIPLIER`; line 450 assigns it when `powerUpMultiplier > 1` |
| `GridRenderer.ts spawnScoreFloat()` | `JuiceHelpers.getFloatDuration()` | duration calculation for zigzag segments | WIRED | Line 457 calls `getFloatDuration(multiplier)` |

---

### Data-Flow Trace (Level 4)

These are animation-only components — they do not render DB-backed dynamic data. The data flows are:

| Artifact | Data Variable | Source | Real Data | Status |
|----------|---------------|--------|-----------|--------|
| `GameController._punchScoreLabel` | `scoreDelta` | `rawScore` from `handleCorrectTap` return value | Yes — from `GameState.applyCorrectTap` | FLOWING |
| `GameController._pulseComboLabel` | `streak` | `this.comboSystem.tapCount` passed at call site (line 273) | Yes — live combo counter | FLOWING |
| `GameController._playComboBreak` | `streakBeforeReset` | captured before `applyWrongTap` at line 286 | Yes — live combo counter | FLOWING |
| `GridRenderer.spawnScoreFloat` | `powerUpMultiplier` | passed from `handleCorrectTap` return value, wired in `GridRenderer.handleTap` at line 304 | Yes — from active power-up state | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes (all 244 tests) | `npm run test:run` | 244 passed, 0 failed, 11 test files | PASS |
| `getScoreFlashColor` returns correct thresholds | Unit tests in JuiceHelpers.test.ts | 6 tests pass covering delta 0, 30, 50, 75, 100, 250 | PASS |
| `getComboStartScale` returns correct values | Unit tests in JuiceHelpers.test.ts | 6 tests pass covering streak 0, 1, 2, 5, 10, 15 | PASS |
| JuiceHelpers has no Cocos engine import | `grep "import.*'cc'" JuiceHelpers.ts` | No matches | PASS |
| All 9 SUMMARY commits exist in git log | `git log --oneline` | All 9 hashes (9a4bbbf, f56dd4e, 8eae1d4, 8af8d02, 50b79b1, a7d4eab, 5c141c9, 590b74f, fae504c) confirmed | PASS |

---

### Requirements Coverage

Note: JUICE-02, JUICE-03, JUICE-04 are v1.0 requirements (defined in `.planning/milestones/v1.0-REQUIREMENTS.md`). They were originally satisfied in Phase 5 (basic implementations). Phase 12 **enhances** these requirements with significantly richer animations.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| JUICE-02 | 12-01-PLAN | Điểm nổi lên từ ô hoa vừa tap — enhanced with score HUD punch+flash | SATISFIED (enhanced) | `_punchScoreLabel` wired in `handleCorrectTap`; `getScoreFlashColor` provides threshold-based color; score floats enhanced with punch-in and zigzag via Plan 02 |
| JUICE-03 | 12-01-PLAN | Visual flash khi tap sai và combo bị reset — enhanced with streak-proportional punch-in and stronger break | SATISFIED (enhanced) | `_pulseComboLabel` uses `getComboStartScale`; `_playComboBreak` uses opacity 89 vs 51; `handleWrongTap` correctly separates combo-break from normal wrong-tap |
| JUICE-04 | 12-02-PLAN | Timer đổi màu/nhấp nháy — Phase 12 re-uses this ID for score float enhancement | SATISFIED (enhanced) | `spawnScoreFloat` has gold color + zigzag for `powerUpMultiplier > 1`; score-proportional punch-in (scale 5x/10x) for all floats; `FLOAT_COLOR_MULTIPLIER` imported and wired |

**Orphaned requirements check:** No additional IDs from REQUIREMENTS.md are mapped to Phase 12 in ROADMAP.md beyond JUICE-02, JUICE-03, JUICE-04.

**Important note on requirement reuse:** JUICE-04 is defined in v1.0-REQUIREMENTS.md as "Timer đổi màu hoặc nhấp nháy trong 15 giây cuối" (timer urgency) — that was satisfied in Phase 5. Phase 12 re-claims JUICE-04 in ROADMAP.md to cover score float enhancement. This is an editorial reuse of the ID; the Phase 12 deliverable is distinct from the original JUICE-04 definition. The code implementing both purposes is present and verified.

---

### Anti-Patterns Found

Scan of all 4 modified files (JuiceHelpers.ts, JuiceHelpers.test.ts, FlowerColors.ts, GameController.ts, GridRenderer.ts):

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| None found | — | — | All files clean — no TODO/FIXME/XXX, no return null stubs, no placeholder comments |

**One documentation discrepancy (not a code defect):**

Commit 5c141c9 message claims initial punch-in opacity was changed to 160. Subsequent commit 590b74f (score-based punch scale refinement) changed it to 51. The SUMMARY documents the 160 value but the actual code uses 51. Both values are semi-transparent; 51 (~20%) is the current implemented value. The effect still works — the text is visible at large scale before shrinking. This is a SUMMARY accuracy issue only, not a functional defect.

---

### Human Verification Required

The following 6 visual checks were already approved by human in Cocos Creator Preview mode according to 12-02-SUMMARY.md. They are listed here for completeness and formal sign-off:

#### 1. Score Label Punch + Color Flash (JUICE-02)

**Test:** Tap a BLOOMING or FULL_BLOOM flower during a game session
**Expected:** Score HUD label scales up briefly (~1.2x) then returns to normal; label color flashes white/yellow/orange based on score amount earned; resets to white after ~0.15s
**Why human:** Tween animation and color flash timing cannot be verified programmatically without a running Cocos runtime

#### 2. Combo Label Punch-In at High Streak (JUICE-03)

**Test:** Build a combo to streak 5, 10, and 15+ taps in a session
**Expected:** Combo label appears large (proportionally bigger at higher streaks) and shrinks to normal size; at streak 2 the initial scale is noticeably smaller than at streak 10
**Why human:** Scale proportionality and animation feel require live visual comparison

#### 3. Combo Break vs Normal Wrong Tap Flash Strength (JUICE-03)

**Test:** Tap a wrong flower at streak 0 (no combo), then build to streak 3 and tap wrong
**Expected:** Combo break (streak >= 2) red flash is perceptibly stronger/brighter than the normal wrong tap flash
**Why human:** Opacity difference (35% vs 20%) is a judgment call that requires human perception

#### 4. Multiplier Score Float — Gold Color + Zigzag + Count-Up (JUICE-04)

**Test:** Activate a SCORE_MULTIPLIER power-up, then tap correct flowers
**Expected:** Score floats appear gold-colored, bounce left-right in a zigzag pattern as they rise, and count up from base score to multiplied score over ~0.4s
**Why human:** Color, animation path, and count-up animation require Cocos runtime visual observation

#### 5. Score Float Punch-In Slam Effect (JUICE-04)

**Test:** Tap a high-value flower (e.g., CHERRY FULL_BLOOM for 120 points)
**Expected:** Float appears at 10x scale with ~20% opacity then slams down to 1x scale over 0.14s while fading to full opacity — a visible "slam from sky" entrance
**Why human:** Animation feel and perception of the slam effect require live observation

#### 6. Normal Float Regression Check (JUICE-04)

**Test:** Tap correct flowers without any active power-up
**Expected:** Floats are white, travel upward with a gentle 16px horizontal zigzag — visually unchanged from before Phase 12 except now using zigzag instead of the old gentle wobble
**Why human:** Regression requires visual comparison with expected behavior baseline

**SUMMARY note:** According to 12-02-SUMMARY.md (line 129-140), all 6 checks were approved by human in Cocos Creator Preview mode on 2026-03-25. Formal verification sign-off is recorded in the SUMMARY. This VERIFICATION.md captures the programmatic checks and routes visual checks to human confirmation as per process.

---

## Summary

Phase 12 fully achieves its goal in code. All 7 observable truths are implemented with real wired logic:

- `getScoreFlashColor` and `getComboStartScale` are pure helpers with 12 unit tests (all passing)
- `_punchScoreLabel` is wired in `handleCorrectTap` with real score delta from game state
- `_pulseComboLabel` uses streak-proportional start scale from `getComboStartScale`
- `_playComboBreak` uses opacity 89 vs the 51 of `_playRedFlash` — a measurable code difference
- `handleWrongTap` correctly separates the two paths with no double-fire
- `spawnScoreFloat` branches on `powerUpMultiplier > 1` for gold color and wider zigzag
- All 9 commits from both SUMMARYs verified in git log
- Test suite: 244/244 passing, 0 regressions

The only outstanding items are visual/perceptual checks that require Cocos Creator Preview mode. 12-02-SUMMARY.md documents human approval of all 6 visual checks.

---

_Verified: 2026-03-25T14:41:00Z_
_Verifier: Claude (gsd-verifier)_
