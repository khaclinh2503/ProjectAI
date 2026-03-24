---
phase: 3
slug: renderer-and-input
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
approved: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `E:/workspace/ProjectAI/vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Cocos Creator preview check
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | GAME-01, GAME-02, GAME-03 | unit | `npx vitest run` | ❌ Wave 0 | ⬜ pending |
| 3-01-xx | 01 | 1 | GRID-01, GRID-02 | manual | Cocos Creator preview | N/A | ⬜ pending |
| 3-02-xx | 02 | 1 | FLOW-03 | manual | Cocos Creator preview | N/A | ⬜ pending |
| 3-03-xx | 03 | 2 | GAME-01, GAME-02, GAME-03 | unit + manual | `npx vitest run` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/GameState.ts` — score accumulation and penalty logic (plain TypeScript, no cc imports)
- [ ] `BloomTap/assets/scripts/logic/GameState.test.ts` — unit tests covering GAME-01 (correct tap scoring), GAME-02 (FULL_BLOOM scores more than BLOOMING), GAME-03 (wrong tap penalty + combo reset)

*Renderer files `GridRenderer.ts`, `CellNode.ts` require Cocos Creator runtime — covered by manual preview only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 64 cell nodes pre-created, none created/destroyed during gameplay | GRID-01 | Requires Cocos Creator runtime; node lifecycle is engine-internal | Open GameScene in Cocos Creator preview; add debug log in onLoad() counting nodes; verify count stays at 64 throughout tap session |
| Grid scales correctly at 375px and 430px viewport | GRID-02 | Requires device/emulator viewport simulation | In Cocos Creator preview, set canvas resolution to 375x812 and 430x932; verify grid fills ~80% width on both |
| 5 flower states visually distinct (no text reading needed) | FLOW-03 | Visual validation; cannot be automated in Vitest | Open GameScene preview with all 5 states rendered; confirm BUD/BLOOMING/FULL_BLOOM/WILTING/DEAD are immediately distinguishable by color alone |
| Wrong-tap red flash 150ms on BUD/WILTING/DEAD tap | GAME-03 (visual) | Animation timing in Cocos runtime | Tap a BUD cell in preview; confirm red flash appears and clears after ~150ms |
| Correct-tap yellow/white flash 300ms on BLOOMING/FULL_BLOOM tap | GAME-01/02 (visual) | Animation timing in Cocos runtime | Tap a BLOOMING cell; confirm yellow flash appears and cell becomes empty after ~300ms; tap FULL_BLOOM; confirm white flash |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactively approved 2026-03-14 — phase completed and verified (03-VERIFICATION.md, 6/6 must-haves passed, 105 tests green)
