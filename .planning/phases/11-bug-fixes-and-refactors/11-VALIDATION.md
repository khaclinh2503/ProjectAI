---
phase: 11
slug: bug-fixes-and-refactors
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
approved: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 11-01-01 | 01 | 1 | FIX-03 | unit | `npx vitest run` (JuiceHelpers refactor) | ✅ green |
| 11-01-02 | 01 | 1 | SPECIAL-04 (applySlowGrowthConfig fix) | unit | `npx vitest run` | ✅ green |
| 11-02-01 | 02 | 2 | FIX-01 | unit | `npx vitest run` | ✅ green |
| 11-02-02 | 02 | 2 | FIX-02 | manual | Cocos Editor play | ✅ green |
| 11-02-03 | 02 | 2 | FIX-01/02/03 | manual | Full human checkpoint | ✅ green |

---

## Wave 0 Requirements

No new test infrastructure needed — extending existing Vitest suite.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Screen shake triggers on wrong tap | FIX-02 | Cocos tween animation requires runtime | ✅ PASSED (11-VERIFICATION.md) |
| Combo label shows x1 streak from session start | FIX-01 | UI label requires Cocos runtime | ✅ PASSED (11-VERIFICATION.md) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-25 — Phase 11 complete. VERIFICATION.md passed 8/8. 232 tests passing at close. Retroactive sign-off.
