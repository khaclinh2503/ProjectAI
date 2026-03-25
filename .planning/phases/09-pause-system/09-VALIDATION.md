---
phase: 9
slug: pause-system
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
approved: 2026-03-25
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / ts-jest (Cocos Creator project) |
| **Config file** | BloomTap/jest.config.js or package.json |
| **Quick run command** | `cd BloomTap && npx jest --testPathPattern=pause` |
| **Full suite command** | `cd BloomTap && npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd BloomTap && npx jest --testPathPattern=pause`
- **After every plan wave:** Run `cd BloomTap && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | PAUSE-01 | unit | `npx jest --testPathPattern=pause` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | PAUSE-01 | unit | `npx jest --testPathPattern=timestamp` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 2 | PAUSE-01 | integration | `npx jest --testPathPattern=GameController` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/__tests__/PauseSystem.test.ts` — stubs for PAUSE-01 pause/resume state machine
- [ ] `BloomTap/assets/scripts/logic/__tests__/TimestampShift.test.ts` — stubs for timestamp drift verification
- [ ] Verify jest config supports TypeScript (ts-jest installed)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pause button visible and tappable during gameplay | PAUSE-01 | UI interaction in Cocos Editor | Run game in Preview, tap pause, verify overlay appears |
| Resume countdown 3-2-1 animates correctly | PAUSE-01 | Visual animation in Cocos | Tap resume, verify 3-2-1 shows before game resumes |
| Urgency blink stops while paused | PAUSE-01 | Visual timing in runtime | Pause at urgency threshold, verify no blink during pause |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (shiftTimestamp tests added to FlowerFSM.test.ts / Grid.test.ts)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-25 — Phase 9 complete. VERIFICATION.md passed 8/8. 186 tests passing at close. Retroactive sign-off.
