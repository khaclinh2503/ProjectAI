---
phase: 4
slug: session-loop-and-scoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or package.json scripts) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | GAME-04 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | SESS-01 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | SESS-02 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 4-01-04 | 01 | 1 | SESS-03 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 4-01-05 | 01 | 1 | GAME-05 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 4-02-01 | 02 | 1 | SESS-04 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 4-02-02 | 02 | 1 | SESS-05 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 4-03-01 | 03 | 2 | HUD-01 | manual | — | — | ⬜ pending |
| 4-03-02 | 03 | 2 | HUD-02 | manual | — | — | ⬜ pending |
| 4-03-03 | 03 | 2 | HUD-03 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/GameState.test.ts` — stubs for GAME-04 (isGameOver), SESS-01 (session 120s), SESS-02 (reset moves sessionStartMs)
- [ ] `tests/unit/Grid.clearAll.test.ts` — stub for Grid.clearAll() (new method)

*Existing Vitest infrastructure covers the remaining requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Start screen → countdown 3→2→1 → game begins | SESS-01 | Cocos scene animation cannot run in Vitest | Launch game, tap Start, verify "3", "2", "1" labels display ~1s each |
| HUD score/timer/combo visible and updating | HUD-01, HUD-02, HUD-03 | Requires running Cocos scene | Observe HUD during play; verify score increments on correct tap, timer counts down, combo resets on wrong tap |
| Game-over overlay appears at T=120s | SESS-04 | Requires running Cocos scene | Let session run to 0; verify overlay shows "Game Over" + final score |
| "Chơi lại" resets and returns to Start screen | SESS-05 | Requires running Cocos scene | Tap "Chơi lại"; verify score=0, grid empty, Start screen visible |
| Spawn rate increases across 3 difficulty phases | GAME-05 | Subjective visual observation | Play full 120s session; verify noticeably slower spawns 0–40s vs 80–120s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
