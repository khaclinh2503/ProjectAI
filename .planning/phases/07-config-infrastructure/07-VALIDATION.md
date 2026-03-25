---
phase: 7
slug: config-infrastructure
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-17
approved: 2026-03-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `E:/workspace/ProjectAI/vitest.config.ts` |
| **Quick run command** | `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-W0-01 | Wave 0 | 0 | CFG-01, CFG-02, CFG-03 | unit | `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-xx | 01 | 1 | CFG-01 | unit | `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts` | ❌ W0 | ⬜ pending |
| 7-02-xx | 02 | 1 | CFG-02 | unit | `npx vitest run BloomTap/assets/scripts/logic/SpawnManager.test.ts` | ✅ existing | ⬜ pending |
| 7-03-xx | 03 | 2 | CFG-03 | unit | `npx vitest run` | ✅ existing | ⬜ pending |
| 7-04-xx | 04 | 2 | CFG-01, CFG-02, CFG-03 | regression | `npx vitest run` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/GameConfig.test.ts` — stubs for CFG-01, CFG-02, CFG-03 parse validation
- [ ] `BloomTap/assets/resources/config/flowers.json` — full schema with 5 flower types + spawnPhases
- [ ] `BloomTap/assets/resources/config/settings.json` — session.durationMs + scoring.wrongTapPenalty

*Vitest 3.2.4 already installed — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Boot shows error popup on malformed JSON | CFG-03 | Requires Cocos Editor runtime | Open in Cocos Editor → intentionally break flowers.json (e.g., add trailing comma) → Play → verify "Game config lỗi. Vui lòng reload." popup appears |
| Reload button reloads Boot and re-parses | CFG-03 | Requires Cocos Editor runtime | Same setup → click Reload → verify game reloads Boot scene and re-attempts load |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-25 — Phase 7 complete. VERIFICATION.md passed 9/9. GameConfig.test.ts present (Wave 0 fulfilled). 186 tests passing at close. Retroactive sign-off.
