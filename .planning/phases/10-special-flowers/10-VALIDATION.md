---
phase: 10
slug: special-flowers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` — covers `BloomTap/assets/scripts/logic/**/*.test.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green (186 + new tests)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-W0-01 | W0 | 0 | SPECIAL-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-W0-02 | W0 | 0 | SPECIAL-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-W0-03 | W0 | 0 | SPECIAL-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-W0-04 | W0 | 0 | SPECIAL-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-W0-05 | W0 | 0 | SPECIAL-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-W0-06 | W0 | 0 | POLISH-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/PowerUpState.test.ts` — new file covering all PowerUpState unit tests (SPECIAL-01 through SPECIAL-04, POLISH-03)
- [ ] Extend `BloomTap/assets/scripts/logic/Grid.test.ts` — new cases for `isSpecial`/`specialEffect` reset in `clearCell` and `clearAll`
- [ ] Extend `BloomTap/assets/scripts/logic/GameState.test.ts` — new cases for `applyCorrectTap` with `powerUpMultiplier` parameter
- [ ] Extend `BloomTap/assets/scripts/logic/GameConfig.test.ts` — new cases for `powerUps` section parsing and validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HUD row hidden when no effects active, shown when any effect active | SPECIAL-01 | Cocos node visibility — no DOM/unit test | Run game, observe HUD before/after tapping special flower |
| Each effect activates and expires with correct HUD animation | SPECIAL-02, SPECIAL-03, SPECIAL-04 | Cocos Graphics rendering — visual check only | Tap each special flower type, watch arc timer drain to 0 |
| Special flower visually distinct from regular flowers (color overlay per effect type) | SPECIAL-01 | Visual rendering — Cocos Graphics | Run game, confirm gold/blue/green overlay visible from BUD state |
| TIME_FREEZE: countdown timer visibly stops, flowers continue cycling | SPECIAL-03 | Real-time visual behavior | Tap TIME_FREEZE special, confirm countdown freezes ~5s, resumes from same value |
| SLOW_GROWTH: newly spawned flowers cycle more slowly during effect | SPECIAL-04 | Visual timing observation | Tap SLOW_GROWTH special, confirm new flowers bloom slower than baseline |
| Pause during active effects → effects resume with remaining duration | SPECIAL-01 | Pause/resume game state integration | Tap special, immediately pause mid-effect, resume, confirm remaining duration continues |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
