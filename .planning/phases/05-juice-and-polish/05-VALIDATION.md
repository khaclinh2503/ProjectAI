---
phase: 5
slug: juice-and-polish
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
approved: 2026-03-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Cocos Creator preview playthrough
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-00-01 | 00 | 0 | JUICE-01/02/03/04 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | — | scene | tsc --noEmit | — | ⬜ pending |
| 5-01-02 | 01 | 1 | JUICE-01/02/03 | impl | tsc --noEmit | — | ⬜ pending |
| 5-01-03 | 01 | 1 | JUICE-02 | impl | tsc --noEmit | — | ⬜ pending |
| 5-02-01 | 02 | 2 | JUICE-01/02/03 | impl | tsc --noEmit | — | ⬜ pending |
| 5-02-02 | 02 | 2 | JUICE-03 | impl | tsc --noEmit | — | ⬜ pending |
| 5-02-03 | 02 | 2 | JUICE-04 | impl | tsc --noEmit | — | ⬜ pending |
| 5-02-04 | 02 | 2 | ALL JUICE | manual | Cocos Creator preview | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — pure functions (no Cocos imports)
- [ ] `BloomTap/assets/scripts/logic/JuiceHelpers.test.ts` — unit tests for all pure logic

### Pure functions to extract and test

| Function | Formula / Logic | Test cases |
|----------|----------------|------------|
| `getFloatLabelString(amount)` | `amount < 0 ? String(amount) : '+' + String(amount)` | -30 → "-30", +120 → "+120", 0 → "+0" |
| `getFloatFontSize(multiplier)` | `Math.min(24 + (multiplier - 1) * 4, 48)` | x1→24, x2→28, x7→48 (cap), x10→48 (cap) |
| `getFloatDuration(multiplier)` | `Math.min(0.4 + (multiplier - 1) * 0.1, 1.0)` | x1→0.4s, x5→0.8s, x10→1.0s (cap) |
| `getUrgencyStage(remainingSecs)` | 0 if >60, 1 if ≤60 and >30, 2 if ≤30 and >10, 3 if ≤10 | 61→0, 60→1, 30→2, 10→3, 0→3 |
| `getMilestoneLabel(tapCount, triggered)` | Returns milestone label string if tapCount ∈ {10,25,50} and not already triggered | first x10→"COMBO x10!", second x10→null |

---

## Manual Verification (Wave 2 checkpoint)

After Plan 02 completes, verify in Cocos Creator preview:

1. **JUICE-01:** Tap any flower → visible scale pulse (~1.1) on cell completes in ~80ms
2. **JUICE-01:** Tap FULL_BLOOM flower → pulse + 4 neighbor cells ripple within 120ms
3. **JUICE-02:** Correct tap → float label appears from cell center, wobbles up, fades out (≤1s)
4. **JUICE-02:** Float label size visibly larger at high combo vs low combo
5. **JUICE-02:** Wrong tap → "-30" red float appears from tapped cell
6. **JUICE-03:** Wrong tap → combo label chớp rồi fade out + full-screen red overlay flashes 150ms
7. **JUICE-03:** Correct taps to x10 → mid-screen "COMBO x10!" celebration appears
8. **JUICE-03:** Same session x10 celebration does NOT repeat on next x10 tap (already triggered)
9. **JUICE-03:** Restart session → x10/x25/x50 celebrations fire again
10. **JUICE-04:** At 60s remaining → timer text turns yellow, slightly larger
11. **JUICE-04:** At 30s remaining → timer text turns orange, larger still
12. **JUICE-04:** At 10s remaining → timer text turns red + blinks + HUD shows urgency state
13. **JUICE-04:** Restart → timer returns to normal white/non-blinking

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactively approved 2026-03-15 — phase completed and verified (05-VERIFICATION.md, 10/10 must-haves passed)
