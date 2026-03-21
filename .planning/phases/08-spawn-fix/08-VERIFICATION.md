---
phase: 08-spawn-fix
verified: 2026-03-21T14:54:00+07:00
status: passed
score: 5/5 must-haves verified
gaps: []
human_verification:
  - test: "Tap Start in the running game — observe flowers on board before countdown overlay fades in"
    expected: "Board shows 5 flowers the instant the countdown overlay appears (before '3' is displayed)"
    why_human: "Cocos scene runtime — cannot verify visual frame timing programmatically"
---

# Phase 8: Spawn Fix Verification Report

**Phase Goal:** Fix spawn timing — flowers appear immediately on Start tap, before the 3-2-1 countdown
**Verified:** 2026-03-21T14:54:00+07:00
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Flowers appear on the board within the same frame as the Start tap — no empty-board period | VERIFIED | `_onStartTapped()` calls `_spawnInitialBurst()` at line 402, before `_startCountdown()` at line 403 |
| 2 | The number of initial flowers matches `initialCount` from `spawnPhases[0]` in flowers.json | VERIFIED | `flowers.json` spawnPhases[0] has `"initialCount": 5`; `_spawnInitialBurst()` reads `phaseConfig.initialCount ?? 0` and loops that many times |
| 3 | `parseGameConfig` throws if `initialCount` is missing or non-positive on `spawnPhases[0]` | VERIFIED | `GameConfig.ts` line 143: `requirePositiveNumber(phase, 'initialCount', ctx)` on `index === 0`; all 4 failure-path tests pass |
| 4 | `parseGameConfig` does NOT throw when `initialCount` is absent on `spawnPhases[1]` and `[2]` | VERIFIED | `GameConfig.ts` line 144: `undefined` returned for index != 0; tests 5 and 6 in `initialCount validation` block pass |
| 5 | Initial burst respects `maxAlive` cap — never exceeds `spawnPhases[0].maxAlive` | VERIFIED | `_spawnInitialBurst()` line 452: `if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;` — same guard as `update()` loop |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/logic/SpawnManager.ts` | `SpawnPhaseConfig` interface with `initialCount?: number` | VERIFIED | Line 17: `initialCount?: number;` present in interface |
| `BloomTap/assets/scripts/logic/GameConfig.ts` | `parseSpawnPhases` validates `initialCount` on phase 0 | VERIFIED | Lines 142-146: conditional `requirePositiveNumber` + conditional spread |
| `BloomTap/assets/scripts/logic/GameConfig.test.ts` | Tests for `initialCount` validation (valid, missing, zero, negative, absent on phases 1-2) | VERIFIED | `describe('initialCount validation')` block at line 220 — 6 tests covering all cases |
| `BloomTap/assets/resources/config/flowers.json` | `initialCount` field in `spawnPhases[0]` | VERIFIED | Line 31: `"initialCount": 5` present; phases 1 and 2 do not have the field |
| `BloomTap/assets/scripts/GameController.ts` | `_spawnInitialBurst()` helper called from `_onStartTapped()` | VERIFIED | `_spawnInitialBurst()` defined at line 447; called at line 402 (before `_startCountdown()`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GameController.ts` | `SpawnManager.ts` | `this.spawnManager.getPhaseConfig(0).initialCount` | VERIFIED | Line 449: `this.spawnManager.getPhaseConfig(0)` then line 450: `phaseConfig.initialCount ?? 0` |
| `GameController._onStartTapped()` | `_spawnInitialBurst()` before `_startCountdown()` | method call order | VERIFIED | Lines 401-404: `_spawnInitialBurst()` at line 402, `_startCountdown()` at line 403 — correct order |
| `GameConfig.ts` | `flowers.json` | `requirePositiveNumber` reads `initialCount` from phase index 0 | VERIFIED | Line 143: `requirePositiveNumber(phase, 'initialCount', ctx)` inside `index === 0` branch |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SPAWN-01 | 08-01-PLAN.md | Hoa xuất hiện ngay khi game bắt đầu (không delay 3 giây), số lượng ban đầu configurable từ JSON | SATISFIED | `_spawnInitialBurst()` called from `_onStartTapped()` before countdown; `initialCount: 5` in flowers.json; parseGameConfig validates the field |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps only SPAWN-01 to Phase 8. No orphaned requirements.

**CFG-02 note:** REQUIREMENTS.md marks CFG-02 (`initialCount` configurable via JSON) as Complete on Phase 7, but the `initialCount` field itself was added in Phase 8. This is a pre-existing status discrepancy unrelated to this phase's scope — SPAWN-01 covers the spawn behavior and the JSON configurability of `initialCount` together.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No stubs, no placeholder comments, no unimplemented handlers. `_spawnInitialBurst()` mirrors the `update()` spawn loop exactly — it is a full implementation, not a stub.

`grid.clearAll()` calls at lines 468 and 534 are in `_triggerGameOver()` and `onRestartTapped()` respectively — not in `_beginSession()`. This is correct: flowers spawned by `_spawnInitialBurst()` survive through the 3s countdown.

### Test Results

```
Test Files  10 passed (10)
      Tests 177 passed (177)
   Duration 2.91s
```

All 177 tests pass including the 6 new `initialCount validation` tests.

Commits verified in repo:
- `c742ce2` — feat(08-01): add initialCount to SpawnPhaseConfig, parseSpawnPhases, and flowers.json
- `5b7baa2` — feat(08-01): add _spawnInitialBurst() and call from _onStartTapped()

### Human Verification Required

#### 1. Visual board population on Start tap

**Test:** Launch game in Cocos editor (F5). Tap the Start button.
**Expected:** Flowers are visible on the board cells at the moment the countdown overlay appears (when "3" first shows). The board should never be empty while the countdown is running.
**Why human:** Cocos scene runtime — frame-level timing and visual rendering cannot be verified from source code alone.

### Gaps Summary

No gaps. All 5 must-have truths are verified, all 5 artifacts are substantive and wired, all 3 key links are confirmed. SPAWN-01 is satisfied.

---

_Verified: 2026-03-21T14:54:00+07:00_
_Verifier: Claude (gsd-verifier)_
