---
phase: 6
slug: results-and-persistence
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
approved: 2026-03-16
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (workspace root) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | RSLT-03 | unit | `npx vitest run BloomTap/assets/scripts/logic/StorageService.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 0 | RSLT-02 | unit | `npx vitest run BloomTap/assets/scripts/logic/GameState.test.ts` | ❌ W0 extend | ⬜ pending |
| 6-01-03 | 01 | 0 | RSLT-01 | unit | `npx vitest run BloomTap/assets/scripts/logic/StorageService.test.ts` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | RSLT-01 | manual | Open game → timer expires → check overlay labels visible | N/A (Cocos scene) | ⬜ pending |
| 6-02-02 | 02 | 1 | RSLT-02 | manual | On results screen → tap Restart → verify start screen, fresh state | N/A (Cocos scene) | ⬜ pending |
| 6-02-03 | 02 | 1 | RSLT-03 | manual | Game over → refresh browser → game over again → highscore persists | N/A (Cocos scene) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/StorageService.test.ts` — new file, covers RSLT-03 (round-trip persistence) + RSLT-01 (storage read path); requires jsdom environment or `vi.stubGlobal` mock
- [ ] Extend `BloomTap/assets/scripts/logic/GameState.test.ts` — add Phase 6 stats section (correctTaps, wrongTaps, peakStreak, reset zeroing); covers RSLT-02
- [ ] Resolve localStorage in Vitest node environment — add `// @vitest-environment jsdom` per-file header OR `vi.stubGlobal('localStorage', ...)` in beforeEach

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Results overlay labels visible on game over | RSLT-01 | Cocos Creator scene node visibility cannot be verified headlessly | Open game in browser, wait for 120s timer or debug-trigger game-over, confirm Score/Highscore/BestCombo/Accuracy labels display correctly in overlay |
| "NEW BEST!" celebration fires on first highscore | RSLT-01 | Tween + scheduleOnce animation, no headless DOM | Clear localStorage, play one session, let timer expire — confirm "NEW BEST!" label animates in after 0.5s |
| Highscore persists across browser refresh | RSLT-03 | Browser localStorage persistence | Achieve a score, note highscore, refresh tab, trigger game over again — confirm highscore shown matches stored value |
| Restart resets visual state (NEW BEST hidden) | RSLT-02 | Cocos scene node state | On results screen after NEW BEST, tap Restart — confirm "NEW BEST!" label is hidden on next session |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactively approved 2026-03-16 — phase completed and verified (06-VERIFICATION.md, 12/12 must-haves passed)
