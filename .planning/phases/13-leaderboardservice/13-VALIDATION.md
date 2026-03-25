---
phase: 13
slug: leaderboardservice
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | PLAYER-01 | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | LB-01 | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | LB-02 (insert) | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | LB-02 (no-insert) | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | LB-02 (getRank) | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | LB-02 (boundary) | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.ts` — implementation file (new)
- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.test.ts` — test file covering all 6 requirement behaviors (new)

*Note: Both files created as part of Wave 1. vitest.config.ts and jsdom already configured — no separate Wave 0 needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
