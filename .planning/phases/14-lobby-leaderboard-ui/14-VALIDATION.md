---
phase: 14
slug: lobby-leaderboard-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:run -- --reporter=verbose` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green + human play-test checklist completed
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | LOBBY-01 | manual | `npm run test:run` (regression check) | N/A | ⬜ pending |
| 14-01-02 | 01 | 1 | LOBBY-01 | manual | `npm run test:run` (regression check) | N/A | ⬜ pending |
| 14-02-01 | 02 | 1 | PLAYER-01 | manual | `npm run test:run` (regression check) | N/A | ⬜ pending |
| 14-03-01 | 03 | 2 | LB-01 | manual | `npm run test:run` (regression check) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — Existing infrastructure covers all phase requirements.

Controller classes (LobbyController, LeaderboardController) import from `cc` and cannot run in the Vitest/jsdom environment. The project's `vitest.config.ts` explicitly scopes tests to `logic/` only — this is the established pattern. No new test files are needed.

Existing tests that continue to be valid:
- `LeaderboardService.test.ts` — 24 tests for getPlayerName, setPlayerName, getEntries, saveEntry, getRank (run unchanged as regression gate)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LobbyScene renders with 5 buttons | LOBBY-01 | LobbyController imports from `cc` (no jsdom) | Open Cocos Preview → verify 5 buttons visible: Chơi Ngay, Vườn Hoa, Túi Đồ, BXH, Setting |
| Toast shows "Sắp ra mắt!" for 3 buttons | LOBBY-01 | UI animation, no jsdom | Tap Vườn Hoa, Túi Đồ, Setting → verify toast appears/disappears, no scene change |
| Name overlay on first run | PLAYER-01 | Requires localStorage interaction in Cocos | Clear localStorage → launch → verify overlay with EditBox appears before lobby |
| Name persists across reload | PLAYER-01 | Requires localStorage state across runs | Set name → reload app → verify lobby shows correct name greeting |
| LeaderboardScene shows entries | LB-01 | Requires scene rendering in Cocos | Tap BXH → verify rank/name/score columns for up to 10 entries |
| Empty state in LeaderboardScene | LB-01 | Requires scene with no data | Clear leaderboard data → tap BXH → verify "Chưa có ai lên bảng. Hãy chơi ngay!" label |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
