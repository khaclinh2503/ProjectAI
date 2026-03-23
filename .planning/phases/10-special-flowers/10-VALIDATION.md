---
phase: 10
slug: special-flowers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | SPECIAL-01 | unit | `npx vitest run` | Wave 0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SPECIAL-01 | unit | `npx vitest run` | existing | ⬜ pending |
| 10-01-03 | 01 | 1 | SPECIAL-01 | unit | `npx vitest run` | existing | ⬜ pending |
| 10-01-04 | 01 | 1 | SPECIAL-02 | unit | `npx vitest run` | existing | ⬜ pending |
| 10-02-01 | 02 | 2 | SPECIAL-01 | unit | `npx vitest run` | existing | ⬜ pending |
| 10-02-02 | 02 | 2 | SPECIAL-03 | manual | Cocos Editor play | N/A | ⬜ pending |
| 10-02-03 | 02 | 2 | SPECIAL-04 | unit | `npx vitest run` | Wave 0 | ⬜ pending |
| 10-03-01 | 03 | 3 | SPECIAL-02/03/04 | manual | Cocos Editor play | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/PowerUpState.test.ts` — unit tests for PowerUpState (activate, tick, shiftExpiry, isActive)
- [ ] `BloomTap/assets/scripts/logic/PowerUpState.ts` — stub class with correct signatures

*Existing infrastructure (Vitest, vitest.config.ts) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cell sprite swap visible at BUD state | SPECIAL-01 | Requires Cocos Editor scene rendering | Play game, verify special cell shows correct sprite from spawn |
| HUD shows active effect + hides on expire | SPECIAL-02/03/04 | Requires Cocos Editor UI rendering | Tap special flower, verify HUD appears; wait for expiry, verify HUD hides |
| TIME_FREEZE stops countdown timer | SPECIAL-03 | Requires visual timer observation | Tap freeze flower, verify countdown pauses for ~5s |
| Replacement semantics: new effect replaces old | SPECIAL-01/D-05 | Runtime behavior | Activate one effect, tap different special flower, verify first effect replaced |
| SLOW_GROWTH widens bloom window | SPECIAL-04 | Requires observation of flower cycle speed | Activate slow growth, verify newly spawned flowers cycle noticeably slower |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
