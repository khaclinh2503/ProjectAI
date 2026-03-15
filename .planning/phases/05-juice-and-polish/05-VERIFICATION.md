---
phase: 05-juice-and-polish
verified: 2026-03-15T21:43:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "JUICE-01: Tap any flower cell and confirm a visible scale-pulse animation completes within ~100ms"
    expected: "Cell scales up to ~1.1x then returns to 1.0x; FULL_BLOOM tap also causes 4 adjacent cells to ripple with a 30ms delay"
    why_human: "Tween animation is runtime Cocos behavior — cannot verify visual timing from source code alone"
  - test: "JUICE-02: Tap a correct cell (BLOOMING/FULL_BLOOM) and observe score float label"
    expected: "'+N' white label rises from tapped cell with zigzag wobble, fades out within 1 second; label is visibly larger at higher combo multiplier"
    why_human: "Float pool positioning, wobble trajectory, and size scaling require runtime rendering to verify"
  - test: "JUICE-02: Tap a wrong cell (BUD/WILTING/DEAD) or empty cell and observe float"
    expected: "'-10' red label rises and fades from the tapped cell"
    why_human: "Visual color and position of wrong-tap float requires runtime verification"
  - test: "JUICE-03: Tap a wrong cell and observe combo feedback"
    expected: "Full-screen red overlay flashes at ~20% opacity for 150ms AND combo label blinks 3 times then fades"
    why_human: "Overlay opacity, blink timing, and fade behavior are Cocos runtime animations"
  - test: "JUICE-03: Build a streak to exactly 10 correct taps and observe milestone"
    expected: "Mid-screen 'COMBO x10!' label punches in (scale 0.5 → 1.3 → 1.0), holds ~0.6s, fades out; does NOT appear again in same session if combo breaks and reaches x10 again"
    why_human: "Scale punch, hold duration, and one-per-session guard require runtime playthrough"
  - test: "JUICE-04: Play a full 120-second session and observe timer urgency progression"
    expected: "Timer is white at start; turns yellow at ≤60s; turns orange at ≤30s; turns red and blinks every 250ms at ≤10s"
    why_human: "Color transitions, scale changes, and blink timing are runtime visual behaviors"
  - test: "JUICE-04 cleanup: Let session end or restart and confirm blink stops cleanly"
    expected: "After game-over overlay appears, timer is no longer blinking; after restart, timer returns to white at normal size with no leftover animation state"
    why_human: "State cleanup correctness (no ghost blink across sessions) requires live playthrough"
---

# Phase 5: Juice and Polish Verification Report

**Phase Goal:** Add juice animations and visual polish — tap pulse, score floats, combo feedback, timer urgency — so the game feels alive and responsive.
**Verified:** 2026-03-15T21:43:00Z
**Status:** human_needed (all automated checks passed; runtime visual behavior requires human playtest)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | getFloatLabelString(-30) returns '-30'; getFloatLabelString(120) returns '+120' | VERIFIED | JuiceHelpers.ts line 13; 29 tests green |
| 2 | getFloatFontSize(1) returns 24; getFloatFontSize(7) returns 48 (cap) | VERIFIED | JuiceHelpers.ts line 22; test cases confirmed |
| 3 | getFloatDuration(1) returns 0.4; getFloatDuration(10) returns 1.0 (cap) | VERIFIED | JuiceHelpers.ts line 31; test cases confirmed |
| 4 | getUrgencyStage(61)=0, getUrgencyStage(60)=1, getUrgencyStage(30)=2, getUrgencyStage(10)=3 | VERIFIED | JuiceHelpers.ts lines 39-43; 8 boundary tests green |
| 5 | getMilestoneLabel(10, emptySet) returns 'COMBO x10!'; second call with 10 in Set returns null | VERIFIED | JuiceHelpers.ts lines 50-55; 7 tests green |
| 6 | Tapping any cell produces a visible scale-pulse animation completing within ~100ms | VERIFIED (code) / NEEDS HUMAN (visual) | GridRenderer.ts lines 300-316: playTapPulse() with 0.04 halfDuration (80ms) or 0.06 (120ms FULL_BLOOM); called on all 3 tap paths in _onCellTapped() (lines 240, 255, 269) |
| 7 | FULL_BLOOM tap produces stronger pulse + lighter pulses on adjacent cells | VERIFIED (code) / NEEDS HUMAN (visual) | _rippleNeighbors() at lines 318-335; called from playTapPulse() when isFullBloom=true |
| 8 | Score float label rises from tapped cell and fades out after every correct or wrong tap | VERIFIED (code) / NEEDS HUMAN (visual) | spawnScoreFloat() pool pattern at lines 341-389; called on correct (line 258), wrong-flower (line 272), empty (line 242) paths |
| 9 | Wrong tap triggers red screen flash AND combo label blinks; correct tap pulses combo label; x10/x25/x50 celebration triggers exactly once | VERIFIED (code) / NEEDS HUMAN (visual) | _playRedFlash(), _playComboBreak() wired in handleWrongTap() lines 185-186; _pulseComboLabel(), _checkMilestone() wired in handleCorrectTap() lines 172-173; _triggeredMilestones Set prevents re-trigger |
| 10 | Timer turns yellow at ≤60s, orange at ≤30s, red+blinking at ≤10s; blink stops cleanly on game-over/restart | VERIFIED (code) / NEEDS HUMAN (visual) | _updateTimerUrgency() + _applyUrgencyStage() at lines 292-349; _stopAllJuiceAnimations() called in _beginSession() (line 408) and _triggerGameOver() (line 428) |

**Score:** 10/10 truths verified at code level; 7 require human runtime confirmation

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/logic/JuiceHelpers.ts` | 5 pure functions + MILESTONE_THRESHOLDS, zero Cocos imports | VERIFIED | 55 lines; exports getFloatLabelString, getFloatFontSize, getFloatDuration, getUrgencyStage, getMilestoneLabel, MILESTONE_THRESHOLDS; no Cocos imports |
| `BloomTap/assets/scripts/logic/JuiceHelpers.test.ts` | Vitest unit tests for all 5 functions, all green | VERIFIED | 124 lines; 29 tests across 6 describe blocks; `npx vitest run` = 140/140 passing |
| `BloomTap/assets/scripts/GridRenderer.ts` | playTapPulse, _rippleNeighbors, spawnScoreFloat, stopAllFloatAnimations, FloatSlot pool | VERIFIED | All 4 public methods present and substantive; _floatPool pre-created in onLoad() via _buildFloatPool() with 8 slots; no Node allocations during gameplay |
| `BloomTap/assets/scripts/GameController.ts` | @property redFlashOverlay/milestoneNode/milestoneLabel; juice animation methods; extended handleCorrectTap return type | VERIFIED | Lines 69-75: 3 @property fields; lines 158-176: handleCorrectTap returns {flashColor, rawScore, multiplier, isFullBloom}; _playRedFlash, _playComboBreak, _pulseComboLabel, _checkMilestone, _playMilestoneCelebration, _updateTimerUrgency, _applyUrgencyStage all present and substantive |
| `BloomTap/assets/scene/GameScene.scene` | RedFlashOverlay node, MilestoneLabelNode, UIOpacity on ScoreLabel/TimerLabel/ComboLabel | VERIFIED | Line 2737: RedFlashOverlay present; line 2862: MilestoneLabelNode present; 5 UIOpacity components at lines 2697-3006; all 3 @property fields wired (lines 674-682) to valid node IDs |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| GridRenderer._onCellTapped() | GridRenderer.playTapPulse() | called on all 3 tap paths | WIRED | Lines 240, 255, 269 — correct-tap, wrong-flower-tap, empty-cell-tap all call playTapPulse() |
| GridRenderer._onCellTapped() correct path | GameController.handleCorrectTap() extended return | destructures {flashColor, rawScore, multiplier, isFullBloom} | WIRED | Line 250-251: full destructure verified |
| GridRenderer.spawnScoreFloat() | FloatSlot pool | _floatPool.find(s => !s.inUse) | WIRED | Line 342: pool lookup; slots pre-created in _buildFloatPool() (line 181-197) |
| GridRenderer.spawnScoreFloat() | getFloatLabelString, getFloatFontSize, getFloatDuration | imported from JuiceHelpers | WIRED | Line 6: import; lines 354, 361, 363: all three helpers called |
| GameController.handleCorrectTap() | _checkMilestone() | called after applyCorrectTap | WIRED | Line 173: _checkMilestone(this.comboSystem.tapCount) |
| GameController.handleWrongTap() | _playRedFlash() + _playComboBreak() | called after applyWrongTap | WIRED | Lines 185-186 |
| GameController._updateHUD() | _updateTimerUrgency() | called on each second boundary | WIRED | Line 467: this._updateTimerUrgency(remainingSecs) inside if-block |
| GameController._beginSession() | _stopAllJuiceAnimations() | called at top of method | WIRED | Line 408 |
| GameController._triggerGameOver() | _stopAllJuiceAnimations() | called before phase change | WIRED | Line 428 |
| GameController._updateTimerUrgency() | getUrgencyStage() | — | PARTIAL | Inline logic at lines 294-297 is functionally equivalent to getUrgencyStage() but does NOT import from JuiceHelpers. Plan 00 key_link specified "pattern: getUrgencyStage" in GameController. Logic is correct; coupling to tested module is absent. |
| GameController._checkMilestone() | getMilestoneLabel() | — | PARTIAL | Inline loop at lines 244-249 is functionally equivalent to getMilestoneLabel() but does NOT import from JuiceHelpers. Logic is correct; coupling to tested module is absent. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| JUICE-01 | 05-00, 05-01, 05-02 | Ô tap scale phồng lên rồi về khi nhấn (scale pulse ~100ms) | SATISFIED | playTapPulse() implemented and called on every tap path; 80ms normal / 120ms FULL_BLOOM timing |
| JUICE-02 | 05-00, 05-01, 05-02 | Điểm nổi lên từ ô hoa vừa tap ("+120 x3" float animation) | SATISFIED | spawnScoreFloat() with object pool; getFloatLabelString/getFloatFontSize/getFloatDuration helpers; called on all tap paths |
| JUICE-03 | 05-00, 05-02 | Visual flash khi tap sai và combo bị reset | SATISFIED | _playRedFlash() (red overlay 150ms), _playComboBreak() (blink+fade), _pulseComboLabel() (correct tap), _playMilestoneCelebration() (x10/x25/x50 celebrations) |
| JUICE-04 | 05-00, 05-02 | Timer đổi màu hoặc nhấp nháy trong 15 giây cuối | SATISFIED | _updateTimerUrgency() + _applyUrgencyStage() with 3 urgency stages; red+blink at ≤10s; cleanup in _stopAllJuiceAnimations() |

**No orphaned requirements.** All 4 JUICE requirements mapped to plans and verified as implemented.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| GameController.ts | 244-249 | Inline milestone threshold array [10, 25, 50] duplicates MILESTONE_THRESHOLDS from JuiceHelpers | Info | Logic duplication — if thresholds change, two places must be updated |
| GameController.ts | 294-297 | Inline urgency stage logic duplicates getUrgencyStage() from JuiceHelpers | Info | Logic duplication — urgency boundaries tested in JuiceHelpers tests but not in the inlined version |

No blockers or warnings found. Both anti-patterns are informational: the duplicated logic is functionally correct and the game behavior is unaffected. The original plan intent was to import these helpers, but the implementation inlined them instead.

---

## Human Verification Required

The following behaviors require runtime Cocos Creator preview to confirm. All underlying code is verified correct at the source level.

### 1. Tap Pulse Visual (JUICE-01)

**Test:** Start a session; tap any flower cell in BLOOMING state
**Expected:** Cell visibly scales up to ~1.1x then returns to normal within ~80ms; no scale jitter on rapid taps
**Why human:** Tween animation timing and visual smoothness cannot be verified from source

### 2. FULL_BLOOM Ripple (JUICE-01)

**Test:** Wait for a cell to reach peak brightness (FULL_BLOOM); tap it
**Expected:** Tapped cell pulses larger (~120ms); up to 4 adjacent valid cells ripple slightly with ~30ms delay
**Why human:** Spatial ripple effect and timing offset require runtime rendering

### 3. Score Float Label Appearance (JUICE-02)

**Test:** Tap correct cells at combo x1 then at combo x5+
**Expected:** White '+N' label rises from cell with sideways wobble, fades within 1 second; label is visibly larger at higher multiplier
**Why human:** Float position, wobble trajectory, fade, and size scaling are visual behaviors

### 4. Wrong Tap Float (JUICE-02)

**Test:** Tap a BUD or empty cell
**Expected:** Red '-10' label rises from the tapped cell and fades out
**Why human:** Color and position of wrong-tap float require runtime confirmation

### 5. Red Flash + Combo Break (JUICE-03)

**Test:** During active gameplay with a combo streak, tap a wrong cell
**Expected:** Screen briefly flashes red (~20% opacity, 150ms); combo label blinks 3 times then fades out; both effects complete within ~1 second
**Why human:** Overlay opacity, blink timing, and combined visual effect require runtime observation

### 6. Milestone Celebration (JUICE-03)

**Test:** Build exactly 10 consecutive correct taps (without a wrong tap)
**Expected:** 'COMBO x10!' text punches in from center screen (scale bounce), holds ~0.6s, fades out; does NOT appear a second time in the same session even if combo resets and reaches 10 again; x25 and x50 also trigger on first crossing
**Why human:** Scale punch animation, one-per-session guard, and milestone sequencing require playthrough

### 7. Timer Urgency Escalation (JUICE-04)

**Test:** Play a full session and observe the timer display
**Expected:** White at session start; turns yellow at 60s; turns orange at 30s; turns red and blinks every ~250ms at 10s; blink stops immediately on game-over; restart produces white timer at normal size
**Why human:** Color transitions, blink timing, and cleanup state across sessions require runtime verification

---

## Gaps Summary

No structural gaps found. All code artifacts exist, are substantive, and are wired to game events. The full test suite passes (140/140). Human runtime verification is the only remaining step before phase can be marked definitively complete.

One notable deviation from plan: `GameController` inlines the urgency stage and milestone threshold logic rather than importing `getUrgencyStage()` and `getMilestoneLabel()` from JuiceHelpers as specified in Plan 00 key_links. The inlined logic is functionally identical to the tested helpers. This is an informational finding only — it creates logic duplication but does not affect correctness or the phase goal.

---

_Verified: 2026-03-15T21:43:00Z_
_Verifier: Claude (gsd-verifier)_
