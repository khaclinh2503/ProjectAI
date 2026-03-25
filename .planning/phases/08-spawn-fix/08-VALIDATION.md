---
phase: 8
slug: spawn-fix
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
approved: 2026-03-25
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (detected via `vitest.config.ts` at project root) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green (171+ tests)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | SPAWN-01 | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameConfig.test.ts` | ✅ extend existing | ⬜ pending |
| 8-01-02 | 01 | 1 | SPAWN-01 | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameConfig.test.ts` | ✅ extend existing | ⬜ pending |
| 8-01-03 | 01 | 2 | SPAWN-01 | unit | `npx vitest run` | ✅ extend existing | ⬜ pending |
| 8-01-04 | 01 | 2 | SPAWN-01 | manual | Cocos Editor play mode | N/A — runtime | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no Wave 0 setup needed.

- `BloomTap/assets/scripts/logic/GameConfig.test.ts` — existing file, extend with `initialCount` test cases
- `vitest.config.ts` — already configured, 171 tests passing baseline

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flowers appear on board before countdown ends | SPAWN-01 | Cocos runtime — no headless test support | Open Cocos Editor, tap Start, verify flowers visible on board during countdown |
| Flower count on board matches `initialCount` from JSON | SPAWN-01 | Cocos runtime — no headless test support | Set `initialCount: 3` in flowers.json, tap Start, count flowers on board — must be 3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no new test files needed)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-25 — Phase 8 complete. VERIFICATION.md passed 5/5. 186 tests passing at close. Retroactive sign-off.
